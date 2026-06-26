"""
DmLoaiHinhCauHoi CRUD routes — Danh mục loại hình câu hỏi
Table: question_types
GET /dm-loai-hinh-cau-hoi/, POST /dm-loai-hinh-cau-hoi/,
PUT /dm-loai-hinh-cau-hoi/{id}, DELETE /dm-loai-hinh-cau-hoi/{id}
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
from backend.exam_service.models import DmLoaiHinhCauHoi
from backend.exam_service.schemas import (
    DmLoaiHinhCauHoiCreate, DmLoaiHinhCauHoiUpdate,
    DmLoaiHinhCauHoiResponse, DmLoaiHinhCauHoiListResponse,
)

router = APIRouter(prefix="/dm-loai-hinh-cau-hoi", tags=["DmLoaiHinhCauHoi"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_response(obj: DmLoaiHinhCauHoi) -> DmLoaiHinhCauHoiResponse:
    return DmLoaiHinhCauHoiResponse(
        id=obj.id,
        code=obj.code,
        name=obj.name,
        note=obj.note or "",
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.get("/", response_model=DmLoaiHinhCauHoiListResponse)
async def list_dm_loai_hinh_cau_hoi(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả loại hình câu hỏi."""
    result = await db.execute(
        select(DmLoaiHinhCauHoi).order_by(DmLoaiHinhCauHoi.created_at.desc())
    )
    items = result.scalars().all()
    data = [_to_response(i) for i in items]
    return DmLoaiHinhCauHoiListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_dm_loai_hinh_cau_hoi(
    body: DmLoaiHinhCauHoiCreate, db: AsyncSession = Depends(get_db)
):
    """Tạo loại hình câu hỏi mới."""
    existing = await db.execute(select(DmLoaiHinhCauHoi).where(DmLoaiHinhCauHoi.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mã loại hình câu hỏi đã tồn tại!")

    obj = DmLoaiHinhCauHoi(
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
    return {
        "success": True,
        "message": "Thêm loại hình câu hỏi thành công!",
        "data": _to_response(obj),
    }


@router.put("/{item_id}")
async def update_dm_loai_hinh_cau_hoi(
    item_id: str, body: DmLoaiHinhCauHoiUpdate, db: AsyncSession = Depends(get_db)
):
    """Cập nhật loại hình câu hỏi."""
    result = await db.execute(select(DmLoaiHinhCauHoi).where(DmLoaiHinhCauHoi.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại hình câu hỏi.")

    if body.code is not None and body.code != obj.code:
        dup = await db.execute(select(DmLoaiHinhCauHoi).where(DmLoaiHinhCauHoi.code == body.code))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Mã loại hình câu hỏi đã tồn tại!")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_at = _now()

    await db.commit()
    await db.refresh(obj)
    return {
        "success": True,
        "message": "Cập nhật loại hình câu hỏi thành công!",
        "data": _to_response(obj),
    }


@router.delete("/{item_id}")
async def delete_dm_loai_hinh_cau_hoi(item_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa loại hình câu hỏi."""
    result = await db.execute(select(DmLoaiHinhCauHoi).where(DmLoaiHinhCauHoi.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại hình câu hỏi.")
    name = obj.name
    await db.delete(obj)
    await db.commit()
    return {"success": True, "message": f'Đã xóa loại hình câu hỏi "{name}".'}
