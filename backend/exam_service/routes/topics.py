"""
Topics (chu_de) CRUD & Review routes
Table: topics
GET /topics/, POST /topics/,
PUT /topics/{id}, DELETE /topics/{id}
POST /topics/{id}/submit, POST /topics/{id}/approve, POST /topics/{id}/reject
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select
from pydantic import BaseModel

from backend.shared.database import get_db
from backend.exam_service.models import Topic, SubjectCategory, GradeLevel, TopicHistory
from backend.exam_service.reference_guard import assert_topic_deletable
from backend.exam_service.schemas import (
    TopicCreate, TopicUpdate,
    TopicResponse, TopicListResponse,
    TopicHistoryResponse, TopicHistoryListResponse,
)

router = APIRouter(prefix="/topics", tags=["Topics"])


class TopicReviewRequest(BaseModel):
    comment: Optional[str] = ""
    # Người thực hiện thẩm định — trước đây route này không nhận actor nên luôn ghi cứng "admin"
    # bất kể ai bấm duyệt/từ chối thật.
    actor: Optional[str] = None


class TopicSubmitRequest(BaseModel):
    # Người gửi thẩm định — trước đây endpoint submit không nhận body nào nên luôn ghi cứng "user1".
    actor: Optional[str] = None


_DEFAULT_ACTOR = "Hội đồng Chuyên môn"


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_response(topic: Topic, subject_name: Optional[str] = None, grade_name: Optional[str] = None) -> TopicResponse:
    return TopicResponse(
        id=topic.id,
        parent_id=topic.parent_id,
        code=topic.code,
        name=topic.name,
        subject_id=topic.subject_id,
        grade_id=topic.grade_id,
        status=topic.status if topic.status is not None else 1,
        created_by=topic.created_by,
        created_at=topic.created_at,
        submitted_by=topic.submitted_by,
        submitted_at=topic.submitted_at,
        approved_by=topic.approved_by,
        approved_at=topic.approved_at,
        approval_note=topic.approval_note or "",
        note=topic.note or "",
        subject_name=subject_name,
        grade_name=grade_name,
    )


@router.get("/", response_model=TopicListResponse)
async def list_topics(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả chủ đề, kèm theo tên môn học và khối lớp."""
    stmt = (
        select(Topic, SubjectCategory.name.label("subject_name"), GradeLevel.name.label("grade_name"))
        .outerjoin(SubjectCategory, Topic.subject_id == SubjectCategory.id)
        .outerjoin(GradeLevel, Topic.grade_id == GradeLevel.id)
        .order_by(Topic.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    data = []
    for row in rows:
        topic, sub_name, gr_name = row
        data.append(_to_response(topic, sub_name, gr_name))
        
    return TopicListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_topic(body: TopicCreate, db: AsyncSession = Depends(get_db)):
    """Tạo chủ đề mới (trạng thái mặc định: 0 - Lưu nháp)."""
    # Validate trùng mã
    existing = await db.execute(select(Topic).where(Topic.code == body.code))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Mã chủ đề đã tồn tại!")

    obj = Topic(
        id=str(uuid.uuid4()),
        parent_id=body.parent_id,
        code=body.code,
        name=body.name,
        subject_id=body.subject_id,
        grade_id=body.grade_id,
        status=0,  # 0: Lưu nháp
        created_by=body.created_by or _DEFAULT_ACTOR,
        created_at=_now(),
        submitted_by=None,
        submitted_at=None,
        approved_by=None,
        approved_at=None,
        approval_note="",
        note=body.note or "",
    )
    db.add(obj)

    # Log history
    history_obj = TopicHistory(
        id=str(uuid.uuid4()),
        topic_id=obj.id,
        action="Thêm mới",
        actor=obj.created_by,
        timestamp=_now(),
        note=f"Thêm mới chủ đề '{obj.name}'"
    )
    db.add(history_obj)

    await db.commit()
    await db.refresh(obj)
    
    # Fetch names for response
    sub_name = None
    if obj.subject_id:
        r = await db.execute(select(SubjectCategory.name).where(SubjectCategory.id == obj.subject_id))
        sub_name = r.scalar()
    gr_name = None
    if obj.grade_id:
        r = await db.execute(select(GradeLevel.name).where(GradeLevel.id == obj.grade_id))
        gr_name = r.scalar()

    return {"success": True, "message": "Thêm chủ đề thành công!", "data": _to_response(obj, sub_name, gr_name)}


@router.put("/{item_id}")
async def update_topic(
    item_id: str, body: TopicUpdate, db: AsyncSession = Depends(get_db)
):
    """Cập nhật chủ đề."""
    result = await db.execute(select(Topic).where(Topic.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy chủ đề.")

    # Validate trùng mã (loại trừ chính record đang cập nhật)
    if body.code is not None and body.code != obj.code:
        dup = await db.execute(select(Topic).where(Topic.code == body.code))
        if dup.scalars().first():
            raise HTTPException(status_code=400, detail="Mã chủ đề đã tồn tại!")

    update_data = body.model_dump(exclude_unset=True)
    actor = update_data.pop("actor", None) or _DEFAULT_ACTOR
    for field, value in update_data.items():
        setattr(obj, field, value)

    # Log history
    history_obj = TopicHistory(
        id=str(uuid.uuid4()),
        topic_id=obj.id,
        action="Sửa",
        actor=actor,
        timestamp=_now(),
        note=f"Sửa thông tin chủ đề '{obj.name}'"
    )
    db.add(history_obj)

    await db.commit()
    await db.refresh(obj)
    
    # Fetch names for response
    sub_name = None
    if obj.subject_id:
        r = await db.execute(select(SubjectCategory.name).where(SubjectCategory.id == obj.subject_id))
        sub_name = r.scalar()
    gr_name = None
    if obj.grade_id:
        r = await db.execute(select(GradeLevel.name).where(GradeLevel.id == obj.grade_id))
        gr_name = r.scalar()

    return {
        "success": True,
        "message": "Cập nhật chủ đề thành công!",
        "data": _to_response(obj, sub_name, gr_name),
    }


@router.delete("/{item_id}")
async def delete_topic(item_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa chủ đề. Nếu chủ đề con chưa có dữ liệu câu hỏi/ma trận thì bị xóa cascade theo."""
    result = await db.execute(select(Topic).where(Topic.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy chủ đề.")
    subtree_ids = await assert_topic_deletable(db, obj)
    name = obj.name

    # Xóa từ lá lên gốc để tránh phụ thuộc thứ tự (parent_id không có FK nên không bắt buộc,
    # nhưng đảo ngược thứ tự BFS đảm bảo con luôn bị xóa trước cha).
    result = await db.execute(select(Topic).where(Topic.id.in_(subtree_ids)))
    topics_to_delete = {t.id: t for t in result.scalars().all()}
    for tid in reversed(subtree_ids):
        t = topics_to_delete.get(tid)
        if t is not None:
            await db.delete(t)

    await db.commit()
    return {"success": True, "message": f'Đã xóa chủ đề "{name}".'}


@router.post("/{item_id}/submit")
async def submit_topic(item_id: str, body: TopicSubmitRequest = TopicSubmitRequest(), db: AsyncSession = Depends(get_db)):
    """Gửi thẩm định chủ đề (chuyển trạng thái sang 1 - Chờ thẩm định).

    Chủ đề đã thẩm định (status 2) giữ nguyên trạng thái, không gửi lại.
    """
    result = await db.execute(select(Topic).where(Topic.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy chủ đề.")

    if obj.status == 2:
        return {"success": True, "message": "Chủ đề đã thẩm định, giữ nguyên trạng thái.", "data": _to_response(obj)}

    actor = body.actor or _DEFAULT_ACTOR
    obj.status = 1  # 1: Chờ thẩm định
    obj.submitted_by = actor
    obj.submitted_at = _now()

    # Log history
    history_obj = TopicHistory(
        id=str(uuid.uuid4()),
        topic_id=obj.id,
        action="Gửi thẩm định",
        actor=actor,
        timestamp=_now(),
        note=f"Gửi thẩm định chủ đề '{obj.name}'"
    )
    db.add(history_obj)

    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Gửi thẩm định chủ đề thành công!", "data": _to_response(obj)}


@router.post("/{item_id}/approve")
async def approve_topic(item_id: str, body: TopicReviewRequest, db: AsyncSession = Depends(get_db)):
    """Phê duyệt chủ đề (chuyển trạng thái sang 2 - Đã thẩm định)."""
    result = await db.execute(select(Topic).where(Topic.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy chủ đề.")
    
    actor = body.actor or _DEFAULT_ACTOR
    obj.status = 2  # 2: Đã thẩm định
    obj.approved_by = actor
    obj.approved_at = _now()
    obj.approval_note = body.comment or "Đạt"

    # Log history
    history_obj = TopicHistory(
        id=str(uuid.uuid4()),
        topic_id=obj.id,
        action="Đồng ý",
        actor=actor,
        timestamp=_now(),
        note=f"Đồng ý thẩm định chủ đề '{obj.name}'"
    )
    db.add(history_obj)

    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Phê duyệt chủ đề thành công!", "data": _to_response(obj)}


@router.post("/{item_id}/reject")
async def reject_topic(item_id: str, body: TopicReviewRequest, db: AsyncSession = Depends(get_db)):
    """Từ chối phê duyệt chủ đề (chuyển trạng thái sang 3 - Từ chối)."""
    result = await db.execute(select(Topic).where(Topic.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy chủ đề.")
    
    actor = body.actor or _DEFAULT_ACTOR
    obj.status = 3  # 3: Từ chối
    obj.approved_by = actor
    obj.approved_at = _now()
    obj.approval_note = body.comment or "Cần chỉnh sửa lại"

    # Log history
    history_obj = TopicHistory(
        id=str(uuid.uuid4()),
        topic_id=obj.id,
        action="Từ chối",
        actor=actor,
        timestamp=_now(),
        note=f"Từ chối thẩm định chủ đề '{obj.name}'"
    )
    db.add(history_obj)

    await db.commit()
    await db.refresh(obj)
    return {"success": True, "message": "Từ chối chủ đề thành công!", "data": _to_response(obj)}

@router.get("/{item_id}/history", response_model=TopicHistoryListResponse)
async def get_topic_history(item_id: str, db: AsyncSession = Depends(get_db)):
    """Lấy danh sách lịch sử của một chủ đề."""
    stmt = (
        select(TopicHistory)
        .where(TopicHistory.topic_id == item_id)
        .order_by(TopicHistory.timestamp.desc())
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    
    data = [
        TopicHistoryResponse(
            id=r.id,
            topic_id=r.topic_id,
            action=r.action,
            actor=r.actor,
            timestamp=r.timestamp,
            note=r.note
        ) for r in rows
    ]
    return TopicHistoryListResponse(success=True, count=len(data), data=data)
