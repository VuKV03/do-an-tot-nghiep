# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select
from datetime import datetime
import json

from backend.shared.database import get_db
from backend.quanlythi_service import models, schemas
# Note: In a real system, you would verify the JWT token from auth_service
# from backend.auth_service.dependencies import get_current_user

router = APIRouter()

@router.post("/auth/login")
async def login_candidate(credentials: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    """Đăng nhập thí sinh, trả về JWT Token với scope là `candidate`."""
    # pyrefly: ignore [missing-import]
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        select(models.ExamCandidate)
        .options(joinedload(models.ExamCandidate.subjects))
        .where(models.ExamCandidate.username == credentials.username)
    )
    candidate = result.unique().scalar_one_or_none()
    
    if not candidate or candidate.password_hash != credentials.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    return {
        "access_token": "fake-jwt-token-for-candidate",
        "token_type": "bearer",
        "candidate": {
            "id": candidate.id,
            "username": candidate.username,
            "fullName": candidate.full_name,
            "dob": candidate.dob,
            "gender": candidate.gender,
            "registered_subjects": [s.subject_name for s in candidate.subjects] if candidate.subjects else []
        }
    }

from backend.exam_service import models as exam_models
import random
import uuid

@router.get("/me/available-subjects")
async def get_available_subjects(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Lấy danh sách các môn thi mà thí sinh đăng ký VÀ đang có gói đề được phát."""
    # pyrefly: ignore [missing-import]
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        select(models.ExamCandidate)
        .options(joinedload(models.ExamCandidate.subjects))
        .where(models.ExamCandidate.id == candidate_id)
    )
    candidate = result.unique().scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    registered_subjects = [s.subject_name for s in candidate.subjects] if candidate.subjects else []

    if not registered_subjects:
        return {"available_subjects": []}

    # Find active packages for these subjects
    pkg_result = await db.execute(
        select(exam_models.Package)
        .where(exam_models.Package.status == "active")
        .where(exam_models.Package.subject.in_(registered_subjects))
    )
    active_packages = pkg_result.scalars().all()
    
    # Check submission status
    res_result = await db.execute(
        select(models.ExamResult)
        .where(models.ExamResult.candidate_id == candidate_id)
    )
    all_results = res_result.scalars().all()
    submitted_subjects = {r.subject: r for r in all_results if r.submitted_at is not None}
    in_progress_subjects = {r.subject: r for r in all_results if r.submitted_at is None}
    
    available_subjects = []
    for p in active_packages:
        status = "available"
        score = None
        started_at = None
        duration = None
        
        # Try to get the default duration from package's first exam — "first" nghĩa là
        # position=0 trong package_exams (bảng trung gian có FK thật, thay cho Package.examIds
        # JSON cũ — xem exam_service/models.py::Package.exam_links).
        first_link_res = await db.execute(
            select(exam_models.PackageExam.exam_id)
            .where(exam_models.PackageExam.package_id == p.id)
            .order_by(exam_models.PackageExam.position)
            .limit(1)
        )
        first_exam_id = first_link_res.scalar_one_or_none()
        if first_exam_id:
            exam_res = await db.execute(select(exam_models.Exam).where(exam_models.Exam.id == first_exam_id))
            first_exam = exam_res.scalar_one_or_none()
            if first_exam:
                duration = first_exam.duration
        
        if p.subject in submitted_subjects:
            status = "submitted"
            score = submitted_subjects[p.subject].score
        elif p.subject in in_progress_subjects:
            res = in_progress_subjects[p.subject]
            if res.started_at:
                status = "in_progress"
            else:
                status = "available"
            # Ensure proper ISO string format with Z to denote UTC, since datetime.utcnow() was used
            started_at = res.started_at.isoformat() + "Z" if res.started_at else None
            
            # Need to get exam duration specifically if different
            if res.exam_id:
                exam_res = await db.execute(select(exam_models.Exam).where(exam_models.Exam.id == res.exam_id))
                exam = exam_res.scalar_one_or_none()
                if exam:
                    duration = exam.duration
            
        available_subjects.append({
            "subject": p.subject,
            "status": status,
            "score": score,
            "started_at": started_at,
            "duration": duration
        })
        
    return {"available_subjects": available_subjects}

@router.post("/me/start-exam")
async def start_exam(candidate_id: str, subject: str, db: AsyncSession = Depends(get_db)):
    """Bắt đầu thi: Chọn 1 đề ngẫu nhiên từ gói đề đang phát của môn thi đó."""
    # Check candidate
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Check if already started or submitted
    existing_res_all = await db.execute(
        select(models.ExamResult)
        .where(models.ExamResult.candidate_id == candidate_id, models.ExamResult.subject == subject)
    )
    results = existing_res_all.scalars().all()
    for res in results:
        if res.submitted_at is not None:
            raise HTTPException(status_code=400, detail="Bạn đã hoàn thành bài thi môn này.")
        else:
            return {"message": "Already started", "exam_id": res.exam_id, "result_id": res.id}

    # Find active package for the subject
    pkg_result = await db.execute(
        select(exam_models.Package)
        .where(exam_models.Package.status == "active", exam_models.Package.subject == subject)
    )
    package = pkg_result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail=f"Không có gói đề nào đang phát cho môn {subject}")

    # Đọc danh sách đề từ bảng trung gian package_exams (FK thật, thay cho Package.examIds JSON cũ).
    exam_ids_res = await db.execute(
        select(exam_models.PackageExam.exam_id)
        .where(exam_models.PackageExam.package_id == package.id)
        .order_by(exam_models.PackageExam.position)
    )
    exam_ids = list(exam_ids_res.scalars().all())

    if not exam_ids:
        raise HTTPException(status_code=400, detail="Gói đề này không chứa đề thi nào.")

    # Randomly pick an exam
    chosen_exam_id = random.choice(exam_ids)

    # Create ExamResult
    new_result = models.ExamResult(
        id=f"res-{uuid.uuid4().hex[:8]}",
        candidate_id=candidate_id,
        package_id=package.id,
        exam_id=chosen_exam_id,
        subject=subject
        # started_at will be set when candidate clicks "Bắt đầu làm bài"
    )
    db.add(new_result)
    
    candidate.status = "in_progress"
    await db.commit()
    
    return {
        "success": True,
        "message": "Đã tạo phiên thi thành công",
        "exam_id": chosen_exam_id,
        "result_id": new_result.id
    }

@router.post("/me/confirm-start")
async def confirm_start(result_id: str, db: AsyncSession = Depends(get_db)):
    """Xác nhận bắt đầu làm bài để tính giờ thi."""
    result = await db.execute(select(models.ExamResult).where(models.ExamResult.id == result_id))
    exam_result = result.scalar_one_or_none()
    
    if not exam_result:
        raise HTTPException(status_code=404, detail="Exam result not found")
        
    if not exam_result.started_at:
        exam_result.started_at = datetime.utcnow()
        await db.commit()
    
    return {
        "success": True,
        "message": "Exam officially started", 
        "started_at": exam_result.started_at.isoformat() + "Z"
    }

@router.get("/me/exam-info")
async def get_exam_info(candidate_id: str, subject: str, db: AsyncSession = Depends(get_db)):
    """Lấy thông tin bài thi hiện tại và chi tiết đề thi theo môn."""
    # pyrefly: ignore [missing-import]
    from sqlalchemy.orm import joinedload
    res_result = await db.execute(
        select(models.ExamResult)
        .options(joinedload(models.ExamResult.candidate))
        .where(models.ExamResult.candidate_id == candidate_id, models.ExamResult.subject == subject)
        .order_by(models.ExamResult.started_at.desc())
    )
    exam_result = res_result.scalars().first()
    if not exam_result:
        raise HTTPException(status_code=404, detail="Exam result not found. You must start exam first.")
        
    e_result = await db.execute(select(exam_models.Exam).where(exam_models.Exam.id == exam_result.exam_id))
    exam = e_result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    q_result = await db.execute(
        select(exam_models.Question, exam_models.QuestionType)
        .outerjoin(exam_models.QuestionType, exam_models.Question.type_id == exam_models.QuestionType.id)
        .where(exam_models.Question.exam_id == exam.id)
        .order_by(exam_models.Question.line_number.asc())
    )
    questions_rows = q_result.all()
    questions_list = []
    
    for row in questions_rows:
        q = row.Question
        q_type = row.QuestionType
        
        parsed_options = []
        if q.options:
            try:
                parsed_options = json.loads(q.options)
            except:
                pass

        parsed_statements = []
        if q.statements:
            try:
                parsed_statements = json.loads(q.statements)
            except:
                pass
        
        type_name = q_type.name if q_type else "Phần chung"
        type_code = q_type.code if q_type else ""

        questions_list.append({
            "id": q.id,
            "part": type_name,
            "type_code": type_code,
            "content": q.content,
            "options": parsed_options,
            "statements": parsed_statements,
            "correct_answer": q.correct_answer,
            "line_number": q.line_number
        })
            
    return {
        "exam": exam,
        "questions": questions_list,
        "result_info": {
            "id": exam_result.id,
            "started_at": exam_result.started_at.isoformat() + "Z" if exam_result.started_at else None,
            "answers_json": exam_result.answers_json
        },
        "candidate_info": {
            "id": exam_result.candidate.id,
            "username": exam_result.candidate.username,
            "fullName": exam_result.candidate.full_name,
            "dob": exam_result.candidate.dob,
            "gender": exam_result.candidate.gender,
        }
    }

@router.post("/submit-draft")
async def submit_draft(result_id: str, payload: schemas.SubmitDraftRequest, db: AsyncSession = Depends(get_db)):
    """(Auto-save) Lưu tạm đáp án của thí sinh khi họ đang làm bài."""
    result = await db.execute(select(models.ExamResult).where(models.ExamResult.id == result_id))
    exam_result = result.scalar_one_or_none()
    
    if not exam_result:
        raise HTTPException(status_code=404, detail="Exam result not found")
        
    exam_result.answers_json = payload.answers_json
    await db.commit()
    return {"message": "Draft saved"}

@router.post("/submit-final")
async def submit_final(result_id: str, payload: schemas.SubmitFinalRequest, db: AsyncSession = Depends(get_db)):
    """Nộp bài chính thức. Trả về kết quả điểm số tức thì."""
    result = await db.execute(select(models.ExamResult).where(models.ExamResult.id == result_id))
    exam_result = result.scalar_one_or_none()
    
    if not exam_result:
        raise HTTPException(status_code=404, detail="Exam result not found")
    
    exam_result.answers_json = payload.answers_json
    exam_result.submitted_at = datetime.utcnow()
        
    # Calculate real score
    total_correct = 0
    total_questions = 0
    detailed_results = []
    
    if exam_result.exam_id:
        # Find subject config
        subject_cat_result = await db.execute(
            select(exam_models.SubjectCategory).where(exam_models.SubjectCategory.code == exam_result.subject)
        )
        subject_cat = subject_cat_result.scalar_one_or_none()
        
        config = None
        if subject_cat:
            config_result = await db.execute(
                select(exam_models.SubjectConfig).where(exam_models.SubjectConfig.subject_id == subject_cat.id)
            )
            config = config_result.scalar_one_or_none()
            
        q_result = await db.execute(
            select(exam_models.Question, exam_models.QuestionType)
            .outerjoin(exam_models.QuestionType, exam_models.Question.type_id == exam_models.QuestionType.id)
            .where(exam_models.Question.exam_id == exam_result.exam_id)
        )
        questions_rows = q_result.all()
        total_questions = len(questions_rows)
        
        try:
            answers_dict = json.loads(payload.answers_json)
        except Exception:
            answers_dict = {}
        total_score = 0.0
        
        import re
        import html
        
        def clean_html(text):
            if not text:
                return ""
            text = str(text)
            text = re.sub(r'<[^>]+>', '', text)
            text = html.unescape(text)
            text = re.sub(r'[\u200b\u200c\u200d\ufeff]', '', text)
            return text.strip()

        def parse_ds(ans_str):
            ans_str = clean_html(ans_str)
            parts = str(ans_str).split(",")
            res = {}
            for p in parts:
                p = p.strip()
                m = re.match(r'^(\d+)\.\s*(đúng|sai)$', p, re.IGNORECASE)
                if m:
                    res[m.group(1)] = m.group(2).lower()
            return res

        for row in questions_rows:
            q = row.Question
            q_type = row.QuestionType
            
            user_ans = answers_dict.get(str(q.id))
            type_code = q_type.code.upper() if q_type and q_type.code else ""
            
            if not user_ans or not q.correct_answer:
                detailed_results.append({
                    "question_id": q.id,
                    "user_answer": user_ans or "",
                    "correct_answer": clean_html(q.correct_answer) if q.correct_answer else "",
                    "is_correct": False,
                    "type_code": type_code
                })
                continue
                
            part = None
            if config:
                if q.type_id == config.type_id_p1:
                    part = "p1"
                elif q.type_id == config.type_id_p2:
                    part = "p2"
                elif q.type_id == config.type_id_p3:
                    part = "p3"
            
            is_ds = type_code in ["DS", "TRUE_FALSE"]
            is_short_answer = type_code in ["TLN", "SHORT_ANSWER"] or (q_type and "ngắn" in q_type.name.lower())
            
            q_detailed_result = {
                "question_id": q.id,
                "user_answer": str(user_ans),
                "correct_answer": clean_html(q.correct_answer),
                "is_correct": False,
                "type_code": type_code
            }
            
            if is_ds:
                user_ds = parse_ds(user_ans)
                correct_ds = parse_ds(q.correct_answer)
                
                match_count = 0
                for k, v in correct_ds.items():
                    if user_ds.get(k) == v:
                        match_count += 1
                        
                if match_count > 0:
                    total_correct += 1 
                
                if match_count == len(correct_ds) and len(correct_ds) > 0:
                    q_detailed_result["is_correct"] = True
                    
                points = 0.0
                if config:
                    pts = [0, 0, 0, 0, 0]
                    if part == "p1":
                        pts = [0, config.points_for_1_correct_idea_p1, config.points_for_2_correct_idea_p1, config.points_for_3_correct_idea_p1, config.points_for_4_correct_idea_p1]
                    elif part == "p2":
                        pts = [0, config.points_for_1_correct_idea_p2, config.points_for_2_correct_idea_p2, config.points_for_3_correct_idea_p2, config.points_for_4_correct_idea_p2]
                    elif part == "p3":
                        pts = [0, config.points_for_1_correct_idea_p3, config.points_for_2_correct_idea_p3, config.points_for_3_correct_idea_p3, config.points_for_4_correct_idea_p3]
                        
                    if match_count < len(pts):
                        val = pts[match_count]
                        points = float(val) if val is not None else 0.0
                    else:
                        val = pts[-1]
                        points = float(val) if val is not None else 0.0
                else:
                    points = match_count * 0.25 
                
                total_score += points
                
            elif is_short_answer:
                u_ans = clean_html(user_ans).lower()
                c_ans = clean_html(q.correct_answer).lower()
                if u_ans == c_ans:
                    total_correct += 1
                    q_detailed_result["is_correct"] = True
                    if config:
                        if part == "p1": total_score += float(config.points_for_a_correct_answers_p1 or 0)
                        elif part == "p2": total_score += float(config.points_for_a_correct_answers_p2 or 0)
                        elif part == "p3": total_score += float(config.points_for_a_correct_answers_p3 or 0)
                    else:
                        total_score += 1.0 
            else:
                correct_letter = None
                if q.options and q.correct_answer:
                    try:
                        opts = json.loads(q.options) if isinstance(q.options, str) else q.options
                        if isinstance(opts, list):
                            clean_correct = clean_html(q.correct_answer).lower()
                            for i, opt in enumerate(opts):
                                if clean_html(opt).lower() == clean_correct:
                                    correct_letter = chr(65 + i)
                                    break
                    except Exception:
                        pass
                
                u_ans = str(user_ans).strip().upper()
                is_correct = False
                
                if correct_letter:
                    q_detailed_result["correct_answer"] = correct_letter
                    if u_ans == correct_letter:
                        is_correct = True
                else:
                    if clean_html(user_ans).lower() == clean_html(q.correct_answer).lower():
                        is_correct = True

                if is_correct:
                    q_detailed_result["is_correct"] = True
                    total_correct += 1
                    if config:
                        if part == "p1": total_score += float(config.points_for_a_correct_answers_p1 or 0)
                        elif part == "p2": total_score += float(config.points_for_a_correct_answers_p2 or 0)
                        elif part == "p3": total_score += float(config.points_for_a_correct_answers_p3 or 0)
                    else:
                        total_score += 1.0 

            detailed_results.append(q_detailed_result)

        if config:
            exam_result.score = round(total_score, 2)
        else:
            exam_result.score = round((total_correct / total_questions) * 10, 2) if total_questions > 0 else 0
            
    exam_result.total_correct = total_correct
    exam_result.total_questions = total_questions
    
    # Update candidate status if needed (could be "submitted" but what if multiple subjects?)
    cand_res = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == exam_result.candidate_id))
    cand = cand_res.scalar_one_or_none()
    if cand:
        cand.status = "submitted"
    
    await db.commit()
    await db.refresh(exam_result)
    
    return {
        "success": True,
        "score": exam_result.score,
        "total_correct": exam_result.total_correct,
        "total_questions": exam_result.total_questions,
        "submitted_at": exam_result.submitted_at,
        "detailed_results": detailed_results
    }
