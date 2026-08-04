"""
Question creation routes — bảng questions
POST /questions/
"""
import json
import time
import uuid
from datetime import datetime, timezone

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy import select
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import func
from backend.exam_service.models import Exam, Question, SubjectCategory, GradeLevel, CognitiveLevel, QuestionType, Topic, CompetencyComponent, QuestionHistory, SOURCE_TO_INT
from backend.exam_service.schemas import QuestionManualCreate, QuestionBulkCreate, QuestionResponse
from backend.shared.database import get_db

router = APIRouter(prefix="/questions", tags=["Questions"])

_DEFAULT_ACTOR = "Hội đồng Chuyên môn"


def _now() -> str:
    # Cùng định dạng (không mili-giây) với bank_questions.py::_now() — 2 route này cùng ghi vào
    # bảng question_histories, khác định dạng sẽ làm lệch thứ tự sắp xếp theo timestamp (string sort).
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _as_json(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)


def _normalize_subject(subject_name: str | None) -> str | None:
    if not subject_name:
        return None
    return subject_name.strip().lower()


def _status_to_int(status: str | None) -> int:
    if status == 'approved':
        return 2
    if status == 'pending':
        return 1
    return 0


@router.post("/", status_code=201)
async def create_question(body: QuestionManualCreate, db: AsyncSession = Depends(get_db)):
    subject_key = _normalize_subject(body.subject)
    grade_key = (body.grade or '').strip().lower().replace('khối', '').replace('lớp', '').strip()
    level_key = (body.level or '').strip().lower()
    type_key = (body.type or '').strip().lower()
    print(f"Body received: {body}")
    print(f"Creating question with subject: {subject_key}, grade: {grade_key}, level: {level_key}, type: {type_key}")
    # Dùng .scalars().first() thay vì .scalar_one_or_none() cho MỌI query ILIKE
    # bên dưới — pattern "%...%" (hoặc rỗng "%%") có thể khớp NHIỀU dòng cùng lúc,
    # và .scalar_one_or_none() raise MultipleResultsFound khi đó (uncaught → 500
    # "Multiple rows were found..." không rõ nghĩa với người dùng). Lấy dòng khớp
    # đầu tiên là đủ vì đây vốn đã là fuzzy-match "best effort", không phải tra khóa chính.
    subject_result = await db.execute(select(SubjectCategory).where(SubjectCategory.name.ilike(f"%{body.subject}%") | SubjectCategory.code.ilike(f"%{body.subject}%")))
    print(f"Subject query result: {subject_result}")
    subject = subject_result.scalars().first()
    print(f"Subject found: {subject}")
    if not subject and subject_key:
        subject_result = await db.execute(select(SubjectCategory).where(SubjectCategory.name.ilike(f"%{subject_key}%")))
        subject = subject_result.scalars().first()

    grade_result = await db.execute(select(GradeLevel).where(GradeLevel.name.ilike(f"%{body.grade}%") | GradeLevel.code.ilike(f"%{body.grade}%")))
    grade = grade_result.scalars().first()
    if not grade and grade_key:
        grade_result = await db.execute(select(GradeLevel).where(GradeLevel.name.ilike(f"%{grade_key}%")))
        grade = grade_result.scalars().first()

    # Cột "code" trong danh mục Cấp độ tư duy là ô nhập tự do (không chuẩn hoá) — tra thẳng bằng
    # đúng chuỗi enum FE (vd "thong_hieu") gần như không bao giờ khớp dữ liệu thật (đã quan sát
    # "Thông hiểu" có code "TH", tên có dấu khác hẳn "thong_hieu"), khiến MỌI cấp độ trừ "Nhận biết"
    # (nếu tình cờ khớp) bị 400 hoặc rơi vào nhánh mặc định "Nhận biết" ở nơi khác. Liệt kê đủ alias,
    # giống cách xử lý `type_lookup` ngay bên dưới.
    level_lookup = {
        'nhan_biet': ['nhan_biet', 'nhận biết', 'nhan biet', 'vv', 'l1', 'biết', 'biet'],
        'thong_hieu': ['thong_hieu', 'thông hiểu', 'thong hieu', 'zz', 'l2', 'hiểu', 'hieu', 'th'],
        'van_dung': ['van_dung', 'vận dụng', 'van dung', 'xx', 'l3'],
        'van_dung_cao': ['van_dung_cao', 'vận dụng cao', 'van dung cao', 'vdc', 'l4'],
    }
    matched_level_aliases = level_lookup.get(level_key, [level_key])
    level = None
    for alias in matched_level_aliases:
        level_result = await db.execute(select(CognitiveLevel).where(CognitiveLevel.code.ilike(alias) | CognitiveLevel.name.ilike(alias)))
        level = level_result.scalars().first()
        if level:
            break

    type_lookup = {
        'single': ['single', 'tn', 'trắc nghiệm', 'trắc nghiệm một đáp án', 'trắc nghiệm một lựa chọn'],
        'multiple': ['multiple', 'multi', 'tnn', 'trắc nghiệm nhiều đáp án'],
        'true_false': ['true_false', 'truefalse', 'ds', 'đúng sai', 'đúng / sai'],
        'short': ['short', 'tl', 'tự luận', 'trả lời ngắn'],
    }
    matched_aliases = type_lookup.get(type_key, [type_key])
    type_result = await db.execute(select(QuestionType).where(QuestionType.code.ilike(type_key) | QuestionType.name.ilike(type_key)))
    question_type = type_result.scalars().first()
    if not question_type:
        for alias in matched_aliases:
            type_result = await db.execute(select(QuestionType).where(QuestionType.code.ilike(alias) | QuestionType.name.ilike(alias)))
            question_type = type_result.scalars().first()
            if question_type:
                break

    if not subject or not grade:
        print(f"Subject: {subject}, Grade: {grade}, Level: {level}, Type: {question_type}")
        raise HTTPException(status_code=400, detail="Không tìm thấy môn học hoặc khối lớp tương ứng trong danh mục.")
    if not level or not question_type:
        raise HTTPException(status_code=400, detail="Không tìm thấy cấp độ tư duy hoặc loại câu hỏi tương ứng trong danh mục.")

    topic_id = None
    parent_id = None
    if body.topicId:
        topic_result = await db.execute(
            select(Topic).where(Topic.id == body.topicId)
        )
        topic = topic_result.scalar_one_or_none()

        if not topic:
            # Topic.code không có ràng buộc UNIQUE (nhiều chủ đề khác môn có thể trùng mã) —
            # dùng .first() thay vì .scalar_one_or_none() để tránh crash 500 khi trùng mã.
            topic_result = await db.execute(
                select(Topic).where(Topic.code == body.topicId)
            )
            topic = topic_result.scalars().first()

        if not topic and body.subTopicName:
            topic_result = await db.execute(
                select(Topic).where(Topic.name.ilike(f"%{body.subTopicName}%"))
            )
            topic = topic_result.scalars().first()

        if not topic and body.topicName:
            topic_result = await db.execute(
                select(Topic).where(Topic.name.ilike(f"%{body.topicName}%"))
            )
            topic = topic_result.scalars().first()

        if topic:
            topic_id = topic.id
            parent_id = topic.parent_id

    # Kiểm tra thành phần năng lực tồn tại trước khi gán FK — tránh crash 500 do vi phạm khóa ngoại
    # nếu id gửi lên không hợp lệ/đã bị xóa (đây là field tùy chọn nên bỏ qua thay vì chặn tạo câu hỏi).
    competency_component_id = None
    if body.competencyComponentId:
        comp_result = await db.execute(
            select(CompetencyComponent).where(CompetencyComponent.id == body.competencyComponentId)
        )
        if comp_result.scalar_one_or_none():
            competency_component_id = body.competencyComponentId

    question_id = f"q-{int(time.time() * 1000)}"
    question = Question(
        id=question_id,
        code=f"Q-{str(int(time.time()))[-6:].upper()}",
        content=body.text,
        options=_as_json(body.options),
        correct_answer=_as_json(body.correctAnswer),
        topic_id=topic_id,
        parent_id=parent_id,
        subject_id=subject.id,
        grade_id=grade.id,
        level_id=level.id,
        type_id=question_type.id,
        competency_component_id=competency_component_id,
        exam_id=body.examId,
        line_number=body.lineNumber or 0,
        status=_status_to_int(body.status),
        status_ai=SOURCE_TO_INT.get(body.source or 'manual', 0),
        approved_note="",
        statements=_as_json(body.statements),
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

    # Đề tạo qua luồng "sinh từng câu một" (AI-config, đề hoán vị — xem ModalTaoDeTuDong.tsx/
    # ModalSinhDeHoanVi.tsx) không đi qua POST /exams/ với questionIds/questions nên cột
    # exams.totalQuestions vẫn giữ giá trị 0 lúc tạo đề rỗng ban đầu, không bao giờ tự cập nhật khi
    # từng câu được thêm sau đó — khiến "Số câu hỏi" hiện sai (0) ở cả tab Quản lý đề gốc lẫn Quản lý
    # gói đề. Đếm lại số câu THẬT của đề này và ghi đè lại cho đúng mỗi khi thêm 1 câu hỏi.
    if question.exam_id:
        exam_result = await db.execute(select(Exam).where(Exam.id == question.exam_id))
        exam_obj = exam_result.scalar_one_or_none()
        if exam_obj:
            count_result = await db.execute(
                select(func.count()).select_from(Question).where(Question.exam_id == question.exam_id)
            )
            exam_obj.totalQuestions = count_result.scalar_one()
            await db.commit()

    return {
        "success": True,
        "message": "Thêm câu hỏi thủ công thành công!",
        "data": QuestionResponse(
            id=question.id,
            code=question.code or "",
            content=question.content,
            options=question.options,
            correct_answer=question.correct_answer,
            topic_id=question.topic_id,
            parent_id=question.parent_id,
            subject_id=question.subject_id,
            grade_id=question.grade_id,
            level_id=question.level_id,
            type_id=question.type_id,
            competency_component_id=question.competency_component_id,
            # KHÔNG dùng "or 1" — line_number=0 (câu tự do, chưa thuộc đề) là giá trị FALSY hợp lệ.
            line_number=question.line_number if question.line_number is not None else 0,
            status=question.status or 0,
            status_ai=question.status_ai or 0,
            approved_note=question.approved_note or "",
            exam_id=question.exam_id,
            statements=question.statements,
        ),
    }


async def _resolve_subject(db: AsyncSession, cache: dict, subject_name: str):
    key = (subject_name or '').strip().lower()
    if key in cache:
        return cache[key]
    subject_key = _normalize_subject(subject_name)
    result = await db.execute(select(SubjectCategory).where(SubjectCategory.name.ilike(f"%{subject_name}%") | SubjectCategory.code.ilike(f"%{subject_name}%")))
    subject = result.scalars().first()
    if not subject and subject_key:
        result = await db.execute(select(SubjectCategory).where(SubjectCategory.name.ilike(f"%{subject_key}%")))
        subject = result.scalars().first()
    cache[key] = subject
    return subject


async def _resolve_grade(db: AsyncSession, cache: dict, grade_name: str):
    key = (grade_name or '').strip().lower()
    if key in cache:
        return cache[key]
    grade_key = key.replace('khối', '').replace('lớp', '').strip()
    result = await db.execute(select(GradeLevel).where(GradeLevel.name.ilike(f"%{grade_name}%") | GradeLevel.code.ilike(f"%{grade_name}%")))
    grade = result.scalars().first()
    if not grade and grade_key:
        result = await db.execute(select(GradeLevel).where(GradeLevel.name.ilike(f"%{grade_key}%")))
        grade = result.scalars().first()
    cache[key] = grade
    return grade


_LEVEL_LOOKUP = {
    'nhan_biet': ['nhan_biet', 'nhận biết', 'nhan biet', 'vv', 'l1', 'biết', 'biet'],
    'thong_hieu': ['thong_hieu', 'thông hiểu', 'thong hieu', 'zz', 'l2', 'hiểu', 'hieu', 'th'],
    'van_dung': ['van_dung', 'vận dụng', 'van dung', 'xx', 'l3'],
    'van_dung_cao': ['van_dung_cao', 'vận dụng cao', 'van dung cao', 'vdc', 'l4'],
}


async def _resolve_level(db: AsyncSession, cache: dict, level_key: str):
    key = (level_key or '').strip().lower()
    if key in cache:
        return cache[key]
    level = None
    for alias in _LEVEL_LOOKUP.get(key, [key]):
        result = await db.execute(select(CognitiveLevel).where(CognitiveLevel.code.ilike(alias) | CognitiveLevel.name.ilike(alias)))
        level = result.scalars().first()
        if level:
            break
    cache[key] = level
    return level


_TYPE_LOOKUP = {
    'single': ['single', 'tn', 'trắc nghiệm', 'trắc nghiệm một đáp án', 'trắc nghiệm một lựa chọn'],
    'multiple': ['multiple', 'multi', 'tnn', 'trắc nghiệm nhiều đáp án'],
    'true_false': ['true_false', 'truefalse', 'ds', 'đúng sai', 'đúng / sai'],
    'short': ['short', 'tl', 'tự luận', 'trả lời ngắn'],
}


async def _resolve_type(db: AsyncSession, cache: dict, type_key: str):
    key = (type_key or '').strip().lower()
    if key in cache:
        return cache[key]
    result = await db.execute(select(QuestionType).where(QuestionType.code.ilike(key) | QuestionType.name.ilike(key)))
    question_type = result.scalars().first()
    if not question_type:
        for alias in _TYPE_LOOKUP.get(key, [key]):
            result = await db.execute(select(QuestionType).where(QuestionType.code.ilike(alias) | QuestionType.name.ilike(alias)))
            question_type = result.scalars().first()
            if question_type:
                break
    cache[key] = question_type
    return question_type


async def _resolve_topic(db: AsyncSession, cache: dict, topic_id: str | None, topic_name: str | None, sub_topic_name: str | None):
    key = (topic_id or '', topic_name or '', sub_topic_name or '')
    if key in cache:
        return cache[key]
    topic = None
    if topic_id:
        result = await db.execute(select(Topic).where(Topic.id == topic_id))
        topic = result.scalar_one_or_none()
        if not topic:
            result = await db.execute(select(Topic).where(Topic.code == topic_id))
            topic = result.scalars().first()
        if not topic and sub_topic_name:
            result = await db.execute(select(Topic).where(Topic.name.ilike(f"%{sub_topic_name}%")))
            topic = result.scalars().first()
        if not topic and topic_name:
            result = await db.execute(select(Topic).where(Topic.name.ilike(f"%{topic_name}%")))
            topic = result.scalars().first()
    cache[key] = topic
    return topic


async def _resolve_competency(db: AsyncSession, cache: dict, competency_id: str | None):
    if not competency_id:
        return None
    if competency_id in cache:
        return cache[competency_id]
    result = await db.execute(select(CompetencyComponent).where(CompetencyComponent.id == competency_id))
    ok = result.scalar_one_or_none() is not None
    cache[competency_id] = ok
    return ok


@router.post("/bulk", status_code=201)
async def create_questions_bulk(body: QuestionBulkCreate, db: AsyncSession = Depends(get_db)):
    """
    Tạo NHIỀU câu hỏi trong 1 request — dùng cho đề hoán vị/đề theo ma trận (ModalSinhDeHoanVi.tsx,
    ModalTaoDeTuDong.tsx), nơi trước đây gọi POST /questions/ lặp lại hàng chục/trăm lần (mỗi lần tự
    tra lại subject/grade/level/type/topic bằng SELECT riêng, cực chậm với DB cloud có độ trễ mạng
    cao). Ở đây các giá trị lặp lại (vd toàn bộ câu hỏi cùng 1 môn/đề) chỉ tra 1 lần nhờ cache theo
    batch, và toàn bộ câu hỏi commit 1 lần duy nhất thay vì mỗi câu 1 round-trip DB riêng.
    """
    if not body.items:
        raise HTTPException(status_code=400, detail="Danh sách câu hỏi rỗng.")

    subject_cache: dict = {}
    grade_cache: dict = {}
    level_cache: dict = {}
    type_cache: dict = {}
    topic_cache: dict = {}
    competency_cache: dict = {}

    created_questions: list[Question] = []
    history_objs: list[QuestionHistory] = []
    errors: list[dict] = []

    for idx, item in enumerate(body.items):
        subject = await _resolve_subject(db, subject_cache, item.subject)
        grade = await _resolve_grade(db, grade_cache, item.grade)
        if not subject or not grade:
            errors.append({"index": idx, "detail": "Không tìm thấy môn học hoặc khối lớp tương ứng trong danh mục."})
            continue

        level = await _resolve_level(db, level_cache, item.level)
        question_type = await _resolve_type(db, type_cache, item.type)
        if not level or not question_type:
            errors.append({"index": idx, "detail": "Không tìm thấy cấp độ tư duy hoặc loại câu hỏi tương ứng trong danh mục."})
            continue

        topic = await _resolve_topic(db, topic_cache, item.topicId, item.topicName, item.subTopicName)
        competency_component_id = item.competencyComponentId if (item.competencyComponentId and await _resolve_competency(db, competency_cache, item.competencyComponentId)) else None

        question_id = f"q-{int(time.time() * 1000)}-{idx}"
        question = Question(
            id=question_id,
            code=f"Q-{str(int(time.time()))[-6:].upper()}{idx}",
            content=item.text,
            options=_as_json(item.options),
            correct_answer=_as_json(item.correctAnswer),
            topic_id=topic.id if topic else None,
            parent_id=topic.parent_id if topic else None,
            subject_id=subject.id,
            grade_id=grade.id,
            level_id=level.id,
            type_id=question_type.id,
            competency_component_id=competency_component_id,
            exam_id=item.examId,
            line_number=item.lineNumber or 0,
            status=_status_to_int(item.status),
            status_ai=SOURCE_TO_INT.get(item.source or 'manual', 0),
            approved_note="",
            statements=_as_json(item.statements),
            created_by=item.creator,
            created_at=_now(),
        )
        db.add(question)
        created_questions.append(question)

        history_obj = QuestionHistory(
            id=str(uuid.uuid4()),
            question_id=question.id,
            actor=item.creator or _DEFAULT_ACTOR,
            action="Thêm mới",
            timestamp=_now(),
            note=f"Thêm mới câu hỏi mã {question.code}",
        )
        db.add(history_obj)
        history_objs.append(history_obj)

    if not created_questions:
        raise HTTPException(status_code=400, detail={"message": "Không tạo được câu hỏi nào.", "errors": errors})

    await db.commit()
    for q in created_questions:
        await db.refresh(q)

    # Cập nhật lại totalQuestions cho từng đề có câu hỏi vừa thêm (đếm 1 lần/đề thay vì 1 lần/câu).
    exam_ids = {q.exam_id for q in created_questions if q.exam_id}
    for exam_id in exam_ids:
        exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
        exam_obj = exam_result.scalar_one_or_none()
        if exam_obj:
            count_result = await db.execute(
                select(func.count()).select_from(Question).where(Question.exam_id == exam_id)
            )
            exam_obj.totalQuestions = count_result.scalar_one()
    if exam_ids:
        await db.commit()

    return {
        "success": True,
        "message": f"Đã tạo {len(created_questions)}/{len(body.items)} câu hỏi.",
        "data": [q.id for q in created_questions],
        "errors": errors,
    }