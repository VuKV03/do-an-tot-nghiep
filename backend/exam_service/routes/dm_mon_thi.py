"""
DmMonThi CRUD routes — Danh mục môn thi
GET /dm-mon-thi/, POST /dm-mon-thi/,
PUT /dm-mon-thi/{id}, DELETE /dm-mon-thi/{id}
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
from backend.exam_service.models import DmMonThi
from backend.exam_service.schemas import (
    DmMonThiCreate, DmMonThiUpdate,
    DmMonThiResponse, DmMonThiListResponse,
)

router = APIRouter(prefix="/dm-mon-thi", tags=["DmMonThi"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_response(obj: DmMonThi) -> DmMonThiResponse:
    return DmMonThiResponse(
        id=obj.id,
        code=obj.code,
        name=obj.name,
        is_active=bool(obj.is_active),
        note=obj.note or "",
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.get("/", response_model=DmMonThiListResponse)
async def list_dm_mon_thi(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả môn thi."""
    result = await db.execute(select(DmMonThi).order_by(DmMonThi.created_at.desc()))
    items = result.scalars().all()
    data = [_to_response(i) for i in items]
    return DmMonThiListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_dm_mon_thi(body: DmMonThiCreate, db: AsyncSession = Depends(get_db)):
    """Tạo môn thi mới."""
    existing = await db.execute(select(DmMonThi).where(DmMonThi.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mã môn thi đã tồn tại!")

    obj = DmMonThi(
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
    return {"success": True, "message": "Thêm môn thi thành công!", "data": _to_response(obj)}


@router.put("/{item_id}")
async def update_dm_mon_thi(
    item_id: str, body: DmMonThiUpdate, db: AsyncSession = Depends(get_db)
):
    """Cập nhật thông tin môn thi."""
    result = await db.execute(select(DmMonThi).where(DmMonThi.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn thi.")

    if body.code is not None and body.code != obj.code:
        dup = await db.execute(select(DmMonThi).where(DmMonThi.code == body.code))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Mã môn thi đã tồn tại!")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_at = _now()

    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Cập nhật môn thi thành công!", "data": _to_response(obj)}


@router.delete("/{item_id}")
async def delete_dm_mon_thi(item_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa môn thi."""
    result = await db.execute(select(DmMonThi).where(DmMonThi.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn thi.")
    name = obj.name
    await db.delete(obj)
    await db.commit()
    return {"success": True, "message": f'Đã xóa môn thi "{name}".'}
