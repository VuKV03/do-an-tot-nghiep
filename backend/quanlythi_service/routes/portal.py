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
    submitted_subjects = set(r.subject for r in all_results if r.submitted_at is not None)
    in_progress_subjects = set(r.subject for r in all_results if r.submitted_at is None)
    
    available_subjects = []
    for p in active_packages:
        status = "available"
        if p.subject in submitted_subjects:
            status = "submitted"
        elif p.subject in in_progress_subjects:
            status = "in_progress"
            
        available_subjects.append({
            "subject": p.subject,
            "status": status
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

    exam_ids = []
    if package.examIds:
        try:
            exam_ids = json.loads(package.examIds)
        except:
            pass

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
        subject=subject,
        started_at=datetime.utcnow()
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
            "correct_answer": q.correct_answer
        })
            
    return {
        "exam": exam,
        "questions": questions_list,
        "result_info": {
            "id": exam_result.id,
            "started_at": exam_result.started_at,
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
    
    if exam_result.exam_id:
        q_result = await db.execute(select(exam_models.Question).where(exam_models.Question.exam_id == exam_result.exam_id))
        questions = q_result.scalars().all()
        total_questions = len(questions)
        
        try:
            answers_dict = json.loads(payload.answers_json)
        except Exception:
            answers_dict = {}
            
        for q in questions:
            user_ans = answers_dict.get(str(q.id))
            if user_ans and q.correct_answer:
                if str(user_ans).strip().lower() == str(q.correct_answer).strip().lower():
                    total_correct += 1
                
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
        "submitted_at": exam_result.submitted_at
    }
