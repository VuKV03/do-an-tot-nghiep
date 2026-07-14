"""
GradeLevel CRUD routes — Danh mục khối lớp
Table: grade_levels
GET /grade-levels/, POST /grade-levels/,
PUT /grade-levels/{id}, DELETE /grade-levels/{id}
"""
import uuid
from datetime import datetime, timezone

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select

from backend.shared.database import get_db
from backend.exam_service.models import GradeLevel
from backend.exam_service.reference_guard import assert_grade_level_deletable
from backend.exam_service.schemas import (
    GradeLevelCreate, GradeLevelUpdate,
    GradeLevelResponse, GradeLevelListResponse,
)

router = APIRouter(prefix="/grade-levels", tags=["Grade Levels"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_response(obj: GradeLevel) -> GradeLevelResponse:
    return GradeLevelResponse(
        id=obj.id,
        code=obj.code,
        name=obj.name,
        is_active=bool(obj.is_active),
        note=obj.note or "",
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.get("/", response_model=GradeLevelListResponse)
async def list_grade_levels(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả khối lớp."""
    result = await db.execute(select(GradeLevel).order_by(GradeLevel.created_at.desc()))
    items = result.scalars().all()
    data = [_to_response(i) for i in items]
    return GradeLevelListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_grade_level(body: GradeLevelCreate, db: AsyncSession = Depends(get_db)):
    """Tạo khối lớp mới."""
    existing = await db.execute(select(GradeLevel).where(GradeLevel.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mã khối lớp đã tồn tại!")

    obj = GradeLevel(
        id=str(uuid.uuid4()),
        code=body.code,
        name=body.name,
        is_active=body.is_active,
        note=body.note or "",
        created_at=_now(),
        updated_at=None,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Thêm khối lớp thành công!", "data": _to_response(obj)}


@router.put("/{item_id}")
async def update_grade_level(
    item_id: str, body: GradeLevelUpdate, db: AsyncSession = Depends(get_db)
):
    """Cập nhật khối lớp."""
    result = await db.execute(select(GradeLevel).where(GradeLevel.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy khối lớp.")

    if body.code is not None and body.code != obj.code:
        dup = await db.execute(select(GradeLevel).where(GradeLevel.code == body.code))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Mã khối lớp đã tồn tại!")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_at = _now()

    await db.commit()
    await db.refresh(obj)
    return {
        "success": True,
        "message": "Cập nhật khối lớp thành công!",
        "data": _to_response(obj),
    }


@router.delete("/{item_id}")
async def delete_grade_level(item_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa khối lớp."""
    result = await db.execute(select(GradeLevel).where(GradeLevel.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy khối lớp.")
    await assert_grade_level_deletable(db, obj)
    name = obj.name
    await db.delete(obj)
    await db.commit()
    return {"success": True, "message": f'Đã xóa khối lớp "{name}".'}
