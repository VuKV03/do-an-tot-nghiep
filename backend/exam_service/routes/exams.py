"""
Exam CRUD routes — ported from examService.ts
Handles: GET /exams, POST /exams, PUT /exams/{id}, DELETE /exams/{id}
"""
import json
import time
import uuid
from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, delete, text, update

from backend.shared.database import get_db
from backend.exam_service.models import Exam, Question, QuestionType, QuestionHistory, Package, PackageExam
# Tái dùng _map_type (đã xử lý đủ alias code cũ/mới, tiếng Việt có dấu) để nhóm câu hỏi theo Phần
# I/II/III khi đánh lại line_number — PHẢI khớp đúng cách bank_questions.py tự map, tránh 2 nơi suy
# luận Phần khác nhau cho cùng 1 câu hỏi.
from backend.exam_service.routes.bank_questions import _map_type
from backend.exam_service.schemas import (
    ExamCreate, ExamUpdate, ExamResponse,
    ExamListResponse, QuestionResponse,
)

router = APIRouter(prefix="/exams", tags=["Exams"])

_DEFAULT_ACTOR = "Hội đồng Chuyên môn"

# Thứ tự Phần I/II/III trong đề — PHẢI khớp đúng PART_ORDER ở src/utils/examParts.ts (loại không nằm
# trong danh sách, vd 'multiple' — câu hỏi nhóm, coi như đứng sau cùng).
_PART_ORDER = ['single', 'true_false', 'short']


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _part_bucket(type_code: str | None) -> int:
    mapped = _map_type(type_code)
    return _PART_ORDER.index(mapped) if mapped in _PART_ORDER else len(_PART_ORDER)


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
        matrix_id=exam.matrix_id,
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
                # KHÔNG dùng "or 1" — line_number=0 (câu tự do, chưa thuộc đề) là giá trị FALSY hợp lệ.
                line_number=q.line_number if q.line_number is not None else 0,
                status=q.status or 0,
                status_ai=q.status_ai or 0,
                approved_note=q.approved_note or "",
                exam_id=q.exam_id,
            )
            for q in questions
        ],
    )


async def _duplicate_questions_into_exam(
    db: AsyncSession, exam_id: str, question_ids: list[str],
) -> tuple[dict[str, Question], list[str]]:
    """Nhân bản các câu hỏi NGÂN HÀNG (exam_id NULL) thành bản ghi RIÊNG thuộc đề `exam_id` — bản gốc
    trong Ngân hàng câu hỏi giữ NGUYÊN (exam_id vẫn NULL), vẫn chọn lại được cho đề khác. Không di
    chuyển/UPDATE bản gốc như trước đây (1 câu chỉ thuộc được đúng 1 đề tại 1 thời điểm vì exam_id là
    cột đơn) — xem comment ở models.py::Question.exam_id.

    `line_number` gán tạm 0 ở đây — số thứ tự THẬT được đánh lại ở `_renumber_exam_questions` ngay
    sau, dựa theo vị trí cuối cùng của câu trong đề (không phải theo hàm này, vì còn phải trộn với
    các câu ĐÃ có sẵn trong đề khi sửa đề — xem update_exam).

    Trả về (map id CÂU GỐC -> bản ghi Question MỚI tạo, danh sách id bị bỏ qua vì không tồn tại hoặc
    đã thuộc đề khác — race condition hiếm gặp vì picker FE đã lọc sẵn exam_id NULL).
    """
    if not question_ids:
        return {}, []

    rows = (await db.execute(select(Question).where(Question.id.in_(question_ids)))).scalars().all()
    by_id = {q.id: q for q in rows}

    created: dict[str, Question] = {}
    skipped: list[str] = []
    for qid in question_ids:
        src = by_id.get(qid)
        if not src or src.exam_id is not None:
            skipped.append(qid)
            continue
        # uuid hậu tố — mốc mili-giây không đủ duy nhất khi nhiều request nhân bản câu hỏi chạy
        # SONG SONG (vd nhiều đề hoán vị cùng lúc), dễ trùng "q-{ts}-{len(created)}" giữa 2 request
        # khác nhau rơi vào cùng mili-giây với cùng số thứ tự — xem comment tương tự ở exam_id.
        new_id = f"q-{int(time.time() * 1000)}-{len(created)}-{uuid.uuid4().hex[:6]}"
        new_q = Question(
            id=new_id,
            code=src.code,
            content=src.content,
            options=src.options,
            correct_answer=src.correct_answer,
            topic_id=src.topic_id,
            parent_id=src.parent_id,
            subject_id=src.subject_id,
            grade_id=src.grade_id,
            level_id=src.level_id,
            type_id=src.type_id,
            competency_component_id=src.competency_component_id,
            exam_id=exam_id,
            line_number=0,
            status=src.status,
            status_ai=src.status_ai,
            approved_note=src.approved_note,
            statements=src.statements,
            created_by=src.created_by,
            created_at=src.created_at,
        )
        db.add(new_q)
        created[qid] = new_q

        db.add(QuestionHistory(
            id=str(uuid.uuid4()),
            question_id=new_id,
            actor=src.created_by or _DEFAULT_ACTOR,
            action="Thêm mới",
            timestamp=_now(),
            note=f"Sao chép từ câu {src.code or src.id} vào đề thi",
        ))

    return created, skipped


async def _renumber_exam_questions(db: AsyncSession, exam_id: str, ordered_ids: list[str]) -> None:
    """Đánh lại `line_number` cho TOÀN BỘ câu hỏi hiện có của 1 đề, theo thứ tự `ordered_ids` (thứ tự
    hiển thị cuối cùng do nơi gọi cung cấp), reset về 1 ở mỗi Phần I/II/III (theo loại câu hỏi — xem
    `_part_bucket`, khớp đúng quy ước `compareByPartAndLineNumber` ở src/utils/examParts.ts)."""
    rows = (
        await db.execute(
            select(Question.id, QuestionType.code)
            .outerjoin(QuestionType, Question.type_id == QuestionType.id)
            .where(Question.exam_id == exam_id)
        )
    ).all()
    code_by_id = {qid: code for qid, code in rows}
    if not code_by_id:
        return

    # id nào có trong DB mà thiếu trong ordered_ids (không nên xảy ra, nhưng an toàn) thì nối cuối,
    # giữ nguyên thứ tự đọc được từ DB.
    seen = set(ordered_ids)
    final_order = [qid for qid in ordered_ids if qid in code_by_id] + [
        qid for qid in code_by_id if qid not in seen
    ]

    buckets: dict[int, list[str]] = {}
    for qid in final_order:
        buckets.setdefault(_part_bucket(code_by_id.get(qid)), []).append(qid)

    for bucket in sorted(buckets):
        for i, qid in enumerate(buckets[bucket], start=1):
            await db.execute(update(Question).where(Question.id == qid).values(line_number=i))


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
    # Thêm hậu tố ngẫu nhiên — chỉ dùng mốc mili-giây (int(time.time()*1000)) không đủ duy nhất khi
    # nhiều request tạo đề chạy SONG SONG (vd sinh hàng loạt đề hoán vị qua Promise.all ở
    # ModalSinhDeHoanVi.tsx), dễ trùng id giữa 2 request rơi vào cùng 1 mili-giây, gây lỗi
    # IntegrityError "Duplicate entry ... for key 'exams.PRIMARY'".
    exam_id = f"exam-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    exam_code = body.code or f"DE-{str(int(time.time()))[-6:].upper()}"
    now = datetime.utcnow().isoformat() + "Z"

    exam = Exam(
        id=exam_id,
        code=exam_code,
        name=body.name,
        subject=body.subject,
        grade=body.grade,
        # "draft" (Tạo mới) khi tạo mới — phải qua bước "Gửi thẩm định" tường minh mới chuyển sang
        # "pending" (Chờ thẩm định), khớp quy ước topics/matrix_configs (trước đây tạo thẳng
        # "pending", bỏ qua bước Tạo mới, khiến ExamManagementModule.tsx::handleSendReview chỉ đơn
        # thuần chuyển tab chứ không thực sự gọi API đổi trạng thái).
        status="draft",
        attempts=0,
        totalQuestions=0,
        avgScore=0.0,
        createdAt=now,
        duration=body.duration or 60,
        description=body.description or "",
        source=body.source or "manual",
        matrix_id=body.matrix_id,
    )
    db.add(exam)

    questions: list[Question] = []
    if body.questionIds:
        # exam phải tồn tại thật trong DB TRƯỚC khi insert các Question mới tham chiếu tới nó (FK
        # questions.exam_id -> exams.id) — flush() đẩy câu INSERT của exam đi ngay trong transaction
        # hiện tại (chưa commit), giống pattern packages.py::create_package.
        await db.flush()
        # Nhân bản các câu hỏi ĐÃ CÓ SẴN trong Ngân hàng câu hỏi thành bản ghi RIÊNG của đề này —
        # KHÔNG di chuyển/gắn trực tiếp bản gốc như trước đây (xem _duplicate_questions_into_exam).
        created, _skipped = await _duplicate_questions_into_exam(db, exam_id, body.questionIds)
        await db.flush()
        final_order = [created[qid].id for qid in body.questionIds if qid in created]
        await _renumber_exam_questions(db, exam_id, final_order)
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
        # Câu hỏi thuộc đề giờ là BẢN SAO RIÊNG (không dùng chung với Ngân hàng câu hỏi nữa — xem
        # _duplicate_questions_into_exam), nên "cập nhật danh sách câu hỏi" nghĩa là: id đã thuộc đề
        # này thì GIỮ NGUYÊN bản ghi, id là câu Ngân hàng mới chọn thì NHÂN BẢN, id đang thuộc đề này
        # nhưng không còn trong danh sách mới thì XOÁ HẲN (không phải gỡ liên kết như trước).
        existing_result = await db.execute(select(Question.id).where(Question.exam_id == exam_id))
        existing_ids = set(existing_result.scalars().all())
        requested_ids = list(dict.fromkeys(body.questionIds))  # unique, giữ thứ tự

        remove_ids = existing_ids - set(requested_ids)
        if remove_ids:
            await db.execute(delete(Question).where(Question.id.in_(remove_ids)))

        to_duplicate = [qid for qid in requested_ids if qid not in existing_ids]
        created, _skipped = await _duplicate_questions_into_exam(db, exam_id, to_duplicate)
        await db.flush()

        # _skipped (id không tồn tại/đã thuộc đề khác) bỏ qua âm thầm — picker FE đã lọc sẵn exam_id
        # NULL nên chỉ xảy ra do race condition hiếm gặp.
        final_order = [
            created[qid].id if qid in created else qid
            for qid in requested_ids
            if qid in existing_ids or qid in created
        ]
        await _renumber_exam_questions(db, exam_id, final_order)
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
    """Xóa đề thi.

    Mọi câu hỏi có exam_id trỏ tới đề này đều là bản sao RIÊNG của đề (nhân bản lúc lưu đề — xem
    _duplicate_questions_into_exam), không còn dùng chung với Ngân hàng câu hỏi như trước nữa — nên
    xóa đề kéo theo xóa hẳn toàn bộ câu hỏi của đề, không cần phân biệt nguồn gốc/gỡ liên kết nữa.

    Nếu đề này là ĐỀ GỐC của 1+ gói đề hoán vị (position=0 trong package_exams — xem
    PackageManagementModule.tsx::handleDeletePackage), gói đề đó mất hết ý nghĩa khi thiếu đề gốc
    nên bị xóa theo LUÔN (kéo theo cả đề hoán vị + câu hỏi riêng bên trong gói, cùng cascade như
    packages.py::delete_package) — không chỉ xóa mỗi bản ghi đề. FE phải tự cảnh báo trước (đặc biệt
    nếu gói đề đó đang "Đang thi") vì endpoint này xóa thẳng, không hỏi lại.
    """
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề thi cần xóa.")

    name = exam.name

    root_links_result = await db.execute(
        select(PackageExam.package_id).where(PackageExam.position == 0, PackageExam.exam_id == exam_id)
    )
    dependent_package_ids = list(root_links_result.scalars().all())
    for pkg_id in dependent_package_ids:
        variant_links_result = await db.execute(
            select(PackageExam.exam_id).where(PackageExam.package_id == pkg_id).order_by(PackageExam.position)
        )
        variant_exam_ids = list(variant_links_result.scalars().all())[1:]  # bỏ vị trí 0 (chính là exam_id đang xóa)
        if variant_exam_ids:
            await db.execute(delete(Question).where(Question.exam_id.in_(variant_exam_ids)))
            await db.execute(delete(Exam).where(Exam.id.in_(variant_exam_ids)))
        await db.execute(delete(Package).where(Package.id == pkg_id))

    await db.execute(delete(Question).where(Question.exam_id == exam_id))
    await db.execute(delete(Exam).where(Exam.id == exam_id))
    await db.commit()
    return {"success": True, "message": f'Đã gỡ bỏ đề thi "{name}" khỏi hệ thống.'}
