"""
Ràng buộc tham chiếu khi xóa danh mục — chặn xóa (409) nếu môn học/chủ đề/
mức độ nhận thức/thành phần năng lực/loại câu hỏi/khối lớp/đợt thi đang được
sử dụng ở nơi khác (câu hỏi trong ngân hàng, cấu hình môn học, chủ đề con,
gói đề thi, hoặc cấu trúc ma trận đề thi).

`MatrixConfig.structure` là cột Text chứa JSON (ds_cau_truc) nhúng id chủ đề/
mức độ/loại câu hỏi/năng lực dưới dạng chuỗi thuần — không có FK ở tầng DB nên
chỉ có thể kiểm tra ở đây (app-level), bằng cách quét substring.
"""
# pyrefly: ignore [missing-import]
from fastapi import HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy import select, func, or_
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
from backend.exam_service.models import (
    Question, Topic, CompetencyComponent, SubjectConfig, MatrixConfig, Package,
    SubjectCategory, CognitiveLevel, QuestionType, GradeLevel,
)

# Nguồn duy nhất cho map code môn học cũ -> tên hiển thị (dùng chung với routes/matrix_configs.py).
SUBJECT_MAP = {
    "mh-toan": "Toán học",
    "mh-ly": "Vật lí",
    "mh-anh": "Tiếng Anh",
}


async def _count(db: AsyncSession, column, value: str) -> int:
    result = await db.execute(select(func.count()).where(column == value))
    return result.scalar() or 0


async def _matrix_ref_count(db: AsyncSession, id_value: str) -> int:
    """Đếm số ma trận đề có `id_value` xuất hiện như một giá trị chuỗi JSON trong `structure`."""
    result = await db.execute(
        select(func.count()).where(MatrixConfig.structure.like(f'%"{id_value}"%'))
    )
    return result.scalar() or 0


def _raise_if_in_use(loai: str, ten: str, reasons: list[str]) -> None:
    if reasons:
        raise HTTPException(
            status_code=409,
            detail=(
                f'Không thể xóa {loai} "{ten}" vì đang được sử dụng bởi: '
                f'{", ".join(reasons)}. Vui lòng gỡ bỏ các liên kết này trước khi xóa.'
            ),
        )


async def assert_subject_deletable(db: AsyncSession, subject: SubjectCategory) -> None:
    reasons: list[str] = []
    n = await _count(db, Question.subject_id, subject.id)
    if n:
        reasons.append(f"{n} câu hỏi")
    n = await _count(db, Topic.subject_id, subject.id)
    if n:
        reasons.append(f"{n} chủ đề")
    n = await _count(db, CompetencyComponent.subject_id, subject.id)
    if n:
        reasons.append(f"{n} thành phần năng lực")
    n = await _count(db, SubjectConfig.subject_id, subject.id)
    if n:
        reasons.append(f"{n} cấu hình môn học")

    subj_names = {subject.code, subject.name}
    mapped_name = SUBJECT_MAP.get(subject.code)
    if mapped_name:
        subj_names.add(mapped_name)
    result = await db.execute(select(func.count()).where(MatrixConfig.subject.in_(subj_names)))
    n = result.scalar() or 0
    if n:
        reasons.append(f"{n} ma trận đề")

    _raise_if_in_use("môn học", subject.name, reasons)


async def get_topic_subtree_ids(db: AsyncSession, root_id: str) -> list[str]:
    """Trả về id của topic gốc cùng toàn bộ chủ đề con cháu (BFS theo parent_id)."""
    ids = [root_id]
    frontier = [root_id]
    while frontier:
        result = await db.execute(select(Topic.id).where(Topic.parent_id.in_(frontier)))
        children = list(result.scalars().all())
        if not children:
            break
        ids.extend(children)
        frontier = children
    return ids


async def assert_topic_deletable(db: AsyncSession, topic: Topic) -> list[str]:
    """Kiểm tra có thể xóa chủ đề hay không.

    Chủ đề con (chưa có dữ liệu câu hỏi/ma trận) không còn là lý do chặn xóa —
    chúng sẽ được xóa theo (cascade) cùng chủ đề cha. Chỉ chặn nếu bản thân
    chủ đề hoặc bất kỳ chủ đề con nào trong cây đang có câu hỏi/ma trận tham chiếu.
    Trả về danh sách id của toàn bộ cây con (gồm cả topic gốc) để route xóa cascade.
    """
    subtree_ids = await get_topic_subtree_ids(db, topic.id)

    reasons: list[str] = []
    result = await db.execute(select(func.count()).where(Question.topic_id.in_(subtree_ids)))
    n = result.scalar() or 0
    if n:
        reasons.append(f"{n} câu hỏi")

    matrix_n = 0
    for tid in subtree_ids:
        matrix_n += await _matrix_ref_count(db, tid)
    if matrix_n:
        reasons.append(f"{matrix_n} ma trận đề")

    _raise_if_in_use("chủ đề", topic.name, reasons)
    return subtree_ids


async def assert_cognitive_level_deletable(db: AsyncSession, level: CognitiveLevel) -> None:
    reasons: list[str] = []
    n = await _count(db, Question.level_id, level.id)
    if n:
        reasons.append(f"{n} câu hỏi")
    n = await _matrix_ref_count(db, level.id)
    if n:
        reasons.append(f"{n} ma trận đề")
    _raise_if_in_use("mức độ nhận thức", level.name, reasons)


async def assert_competency_component_deletable(db: AsyncSession, comp: CompetencyComponent) -> None:
    reasons: list[str] = []
    n = await _count(db, Question.competency_component_id, comp.id)
    if n:
        reasons.append(f"{n} câu hỏi")
    n = await _matrix_ref_count(db, comp.id)
    if n:
        reasons.append(f"{n} ma trận đề")
    _raise_if_in_use("thành phần năng lực", comp.name, reasons)


async def assert_question_type_deletable(db: AsyncSession, qtype: QuestionType) -> None:
    reasons: list[str] = []
    n = await _count(db, Question.type_id, qtype.id)
    if n:
        reasons.append(f"{n} câu hỏi")

    result = await db.execute(
        select(func.count()).where(
            or_(
                SubjectConfig.type_id_p1 == qtype.id,
                SubjectConfig.type_id_p2 == qtype.id,
                SubjectConfig.type_id_p3 == qtype.id,
            )
        )
    )
    n = result.scalar() or 0
    if n:
        reasons.append(f"{n} cấu hình môn học")

    n = await _matrix_ref_count(db, qtype.id)
    if n:
        reasons.append(f"{n} ma trận đề")
    _raise_if_in_use("loại hình câu hỏi", qtype.name, reasons)


async def assert_grade_level_deletable(db: AsyncSession, grade: GradeLevel) -> None:
    reasons: list[str] = []
    n = await _count(db, Question.grade_id, grade.id)
    if n:
        reasons.append(f"{n} câu hỏi")
    n = await _count(db, Topic.grade_id, grade.id)
    if n:
        reasons.append(f"{n} chủ đề")
    _raise_if_in_use("khối lớp", grade.name, reasons)



