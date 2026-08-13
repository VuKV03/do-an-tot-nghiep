# pyrefly: ignore [missing-import]
"""
===============================================================================
MODULE: BỘ ROUTE CỔNG THÍ SINH DỰ THI (CANDIDATE EXAM PORTAL)
===============================================================================
Mục đích:
    Cung cấp các API phục vụ cho Thí sinh tham gia kỳ thi trực tuyến:
    1. Đăng nhập hệ thống thi bằng tài khoản được cấp.
    2. Truy vấn danh sách các môn thi khả dụng / đang diễn ra.
    3. Khởi tạo phiên thi: Bốc ngẫu nhiên Gói đề thi và bốc ngẫu nhiên Mã đề thi hoán vị.
    4. Xác nhận tính giờ thi & Tải cấu trúc đề thi + danh sách câu hỏi.
    5. Lưu tạm đáp án tự động (Auto-save draft).
    6. Nộp bài thi chính thức: Tự động chấm điểm (hỗ trợ Trắc nghiệm, Đúng/Sai đa ý, Tự luận ngắn) 
       và trả về kết quả điểm số tức thì.
===============================================================================
"""

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from fastapi.encoders import jsonable_encoder
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select
from datetime import datetime
import json
import random
import uuid

from backend.shared.database import get_db
from backend.quanlythi_service import models, schemas
from backend.de_thi_service import models as exam_models
# Note: Trong hệ thống thực tế, bạn sẽ xác thực JWT token từ auth_service thông qua Dependency
# from backend.auth_service.dependencies import get_current_user

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════════
# PHÂN HỆ 1: ĐĂNG NHẬP THÍ SINH (CANDIDATE AUTHENTICATION)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/auth/login")
async def login_candidate(credentials: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    API: Đăng nhập dành cho thí sinh dự thi.
    
    Luồng xử lý:
    1. Truy vấn thông tin thí sinh theo `username`, nạp sẵn danh sách môn thi đăng ký (`joinedload(ExamCandidate.subjects)`).
    2. Xác thực mật khẩu (trong môi trường mẫu so sánh chuỗi trực tiếp).
    3. Trả về Access Token với scope dành riêng cho thí sinh và thông tin sơ lược tài khoản.
    """
    # pyrefly: ignore [missing-import]
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        select(models.ExamCandidate)
        .options(joinedload(models.ExamCandidate.subjects))
        .where(models.ExamCandidate.username == credentials.username)
    )
    candidate = result.unique().scalar_one_or_none()
    
    if not candidate or candidate.password_hash != credentials.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu không chính xác"
        )
        
    return {
        "access_token": f"fake-token-candidate-{candidate.id}",
        "token_type": "bearer",
        "candidate": {
            "id": candidate.id,
            "username": candidate.username,
            "full_name": candidate.full_name,
            "student_code": candidate.student_code
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PHÂN HỆ 2: TRUY VẤN MÔN THI KHẢ DỤNG (AVAILABLE SUBJECTS & STATUS)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/me/available-subjects")
async def get_available_subjects(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """
    API: Lấy danh sách các môn thi mà thí sinh đăng ký VÀ đang có gói đề thi active được phát.
    """
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

    # Tìm các gói đề đang active thuộc các môn học thí sinh đăng ký
    pkg_result = await db.execute(
        select(exam_models.Package)
        .where(exam_models.Package.status == "active")
        .where(exam_models.Package.subject.in_(registered_subjects))
    )
    active_packages = pkg_result.scalars().all()
    
    # Nhóm các gói đề active theo từng môn thi
    packages_by_subject = {}
    for p in active_packages:
        if p.subject not in packages_by_subject:
            packages_by_subject[p.subject] = []
        packages_by_subject[p.subject].append(p)
    
    # Kiểm tra trạng thái nộp bài / làm bài của thí sinh
    res_result = await db.execute(
        select(models.ExamResult)
        .where(models.ExamResult.candidate_id == candidate_id)
    )
    user_results = res_result.scalars().all()
    results_map = {r.subject: r for r in user_results}

    response_data = []

    for subject_name in registered_subjects:
        pkgs = packages_by_subject.get(subject_name, [])
        if not pkgs:
            continue
            
        result_obj = results_map.get(subject_name)
        
        # Mặc định lấy thời lượng làm bài từ gói đề thi đầu tiên
        duration = 60
        first_pkg = pkgs[0]
        ex_result = await db.execute(
            select(exam_models.Exam)
            .where(exam_models.Exam.package_id == first_pkg.id)
            .limit(1)
        )
        sample_exam = ex_result.scalars().first()
        if sample_exam and sample_exam.duration_minutes:
            duration = sample_exam.duration_minutes

        max_score = await _get_max_score_for_subject_name(db, subject_name)

        if result_obj:
            if result_obj.status == "submitted":
                response_data.append({
                    "subject": subject_name,
                    "status": "submitted",
                    "score": result_obj.score,
                    "max_score": max_score,
                    "duration": duration,
                    "submitted_at": result_obj.submitted_at.isoformat() if result_obj.submitted_at else None
                })
            else:
                response_data.append({
                    "subject": subject_name,
                    "status": "in_progress",
                    "result_id": result_obj.id,
                    "exam_id": result_obj.exam_id,
                    "duration": duration,
                    "started_at": result_obj.started_at.isoformat() if result_obj.started_at else None
                })
        else:
            response_data.append({
                "subject": subject_name,
                "status": "available",
                "duration": duration
            })

    return {"available_subjects": response_data}


# ═══════════════════════════════════════════════════════════════════════════════
# PHÂN HỆ 3: KHỞI TẠO PHIÊN THI (START EXAM SESSION & RANDOM EXAM ALLOCATION)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/me/start-exam")
async def start_exam(payload: schemas.StartExamRequest, db: AsyncSession = Depends(get_db)):
    """
    API: Thí sinh bắt đầu môn thi (Khởi tạo bản ghi `ExamResult` và bốc ngẫu nhiên đề thi).
    """
    res_result = await db.execute(
        select(models.ExamResult)
        .where(models.ExamResult.candidate_id == payload.candidate_id, models.ExamResult.subject == payload.subject)
    )
    existing_result = res_result.scalars().first()
    
    if existing_result:
        if existing_result.status == "submitted":
            raise HTTPException(status_code=400, detail="Bạn đã nộp bài thi môn này rồi.")
        return {
            "success": True,
            "message": "Tiếp tục phiên thi hiện tại",
            "exam_id": existing_result.exam_id,
            "result_id": existing_result.id
        }

    # Bốc ngẫu nhiên Gói đề active
    pkg_result = await db.execute(
        select(exam_models.Package)
        .where(exam_models.Package.subject == payload.subject, exam_models.Package.status == "active")
    )
    active_pkgs = pkg_result.scalars().all()
    if not active_pkgs:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói đề thi active nào cho môn học này")
    
    chosen_pkg = random.choice(active_pkgs)

    # Bốc ngẫu nhiên Mã đề thi trong gói đề
    exam_result = await db.execute(
        select(exam_models.Exam).where(exam_models.Exam.package_id == chosen_pkg.id)
    )
    exams_in_pkg = exam_result.scalars().all()
    if not exams_in_pkg:
        raise HTTPException(status_code=404, detail="Gói đề thi này chưa có đề thi nào")
    
    chosen_exam = random.choice(exams_in_pkg)
    chosen_exam_id = chosen_exam.id

    # Tạo bản ghi kết quả thi mới
    new_result = models.ExamResult(
        candidate_id=payload.candidate_id,
        subject=payload.subject,
        exam_id=chosen_exam_id,
        status="in_progress",
        answers_json="{}"
    )
    db.add(new_result)
    await db.commit()
    await db.refresh(new_result)

    return {
        "success": True,
        "message": "Đã tạo phiên thi thành công",
        "exam_id": chosen_exam_id,
        "result_id": new_result.id
    }

@router.post("/me/confirm-start")
async def confirm_start(result_id: str, db: AsyncSession = Depends(get_db)):
    """
    API: Xác nhận chính thức bắt đầu làm bài.
    """
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


# ═══════════════════════════════════════════════════════════════════════════════
# PHÂN HỆ 4: TẢI ĐỀ THI VÀ NỘP BÀI TẠM THỜI (EXAM DETAILS & AUTO-SAVE DRAFT)
# ═══════════════════════════════════════════════════════════════════════════════
=======
async def _get_max_score_for_subject_name(db: AsyncSession, subject_name: str) -> float:
    """Điểm tối đa THẬT của môn thi — lấy đúng thang điểm (scale) trong Cấu hình môn học của môn đó,
    cùng nguồn dữ liệu mà submit_final() cũng dùng để chấm điểm (xem bên dưới) và exams.py::
    _get_matrix_name_and_score dùng cho tab Quản lý đề gốc — nhất quán 1 nguồn "điểm tối đa" toàn hệ
    thống. Mặc định 10.0 nếu môn chưa có Cấu hình môn học/chưa set scale.
    `.limit(1)` + `.scalars().first()` thay vì `scalar_one_or_none()` — subject_categories.name và
    subject_configs.subject_id đều KHÔNG có ràng buộc unique, khớp lỗi đã sửa ở exams.py."""
    subject_cat_result = await db.execute(
        select(exam_models.SubjectCategory).where(exam_models.SubjectCategory.name == subject_name).limit(1)
    )
    subject_cat = subject_cat_result.scalars().first()
    if not subject_cat:
        return 10.0
    config_result = await db.execute(
        select(exam_models.SubjectConfig).where(exam_models.SubjectConfig.subject_id == subject_cat.id).limit(1)
    )
    config = config_result.scalars().first()
    return float(config.scale) if (config and config.scale is not None) else 10.0


@router.get("/me/exam-info")
async def get_exam_info(candidate_id: str, subject: str, db: AsyncSession = Depends(get_db)):
    """
    API: Lấy thông tin chi tiết đề thi và danh sách câu hỏi cho Thí sinh.
    
    Luồng xử lý:
    1. Lấy kết quả thi hiện tại (`ExamResult`) của thí sinh đối với môn học.
    2. Đọc thông tin Đề thi (`Exam`) và tải danh sách các Câu hỏi (`Question`) kèm Loại câu hỏi (`QuestionType`).
    3. Giải mã JSON các lựa chọn trắc nghiệm (`options`) và ý mệnh đề Đúng/Sai (`statements`).
    4. Trả về toàn bộ cấu trúc câu hỏi, thời gian bắt đầu và nháp đáp án đã lưu trước đó (nếu có).
    """
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

    # Truy vấn danh sách câu hỏi của đề thi theo thứ tự dòng
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
        
        # Parse JSON các phương án trắc nghiệm
        parsed_options = []
        if q.options:
            try:
                parsed_options = json.loads(q.options)
            except:
                pass

        # Parse JSON các mệnh đề Đúng/Sai
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

    # Nhúng thêm "maxScore" (điểm tối đa thật của đề) vào object exam trả về — Exam model không có sẵn
    # cột này (điểm tối đa vốn không lưu trực tiếp trên exams, chỉ suy ra được qua Cấu hình môn học/ma
    # trận — xem exams.py), nên phải tự tính rồi gắn thêm trước khi trả JSON, thay vì để FE tự hardcode
    # "10" như trước (ExamPortal.tsx: màn "Chờ vào thi" > "Điểm tối đa").
    _, max_score = await _get_matrix_name_and_score(db, exam, [row.Question for row in questions_rows])
    exam_dict = jsonable_encoder(exam)
    exam_dict["maxScore"] = max_score

    return {
        "exam": exam_dict,
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
    """
    API: Lưu tạm đáp án (Auto-save Draft).
    Cập nhật dữ liệu `answers_json` liên tục khi thí sinh thao tác chọn đáp án trên giao diện làm bài.
    """
    result = await db.execute(select(models.ExamResult).where(models.ExamResult.id == result_id))
    exam_result = result.scalar_one_or_none()
    
    if not exam_result:
        raise HTTPException(status_code=404, detail="Exam result not found")
        
    exam_result.answers_json = payload.answers_json
    await db.commit()
    return {"message": "Draft saved"}


# ═══════════════════════════════════════════════════════════════════════════════
# PHÂN HỆ 5: NỘP BÀI THI CHÍNH THỨC VÀ TỰ ĐỘNG CHẤM ĐIỂM (SUBMIT & AUTO-GRADING)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/submit-final")
async def submit_final(result_id: str, payload: schemas.SubmitFinalRequest, db: AsyncSession = Depends(get_db)):
    """
    API: Nộp bài thi chính thức và thực hiện tự động chấm điểm bài làm.
    
    Thuật toán chấm điểm:
    1. Lưu toàn bộ đáp án cuối cùng (`answers_json`) và ghi nhận thời gian nộp (`submitted_at`).
    2. Tra cứu cấu hình thang điểm môn học (`SubjectConfig`) nếu có.
    3. Duyệt qua từng câu hỏi và chấm điểm theo dạng câu hỏi:
       - **Trắc nghiệm Đúng/Sai (DS / TRUE_FALSE)**: Phân tích số ý trả lời đúng (1 ý, 2 ý, 3 ý, 4 ý) 
         và cộng điểm lũy tiến theo cấu hình `points_for_X_correct_idea`.
       - **Tự luận ngắn / Điền từ (TLN / SHORT_ANSWER)**: Làm sạch HTML/ký tự ẩn và so sánh chuỗi đáp án.
       - **Trắc nghiệm khoanh chọn (MCQ A/B/C/D)**: Chuyển đổi chỉ số phương án sang chữ cái (A, B, C, D) 
         hoặc so sánh văn bản đáp án đúng.
    4. Tính tổng điểm hệ 10 và số câu trả lời chính xác.
    5. Cập nhật trạng thái thí sinh thành `submitted`.
    6. Kiểm tra cờ cho phép xem kết quả (`is_show_result`) của Gói đề thi để trả về kết quả chi tiết hoặc chỉ báo nộp thành công.
    """
    result = await db.execute(select(models.ExamResult).where(models.ExamResult.id == result_id))
    exam_result = result.scalar_one_or_none()
    
    if not exam_result:
        raise HTTPException(status_code=404, detail="Exam result not found")
    
    exam_result.answers_json = payload.answers_json
    exam_result.submitted_at = datetime.utcnow()
        
    # Khởi tạo các biến đếm và danh sách chi tiết chấm điểm
    total_correct = 0
    total_questions = 0
    detailed_results = []
    max_score = 10.0

    if exam_result.exam_id:
        # Tra cứu cấu hình điểm của môn thi từ exam_service
        subject_cat_result = await db.execute(
            select(exam_models.SubjectCategory).where(exam_models.SubjectCategory.code == exam_result.subject)
        )
        subject_cat = subject_cat_result.scalar_one_or_none()
        
        config = None
        if subject_cat:
            # .limit(1) + .scalars().first() — subject_configs.subject_id KHÔNG có ràng buộc unique,
            # scalar_one_or_none() có thể raise MultipleResultsFound nếu khớp hơn 1 dòng (cùng lớp lỗi
            # đã sửa ở exams.py::_get_matrix_name_and_score).
            config_result = await db.execute(
                select(exam_models.SubjectConfig).where(exam_models.SubjectConfig.subject_id == subject_cat.id).limit(1)
            )
            config = config_result.scalars().first()
            
        # Truy vấn toàn bộ câu hỏi và loại câu hỏi của đề thi này
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
        
        # Hàm làm sạch HTML và các ký tự ẩn unicode đặc biệt trong chuỗi đáp án
        def clean_html(text):
            if not text:
                return ""
            text = str(text)
            text = re.sub(r'<[^>]+>', '', text)
            text = html.unescape(text)
            text = re.sub(r'[\u200b\u200c\u200d\ufeff]', '', text)
            return text.strip()

        # Hàm tách chuỗi đáp án Đúng/Sai dạng "1. đúng, 2. sai, ..." thành Dictionary
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

        # Duyệt từng câu hỏi để chấm điểm
        for row in questions_rows:
            q = row.Question
            q_type = row.QuestionType
            
            user_ans = answers_dict.get(str(q.id))
            type_code = q_type.code.upper() if q_type and q_type.code else ""
            
            # Xử lý trường hợp thí sinh bỏ trống câu hỏi hoặc đề thi không có đáp án đúng
            if not user_ans or not q.correct_answer:
                detailed_results.append({
                    "question_id": q.id,
                    "user_answer": user_ans or "",
                    "correct_answer": clean_html(q.correct_answer) if q.correct_answer else "",
                    "is_correct": False,
                    "type_code": type_code
                })
                continue
                
            # Xác định phần (Phần 1, Phần 2, Phần 3) theo loại câu hỏi
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
            
            # --- DẠNG 1: TRẮC NGHIỆM ĐÚNG / SAI ---
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
                
            # --- DẠNG 2: TỰ LUẬN NGẮN / ĐIỀN TỪ ---
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
                        
            # --- DẠNG 3: TRẮC NGHIỆM CHỌN 1 ĐÁP ÁN (MCQ) ---
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

        # Quyết định tổng điểm chính thức
        if config:
            exam_result.score = round(total_score, 2)
        else:
            exam_result.score = round((total_correct / total_questions) * 10, 2) if total_questions > 0 else 0

        # Điểm tối đa THẬT của đề (ưu tiên matrix.totalScore, rồi Σ điểm từng câu theo Cấu hình môn
        # học, cuối cùng mới scale/mặc định 10) — dùng lại ĐÚNG hàm exams.py đang dùng cho tab "Quản lý
        # đề gốc", để "X / max_score" hiển thị cho thí sinh khớp 100% với điểm tối đa đã thấy ở đó
        # (trước đây tự tính riêng chỉ theo `scale` chung của môn, sai với đề có điểm tối đa khác scale).
        exam_row_result = await db.execute(select(exam_models.Exam).where(exam_models.Exam.id == exam_result.exam_id))
        exam_row = exam_row_result.scalar_one_or_none()
        if exam_row:
            _, max_score = await _get_matrix_name_and_score(db, exam_row, [row.Question for row in questions_rows])
            
    exam_result.total_correct = total_correct
    exam_result.total_questions = total_questions
    
    # Cập nhật trạng thái của thí sinh thành `submitted`
    cand_res = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == exam_result.candidate_id))
    cand = cand_res.scalar_one_or_none()
    if cand:
        cand.status = "submitted"
    
    # Kiểm tra cấu hình xem bài thi (`is_show_result`) của Gói đề
    is_show_result = True
    if exam_result.package_id:
        package_res = await db.execute(select(exam_models.Package).where(exam_models.Package.id == exam_result.package_id))
        package = package_res.scalar_one_or_none()
        if package and hasattr(package, 'is_show_result'):
            is_show_result = package.is_show_result if package.is_show_result is not None else True
            
    await db.commit()
    await db.refresh(exam_result)
    
    res_data = {
        "success": True,
        "submitted_at": exam_result.submitted_at,
        "is_show_result": is_show_result,
        "score": exam_result.score,
        "max_score": max_score,
        "total_correct": exam_result.total_correct,
        "total_questions": exam_result.total_questions
    }
    
    if is_show_result:
        res_data["detailed_results"] = detailed_results
        
    return res_data

