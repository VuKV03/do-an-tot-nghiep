# pyrefly: ignore [missing-import]
"""
===============================================================================
MODULE: BỘ ROUTE QUẢN TRỊ THI TRỰC TUYẾN (ADMIN EXAM ROUTES)
===============================================================================
Mục đích:
    Cung cấp các API dành cho Quản trị viên / Cán bộ quản lý thi để thực hiện:
    1. Quản lý hồ sơ thí sinh (Thêm danh sách, xem, cập nhật, xóa thí sinh).
    2. Cho phép reset điểm môn thi để thí sinh thi lại.
    3. Tra cứu lịch sử thi chi tiết của thí sinh (Quick View History).
    4. Thống kê và báo cáo kết quả thi theo toàn hệ thống hoặc theo từng Gói đề thi.
===============================================================================
"""

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, delete
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import selectinload, joinedload
from typing import List
import uuid

from backend.shared.database import get_db
from backend.quanlythi_service import models, schemas
# Note: Trong hệ thống thực tế, bạn sẽ xác thực JWT token từ auth_service thông qua Dependency
# from backend.auth_service.dependencies import get_current_user

router = APIRouter()


# ─── HÀM TRỢ GIÚP (HELPERS): CHUYỂN ĐỔI ORM MODEL SANG DICTIONARY ─────────────

def _candidate_to_dict(c: models.ExamCandidate) -> dict:
    """
    Chuyển đổi đối tượng ORM ExamCandidate thành dictionary.
    Giúp tránh các lỗi Lazy-Loading trong SQLAlchemy Async khi truy vấn danh sách môn học (subjects).
    """
    return {
        "id": c.id,
        "username": c.username,
        "full_name": c.full_name,
        "cccd": c.cccd,
        "gender": c.gender,
        "dob": c.dob,
        "note": c.note,
        "subjects": [s.subject_name for s in c.subjects] if getattr(c, 'subjects', None) else []
    }

def _result_to_dict(r: models.ExamResult) -> dict:
    """
    Chuyển đổi đối tượng ORM ExamResult sang dict thông qua Pydantic Schema ExamResultResponse.
    """
    return schemas.ExamResultResponse.model_validate(r).model_dump()


# ═══════════════════════════════════════════════════════════════════════════════
# PHÂN HỆ 1: QUẢN LÝ THÍ SINH (CANDIDATES MANAGEMENT)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/candidates")
async def add_exam_candidates(candidates: List[schemas.ExamCandidateCreate], db: AsyncSession = Depends(get_db)):
    """
    API: Import hoặc khởi tạo hàng loạt danh sách tài khoản thí sinh dự thi.
    
    Luồng xử lý:
    1. Lặp qua danh sách thí sinh đầu vào từ client.
    2. Tạo bản ghi thí sinh mới `ExamCandidate` với UUID riêng biệt.
    3. Nếu thí sinh có danh sách môn thi được gán, khởi tạo các bản ghi `StudentSubject` liên kết.
    4. Lưu toàn bộ bản ghi mới vào CSDL (Commit).
    5. Refresh dữ liệu quan hệ môn thi và trả về danh sách dưới dạng dictionary.
    """
    new_candidates = []
    for cand_data in candidates:
        # Khởi tạo đối tượng thí sinh
        new_cand = models.ExamCandidate(
            id=str(uuid.uuid4()),
            username=cand_data.username,
            full_name=cand_data.full_name,
            password_hash=cand_data.password, # Lưu ý: Trong môi trường production cần băm password bằng bcrypt
            cccd=cand_data.cccd,
            gender=cand_data.gender,
            dob=cand_data.dob,
            note=cand_data.note,
        )
        db.add(new_cand)
        
        # Thêm danh sách các môn thi được đăng ký cho thí sinh này
        if cand_data.subjects:
            for sub_name in cand_data.subjects:
                new_sub = models.StudentSubject(
                    id=str(uuid.uuid4()),
                    candidate_id=new_cand.id,
                    subject_id=sub_name,
                    subject_name=sub_name
                )
                db.add(new_sub)
                
        new_candidates.append(new_cand)
        
    # Commit tất cả thí sinh và môn thi vào CSDL
    await db.commit()
    
    # Reload lại dữ liệu môn thi để nạp thông tin relationship `subjects`
    for cand in new_candidates:
        await db.refresh(cand, ["subjects"])
    return [_candidate_to_dict(c) for c in new_candidates]


@router.get("/candidates")
async def get_all_candidates(db: AsyncSession = Depends(get_db)):
    """
    API: Lấy danh sách tất cả thí sinh trong hệ thống.
    Sử dụng `selectinload` để tải trước (Eager Load) danh sách môn thi đăng ký của từng thí sinh.
    """
    result = await db.execute(select(models.ExamCandidate).options(selectinload(models.ExamCandidate.subjects)))
    candidates = result.scalars().all()
    return [_candidate_to_dict(c) for c in candidates]


@router.put("/candidates/{candidate_id}")
async def update_exam_candidate(candidate_id: str, candidate_data: schemas.ExamCandidateUpdate, db: AsyncSession = Depends(get_db)):
    """
    API: Cập nhật thông tin chi tiết của một thí sinh.
    
    Luồng xử lý:
    1. Kiểm tra sự tồn tại của thí sinh theo `candidate_id`.
    2. Cập nhật thông tin tài khoản, mật khẩu (nếu có yêu cầu đổi).
    3. Nếu có danh sách môn thi mới: Xóa toàn bộ môn thi cũ của thí sinh và tạo lại danh sách môn thi mới.
    4. Cập nhật các trường thông tin cơ bản khác (Họ tên, CCCD, Ngày sinh, v.v.).
    5. Lưu thay đổi và trả về dữ liệu mới nhất.
    """
    result = await db.execute(
        select(models.ExamCandidate)
        .options(selectinload(models.ExamCandidate.subjects))
        .where(models.ExamCandidate.id == candidate_id)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Exam candidate not found")
    
    update_data = candidate_data.dict(exclude_unset=True)
    
    # Cập nhật mật khẩu nếu client truyền vào mật khẩu mới
    if 'password' in update_data and update_data['password']:
        candidate.password_hash = update_data['password'] # Lưu ý: Cần băm mật khẩu trong thực tế
        del update_data['password']

    # Cập nhật danh sách môn học dự thi
    if 'subjects' in update_data:
        subjects_data = update_data.pop('subjects')
        # Xóa các môn học cũ đã đăng ký của thí sinh
        await db.execute(delete(models.StudentSubject).where(models.StudentSubject.candidate_id == candidate_id))
        
        # Thêm lại danh sách môn học mới
        if subjects_data:
            for sub_name in subjects_data:
                new_sub = models.StudentSubject(
                    id=str(uuid.uuid4()),
                    candidate_id=candidate.id,
                    subject_id=sub_name,
                    subject_name=sub_name
                )
                db.add(new_sub)

    # Cập nhật các thuộc tính còn lại
    for key, value in update_data.items():
        setattr(candidate, key, value)
    
    await db.commit()
    await db.refresh(candidate, ["subjects"])
    return _candidate_to_dict(candidate)


@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_candidate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """
    API: Xóa tài khoản thí sinh.
    
    Lưu ý quan trọng:
    Để tránh lỗi ràng buộc khóa ngoại (Foreign Key Constraint), API thực hiện xóa thủ công 
    tất cả kết quả thi (`ExamResult`) liên quan đến thí sinh này trước khi tiến hành xóa thí sinh.
    """
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Exam candidate not found")
    
    # Xóa tất cả kết quả làm bài của thí sinh này trước
    await db.execute(delete(models.ExamResult).where(models.ExamResult.candidate_id == candidate_id))
    
    # Xóa tài khoản thí sinh
    await db.delete(candidate)
    await db.commit()
    return None


@router.delete("/candidates/{candidate_id}/results/{subject}", status_code=status.HTTP_204_NO_CONTENT)
async def reset_candidate_exam_result(candidate_id: str, subject: str, db: AsyncSession = Depends(get_db)):
    """
    API: Reset (xóa) kết quả thi của thí sinh cho một môn học cụ thể.
    Chức năng này dùng khi Cán bộ quản lý thi muốn hủy bài làm cũ để thí sinh có thể thực hiện thi lại môn đó.
    """
    result = await db.execute(
        select(models.ExamResult)
        .where(models.ExamResult.candidate_id == candidate_id)
        .where(models.ExamResult.subject == subject)
    )
    exam_results = result.scalars().all()
    if not exam_results:
        raise HTTPException(status_code=404, detail="Không tìm thấy kết quả thi cho môn học này")
    
    # Xóa các bản ghi kết quả tìm thấy
    for r in exam_results:
        await db.delete(r)
        
    await db.commit()
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# PHÂN HỆ 2: TRA CỨU LỊCH SỬ THI (CANDIDATE EXAM HISTORY)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/candidates/{candidate_id}/history")
async def get_candidate_history(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """
    API: Xem lịch sử thi chi tiết của một thí sinh (Quick View).
    
    Luồng xử lý:
    1. Xác minh thí sinh có tồn tại trong CSDL hay không.
    2. Lấy tất cả kết quả thi đã hoàn thành (`submitted_at` không NULL) sắp xếp theo thời gian nộp bài mới nhất.
    3. Truy vấn liên kết sang `exam_service` để lấy tên Gói đề (`Package.name`) và Mã đề thi (`Exam.code`).
    4. Tổng hợp thông tin điểm số, số câu đúng, tổng số câu hỏi và phản hồi cho client.
    """
    # 1. Kiểm tra thí sinh tồn tại
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # 2. Lấy danh sách kết quả bài thi đã nộp của thí sinh
    res_result = await db.execute(
        select(models.ExamResult)
        .where(models.ExamResult.candidate_id == candidate_id)
        .where(models.ExamResult.submitted_at.is_not(None))  # Chỉ lấy các bài thi đã hoàn thành nộp bài
        .order_by(models.ExamResult.submitted_at.desc())
    )
    results = res_result.scalars().all()

    # 3. Liên kết tới models của exam_service để lấy tên gói đề và mã đề thi
    from backend.exam_service.models import Package, Exam
    
    history_items = []
    for r in results:
        package_name = "N/A"
        exam_code = "N/A"
        
        # Tra cứu tên gói đề thi
        if r.package_id:
            pkg_res = await db.execute(select(Package).where(Package.id == r.package_id))
            pkg = pkg_res.scalar_one_or_none()
            if pkg:
                package_name = pkg.name
                
        # Tra cứu mã đề thi
        if r.exam_id:
            ex_res = await db.execute(select(Exam).where(Exam.id == r.exam_id))
            ex = ex_res.scalar_one_or_none()
            if ex:
                exam_code = ex.code if ex.code else ex.name

        # Đóng gói đối tượng lịch sử thi
        history_items.append(
            schemas.CandidateHistoryItem(
                id=r.id,
                subject=r.subject or "N/A",
                package_name=package_name,
                exam_code=exam_code,
                submitted_at=r.submitted_at,
                score=r.score,
                total_correct=r.total_correct,
                total_questions=r.total_questions,
            )
        )
        
    return schemas.CandidateHistoryResponse(
        candidate_id=candidate.id,
        full_name=candidate.full_name,
        history=history_items
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PHÂN HỆ 3: XEM VÀ THỐNG KÊ KẾT QUẢ THI (EXAM RESULTS & REPORTS)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/results")
async def get_all_results(db: AsyncSession = Depends(get_db)):
    """
    API: Lấy toàn bộ kết quả bài thi của tất cả thí sinh trên hệ thống.
    """
    result = await db.execute(select(models.ExamResult))
    results = result.scalars().all()
    return [_result_to_dict(r) for r in results]


@router.get("/packages/{package_id}/results")
async def get_results_by_package(package_id: str, db: AsyncSession = Depends(get_db)):
    """
    API: Lấy danh sách kết quả thi chi tiết theo từng Gói đề thi (`package_id`).
    
    Luồng xử lý:
    1. Truy vấn các bài thi thuộc `package_id`, nạp kèm thông tin thí sinh (`joinedload(ExamResult.candidate)`).
    2. Gom danh sách các `exam_id` duy nhất và tra cứu thông tin Mã đề (`Exam.code`) từ `exam_service`.
    3. Thống kê trạng thái làm bài ("Đã nộp" nếu có `submitted_at`, ngược lại là "Đang làm").
    4. Trả về bảng tổng hợp điểm thi, số câu đúng, thời gian bắt đầu/nộp bài.
    """
    # 1. Truy vấn kết quả bài thi kèm thông tin thí sinh
    result = await db.execute(
        select(models.ExamResult)
        .options(joinedload(models.ExamResult.candidate))
        .where(models.ExamResult.package_id == package_id)
    )
    results = result.unique().scalars().all()
    
    # 2. Lấy thông tin mã đề thi từ exam_service để map tên/mã đề
    from backend.exam_service.models import Exam
    exam_ids = list(set([r.exam_id for r in results if r.exam_id]))
    exam_code_map = {}
    if exam_ids:
        ex_res = await db.execute(select(Exam).where(Exam.id.in_(exam_ids)))
        exams = ex_res.scalars().all()
        exam_code_map = {ex.id: ex.code if ex.code else ex.name for ex in exams}

    # 3. Chuẩn hóa dữ liệu kết quả thi cho giao diện quản trị
    response = []
    for r in results:
        response.append({
            "id": r.id,
            "candidate_id": r.candidate_id,
            "full_name": r.candidate.full_name if r.candidate else "N/A",
            "sbd": r.candidate.username if r.candidate else "N/A",
            "exam_id": r.exam_id,
            "exam_code": exam_code_map.get(r.exam_id, "N/A") if r.exam_id else "N/A",
            "status": "Đã nộp" if r.submitted_at else "Đang làm",
            "score": r.score,
            "started_at": r.started_at,
            "submitted_at": r.submitted_at,
            "total_correct": r.total_correct,
            "total_questions": r.total_questions
        })
    return response

