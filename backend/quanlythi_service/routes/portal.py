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
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select
from datetime import datetime
import json

from backend.shared.database import get_db
from backend.quanlythi_service import models, schemas
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


# ═══════════════════════════════════════════════════════════════════════════════
# PHÂN HỆ 2: TRA CỨU MÔN THI KHẢ DỤNG (AVAILABLE SUBJECTS)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/me/available-subjects")
async def get_available_subjects(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """
    API: Lấy danh sách các môn thi mà thí sinh đăng ký VÀ đang có gói đề thi active được phát.
    
    Luồng xử lý:
    1. Kiểm tra hồ sơ thí sinh và danh sách môn học đã đăng ký.
    2. Tìm các Gói đề thi (`Package`) đang ở trạng thái "active" của các môn học đó.
    3. Gom nhóm gói đề theo từng môn thi.
    4. Kiểm tra lịch sử bài làm của thí sinh (`ExamResult`):
       - Trạng thái `submitted`: Thí sinh đã nộp bài (kèm điểm số).
       - Trạng thái `in_progress`: Thí sinh đang trong tiến trình làm bài.
       - Trạng thái `available`: Thí sinh có thể bắt đầu thi.
    5. Đọc thời lượng làm bài (`duration`) từ đề thi mẫu trong gói đề và trả về danh sách cho Client.
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
    all_results = res_result.scalars().all()
    submitted_subjects = {r.subject: r for r in all_results if r.submitted_at is not None}
    in_progress_subjects = {r.subject: r for r in all_results if r.submitted_at is None}
    
    available_subjects = []
    for subj_name, pkgs in packages_by_subject.items():
        status = "available"
        score = None
        started_at = None
        duration = None
        
        # Lấy gói đề đầu tiên làm mặc định để đọc thời lượng thi
        p = pkgs[0]
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
        
        # Đánh giá trạng thái làm bài của thí sinh đối với môn thi này
        if subj_name in submitted_subjects:
            status = "submitted"
            score = submitted_subjects[subj_name].score
        elif subj_name in in_progress_subjects:
            res = in_progress_subjects[subj_name]
            if res.started_at:
                status = "in_progress"
            else:
                status = "available"
            started_at = res.started_at.isoformat() + "Z" if res.started_at else None
            
            if res.exam_id:
                exam_res = await db.execute(select(exam_models.Exam).where(exam_models.Exam.id == res.exam_id))
                exam = exam_res.scalar_one_or_none()
                if exam:
                    duration = exam.duration
            
        available_subjects.append({
            "subject": subj_name,
            "status": status,
            "score": score,
            "started_at": started_at,
            "duration": duration
        })
        
    return {"available_subjects": available_subjects}


# ═══════════════════════════════════════════════════════════════════════════════
# PHÂN HỆ 3: BẮT ĐẦU VÀ XÁC NHẬN PHIÊN THI (START EXAM & RANDOMIZATION)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/me/start-exam")
async def start_exam(candidate_id: str, subject: str, db: AsyncSession = Depends(get_db)):
    """
    API: Bắt đầu thi (Phân bổ đề thi ngẫu nhiên).
    
    Thuật toán phân bổ:
    1. Kiểm tra thí sinh và các bài thi đã làm (nếu đã nộp -> chặn; nếu đang làm -> trả về session cũ).
    2. Lấy tất cả gói đề đang phát (`status == 'active'`) của môn thi.
    3. Bốc ngẫu nhiên 1 Gói đề thi (`chosen_package`).
    4. Bốc ngẫu nhiên 1 Mã đề thi hoán vị (`chosen_exam_id`) nằm trong gói đề vừa chọn.
    5. Khởi tạo bản ghi `ExamResult` mới và cập nhật trạng thái thí sinh thành `in_progress`.
    """
    # Kiểm tra tồn tại thí sinh
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Kiểm tra xem bài thi môn này đã được bắt đầu hoặc nộp hay chưa
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

    # Tìm tất cả các gói đề đang active của môn thi
    pkg_result = await db.execute(
        select(exam_models.Package)
        .where(exam_models.Package.status == "active", exam_models.Package.subject == subject)
    )
    active_packages = pkg_result.scalars().all()
    if not active_packages:
        raise HTTPException(status_code=404, detail=f"Không có gói đề nào đang phát cho môn {subject}")

    # 1. Bốc ngẫu nhiên 1 gói đề trong các gói đề đang phát của môn thi này
    chosen_package = random.choice(active_packages)

    # 2. Đọc danh sách đề từ bảng trung gian package_exams của gói đề đã chọn
    exam_ids_res = await db.execute(
        select(exam_models.PackageExam.exam_id)
        .where(exam_models.PackageExam.package_id == chosen_package.id)
        .order_by(exam_models.PackageExam.position)
    )
    exam_ids = list(exam_ids_res.scalars().all())

    if not exam_ids:
        raise HTTPException(status_code=400, detail=f"Gói đề '{chosen_package.name}' không chứa đề thi nào.")

    # 3. Bốc ngẫu nhiên 1 mã đề thi hoán vị trong gói đề đã chọn
    chosen_exam_id = random.choice(exam_ids)

    # Tạo bản ghi kết quả thi mới trong CSDL
    new_result = models.ExamResult(
        id=f"res-{uuid.uuid4().hex[:8]}",
        candidate_id=candidate_id,
        package_id=chosen_package.id,
        exam_id=chosen_exam_id,
        subject=subject
        # started_at sẽ được ghi nhận khi thí sinh nhấn nút "Bắt đầu làm bài" ở Frontend
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
    """
    API: Xác nhận chính thức bắt đầu làm bài.
    Cập nhật mốc thời gian `started_at` (UTC) vào bản ghi bài thi để bắt đầu đếm ngược thời gian làm bài.
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
    
    if exam_result.exam_id:
        # Tra cứu cấu hình điểm của môn thi từ exam_service
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
        "total_correct": exam_result.total_correct,
        "total_questions": exam_result.total_questions
    }
    
    if is_show_result:
        res_data["detailed_results"] = detailed_results
        
    return res_data

