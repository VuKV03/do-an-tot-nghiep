"""
DmCapDoTuDuy CRUD routes — Danh mục cấp độ tư duy
GET /dm-cap-do-tu-duy/, POST /dm-cap-do-tu-duy/,
PUT /dm-cap-do-tu-duy/{id}, DELETE /dm-cap-do-tu-duy/{id}
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
from backend.exam_service.models import DmCapDoTuDuy
from backend.exam_service.schemas import (
    DmCapDoTuDuyCreate, DmCapDoTuDuyUpdate,
    DmCapDoTuDuyResponse, DmCapDoTuDuyListResponse,
)

router = APIRouter(prefix="/dm-cap-do-tu-duy", tags=["DmCapDoTuDuy"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_response(obj: DmCapDoTuDuy) -> DmCapDoTuDuyResponse:
    return DmCapDoTuDuyResponse(
        id=obj.id,
        code=obj.code,
        name=obj.name,
        note=obj.note or "",
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.get("/", response_model=DmCapDoTuDuyListResponse)
async def list_dm_cap_do_tu_duy(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả cấp độ tư duy."""
    result = await db.execute(select(DmCapDoTuDuy).order_by(DmCapDoTuDuy.created_at.desc()))
    items = result.scalars().all()
    data = [_to_response(i) for i in items]
    return DmCapDoTuDuyListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_dm_cap_do_tu_duy(body: DmCapDoTuDuyCreate, db: AsyncSession = Depends(get_db)):
    """Tạo cấp độ tư duy mới."""
    existing = await db.execute(select(DmCapDoTuDuy).where(DmCapDoTuDuy.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mã cấp độ tư duy đã tồn tại!")

    obj = DmCapDoTuDuy(
        id=str(uuid.uuid4()),
        code=body.code,
        name=body.name,
        note=body.note or "",
        created_at=_now(),
        updated_at=None,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Thêm cấp độ tư duy thành công!", "data": _to_response(obj)}


@router.put("/{item_id}")
async def update_dm_cap_do_tu_duy(
    item_id: str, body: DmCapDoTuDuyUpdate, db: AsyncSession = Depends(get_db)
):
    """Cập nhật cấp độ tư duy."""
    result = await db.execute(select(DmCapDoTuDuy).where(DmCapDoTuDuy.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấp độ tư duy.")

    if body.code is not None and body.code != obj.code:
        dup = await db.execute(select(DmCapDoTuDuy).where(DmCapDoTuDuy.code == body.code))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Mã cấp độ tư duy đã tồn tại!")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_at = _now()

    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Cập nhật cấp độ tư duy thành công!", "data": _to_response(obj)}


@router.delete("/{item_id}")
async def delete_dm_cap_do_tu_duy(item_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa cấp độ tư duy."""
    result = await db.execute(select(DmCapDoTuDuy).where(DmCapDoTuDuy.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấp độ tư duy.")
    name = obj.name
    await db.delete(obj)
    await db.commit()
    return {"success": True, "message": f'Đã xóa cấp độ tư duy "{name}".'}
