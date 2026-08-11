"""
Bank Questions — Ngân hàng câu hỏi
Using SQLAlchemy ORM to query the `questions` table and its associated tables.
"""
import json
import time
import unicodedata
import uuid
from typing import Optional, List
from datetime import datetime, timezone

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, delete, text, func, or_, and_
# pyrefly: ignore [missing-import]
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
    QuestionHistory,
    INT_TO_SOURCE,
    SOURCE_TO_INT,
)
from backend.exam_service.schemas import QuestionHistoryResponse, QuestionHistoryListResponse

router = APIRouter(prefix="/bank-questions", tags=["Bank Questions"])

_DEFAULT_ACTOR = "Hội đồng Chuyên môn"


class QuestionReviewRequest(BaseModel):
    comment: Optional[str] = ""
    # Người thực hiện thẩm định — trước đây route này không nhận actor nên luôn ghi cứng "admin"
    # bất kể ai bấm duyệt/từ chối thật.
    actor: Optional[str] = None


class BulkReviewRequest(BaseModel):
    ids: List[str]
    verdict: str  # "approve" or "reject"
    comment: Optional[str] = ""
    actor: Optional[str] = None


class BulkDeleteRequest(BaseModel):
    ids: List[str]


class BankQuestionSubmitRequest(BaseModel):
    # Người gửi thẩm định — trước đây endpoint submit không nhận body nào.
    actor: Optional[str] = None


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _normalize_vn(s: str | None) -> str:
    """Bỏ dấu tiếng Việt + hạ chữ thường — soi y hệt `normalize()` phía FE (utils/cognitiveLevel.ts)
    để 2 chiều map (FE hiển thị dropdown, BE map ngược khi đọc) luôn nhất quán với nhau."""
    if not s:
        return ""
    decomposed = unicodedata.normalize("NFD", s)
    stripped = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
    return stripped.replace("đ", "d").replace("Đ", "d").lower().strip()


def _map_level(code: str | None, name: str | None = None) -> str:
    """Map 1 bản ghi Cấp độ tư duy thật (code + name) về đúng 1 trong 4 giá trị enum FE cố định.

    Khớp theo NAME (tiếng Việt, đã bỏ dấu) TRƯỚC — đáng tin cậy hơn code vì code là ô nhập tự do
    không theo chuẩn nào (đã quan sát "TH" cho "Thông hiểu", không nằm trong bất kỳ danh sách mã
    cũ nào), code chỉ dùng làm phương án dự phòng tương thích ngược. Kiểm tra "vận dụng cao" trước
    "vận dụng" vì chuỗi sau là tập con của chuỗi trước — giống hệt thứ tự ở FE."""
    norm_name = _normalize_vn(name)
    norm_code = _normalize_vn(code)

    if "van dung cao" in norm_name or norm_code in ["vdc", "l4"]:
        return "van_dung_cao"
    if "van dung" in norm_name or norm_code in ["vd", "xx", "l3", "van_dung"]:
        return "van_dung"
    if "thong hieu" in norm_name or norm_code in ["th", "zz", "l2", "thong_hieu"]:
        return "thong_hieu"
    if "nhan biet" in norm_name or norm_code in ["nb", "vv", "l1", "nhan_biet"]:
        return "nhan_biet"
    return "nhan_biet"


# Alias ngược (enum FE -> danh sách code/tên có thể khớp trong danh mục Cấp độ tư duy) — dùng khi
# TẠO/SỬA câu hỏi để tra level_id. Cột "code" trong danh mục là ô nhập tự do, không có giá trị cố
# định duy nhất cho mỗi mức — liệt kê đủ mọi biến thể đã quan sát được (khớp 1-1 với các nhóm trong
# `_map_level` ở trên, theo chiều ngược lại).
LEVEL_ALIAS_MAP: dict[str, list[str]] = {
    "nhan_biet": ["nhận biết", "nhan biet", "vv", "l1", "biết", "biet"],
    "thong_hieu": ["thông hiểu", "thong hieu", "zz", "l2", "hiểu", "hieu", "th"],
    "van_dung": ["vận dụng", "van dung", "xx", "l3"],
    "van_dung_cao": ["vận dụng cao", "van dung cao", "vdc", "l4"],
}


def _map_type(qtype: str | None) -> str:
    """Map question type DB code to frontend QuestionType codes."""
    if not qtype:
        return "single"
    qtype_lower = qtype.lower().strip()
    if qtype_lower in ["single", "tn", "trắc nghiệm", "trac nghiem", "trắc nghiệm một đáp án"]:
        return "single"
    elif qtype_lower in ["multiple", "chn", "câu hỏi nhóm", "cau hoi nhom", "trắc nghiệm nhiều đáp án"]:
        return "multiple"
    elif qtype_lower in ["true_false", "ds", "đúng sai", "dung sai", "đúng / sai"]:
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
    topicId: Optional[str] = None
    options: Optional[List[str]] = None
    correctAnswer: Optional[str | List[str]] = None
    status: Optional[str] = None
    competencyComponentId: Optional[str] = None
    statements: Optional[list] = None
    # Người thực hiện chỉnh sửa — dùng để ghi lịch sử, không phải cột dữ liệu câu hỏi.
    actor: Optional[str] = None


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
            CognitiveLevel.name.label("level_name"),
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
    for q, subj_name, grade_name, topic_name, level_code, level_name, type_code, comp_id, comp_name in rows:
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
            "level": _map_level(level_code, level_name),
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
            "createdAt": q.created_at or _now(),
            "examId": q.exam_id,
            "feedback": q.approved_note or "",
            "statements": stmts,
            # KHÔNG dùng "or 1" — line_number=0 (câu tự do, chưa thuộc đề) là giá trị FALSY hợp lệ,
            # "or 1" sẽ âm thầm biến nó thành 1 và làm hỏng bộ lọc "chỉ chọn câu line_number=0" ở
            # ModalChonCauHoi.tsx/random_select_questions.
            "lineNumber": q.line_number if q.line_number is not None else 0,
            # Nguồn gốc câu hỏi (manual/ai_bank/ai_exam) — xem comment ở Question.status_ai trong
            # models.py. FE dùng để ẩn câu hỏi "ai_exam" khỏi Ngân hàng câu hỏi/Thẩm định/picker.
            "source": INT_TO_SOURCE.get(q.status_ai or 0, "manual"),
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
        # Chỉ đếm câu tự do trong Ngân hàng câu hỏi (chưa gắn vào đề nào) — câu đã thuộc 1 đề
        # (exam_id NOT NULL, line_number >= 1, xem comment ở Question.line_number trong models.py)
        # không được tính vào số câu khả dụng để soạn ma trận, nếu không tổng sẽ bị đếm dư.
        .where(Question.exam_id.is_(None))
        .where(Question.line_number == 0)
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

        conditions = [
            Question.topic_id == cell.don_vi_id,
            Question.status == body.status,
            # Loại câu hỏi "sinh cả đề bằng AI" (ma trận đề / đề hoán vị) — cùng điều kiện ẩn
            # đang áp dụng ở tab Ngân hàng câu hỏi (q.source !== 'ai_exam'), tránh random-select
            # âm thầm bốc phải câu hỏi vốn không hiển thị/kiểm soát được ở Ngân hàng câu hỏi.
            # status_ai có thể NULL với dữ liệu cũ (chưa từng backfill) nên phải cho phép NULL
            # đi qua, chứ "!= 2" thuần SQL sẽ loại luôn NULL (unknown), làm mất câu hỏi cũ hợp lệ.
            or_(Question.status_ai.is_(None), Question.status_ai != SOURCE_TO_INT["ai_exam"]),
            # Chỉ chọn câu TỰ DO trong Ngân hàng (chưa nhân bản vào đề nào) — câu đã thuộc 1 đề
            # (exam_id NOT NULL, line_number >= 1) là bản sao RIÊNG của đề đó (xem
            # exams.py::_duplicate_questions_into_exam), không được bốc lại cho đề khác.
            Question.exam_id.is_(None),
            Question.line_number == 0,
        ]
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
    # Dùng .scalars().first() thay vì .scalar_one_or_none() cho mọi lookup ILIKE "%...%"
    # bên dưới — pattern này có thể khớp nhiều dòng cùng lúc (kể cả "%%" khi rỗng), và
    # .scalar_one_or_none() sẽ raise MultipleResultsFound (uncaught → 500 không rõ nghĩa).
    subj_stmt = select(SubjectCategory).where(SubjectCategory.name.ilike(f"%{body.subject}%"))
    subj_res = await db.execute(subj_stmt)
    subject = subj_res.scalars().first()
    if not subject:
         # Fallback search by code
         subj_stmt = select(SubjectCategory).where(SubjectCategory.code.ilike(f"%{body.subject}%"))
         subj_res = await db.execute(subj_stmt)
         subject = subj_res.scalars().first()
         if not subject:
             raise HTTPException(status_code=400, detail=f"Không tìm thấy môn học '{body.subject}'")

    # Find GradeLevel
    gr_stmt = select(GradeLevel).where(GradeLevel.name.ilike(f"%{body.grade}%"))
    gr_res = await db.execute(gr_stmt)
    grade = gr_res.scalars().first()
    if not grade:
         # Fallback search by code or clean value
         grade_clean = body.grade.lower().replace("khối", "").replace("lớp", "").strip()
         gr_stmt = select(GradeLevel).where(GradeLevel.name.ilike(f"%{grade_clean}%") | GradeLevel.code.ilike(f"%{grade_clean}%"))
         gr_res = await db.execute(gr_stmt)
         grade = gr_res.scalars().first()
         if not grade:
             raise HTTPException(status_code=400, detail=f"Không tìm thấy khối lớp '{body.grade}'")

    # Find CognitiveLevel — tra theo NHIỀU alias (code cũ lẫn tên tiếng Việt có dấu), không so
    # sánh == với đúng 1 giá trị code cố định như trước ("zz" cho thong_hieu...). Cột "code" trong
    # danh mục Cấp độ tư duy là ô nhập tự do, dữ liệu thật quan sát được "Thông hiểu" có code "TH"
    # chứ không phải "zz" — so sánh cứng khiến level luôn None, lưu level_id=NULL, và khi đọc lại
    # (_map_level ở trên) NULL bị mặc định hiển thị thành "Nhận biết", dù người dùng chọn đúng.
    level_aliases = LEVEL_ALIAS_MAP.get(body.level, [body.level])
    level = None
    for alias in level_aliases:
        level_stmt = select(CognitiveLevel).where(CognitiveLevel.code.ilike(alias) | CognitiveLevel.name.ilike(alias))
        level_res = await db.execute(level_stmt)
        level = level_res.scalars().first()
        if level:
            break

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
        line_number=0,
        statements=statements_str,
        created_by=body.creator,
        created_at=_now(),
    )

    db.add(question)

    history_obj = QuestionHistory(
        id=str(uuid.uuid4()),
        question_id=question.id,
        actor=body.creator or _DEFAULT_ACTOR,
        action="Thêm mới",
        timestamp=_now(),
        note=f"Thêm mới câu hỏi mã {question.code}",
    )
    db.add(history_obj)

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

    old_status = question.status

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
        level_aliases = LEVEL_ALIAS_MAP.get(body.level, [body.level])
        level = None
        for alias in level_aliases:
            level_stmt = select(CognitiveLevel).where(CognitiveLevel.code.ilike(alias) | CognitiveLevel.name.ilike(alias))
            level_res = await db.execute(level_stmt)
            level = level_res.scalars().first()
            if level:
                break
        if level:
            question.level_id = level.id
    if body.topicId is not None:
        # FE gửi topicId = key tiểu mục (nếu chọn) hoặc key chủ đề cha (nếu không có tiểu mục) —
        # bảng topics tự tham chiếu parent_id nên tra đúng bản ghi đó là đủ, không cần phân biệt
        # chủ đề/tiểu mục ở đây. Trước đây field này không tồn tại trong BankQuestionUpdate nên
        # bị Pydantic âm thầm bỏ qua — sửa chủ đề/tiểu mục báo thành công nhưng không đổi gì.
        topic_stmt = select(Topic).where(Topic.id == body.topicId)
        topic_res = await db.execute(topic_stmt)
        topic = topic_res.scalar_one_or_none()
        if topic:
            question.topic_id = topic.id
            question.parent_id = topic.parent_id
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

    # FE "Gửi thẩm định" trong modal Cập nhật gửi thẳng status='pending' qua route này (không qua
    # /submit riêng) — phân biệt 2 trường hợp để lịch sử đúng ý nghĩa, không phải luôn ghi "Sửa".
    actor = body.actor or _DEFAULT_ACTOR
    is_submit_transition = (
        body.status == "pending" and old_status in (0, -1) and old_status != question.status
    )
    history_obj = QuestionHistory(
        id=str(uuid.uuid4()),
        question_id=question.id,
        actor=actor,
        action="Gửi thẩm định" if is_submit_transition else "Sửa",
        timestamp=_now(),
        note=(
            f"Gửi thẩm định câu hỏi mã {question.code}"
            if is_submit_transition
            else f"Sửa thông tin câu hỏi mã {question.code}"
        ),
    )
    db.add(history_obj)

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

    # questions.exam_id chỉ được gán khi câu hỏi đã thực sự nằm trong 1 đề thi đã lưu (xem
    # exams.py::create_exam/update_exam) — không cho xóa để tránh phá vỡ đề thi đang tham chiếu
    # câu hỏi này. Người dùng phải gỡ câu hỏi khỏi đề (hoặc xóa đề) trước.
    if question.exam_id:
        exam_stmt = select(Exam).where(Exam.id == question.exam_id)
        exam = (await db.execute(exam_stmt)).scalar_one_or_none()
        if exam:
            raise HTTPException(
                status_code=400,
                detail=f"Không thể xóa câu hỏi vì đang được sử dụng trong đề thi \"{exam.name}\". Vui lòng gỡ câu hỏi khỏi đề thi trước khi xóa.",
            )

    await db.delete(question)
    await db.commit()
    return {"success": True, "message": "Đã xóa câu hỏi thành công!"}


@router.post("/bulk-delete")
async def bulk_delete_bank_questions(body: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    """Xóa nhiều câu hỏi cùng lúc trong 1 lượt round-trip DB — thay cho việc FE trước đây gọi
    DELETE /{question_id} riêng lẻ cho từng câu (dù đã Promise.all song song ở FE, mỗi request vẫn
    tốn 2 round-trip DB + 1 transaction/commit riêng, cộng dồn rất chậm khi xóa hàng chục/trăm câu)."""
    if not body.ids:
        return {"success": True, "message": "Không có câu hỏi nào để xóa.", "deletedCount": 0, "blocked": []}

    stmt = select(Question).where(Question.id.in_(body.ids))
    res = await db.execute(stmt)
    questions = res.scalars().all()
    found_ids = {q.id for q in questions}

    # Cùng ràng buộc như xóa đơn: câu hỏi đã gắn vào 1 đề thi đã lưu (exam_id) thì chặn xóa để tránh
    # phá vỡ đề thi đang tham chiếu — 1 query duy nhất tra tên đề cho TOÀN BỘ câu bị chặn, không lặp
    # từng câu.
    exam_ids = {q.exam_id for q in questions if q.exam_id}
    exam_names: dict[str, str] = {}
    if exam_ids:
        exam_res = await db.execute(select(Exam.id, Exam.name).where(Exam.id.in_(exam_ids)))
        exam_names = {row.id: row.name for row in exam_res}

    blocked = [
        {"id": q.id, "code": q.code, "examName": exam_names.get(q.exam_id, "")}
        for q in questions if q.exam_id and q.exam_id in exam_names
    ]
    blocked_ids = {b["id"] for b in blocked}
    deletable_ids = [qid for qid in found_ids if qid not in blocked_ids]

    if deletable_ids:
        await db.execute(delete(Question).where(Question.id.in_(deletable_ids)))
        await db.commit()

    return {
        "success": True,
        "message": f"Đã xóa {len(deletable_ids)} câu hỏi thành công!",
        "deletedCount": len(deletable_ids),
        "blocked": blocked,
        "notFoundIds": [qid for qid in body.ids if qid not in found_ids],
    }


@router.post("/{question_id}/submit")
async def submit_bank_question(
    question_id: str,
    body: BankQuestionSubmitRequest = BankQuestionSubmitRequest(),
    db: AsyncSession = Depends(get_db),
):
    """Gửi câu hỏi đi thẩm định (status → 1)."""
    stmt = select(Question).where(Question.id == question_id)
    res = await db.execute(stmt)
    question = res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")

    question.status = 1

    history_obj = QuestionHistory(
        id=str(uuid.uuid4()),
        question_id=question.id,
        actor=body.actor or _DEFAULT_ACTOR,
        action="Gửi thẩm định",
        timestamp=_now(),
        note=f"Gửi thẩm định câu hỏi mã {question.code}",
    )
    db.add(history_obj)

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
    actor = body.actor or _DEFAULT_ACTOR

    for question in questions:
        question.status = status_val
        question.approved_note = body.comment or ""

        # Log QuestionHistory
        history_obj = QuestionHistory(
            id=str(uuid.uuid4()),
            question_id=question.id,
            actor=actor,
            action=action_label,
            timestamp=_now(),
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
        actor=body.actor or _DEFAULT_ACTOR,
        action="Đồng ý",
        timestamp=_now(),
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
        actor=body.actor or _DEFAULT_ACTOR,
        action="Từ chối",
        timestamp=_now(),
        note=body.comment or "Từ chối thẩm định"
    )
    db.add(history_obj)

    await db.commit()
    return {"success": True, "message": "Đã từ chối câu hỏi!"}


@router.get("/{question_id}/history", response_model=QuestionHistoryListResponse)
async def get_bank_question_history(question_id: str, db: AsyncSession = Depends(get_db)):
    """Lấy lịch sử chỉnh sửa/thẩm định thật của 1 câu hỏi (bảng question_histories)."""
    stmt = (
        select(QuestionHistory)
        .where(QuestionHistory.question_id == question_id)
        .order_by(QuestionHistory.timestamp.desc())
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    data = [
        QuestionHistoryResponse(
            id=r.id,
            question_id=r.question_id,
            action=r.action,
            actor=r.actor,
            timestamp=r.timestamp,
            note=r.note,
        )
        for r in rows
    ]
    return QuestionHistoryListResponse(success=True, count=len(data), data=data)
