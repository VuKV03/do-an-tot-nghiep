"""
Routes for Matrix Configs — Exam Service.
Handles: GET /matrix-configs, POST /matrix-configs, DELETE /matrix-configs, DELETE /matrix-configs/{id}
"""
import json
import time
from datetime import datetime
from typing import List, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, delete, or_, and_, func
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

from backend.shared.database import get_db
from backend.exam_service.models import MatrixConfig, SubjectCategory

router = APIRouter(prefix="/matrix-configs", tags=["Matrix Configs"])


# ─── Pydantic Schemas ───────────────────────────────────────────────
class MatrixConfigCreate(BaseModel):
    subject_id: str
    ma: Optional[str] = None
    ten: str
    ds_cau_truc: List[dict]


async def _get_subject_or_400(db: AsyncSession, subject_id: str) -> SubjectCategory:
    """Tra đúng 1 môn học thật theo id — chặn tạo/sửa ma trận với subject_id không tồn tại thay vì
    âm thầm lưu giá trị rác (trước đây SUBJECT_MAP.get(x, x) luôn cho qua bất kỳ chuỗi nào)."""
    result = await db.execute(select(SubjectCategory).where(SubjectCategory.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=400, detail=f"Không tìm thấy môn học với id '{subject_id}'.")
    return subject


class BatchDeleteRequest(BaseModel):
    ids: List[str]


# ─── Routes ─────────────────────────────────────────────────────────

@router.get("/")
async def list_matrix_configs(
    page: int = 1,
    pageSize: int = 10,
    search: Optional[str] = None,
    subject_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lấy danh sách ma trận đề thi có phân trang và tìm kiếm."""
    # Build query — JOIN subject_categories để lấy tên môn học hiển thị, thay vì đọc thẳng 1 cột
    # chuỗi tự do lưu trùng lặp trong matrix_configs như trước đây.
    query = select(MatrixConfig, SubjectCategory.name.label("subject_name")).outerjoin(
        SubjectCategory, MatrixConfig.subject_id == SubjectCategory.id
    )
    conditions = []

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                MatrixConfig.name.like(search_pattern),
                MatrixConfig.code.like(search_pattern)
            )
        )

    if subject_id and subject_id != "all":
        conditions.append(MatrixConfig.subject_id == subject_id)

    if status and status != "all":
        conditions.append(MatrixConfig.status == status)

    if conditions:
        query = query.where(and_(*conditions))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0

    # Apply pagination and sorting
    query = query.order_by(MatrixConfig.createdAt.desc())
    query = query.offset((page - 1) * pageSize).limit(pageSize)

    result = await db.execute(query)
    rows = result.all()

    data = []
    for c, subject_name in rows:
        data.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "subjectId": c.subject_id,
            "subject": subject_name or "",
            "totalScore": c.totalScore,
            "totalQuestions": c.totalQuestions,
            "duration": c.duration,
            "status": c.status,
            "createdAt": c.createdAt
        })

    return {
        "success": True,
        "total": total_count,
        "page": page,
        "pageSize": pageSize,
        "data": data
    }


@router.post("/", status_code=201)
async def create_matrix_config(body: MatrixConfigCreate, db: AsyncSession = Depends(get_db)):
    """Tạo mới ma trận đề thi."""
    if not body.ten.strip():
        raise HTTPException(status_code=400, detail="Tên ma trận không được để trống.")

    # Calculate total questions and total score
    total_questions = 0
    total_score = 0.0

    for row in body.ds_cau_truc:
        for cell in row.get("ds_loai_cau_hoi", []):
            so_cau = cell.get("so_cau") or 0
            diem = cell.get("diem") or 0.0
            total_questions += so_cau
            total_score += so_cau * diem

    subject = await _get_subject_or_400(db, body.subject_id)

    matrix_id = f"mtr-{int(time.time() * 1000)}"

    # Generate code if empty — dùng đúng code thật của môn học thay vì tách chuỗi id kiểu cũ
    # ("mh-toan".split("-")[-1] chỉ đúng do trùng hợp, không còn ý nghĩa gì với id thật dạng UUID).
    matrix_code = body.ma.strip() if (body.ma and body.ma.strip()) else f"MTR-{subject.code.upper()}-{int(time.time())}"

    # Check unique code
    existing_result = await db.execute(select(MatrixConfig).where(MatrixConfig.code == matrix_code))
    if existing_result.scalar_one_or_none():
        matrix_code = f"{matrix_code}-{str(int(time.time()))[-4:]}"

    now = datetime.utcnow().isoformat() + "Z"

    new_config = MatrixConfig(
        id=matrix_id,
        code=matrix_code,
        name=body.ten,
        subject_id=subject.id,
        totalScore=total_score,
        totalQuestions=total_questions,
        duration=90, # Default duration in minutes
        status="new",
        createdAt=now,
        structure=json.dumps(body.ds_cau_truc, ensure_ascii=False)
    )

    db.add(new_config)
    await db.commit()

    return {
        "success": True,
        "message": "Lưu ma trận thành công!",
        "data": {
            "id": new_config.id,
            "code": new_config.code,
            "name": new_config.name,
            "subjectId": new_config.subject_id,
            "subject": subject.name,
            "totalScore": new_config.totalScore,
            "totalQuestions": new_config.totalQuestions,
            "createdAt": new_config.createdAt
        }
    }


@router.delete("/{config_id}")
async def delete_matrix_config(config_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa một ma trận đề thi."""
    result = await db.execute(select(MatrixConfig).where(MatrixConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Không tìm thấy ma trận cần xóa.")

    await db.delete(config)
    await db.commit()

    return {
        "success": True,
        "message": "Đã xóa ma trận thành công!"
    }


@router.delete("/")
async def batch_delete_matrix_configs(body: BatchDeleteRequest, db: AsyncSession = Depends(get_db)):
    """Xóa hàng loạt ma trận đề thi."""
    if not body.ids:
        return {"success": True, "message": "Không có ma trận nào được chọn để xóa."}

    await db.execute(delete(MatrixConfig).where(MatrixConfig.id.in_(body.ids)))
    await db.commit()

    return {
        "success": True,
        "message": f"Đã xóa thành công {len(body.ids)} ma trận đề thi."
    }


@router.get("/{config_id}")
async def get_matrix_config(config_id: str, db: AsyncSession = Depends(get_db)):
    """Lấy chi tiết một ma trận đề thi."""
    result = await db.execute(
        select(MatrixConfig, SubjectCategory.name.label("subject_name"))
        .outerjoin(SubjectCategory, MatrixConfig.subject_id == SubjectCategory.id)
        .where(MatrixConfig.id == config_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy ma trận đề thi.")
    config, subject_name = row

    try:
        ds_cau_truc = json.loads(config.structure) if config.structure else []
    except Exception:
        ds_cau_truc = []

    return {
        "success": True,
        "data": {
            "id": config.id,
            "code": config.code,
            "name": config.name,
            "subject_id": config.subject_id,
            "subject": subject_name or "",
            "totalScore": config.totalScore,
            "totalQuestions": config.totalQuestions,
            "status": config.status,
            "createdAt": config.createdAt,
            "ds_cau_truc": ds_cau_truc
        }
    }


class MatrixConfigUpdateStatus(BaseModel):
    status: str
    ids: List[str]
    notes: Optional[str] = None


@router.put("/status")
async def update_matrix_configs_status(body: MatrixConfigUpdateStatus, db: AsyncSession = Depends(get_db)):
    """Cập nhật trạng thái thẩm định cho một hoặc nhiều ma trận đề."""
    if not body.ids:
        raise HTTPException(status_code=400, detail="Không có ma trận nào được chọn.")
    
    for mid in body.ids:
        result = await db.execute(select(MatrixConfig).where(MatrixConfig.id == mid))
        config = result.scalar_one_or_none()
        if config:
            config.status = body.status

    await db.commit()
    return {
        "success": True,
        "message": f"Cập nhật trạng thái thẩm định thành công cho {len(body.ids)} ma trận."
    }


@router.put("/{config_id}")
async def update_matrix_config(config_id: str, body: MatrixConfigCreate, db: AsyncSession = Depends(get_db)):
    """Chỉnh sửa ma trận đề thi."""
    result = await db.execute(select(MatrixConfig).where(MatrixConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Không tìm thấy ma trận đề thi cần chỉnh sửa.")

    if not body.ten.strip():
        raise HTTPException(status_code=400, detail="Tên ma trận không được để trống.")

    # Calculate total questions and total score
    total_questions = 0
    total_score = 0.0

    for row in body.ds_cau_truc:
        for cell in row.get("ds_loai_cau_hoi", []):
            so_cau = cell.get("so_cau") or 0
            diem = cell.get("diem") or 0.0
            total_questions += so_cau
            total_score += so_cau * diem

    subject = await _get_subject_or_400(db, body.subject_id)

    # Update fields
    config.name = body.ten
    if body.ma and body.ma.strip():
        config.code = body.ma.strip()
    config.subject_id = subject.id
    config.totalScore = total_score
    config.totalQuestions = total_questions
    config.structure = json.dumps(body.ds_cau_truc, ensure_ascii=False)

    await db.commit()

    return {
        "success": True,
        "message": "Cập nhật ma trận thành công!",
        "data": {
            "id": config.id,
            "code": config.code,
            "name": config.name,
            "subjectId": config.subject_id,
            "subject": subject.name,
            "totalScore": config.totalScore,
            "totalQuestions": config.totalQuestions
        }
    }
