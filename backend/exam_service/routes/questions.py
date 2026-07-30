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
from backend.exam_service.schemas import QuestionManualCreate, QuestionResponse
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
        line_number=body.lineNumber or 1,
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
            line_number=question.line_number or 1,
            status=question.status or 0,
            status_ai=question.status_ai or 0,
            approved_note=question.approved_note or "",
            exam_id=question.exam_id,
            statements=question.statements,
        ),
    }