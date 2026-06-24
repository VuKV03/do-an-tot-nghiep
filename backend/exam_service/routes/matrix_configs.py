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
from backend.exam_service.models import MatrixConfig

router = APIRouter(prefix="/matrix-configs", tags=["Matrix Configs"])

SUBJECT_MAP = {
    "mh-toan": "Toán học",
    "mh-ly": "Vật lí",
    "mh-anh": "Tiếng Anh",
}


# ─── Pydantic Schemas ───────────────────────────────────────────────
class MatrixConfigCreate(BaseModel):
    mon_hoc_id: str
    ma: Optional[str] = None
    ten: str
    ds_cau_truc: List[dict]


class BatchDeleteRequest(BaseModel):
    ids: List[str]


# ─── Routes ─────────────────────────────────────────────────────────

@router.get("/")
async def list_matrix_configs(
    page: int = 1,
    pageSize: int = 10,
    search: Optional[str] = None,
    subject: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lấy danh sách ma trận đề thi có phân trang và tìm kiếm."""
    # Build query
    query = select(MatrixConfig)
    conditions = []

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                MatrixConfig.name.like(search_pattern),
                MatrixConfig.code.like(search_pattern)
            )
        )

    if subject and subject != "all":
        # Resolve to subject name if it's an ID
        subj_name = SUBJECT_MAP.get(subject, subject)
        conditions.append(MatrixConfig.subject == subj_name)

    if status and status != "all":
        if status == "pending":
            conditions.append(or_(MatrixConfig.status == "new", MatrixConfig.status == "pending"))
        else:
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
    configs = result.scalars().all()

    data = []
    for c in configs:
        data.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "subject": c.subject,
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

    matrix_id = f"mtr-{int(time.time() * 1000)}"
    
    # Generate code if empty
    subj_code = body.mon_hoc_id.split("-")[-1].upper()
    matrix_code = body.ma.strip() if (body.ma and body.ma.strip()) else f"MTR-{subj_code}-{int(time.time())}"

    # Check unique code
    existing_result = await db.execute(select(MatrixConfig).where(MatrixConfig.code == matrix_code))
    if existing_result.scalar_one_or_none():
        matrix_code = f"{matrix_code}-{int(time.time())[-4:]}"

    now = datetime.utcnow().isoformat() + "Z"
    subject_name = SUBJECT_MAP.get(body.mon_hoc_id, body.mon_hoc_id)

    new_config = MatrixConfig(
        id=matrix_id,
        code=matrix_code,
        name=body.ten,
        subject=subject_name,
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
            "subject": new_config.subject,
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
