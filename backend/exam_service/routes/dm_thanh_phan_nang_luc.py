"""
DmThanhPhanNangLuc CRUD routes — Danh mục thành phần năng lực
Table: competency_components
GET /dm-thanh-phan-nang-luc/, POST /dm-thanh-phan-nang-luc/,
PUT /dm-thanh-phan-nang-luc/{id}, DELETE /dm-thanh-phan-nang-luc/{id}
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
from backend.exam_service.models import DmThanhPhanNangLuc
from backend.exam_service.schemas import (
    DmThanhPhanNangLucCreate, DmThanhPhanNangLucUpdate,
    DmThanhPhanNangLucResponse, DmThanhPhanNangLucListResponse,
)

router = APIRouter(prefix="/dm-thanh-phan-nang-luc", tags=["DmThanhPhanNangLuc"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_response(obj: DmThanhPhanNangLuc) -> DmThanhPhanNangLucResponse:
    return DmThanhPhanNangLucResponse(
        id=obj.id,
        code=obj.code,
        name=obj.name,
        subject_id=obj.subject_id,
        is_active=bool(obj.is_active),
        note=obj.note or "",
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.get("/", response_model=DmThanhPhanNangLucListResponse)
async def list_dm_thanh_phan_nang_luc(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả thành phần năng lực."""
    result = await db.execute(
        select(DmThanhPhanNangLuc).order_by(DmThanhPhanNangLuc.created_at.desc())
    )
    items = result.scalars().all()
    data = [_to_response(i) for i in items]
    return DmThanhPhanNangLucListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_dm_thanh_phan_nang_luc(
    body: DmThanhPhanNangLucCreate, db: AsyncSession = Depends(get_db)
):
    """Tạo thành phần năng lực mới."""
    existing = await db.execute(select(DmThanhPhanNangLuc).where(DmThanhPhanNangLuc.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mã thành phần năng lực đã tồn tại!")

    obj = DmThanhPhanNangLuc(
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
async def update_dm_thanh_phan_nang_luc(
    item_id: str, body: DmThanhPhanNangLucUpdate, db: AsyncSession = Depends(get_db)
):
    """Cập nhật thành phần năng lực."""
    result = await db.execute(
        select(DmThanhPhanNangLuc).where(DmThanhPhanNangLuc.id == item_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành phần năng lực.")

    if body.code is not None and body.code != obj.code:
        dup = await db.execute(select(DmThanhPhanNangLuc).where(DmThanhPhanNangLuc.code == body.code))
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
async def delete_dm_thanh_phan_nang_luc(item_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa thành phần năng lực."""
    result = await db.execute(
        select(DmThanhPhanNangLuc).where(DmThanhPhanNangLuc.id == item_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành phần năng lực.")
    name = obj.name
    await db.delete(obj)
    await db.commit()
    return {"success": True, "message": f'Đã xóa thành phần năng lực "{name}".'}
