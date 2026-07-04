"""
Exam CRUD routes — ported from examService.ts
Handles: GET /exams, POST /exams, PUT /exams/{id}, DELETE /exams/{id}
"""
import json
import time
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, delete, text, update

from backend.shared.database import get_db
from backend.exam_service.models import Exam, Question
from backend.exam_service.schemas import (
    ExamCreate, ExamUpdate, ExamResponse,
    ExamListResponse, QuestionResponse,
)

router = APIRouter(prefix="/exams", tags=["Exams"])


@router.get("/debug-db")
async def debug_db(db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(text("DESCRIBE questions;"))
        rows = res.fetchall()
        columns = [dict(zip(res.keys(), r)) for r in rows]
        return {"success": True, "columns": columns}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _parse_options(options_str: str | None) -> list[str]:
    if not options_str:
        return []
    try:
        parsed = json.loads(options_str) if isinstance(options_str, str) else options_str
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _build_exam_response(exam: Exam, questions: list[Question]) -> ExamResponse:
    return ExamResponse(
        id=exam.id,
        code=exam.code,
        name=exam.name,
        subject=exam.subject,
        grade=exam.grade,
        status=exam.status or "draft",
        attempts=exam.attempts or 0,
        totalQuestions=exam.totalQuestions or 0,
        avgScore=exam.avgScore or 0.0,
        createdAt=exam.createdAt,
        duration=exam.duration or 60,
        description=exam.description or "",
        source=exam.source or "manual",
        questions=[
            QuestionResponse(
                id=q.id,
                code=q.code,
                content=q.content,
                options=q.options,
                correct_answer=q.correct_answer,
                topic_id=q.topic_id,
                parent_id=q.parent_id,
                subject_id=q.subject_id,
                grade_id=q.grade_id,
                level_id=q.level_id,
                type_id=q.type_id,
                competency_component_id=q.competency_component_id,
                line_number=q.line_number or 1,
                status=q.status or 0,
                status_ai=q.status_ai or 0,
                approved_note=q.approved_note or "",
                exam_id=q.exam_id,
            )
            for q in questions
        ],
    )


@router.get("/", response_model=ExamListResponse)
async def list_exams(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả đề thi."""
    result = await db.execute(select(Exam).order_by(Exam.createdAt.desc()))
    exams = result.scalars().all()

    q_result = await db.execute(select(Question))
    all_questions = q_result.scalars().all()

    # Group questions by exam_id
    questions_by_exam: dict[str, list[Question]] = {}
    for q in all_questions:
        if q.exam_id:
            questions_by_exam.setdefault(q.exam_id, []).append(q)

    data = [
        _build_exam_response(e, questions_by_exam.get(e.id, []))
        for e in exams
    ]
    return ExamListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_exam(body: ExamCreate, db: AsyncSession = Depends(get_db)):
    """Tạo đề thi mới."""
    exam_id = f"exam-{int(time.time() * 1000)}"
    exam_code = body.code or f"DE-{str(int(time.time()))[-6:].upper()}"
    now = datetime.utcnow().isoformat() + "Z"

    exam = Exam(
        id=exam_id,
        code=exam_code,
        name=body.name,
        subject=body.subject,
        grade=body.grade,
        status="pending",
        attempts=0,
        totalQuestions=0,
        avgScore=0.0,
        createdAt=now,
        duration=body.duration or 60,
        description=body.description or "",
        source=body.source or "manual",
    )
    db.add(exam)

    questions: list[Question] = []
    if body.questionIds:
        # Gắn (không nhân bản) các câu hỏi đã có sẵn trong Ngân hàng câu hỏi vào đề thi này.
        await db.execute(
            update(Question).where(Question.id.in_(body.questionIds)).values(exam_id=exam_id)
        )
    else:
        for i, q in enumerate(body.questions or []):
            question = Question(
                id=f"q-{int(time.time() * 1000)}-{i}",
                exam_id=exam_id,
                code=q.code or f"Q-{str(int(time.time()))[-6:].upper()}-{i}",
                content=q.content,
                options=q.options,
                correct_answer=q.correct_answer,
                topic_id=q.topic_id,
                parent_id=q.parent_id,
                subject_id=q.subject_id,
                grade_id=q.grade_id,
                level_id=q.level_id,
                type_id=q.type_id,
                competency_component_id=q.competency_component_id,
                line_number=q.line_number or (i + 1),
                status=q.status or 0,
                status_ai=q.status_ai or 0,
                approved_note=q.approved_note or "",
            )
            db.add(question)
            questions.append(question)

    await db.commit()

    if body.questionIds:
        q_result = await db.execute(select(Question).where(Question.exam_id == exam_id))
        questions = list(q_result.scalars().all())
    exam.totalQuestions = len(questions)
    await db.commit()

    return {
        "success": True,
        "message": "Khởi tạo đề thi thành công!",
        "data": _build_exam_response(exam, questions),
    }


@router.put("/{exam_id}")
async def update_exam(exam_id: str, body: ExamUpdate, db: AsyncSession = Depends(get_db)):
    """Cập nhật thông tin đề thi."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề thi yêu cầu.")

    # Update scalar fields
    update_fields = body.model_dump(exclude_unset=True, exclude={"questions", "questionIds"})
    for field, value in update_fields.items():
        if hasattr(exam, field):
            setattr(exam, field, value)

    if body.questionIds is not None:
        # Gỡ liên kết các câu hỏi không còn được chọn (KHÔNG xoá khỏi Ngân hàng câu hỏi),
        # rồi gắn lại đúng danh sách câu hỏi hiện được chọn cho đề thi này.
        await db.execute(
            update(Question).where(Question.exam_id == exam_id, Question.id.notin_(body.questionIds)).values(exam_id=None)
        )
        if body.questionIds:
            await db.execute(
                update(Question).where(Question.id.in_(body.questionIds)).values(exam_id=exam_id)
            )
    elif body.questions is not None:
        # Đường cũ (chưa có caller nào dùng): xoá và tạo lại câu hỏi thuộc đề thi này.
        await db.execute(delete(Question).where(Question.exam_id == exam_id))
        for i, q in enumerate(body.questions):
            question = Question(
                id=f"q-{int(time.time() * 1000)}-{i}",
                exam_id=exam_id,
                code=q.code or f"Q-{str(int(time.time()))[-6:].upper()}-{i}",
                content=q.content,
                options=q.options,
                correct_answer=q.correct_answer,
                topic_id=q.topic_id,
                parent_id=q.parent_id,
                subject_id=q.subject_id,
                grade_id=q.grade_id,
                level_id=q.level_id,
                type_id=q.type_id,
                competency_component_id=q.competency_component_id,
                line_number=q.line_number or (i + 1),
                status=q.status or 0,
                status_ai=q.status_ai or 0,
                approved_note=q.approved_note or "",
            )
            db.add(question)

    await db.commit()
    await db.refresh(exam)

    # Fetch updated questions
    q_result = await db.execute(select(Question).where(Question.exam_id == exam_id))
    questions = q_result.scalars().all()

    if body.questionIds is not None or body.questions is not None:
        exam.totalQuestions = len(questions)
        await db.commit()

    return {
        "success": True,
        "message": "Đã cập nhật thông tin đề thi thành công!",
        "data": _build_exam_response(exam, list(questions)),
    }


@router.delete("/{exam_id}")
async def delete_exam(exam_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa đề thi. Gỡ liên kết câu hỏi (exam_id = NULL) trước khi xoá, KHÔNG xoá câu hỏi khỏi
    Ngân hàng câu hỏi — vì câu hỏi có thể chỉ đang được gắn (link) từ ngân hàng dùng chung,
    không phải bản sao riêng của đề thi này."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề thi cần xóa.")

    name = exam.name
    await db.execute(update(Question).where(Question.exam_id == exam_id).values(exam_id=None))
    await db.execute(delete(Exam).where(Exam.id == exam_id))
    await db.commit()
    return {"success": True, "message": f'Đã gỡ bỏ đề thi "{name}" khỏi hệ thống.'}
