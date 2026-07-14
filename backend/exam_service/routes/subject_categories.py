"""
SubjectCategory CRUD routes — Danh mục môn học
GET /subject-categories/, POST /subject-categories/,
PUT /subject-categories/{id}, DELETE /subject-categories/{id}
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
from backend.exam_service.models import SubjectCategory
from backend.exam_service.reference_guard import assert_subject_deletable
from backend.exam_service.schemas import (
    SubjectCategoryCreate, SubjectCategoryUpdate,
    SubjectCategoryResponse, SubjectCategoryListResponse,
)

router = APIRouter(prefix="/subject-categories", tags=["Subject Categories"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_response(obj: SubjectCategory) -> SubjectCategoryResponse:
    return SubjectCategoryResponse(
        id=obj.id,
        code=obj.code,
        name=obj.name,
        is_active=bool(obj.is_active),
        note=obj.note or "",
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.get("/", response_model=SubjectCategoryListResponse)
async def list_subject_categories(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả môn học."""
    result = await db.execute(select(SubjectCategory).order_by(SubjectCategory.created_at.desc()))
    items = result.scalars().all()
    data = [_to_response(i) for i in items]
    return SubjectCategoryListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_subject_category(body: SubjectCategoryCreate, db: AsyncSession = Depends(get_db)):
    """Tạo môn học mới."""
    existing = await db.execute(select(SubjectCategory).where(SubjectCategory.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mã môn học đã tồn tại!")

    obj = SubjectCategory(
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
    return {"success": True, "message": "Thêm môn học thành công!", "data": _to_response(obj)}


@router.put("/{item_id}")
async def update_subject_category(
    item_id: str, body: SubjectCategoryUpdate, db: AsyncSession = Depends(get_db)
):
    """Cập nhật thông tin môn học."""
    result = await db.execute(select(SubjectCategory).where(SubjectCategory.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học.")

    if body.code is not None and body.code != obj.code:
        dup = await db.execute(select(SubjectCategory).where(SubjectCategory.code == body.code))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Mã môn học đã tồn tại!")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_at = _now()

    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Cập nhật môn học thành công!", "data": _to_response(obj)}


@router.delete("/{item_id}")
async def delete_subject_category(item_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa môn học."""
    result = await db.execute(select(SubjectCategory).where(SubjectCategory.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học.")
    await assert_subject_deletable(db, obj)
    name = obj.name
    await db.delete(obj)
    await db.commit()
    return {"success": True, "message": f'Đã xóa môn học "{name}".'}
