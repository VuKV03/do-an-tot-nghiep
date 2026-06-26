"""
DmDotThi CRUD routes — Danh mục đợt thi
Table: exam_periods
GET /dm-dot-thi/, POST /dm-dot-thi/,
PUT /dm-dot-thi/{id}, DELETE /dm-dot-thi/{id}
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
from backend.exam_service.models import ExamPeriod
from backend.exam_service.schemas import (
    ExamPeriodCreate, ExamPeriodUpdate,
    ExamPeriodResponse, ExamPeriodListResponse,
)

router = APIRouter(prefix="/dm-dot-thi", tags=["DmDotThi"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_response(obj: ExamPeriod) -> ExamPeriodResponse:
    return ExamPeriodResponse(
        id=obj.id,
        code=obj.code,
        name=obj.name,
        start_date=obj.start_date,
        end_date=obj.end_date,
        status=obj.status or "HOAT_DONG",
        is_active=bool(obj.is_active),
        note=obj.note or "",
        created_by=obj.created_by,
        updated_by=obj.updated_by,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.get("/", response_model=ExamPeriodListResponse)
async def list_dm_dot_thi(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả đợt thi."""
    result = await db.execute(select(ExamPeriod).order_by(ExamPeriod.created_at.desc()))
    items = result.scalars().all()
    data = [_to_response(i) for i in items]
    return ExamPeriodListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_dm_dot_thi(body: ExamPeriodCreate, db: AsyncSession = Depends(get_db)):
    """Tạo đợt thi mới."""
    existing = await db.execute(select(ExamPeriod).where(ExamPeriod.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mã đợt thi đã tồn tại!")

    obj = ExamPeriod(
        id=str(uuid.uuid4()),
        code=body.code,
        name=body.name,
        start_date=body.start_date,
        end_date=body.end_date,
        status=body.status or "HOAT_DONG",
        is_active=body.is_active,
        note=body.note or "",
        created_by=body.created_by,
        updated_by=body.updated_by,
        created_at=_now(),
        updated_at=None,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Thêm đợt thi thành công!", "data": _to_response(obj)}


@router.put("/{item_id}")
async def update_dm_dot_thi(
    item_id: str, body: ExamPeriodUpdate, db: AsyncSession = Depends(get_db)
):
    """Cập nhật đợt thi."""
    result = await db.execute(select(ExamPeriod).where(ExamPeriod.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt thi.")

    if body.code is not None and body.code != obj.code:
        dup = await db.execute(select(ExamPeriod).where(ExamPeriod.code == body.code))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Mã đợt thi đã tồn tại!")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_at = _now()

    await db.commit()
    await db.refresh(obj)
    return {
        "success": True,
        "message": "Cập nhật đợt thi thành công!",
        "data": _to_response(obj),
    }


@router.delete("/{item_id}")
async def delete_dm_dot_thi(item_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa đợt thi."""
    result = await db.execute(select(ExamPeriod).where(ExamPeriod.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt thi.")
    name = obj.name
    await db.delete(obj)
    await db.commit()
    return {"success": True, "message": f'Đã xóa đợt thi "{name}".'}
