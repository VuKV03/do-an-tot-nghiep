"""
SubjectConfig CRUD routes — Cấu hình môn học
GET /subject-configs/, GET /subject-configs/by-subject/{subject_id},
POST /subject-configs/, PUT /subject-configs/{id}
"""
import uuid
from datetime import datetime

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy import select
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exam_service.models import SubjectConfig
from backend.exam_service.schemas import (
    SubjectConfigCreate,
    SubjectConfigListResponse,
    SubjectConfigResponse,
    SubjectConfigUpdate,
)
from backend.shared.database import get_db

router = APIRouter(prefix="/subject-configs", tags=["Subject Configs"])


def _now() -> datetime:
    return datetime.utcnow()


def _to_response(obj: SubjectConfig) -> SubjectConfigResponse:
    return SubjectConfigResponse(
        id=obj.id,
        type_id_p1=obj.type_id_p1,
        type_id_p2=obj.type_id_p2,
        type_id_p3=obj.type_id_p3,
        subject_id=obj.subject_id,
        content_p1=obj.content_p1,
        content_p2=obj.content_p2,
        content_p3=obj.content_p3,
        p1_from=obj.p1_from,
        p1_to=obj.p1_to,
        p2_from=obj.p2_from,
        p2_to=obj.p2_to,
        p3_from=obj.p3_from,
        p3_to=obj.p3_to,
        points_for_a_correct_answers_p1=obj.points_for_a_correct_answers_p1,
        points_for_1_correct_idea=obj.points_for_1_correct_idea,
        points_for_2_correct_idea=obj.points_for_2_correct_idea,
        points_for_3_correct_idea=obj.points_for_3_correct_idea,
        points_for_4_correct_idea=obj.points_for_4_correct_idea,
        points_for_a_correct_answers_p3=obj.points_for_a_correct_answers_p3,
        questions_number=obj.questions_number,
        number_to_create=obj.number_to_create,
        scale=obj.scale,
        time=obj.time,
        created_by=obj.created_by,
        updated_by=obj.updated_by,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.get("/", response_model=SubjectConfigListResponse)
async def list_subject_configs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SubjectConfig).order_by(SubjectConfig.created_at.desc()))
    items = result.scalars().all()
    data = [_to_response(item) for item in items]
    return SubjectConfigListResponse(success=True, count=len(data), data=data)


@router.get("/by-subject/{subject_id}", response_model=SubjectConfigResponse)
async def get_subject_config_by_subject(subject_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SubjectConfig).where(SubjectConfig.subject_id == subject_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình môn học.")
    return _to_response(obj)


@router.post("/", status_code=201)
async def create_subject_config(body: SubjectConfigCreate, db: AsyncSession = Depends(get_db)):
    if not body.subject_id:
        raise HTTPException(status_code=400, detail="subject_id là bắt buộc.")

    existing = await db.execute(select(SubjectConfig).where(SubjectConfig.subject_id == body.subject_id))
    obj = existing.scalar_one_or_none()
    if obj:
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        obj.updated_at = _now()

        await db.commit()
        await db.refresh(obj)
        return {"success": True, "message": "Cập nhật cấu hình môn học thành công!", "data": _to_response(obj)}

    payload = body.model_dump(exclude_unset=True)
    payload["id"] = str(uuid.uuid4())
    payload["created_at"] = _now()
    payload["updated_at"] = None

    obj = SubjectConfig(**payload)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Thêm cấu hình môn học thành công!", "data": _to_response(obj)}


@router.put("/{item_id}")
async def update_subject_config(item_id: str, body: SubjectConfigUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SubjectConfig).where(SubjectConfig.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình môn học.")

    if body.subject_id is not None and body.subject_id != obj.subject_id:
        dup = await db.execute(select(SubjectConfig).where(SubjectConfig.subject_id == body.subject_id))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Môn học đã có cấu hình.")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_at = _now()

    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Cập nhật cấu hình môn học thành công!", "data": _to_response(obj)}