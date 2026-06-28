"""
CognitiveLevel CRUD routes — Danh mục cấp độ tư duy
GET /cognitive-levels/, POST /cognitive-levels/,
PUT /cognitive-levels/{id}, DELETE /cognitive-levels/{id}
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
from backend.exam_service.models import CognitiveLevel
from backend.exam_service.schemas import (
    CognitiveLevelCreate, CognitiveLevelUpdate,
    CognitiveLevelResponse, CognitiveLevelListResponse,
)

router = APIRouter(prefix="/cognitive-levels", tags=["Cognitive Levels"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_response(obj: CognitiveLevel) -> CognitiveLevelResponse:
    return CognitiveLevelResponse(
        id=obj.id,
        code=obj.code,
        name=obj.name,
        note=obj.note or "",
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.get("/", response_model=CognitiveLevelListResponse)
async def list_cognitive_levels(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả cấp độ tư duy."""
    result = await db.execute(select(CognitiveLevel).order_by(CognitiveLevel.created_at.desc()))
    items = result.scalars().all()
    data = [_to_response(i) for i in items]
    return CognitiveLevelListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_cognitive_level(body: CognitiveLevelCreate, db: AsyncSession = Depends(get_db)):
    """Tạo cấp độ tư duy mới."""
    existing = await db.execute(select(CognitiveLevel).where(CognitiveLevel.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mã cấp độ tư duy đã tồn tại!")

    obj = CognitiveLevel(
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
async def update_cognitive_level(
    item_id: str, body: CognitiveLevelUpdate, db: AsyncSession = Depends(get_db)
):
    """Cập nhật cấp độ tư duy."""
    result = await db.execute(select(CognitiveLevel).where(CognitiveLevel.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấp độ tư duy.")

    if body.code is not None and body.code != obj.code:
        dup = await db.execute(select(CognitiveLevel).where(CognitiveLevel.code == body.code))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Mã cấp độ tư duy đã tồn tại!")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_at = _now()

    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Cập nhật cấp độ tư duy thành công!", "data": _to_response(obj)}


@router.delete("/{item_id}")
async def delete_cognitive_level(item_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa cấp độ tư duy."""
    result = await db.execute(select(CognitiveLevel).where(CognitiveLevel.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấp độ tư duy.")
    name = obj.name
    await db.delete(obj)
    await db.commit()
    return {"success": True, "message": f'Đã xóa cấp độ tư duy "{name}".'}
