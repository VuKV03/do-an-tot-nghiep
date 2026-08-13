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
# pyrefly: ignore [missing-import]
from sqlalchemy.exc import IntegrityError

from backend.shared.database import get_db
from backend.exam_service.models import (
    Exam, Question, QuestionType, QuestionHistory, Package, PackageExam, MatrixConfig,
    SubjectConfig, SubjectCategory,
)
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


def _points_per_question_by_type(cfg: SubjectConfig, type_by_id: dict[str, QuestionType]) -> dict[str, float]:
    """Suy ra điểm/1 câu đúng cho từng loại câu hỏi (type_id) theo Cấu hình môn học — dùng để tính
    "Tổng điểm" của đề THỦ CÔNG (không có ma trận, xem _resolve_matrix_name_and_score) bằng đúng công
    thức Σ điểm từng câu THẬT đang có trong đề, thay vì gán chung 1 con số (scale) bất kể đề đó chọn
    bao nhiêu câu mỗi loại — khớp đúng cách "Cấu hình môn học" (quan-ly-danh-muc) định nghĩa điểm.
    Câu Đúng/Sai (type code 'DS'/'true_false') dùng points_for_4_correct_idea_pN (điểm khi đúng cả 4
    ý — mức điểm TỐI ĐA/câu, giống hệt cách matrix tự tính diem cho DS — xem CreateMatrixForm.tsx::
    buildPart: `diem: toNum(ideaPoints[3])`), các loại còn lại dùng points_for_a_correct_answers_pN.
    """
    points_by_type: dict[str, float] = {}
    for type_id, pts_normal, pts_ds_full in (
        (cfg.type_id_p1, cfg.points_for_a_correct_answers_p1, cfg.points_for_4_correct_idea_p1),
        (cfg.type_id_p2, cfg.points_for_a_correct_answers_p2, cfg.points_for_4_correct_idea_p2),
        (cfg.type_id_p3, cfg.points_for_a_correct_answers_p3, cfg.points_for_4_correct_idea_p3),
    ):
        if not type_id:
            continue
        is_ds = _map_type(type_by_id[type_id].code) == "true_false" if type_id in type_by_id else False
        pts = pts_ds_full if is_ds else pts_normal
        if pts is not None:
            points_by_type[type_id] = float(pts)
    return points_by_type


def _resolve_matrix_name_and_score(
    matrix: MatrixConfig | None,
    questions: list[Question],
    points_by_type: dict[str, float],
    scale: float | None,
) -> tuple[str | None, float]:
    """Suy ra tên ma trận + điểm tối đa THẬT của 1 đề — không còn hardcode "Ma trận đề 01"/"10.00" như
    trước (ExamManagementModule.tsx: row.matrixName || 'Ma trận đề 01', row.totalScore || '10.00').
    - Có ma trận (exam.matrix_id khớp 1 bản ghi thật): dùng đúng tên + totalScore đã tính sẵn của ma
      trận đó (Σ so_cau × diem lúc lưu ma trận — xem matrix_configs.py::create_matrix_config).
    - Không có ma trận (đề thủ công/AI-config): không có "tên ma trận" nào để hiện (trả None, FE tự
      hiện "—"). Điểm tối đa tính TRỰC TIẾP theo các câu THẬT đang có trong đề (Σ điểm/câu theo loại,
      xem _points_per_question_by_type) — trước đây gán thẳng `scale` (vd luôn 10 dù đề chỉ chọn vài
      câu) không phản ánh đúng số câu thực tế đã chọn, nên KHÔNG "hợp lý" như người dùng phản ánh.
    - Không tính được theo câu (thiếu Cấu hình môn học/câu chưa gắn đúng loại) → fallback về `scale`
      (thang điểm khai báo trong Cấu hình môn học), rồi mới tới mặc định 10.0 nếu hoàn toàn thiếu cấu hình.
    """
    if matrix:
        return matrix.name, float(matrix.totalScore or 10.0)
    if points_by_type and questions:
        computed = sum(points_by_type.get(q.type_id, 0.0) for q in questions if q.type_id)
        if computed > 0:
            return None, computed
    return None, float(scale) if scale else 10.0


async def _load_matrix_and_scoring_lookups(
    db: AsyncSession,
) -> tuple[dict[str, MatrixConfig], dict[str, dict[str, float]], dict[str, float]]:
    """Tải sẵn 1 lần toàn bộ ma trận + cách tính điểm/câu + thang điểm theo môn — dùng cho list_exams
    (nhiều đề cùng lúc) để tránh N+1 query (mỗi đề lại tự truy vấn riêng)."""
    matrix_result = await db.execute(select(MatrixConfig))
    matrix_by_id = {m.id: m for m in matrix_result.scalars().all()}

    cfg_result = await db.execute(
        select(SubjectCategory.name, SubjectConfig)
        .join(SubjectConfig, SubjectConfig.subject_id == SubjectCategory.id)
    )
    cfg_rows = cfg_result.all()

    type_ids = {tid for _, cfg in cfg_rows for tid in (cfg.type_id_p1, cfg.type_id_p2, cfg.type_id_p3) if tid}
    type_by_id: dict[str, QuestionType] = {}
    if type_ids:
        types_result = await db.execute(select(QuestionType).where(QuestionType.id.in_(type_ids)))
        type_by_id = {t.id: t for t in types_result.scalars().all()}

    points_by_type_by_subject: dict[str, dict[str, float]] = {}
    scale_by_subject: dict[str, float] = {}
    for name, cfg in cfg_rows:
        pts_map = _points_per_question_by_type(cfg, type_by_id)
        if pts_map:
            points_by_type_by_subject[name] = pts_map
        if cfg.scale is not None:
            scale_by_subject[name] = float(cfg.scale)
    return matrix_by_id, points_by_type_by_subject, scale_by_subject


async def _get_matrix_name_and_score(
    db: AsyncSession, exam: Exam, questions: list[Question],
) -> tuple[str | None, float]:
    """Bản đơn lẻ của _load_matrix_and_scoring_lookups — dùng ở create/update 1 đề, không cần tải cả
    danh sách ma trận/môn học chỉ để suy ra thông tin của đúng 1 đề."""
    matrix: MatrixConfig | None = None
    if exam.matrix_id:
        result = await db.execute(select(MatrixConfig).where(MatrixConfig.id == exam.matrix_id))
        matrix = result.scalar_one_or_none()
    if matrix:
        return _resolve_matrix_name_and_score(matrix, questions, {}, None)

    # KHÔNG dùng scalar_one_or_none() — subject_categories.name và subject_configs.subject_id đều
    # KHÔNG có ràng buộc unique (chỉ subject_categories.code là unique), nên JOIN này có thể khớp hơn
    # 1 dòng và làm scalar_one_or_none() raise MultipleResultsFound (500) — vỡ NGAY cả luồng tạo đề
    # thủ công bình thường (ModalDeRiengLe.tsx: luôn không có matrix_id nên luôn rơi vào nhánh này).
    # .limit(1) + .first() lấy đại 1 kết quả khớp thay vì đòi hỏi phải khớp duy nhất.
    cfg_result = await db.execute(
        select(SubjectConfig)
        .join(SubjectCategory, SubjectConfig.subject_id == SubjectCategory.id)
        .where(SubjectCategory.name == exam.subject)
        .limit(1)
    )
    cfg = cfg_result.scalars().first()
    if not cfg:
        return _resolve_matrix_name_and_score(None, questions, {}, None)

    type_ids = [t for t in (cfg.type_id_p1, cfg.type_id_p2, cfg.type_id_p3) if t]
    type_by_id: dict[str, QuestionType] = {}
    if type_ids:
        types_result = await db.execute(select(QuestionType).where(QuestionType.id.in_(type_ids)))
        type_by_id = {t.id: t for t in types_result.scalars().all()}

    points_by_type = _points_per_question_by_type(cfg, type_by_id)
    scale = float(cfg.scale) if cfg.scale is not None else None
    return _resolve_matrix_name_and_score(None, questions, points_by_type, scale)


def _build_exam_response(
    exam: Exam, questions: list[Question], matrix_name: str | None = None, total_score: float = 10.0,
) -> ExamResponse:
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
        matrixName=matrix_name,
        totalScore=total_score,
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

    matrix_by_id, points_by_type_by_subject, scale_by_subject = await _load_matrix_and_scoring_lookups(db)
    data = []
    for e in exams:
        qs = questions_by_exam.get(e.id, [])
        matrix_name, total_score = _resolve_matrix_name_and_score(
            matrix_by_id.get(e.matrix_id) if e.matrix_id else None, qs,
            points_by_type_by_subject.get(e.subject, {}), scale_by_subject.get(e.subject),
        )
        data.append(_build_exam_response(e, qs, matrix_name, total_score))
    return ExamListResponse(success=True, count=len(data), data=data)


async def _get_approved_matrix_or_400(db: AsyncSession, matrix_id: str) -> MatrixConfig:
    """Chặn cứng việc sinh/lưu đề từ 1 ma trận CHƯA "Đã thẩm định" (status khác 'approved': 'new'/
    'pending'/'rejected') — trước đây màn "Thêm mới tự động theo ma trận" (ModalTaoDeTuDong.tsx) liệt
    kê MỌI ma trận không lọc theo trạng thái thẩm định, nên có thể sinh đề từ ma trận còn đang nháp
    hoặc vừa bị Từ chối. Đây là lớp chặn ở server, độc lập với việc FE có lọc đúng hay không (áp dụng
    cho cả 2 nguồn sinh đề — "Theo ngân hàng câu hỏi" lẫn "Theo AI" — miễn có matrix_id gửi lên)."""
    result = await db.execute(select(MatrixConfig).where(MatrixConfig.id == matrix_id))
    matrix = result.scalar_one_or_none()
    if not matrix:
        raise HTTPException(status_code=400, detail="Không tìm thấy ma trận đề đã chọn.")
    if matrix.status != "approved":
        _STATUS_LABEL = {"new": "Tạo mới", "pending": "Chờ thẩm định", "rejected": "Từ chối"}
        label = _STATUS_LABEL.get(matrix.status, matrix.status)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Ma trận đề mã {matrix.code} chưa được thẩm định (trạng thái hiện tại: {label}) — "
                "chỉ được dùng để sinh đề sau khi ma trận đã \"Đã thẩm định\"."
            ),
        )
    return matrix


def _validate_matrix_question_count(matrix: MatrixConfig, question_count: int) -> None:
    """Chặn cứng việc tạo đề "Theo ma trận đề" (nguồn Ngân hàng câu hỏi, không dùng AI) khi số câu
    thực nhận được ít hơn ma trận yêu cầu — trước đây FE (ModalTaoDeTuDong.tsx) chỉ tô vàng cảnh báo
    mềm "N ô chưa đủ số câu yêu cầu" nhưng vẫn cho lưu, và BE nhận thẳng questionIds mà không đối
    chiếu lại với ma trận. Đây là lớp chặn thứ 2 ở server — phòng khi NHCH thay đổi (bị xoá câu, đổi
    trạng thái duyệt...) giữa lúc FE sinh đề và lúc bấm Lưu, hoặc khi gọi API trực tiếp bỏ qua FE.
    Mỗi ô của ma trận giới hạn LIMIT so_cau khi random-select nên số câu nhận về không thể VƯỢT tổng
    yêu cầu của ma trận — so sánh tổng số câu là đủ để phát hiện thiếu, không cần đối chiếu từng ô.
    """
    if matrix.totalQuestions is None:
        return
    if question_count != matrix.totalQuestions:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Ngân hàng câu hỏi không đủ câu cho ma trận đề mã {matrix.code}: "
                f"chỉ nhận được {question_count}/{matrix.totalQuestions} câu. "
                "Vui lòng bổ sung thêm câu hỏi vào Ngân hàng câu hỏi rồi sinh lại đề."
            ),
        )


@router.post("/", status_code=201)
async def create_exam(body: ExamCreate, db: AsyncSession = Depends(get_db)):
    """Tạo đề thi mới."""
    # Có matrix_id (sinh theo ma trận đề — cả nguồn NHCH lẫn AI) → ma trận PHẢI đã "Đã thẩm định",
    # rồi mới đối chiếu số câu thực nhận (chỉ áp dụng khi có questionIds — nguồn NHCH, không phải AI).
    if body.matrix_id:
        matrix = await _get_approved_matrix_or_400(db, body.matrix_id)
        if body.questionIds:
            _validate_matrix_question_count(matrix, len(body.questionIds))

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

    # TOÀN BỘ phần ghi DB (kể cả các flush() trung gian) phải nằm trong CÙNG 1 try/except IntegrityError
    # — trước đây try/except chỉ bọc quanh db.commit() ở cuối, nhưng khi có questionIds thì chính
    # db.flush() đầu tiên (đẩy INSERT của `exam`, cần có TRƯỚC khi insert Question tham chiếu FK) mới
    # là nơi UNIQUE constraint exams.code thực sự vỡ, nên lỗi thoát ra NGOÀI try/except ở dưới, lọt
    # nguyên lỗi SQL thô (pymysql.err.IntegrityError) ra ngoài dưới dạng 500 thay vì thông báo dễ hiểu.
    questions: list[Question] = []
    try:
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
    except IntegrityError as e:
        # Rollback trước khi raise — nếu không session ở trạng thái lỗi sẽ làm hỏng luôn request kế
        # tiếp dùng chung session (giống pattern packages.py::create_package).
        await db.rollback()
        if "exams.code" in str(getattr(e, "orig", e)):
            # Trùng UNIQUE constraint exams.code — trước đây để lọt nguyên lỗi SQL thô (500,
            # "Duplicate entry ... for key 'exams.code'") ra ngoài thay vì thông báo dễ hiểu. Có thể
            # xảy ra dù FE đã tự né trùng (ModalSinhDeHoanVi.tsx) nếu 2 request tạo đề cùng mã chạy
            # song song thật sự (race condition), hoặc mã đề người dùng tự nhập đã tồn tại.
            raise HTTPException(
                status_code=400,
                detail=f"Mã đề thi \"{exam_code}\" đã tồn tại. Vui lòng đổi mã khác.",
            )
        raise HTTPException(status_code=400, detail="Không thể tạo đề thi — dữ liệu bị trùng lặp.")

    if body.questionIds:
        q_result = await db.execute(select(Question).where(Question.exam_id == exam_id))
        questions = list(q_result.scalars().all())
    exam.totalQuestions = len(questions)
    await db.commit()

    matrix_name, total_score = await _get_matrix_name_and_score(db, exam, questions)
    return {
        "success": True,
        "message": "Khởi tạo đề thi thành công!",
        "data": _build_exam_response(exam, questions, matrix_name, total_score),
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

    matrix_name, total_score = await _get_matrix_name_and_score(db, exam, list(questions))
    return {
        "success": True,
        "message": "Đã cập nhật thông tin đề thi thành công!",
        "data": _build_exam_response(exam, list(questions), matrix_name, total_score),
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
