"""
Bank Questions — Ngân hàng câu hỏi
Using SQLAlchemy ORM to query the `questions` table and its associated tables.
"""
import json
import time
import uuid
from typing import Optional, List
from datetime import datetime, timezone

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, text, func, or_, and_
from pydantic import BaseModel

from backend.shared.database import get_db
from backend.exam_service.models import (
    Question,
    Exam,
    SubjectCategory,
    GradeLevel,
    CognitiveLevel,
    QuestionType,
    Topic,
    CompetencyComponent,
    QuestionHistory
)

router = APIRouter(prefix="/bank-questions", tags=["Bank Questions"])


class QuestionReviewRequest(BaseModel):
    comment: Optional[str] = ""


class BulkReviewRequest(BaseModel):
    ids: List[str]
    verdict: str  # "approve" or "reject"
    comment: Optional[str] = ""



def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _map_level(level: str | None) -> str:
    """Map DB level code to frontend CognitiveLevel codes."""
    if not level:
        return "nhan_biet"
    level_lower = level.lower().strip()
    if level_lower in ["easy", "nhận biết", "nhan_biet", "vv", "l1", "biết", "biet"]:
        return "nhan_biet"
    elif level_lower in ["medium", "thông hiểu", "thong_hieu", "zz", "l2", "hiểu", "hieu"]:
        return "thong_hieu"
    elif level_lower in ["hard", "vận dụng", "van_dung", "xx", "l3"]:
        return "van_dung"
    elif level_lower in ["very_hard", "vận dụng cao", "van_dung_cao", "vdc", "l4"]:
        return "van_dung_cao"
    return "nhan_biet"


def _map_type(qtype: str | None) -> str:
    """Map question type DB code to frontend QuestionType codes."""
    if not qtype:
        return "single"
    qtype_lower = qtype.lower().strip()
    if qtype_lower in ["single", "tn", "trắc nghiệm", "trac nghiem", "trắc nghiệm một đáp án"]:
        return "single"
    elif qtype_lower in ["multiple", "chn", "câu hỏi nhóm", "cau hoi nhom", "trắc nghiệm nhiều đáp án"]:
        return "multiple"
    elif qtype_lower in ["true_false", "đs", "đúng sai", "dung sai", "đúng / sai"]:
        return "true_false"
    elif qtype_lower in ["short", "tln", "trả lời ngắn", "tra loi ngan", "tự luận"]:
        return "short"
    return "single"


def _map_status(status_val) -> str:
    """Map integer status to frontend QuestionStatus."""
    if status_val == 2:
        return "approved"
    if status_val == 1:
        return "pending"
    if status_val == -1:
        return "rejected"
    return "draft"


class BankQuestionCreate(BaseModel):
    text: str
    type: str = "single"
    level: str = "nhan_biet"
    subject: str
    grade: str
    examId: Optional[str] = None
    options: Optional[List[str]] = None
    correctAnswer: Optional[str | List[str]] = None
    status: Optional[str] = "draft"
    competencyComponentId: Optional[str] = None
    statements: Optional[list] = None
    creator: Optional[str] = None


class BankQuestionUpdate(BaseModel):
    text: Optional[str] = None
    type: Optional[str] = None
    level: Optional[str] = None
    options: Optional[List[str]] = None
    correctAnswer: Optional[str | List[str]] = None
    status: Optional[str] = None
    competencyComponentId: Optional[str] = None
    statements: Optional[list] = None


@router.get("/")
async def list_bank_questions(db: AsyncSession = Depends(get_db)):
    """Lấy tất cả câu hỏi từ bảng questions sử dụng SQLAlchemy ORM."""
    stmt = (
        select(
            Question,
            SubjectCategory.name.label("subject_name"),
            GradeLevel.name.label("grade_name"),
            Topic.name.label("topic_name"),
            CognitiveLevel.code.label("level_code"),
            QuestionType.code.label("type_code"),
            Question.competency_component_id,
            CompetencyComponent.name.label("competency_name")
        )
        .outerjoin(SubjectCategory, Question.subject_id == SubjectCategory.id)
        .outerjoin(GradeLevel, Question.grade_id == GradeLevel.id)
        .outerjoin(Topic, Question.topic_id == Topic.id)
        .outerjoin(CognitiveLevel, Question.level_id == CognitiveLevel.id)
        .outerjoin(QuestionType, Question.type_id == QuestionType.id)
        .outerjoin(CompetencyComponent, Question.competency_component_id == CompetencyComponent.id)
        .order_by(Question.id.desc())
    )
    
    result = await db.execute(stmt)
    rows = result.all()

    data = []
    for q, subj_name, grade_name, topic_name, level_code, type_code, comp_id, comp_name in rows:
        # Parse options
        opts = []
        if q.options:
            try:
                parsed = json.loads(q.options)
                if isinstance(parsed, list):
                    opts = [str(o) for o in parsed]
            except Exception:
                pass

        # Parse correct_answer
        correct_ans = q.correct_answer or ""
        if correct_ans:
            try:
                parsed_ans = json.loads(correct_ans)
                if isinstance(parsed_ans, list):
                    correct_ans = parsed_ans
                elif isinstance(parsed_ans, str):
                    correct_ans = parsed_ans
            except Exception:
                pass

        # Parse statements
        stmts = []
        if q.statements:
            try:
                parsed_stmts = json.loads(q.statements)
                if isinstance(parsed_stmts, list):
                    stmts = parsed_stmts
            except Exception:
                pass

        data.append({
            "id": q.id,
            "code": q.code or (f"Q-{q.id[-6:].upper()}" if len(q.id) >= 6 else q.id),
            "text": q.content or "",
            "type": _map_type(type_code),
            "level": _map_level(level_code),
            "status": _map_status(q.status),
            "subject": subj_name or "",
            "grade": grade_name or "",
            "topicId": q.topic_id or "",
            "topicName": topic_name or "",
            "subTopicName": "",
            "nangLucId": comp_id,
            "nangLuc": comp_name or "",
            "options": opts,
            "correctAnswer": correct_ans,
            "creator": q.created_by or "Hội đồng Chuyên môn",
            "createdAt": _now(),
            "examId": q.exam_id,
            "feedback": q.approved_note or "",
            "statements": stmts,
        })

    return {"success": True, "count": len(data), "data": data}


@router.get("/count-by-topic")
async def count_bank_questions_by_topic(
    topic_ids: str,
    status: int = 2,  # mặc định chỉ đếm câu đã duyệt
    db: AsyncSession = Depends(get_db)
):
    """Đếm số câu hỏi trong ngân hàng, group theo topic/mức độ/loại câu hỏi/năng lực."""
    ids = [t for t in topic_ids.split(",") if t]
    if not ids:
        return {"success": True, "data": []}

    stmt = (
        select(
            Question.topic_id,
            Question.level_id,
            Question.type_id,
            Question.competency_component_id,
            func.count(Question.id).label("count"),
        )
        .where(Question.topic_id.in_(ids))
        .where(Question.status == status)
        .group_by(Question.topic_id, Question.level_id, Question.type_id, Question.competency_component_id)
    )
    result = await db.execute(stmt)
    data = [
        {
            "topic_id": r.topic_id,
            "level_id": r.level_id,
            "type_id": r.type_id,
            "competency_component_id": r.competency_component_id,
            "count": r.count,
        }
        for r in result.all()
    ]
    return {"success": True, "data": data}


class RandomSelectCell(BaseModel):
    don_vi_id: str
    muc_do_id: Optional[str] = None
    loai_cau_hoi_id: Optional[str] = None
    nang_luc_id: Optional[str] = None
    so_cau: int


class RandomSelectRequest(BaseModel):
    grade_id: Optional[str] = None
    status: int = 2
    cells: List[RandomSelectCell]


@router.post("/random-select")
async def random_select_questions(body: RandomSelectRequest, db: AsyncSession = Depends(get_db)):
    """Chọn ngẫu nhiên câu hỏi đã duyệt khớp từng ô của ma trận (topic/mức độ/loại câu hỏi/năng lực).
    Câu chưa gắn năng lực (competency_component_id = NULL) được coi là khớp mọi cột năng lực,
    nhất quán với cách tính tong_so_cau ở ma trận đề. Một câu đã được chọn cho 1 ô sẽ không được
    chọn lại cho ô khác trong cùng lượt sinh, tránh trùng lặp câu hỏi trong đề."""
    excluded: set[str] = set()
    results = []
    for cell in body.cells:
        if cell.so_cau <= 0:
            results.append({
                "don_vi_id": cell.don_vi_id, "muc_do_id": cell.muc_do_id,
                "loai_cau_hoi_id": cell.loai_cau_hoi_id, "nang_luc_id": cell.nang_luc_id,
                "requested": 0, "found": 0, "questionIds": [],
            })
            continue

        conditions = [Question.topic_id == cell.don_vi_id, Question.status == body.status]
        if cell.muc_do_id:
            conditions.append(Question.level_id == cell.muc_do_id)
        if cell.loai_cau_hoi_id:
            conditions.append(Question.type_id == cell.loai_cau_hoi_id)
        if body.grade_id:
            conditions.append(Question.grade_id == body.grade_id)
        if cell.nang_luc_id:
            conditions.append(or_(
                Question.competency_component_id == cell.nang_luc_id,
                Question.competency_component_id.is_(None),
            ))
        if excluded:
            conditions.append(Question.id.notin_(excluded))

        stmt = select(Question.id).where(and_(*conditions)).order_by(func.rand()).limit(cell.so_cau)
        ids = [r[0] for r in (await db.execute(stmt)).all()]
        excluded.update(ids)

        results.append({
            "don_vi_id": cell.don_vi_id, "muc_do_id": cell.muc_do_id,
            "loai_cau_hoi_id": cell.loai_cau_hoi_id, "nang_luc_id": cell.nang_luc_id,
            "requested": cell.so_cau, "found": len(ids), "questionIds": ids,
        })

    return {"success": True, "data": results}


@router.post("/", status_code=201)
async def create_bank_question(body: BankQuestionCreate, db: AsyncSession = Depends(get_db)):
    """Tạo câu hỏi mới vào ngân hàng câu hỏi."""
    # Find SubjectCategory
    subj_stmt = select(SubjectCategory).where(SubjectCategory.name.ilike(f"%{body.subject}%"))
    subj_res = await db.execute(subj_stmt)
    subject = subj_res.scalar_one_or_none()
    if not subject:
         # Fallback search by code
         subj_stmt = select(SubjectCategory).where(SubjectCategory.code.ilike(f"%{body.subject}%"))
         subj_res = await db.execute(subj_stmt)
         subject = subj_res.scalar_one_or_none()
         if not subject:
             raise HTTPException(status_code=400, detail=f"Không tìm thấy môn học '{body.subject}'")

    # Find GradeLevel
    gr_stmt = select(GradeLevel).where(GradeLevel.name.ilike(f"%{body.grade}%"))
    gr_res = await db.execute(gr_stmt)
    grade = gr_res.scalar_one_or_none()
    if not grade:
         # Fallback search by code or clean value
         grade_clean = body.grade.lower().replace("khối", "").replace("lớp", "").strip()
         gr_stmt = select(GradeLevel).where(GradeLevel.name.ilike(f"%{grade_clean}%") | GradeLevel.code.ilike(f"%{grade_clean}%"))
         gr_res = await db.execute(gr_stmt)
         grade = gr_res.scalar_one_or_none()
         if not grade:
             raise HTTPException(status_code=400, detail=f"Không tìm thấy khối lớp '{body.grade}'")

    # Find CognitiveLevel
    db_level_code = {"nhan_biet": "vv", "thong_hieu": "zz", "van_dung": "xx", "van_dung_cao": "VDC"}.get(body.level, "vv")
    level_stmt = select(CognitiveLevel).where(CognitiveLevel.code == db_level_code)
    level_res = await db.execute(level_stmt)
    level = level_res.scalar_one_or_none()

    # Find QuestionType
    db_type_code = {"single": "TN", "multiple": "CHN", "true_false": "ĐS", "short": "TLN"}.get(body.type, "TN")
    type_stmt = select(QuestionType).where(QuestionType.code == db_type_code)
    type_res = await db.execute(type_stmt)
    qtype = type_res.scalar_one_or_none()

    # Get exam_id
    exam_id = body.examId
    if not exam_id:
        exam_stmt = select(Exam).where(Exam.subject == body.subject).limit(1)
        exam_res = await db.execute(exam_stmt)
        exam = exam_res.scalar_one_or_none()
        if exam:
            exam_id = exam.id

    q_id = f"q-nhch-{int(time.time() * 1000)}"
    status_int = {"approved": 2, "pending": 1, "draft": 0}.get(body.status or "draft", 0)

    # Options and Correct Answer conversion
    options_str = json.dumps(body.options or [], ensure_ascii=False)
    correct_ans_str = json.dumps(body.correctAnswer, ensure_ascii=False) if isinstance(body.correctAnswer, list) else (body.correctAnswer or "")
    statements_str = json.dumps(body.statements, ensure_ascii=False) if body.statements else None

    # Kiểm tra thành phần năng lực tồn tại trước khi gán FK — tránh crash 500 do vi phạm khóa ngoại
    # nếu id gửi lên không hợp lệ/đã bị xóa (field tùy chọn nên bỏ qua thay vì chặn tạo câu hỏi).
    competency_component_id = None
    if body.competencyComponentId:
        comp_stmt = select(CompetencyComponent).where(CompetencyComponent.id == body.competencyComponentId)
        comp_res = await db.execute(comp_stmt)
        if comp_res.scalar_one_or_none():
            competency_component_id = body.competencyComponentId

    question = Question(
        id=q_id,
        code=f"Q-{q_id[-6:].upper()}",
        content=body.text,
        options=options_str,
        correct_answer=correct_ans_str,
        subject_id=subject.id if subject else None,
        grade_id=grade.id if grade else None,
        level_id=level.id if level else None,
        type_id=qtype.id if qtype else None,
        competency_component_id=competency_component_id,
        exam_id=exam_id,
        status=status_int,
        line_number=1,
        statements=statements_str,
        created_by=body.creator,
    )
    
    db.add(question)
    await db.commit()
    await db.refresh(question)

    return {
        "success": True,
        "message": "Thêm câu hỏi thành công!",
        "data": {
            "id": question.id,
            "code": question.code,
            "text": question.content,
            "type": body.type,
            "level": body.level,
            "status": body.status or "draft",
            "subject": body.subject,
            "grade": body.grade,
            "topicId": None,
            "topicName": "",
            "options": body.options or [],
            "correctAnswer": body.correctAnswer or "",
            "creator": body.creator or "Hội đồng Chuyên môn",
            "createdAt": _now(),
            "statements": body.statements or [],
        }
    }


@router.put("/{question_id}")
async def update_bank_question(question_id: str, body: BankQuestionUpdate, db: AsyncSession = Depends(get_db)):
    """Cập nhật câu hỏi."""
    stmt = select(Question).where(Question.id == question_id)
    res = await db.execute(stmt)
    question = res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")

    if body.text is not None:
        question.content = body.text
    if body.type is not None:
        db_type_code = {"single": "TN", "multiple": "CHN", "true_false": "ĐS", "short": "TLN"}.get(body.type, "TN")
        type_stmt = select(QuestionType).where(QuestionType.code == db_type_code)
        type_res = await db.execute(type_stmt)
        qtype = type_res.scalar_one_or_none()
        if qtype:
            question.type_id = qtype.id
    if body.level is not None:
        db_level_code = {"nhan_biet": "vv", "thong_hieu": "zz", "van_dung": "xx", "van_dung_cao": "VDC"}.get(body.level, "vv")
        level_stmt = select(CognitiveLevel).where(CognitiveLevel.code == db_level_code)
        level_res = await db.execute(level_stmt)
        level = level_res.scalar_one_or_none()
        if level:
            question.level_id = level.id
    if body.options is not None:
        question.options = json.dumps(body.options, ensure_ascii=False)
    if body.correctAnswer is not None:
        question.correct_answer = json.dumps(body.correctAnswer, ensure_ascii=False) if isinstance(body.correctAnswer, list) else str(body.correctAnswer)
    if body.status is not None:
        question.status = {"approved": 2, "pending": 1, "draft": 0}.get(body.status, 0)
    if body.competencyComponentId is not None:
        # Kiểm tra tồn tại trước khi gán FK — tránh crash 500 nếu id không hợp lệ/đã bị xóa.
        comp_stmt = select(CompetencyComponent).where(CompetencyComponent.id == body.competencyComponentId)
        comp_res = await db.execute(comp_stmt)
        question.competency_component_id = body.competencyComponentId if comp_res.scalar_one_or_none() else None
    if body.statements is not None:
        question.statements = json.dumps(body.statements, ensure_ascii=False)

    await db.commit()
    return {"success": True, "message": "Cập nhật câu hỏi thành công!"}


@router.delete("/{question_id}")
async def delete_bank_question(question_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa câu hỏi."""
    stmt = select(Question).where(Question.id == question_id)
    res = await db.execute(stmt)
    question = res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")

    await db.delete(question)
    await db.commit()
    return {"success": True, "message": "Đã xóa câu hỏi thành công!"}


@router.post("/{question_id}/submit")
async def submit_bank_question(question_id: str, db: AsyncSession = Depends(get_db)):
    """Gửi câu hỏi đi thẩm định (status → 1)."""
    stmt = select(Question).where(Question.id == question_id)
    res = await db.execute(stmt)
    question = res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")

    question.status = 1
    await db.commit()
    return {"success": True, "message": "Đã gửi câu hỏi đi thẩm định!"}


@router.post("/bulk-review")
async def bulk_review_bank_questions(body: BulkReviewRequest, db: AsyncSession = Depends(get_db)):
    """Thẩm định nhanh hàng loạt câu hỏi."""
    stmt = select(Question).where(Question.id.in_(body.ids))
    res = await db.execute(stmt)
    questions = res.scalars().all()
    
    status_val = 2 if body.verdict == "approve" else -1
    action_label = "Đồng ý" if body.verdict == "approve" else "Từ chối"
    
    for question in questions:
        question.status = status_val
        question.approved_note = body.comment or ""
        
        # Log QuestionHistory
        history_obj = QuestionHistory(
            id=str(uuid.uuid4()),
            question_id=question.id,
            actor="admin",
            action=action_label,
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            note=body.comment or (f"{action_label} thẩm định hàng loạt")
        )
        db.add(history_obj)
        
    await db.commit()
    return {"success": True, "message": f"Đã thẩm định thành công {len(questions)} câu hỏi!"}


@router.post("/{question_id}/approve")
async def approve_bank_question(question_id: str, body: QuestionReviewRequest = QuestionReviewRequest(), db: AsyncSession = Depends(get_db)):
    """Phê duyệt câu hỏi (status → 2)."""
    stmt = select(Question).where(Question.id == question_id)
    res = await db.execute(stmt)
    question = res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")

    question.status = 2
    question.approved_note = body.comment or ""
    
    # Log QuestionHistory
    history_obj = QuestionHistory(
        id=str(uuid.uuid4()),
        question_id=question.id,
        actor="admin",
        action="Đồng ý",
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        note=body.comment or "Đồng ý thẩm định"
    )
    db.add(history_obj)
    
    await db.commit()
    return {"success": True, "message": "Đã phê duyệt câu hỏi!"}


@router.post("/{question_id}/reject")
async def reject_bank_question(question_id: str, body: QuestionReviewRequest = QuestionReviewRequest(), db: AsyncSession = Depends(get_db)):
    """Từ chối câu hỏi (status → -1 rejected)."""
    stmt = select(Question).where(Question.id == question_id)
    res = await db.execute(stmt)
    question = res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")

    question.status = -1
    question.approved_note = body.comment or ""
    
    # Log QuestionHistory
    history_obj = QuestionHistory(
        id=str(uuid.uuid4()),
        question_id=question.id,
        actor="admin",
        action="Từ chối",
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        note=body.comment or "Từ chối thẩm định"
    )
    db.add(history_obj)
    
    await db.commit()
    return {"success": True, "message": "Đã từ chối câu hỏi!"}
