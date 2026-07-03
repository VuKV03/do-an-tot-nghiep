"""
CompetencyComponent CRUD routes — Danh mục thành phần năng lực
Table: competency_components
GET /competency-components/, POST /competency-components/,
PUT /competency-components/{id}, DELETE /competency-components/{id}
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
from backend.exam_service.models import CompetencyComponent
from backend.exam_service.schemas import (
    CompetencyComponentCreate, CompetencyComponentUpdate,
    CompetencyComponentResponse, CompetencyComponentListResponse,
)

router = APIRouter(prefix="/competency-components", tags=["Competency Components"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_response(obj: CompetencyComponent) -> CompetencyComponentResponse:
    return CompetencyComponentResponse(
        id=obj.id,
        code=obj.code,
        name=obj.name,
        subject_id=obj.subject_id,
        is_active=bool(obj.is_active),
        note=obj.note or "",
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.get("/", response_model=CompetencyComponentListResponse)
async def list_competency_components(
    subject_id: str | None = None,
    grade_id: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """Lấy danh sách tất cả thành phần năng lực."""
    query = select(CompetencyComponent)
    if subject_id:
        query = query.where(CompetencyComponent.subject_id == subject_id)
    # Note: competency_components table currently doesn't have a grade_id column to filter by.
    query = query.order_by(CompetencyComponent.created_at.desc())
    
    result = await db.execute(query)
    items = result.scalars().all()
    data = [_to_response(i) for i in items]
    return CompetencyComponentListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_competency_component(
    body: CompetencyComponentCreate, db: AsyncSession = Depends(get_db)
):
    """Tạo thành phần năng lực mới."""
    existing = await db.execute(select(CompetencyComponent).where(CompetencyComponent.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mã thành phần năng lực đã tồn tại!")

    obj = CompetencyComponent(
        id=str(uuid.uuid4()),
        code=body.code,
        name=body.name,
        subject_id=body.subject_id,
        is_active=body.is_active,
        note=body.note or "",
        created_at=_now(),
        updated_at=None,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {
        "success": True,
        "message": "Thêm thành phần năng lực thành công!",
        "data": _to_response(obj),
    }


@router.put("/{item_id}")
async def update_competency_component(
    item_id: str, body: CompetencyComponentUpdate, db: AsyncSession = Depends(get_db)
):
    """Cập nhật thành phần năng lực."""
    result = await db.execute(
        select(CompetencyComponent).where(CompetencyComponent.id == item_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành phần năng lực.")

    if body.code is not None and body.code != obj.code:
        dup = await db.execute(select(CompetencyComponent).where(CompetencyComponent.code == body.code))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Mã thành phần năng lực đã tồn tại!")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_at = _now()

    await db.commit()
    await db.refresh(obj)
    return {
        "success": True,
        "message": "Cập nhật thành phần năng lực thành công!",
        "data": _to_response(obj),
    }


@router.delete("/{item_id}")
async def delete_competency_component(item_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa thành phần năng lực."""
    result = await db.execute(
        select(CompetencyComponent).where(CompetencyComponent.id == item_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành phần năng lực.")
    name = obj.name
    await db.delete(obj)
    await db.commit()
    return {"success": True, "message": f'Đã xóa thành phần năng lực "{name}".'}
