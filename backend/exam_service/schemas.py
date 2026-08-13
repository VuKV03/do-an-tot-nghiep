"""
Pydantic schemas for request/response validation — Exam Service.
"""
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal


# ─── Question Schemas ────────────────────────────────────────────────
class QuestionBase(BaseModel):
    code: Optional[str] = None
    content: str
    options: Optional[str] = None
    correct_answer: Optional[str] = None
    topic_id: Optional[str] = None
    parent_id: Optional[str] = None
    subject_id: Optional[str] = None
    grade_id: Optional[str] = None
    level_id: Optional[str] = None
    type_id: Optional[str] = None
    competency_component_id: Optional[str] = None
    line_number: Optional[int] = 0
    status: Optional[int] = 0
    status_ai: Optional[int] = 0
    approved_note: Optional[str] = ""
    exam_id: Optional[str] = None
    statements: Optional[str] = None


class QuestionResponse(QuestionBase):
    id: str

    model_config = {"from_attributes": True}


class QuestionManualCreate(BaseModel):
    text: str
    type: Literal['single', 'multiple', 'true_false', 'short']
    level: Literal['nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao']
    subject: str
    grade: str
    topicId: Optional[str] = None
    topicName: Optional[str] = None
    subTopicName: Optional[str] = None
    options: Optional[List[str]] = None
    correctAnswer: Optional[str | List[str]] = None
    statements: Optional[list] = None
    competencyComponentId: Optional[str] = None
    creator: Optional[str] = None
    createdAt: Optional[str] = None
    status: Optional[Literal['draft', 'pending', 'approved']] = 'draft'
    lineNumber: Optional[int] = 0
    examId: Optional[str] = None
    # Nguồn gốc câu hỏi — dùng để ẩn câu hỏi "sinh cả đề bằng AI" (ModalTaoDeTuDong.tsx > Theo AI,
    # ModalSinhDeHoanVi.tsx) khỏi Ngân hàng câu hỏi/Thẩm định/picker chọn câu hỏi, KHÁC với câu hỏi
    # sinh bằng AI ngay trong màn Ngân hàng câu hỏi (ai-generate.tsx, vẫn hiện bình thường). Lưu vào
    # cột status_ai đã có sẵn (trước đây không dùng vào việc gì): manual=0, ai_bank=1, ai_exam=2.
    source: Optional[Literal['manual', 'ai_bank', 'ai_exam']] = 'manual'


class QuestionBulkCreate(BaseModel):
    # Dùng cho luồng tạo NHIỀU câu hỏi cùng lúc cho 1 đề (đề hoán vị, đề theo ma trận) — gộp lại
    # thành 1 request thay vì gọi POST /questions/ lặp lại N lần (xem routes/questions.py::create_questions_bulk).
    items: List[QuestionManualCreate]


class QuestionHistoryResponse(BaseModel):
    id: str
    question_id: str
    action: str
    actor: Optional[str] = None
    timestamp: str
    note: str

    model_config = {"from_attributes": True}


class QuestionHistoryListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[QuestionHistoryResponse]


class MatrixHistoryResponse(BaseModel):
    id: str
    matrix_id: str
    action: str
    actor: Optional[str] = None
    timestamp: str
    note: str
    comment: Optional[str] = None

    model_config = {"from_attributes": True}


class MatrixHistoryListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[MatrixHistoryResponse]


# ─── Exam Schemas ────────────────────────────────────────────────────
class ExamCreate(BaseModel):
    name: str
    code: Optional[str] = None
    subject: str
    grade: str
    duration: Optional[int] = 60
    description: Optional[str] = ""
    source: Optional[str] = "manual"
    questions: Optional[List[QuestionBase]] = []
    # Danh sách id câu hỏi đã có sẵn trong Ngân hàng câu hỏi cần gắn vào đề thi này
    # (dùng cho luồng "Đề thi riêng lẻ" — chọn câu có sẵn thay vì tạo câu mới).
    questionIds: Optional[List[str]] = None
    # Ma trận đề đã dùng để sinh đề này (luồng "Theo ma trận đề"); None nếu đề tự chọn/AI-config.
    matrix_id: Optional[str] = None


class ExamUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    subject: Optional[str] = None
    grade: Optional[str] = None
    status: Optional[str] = None
    attempts: Optional[int] = None
    totalQuestions: Optional[int] = None
    avgScore: Optional[float] = None
    duration: Optional[int] = None
    description: Optional[str] = None
    source: Optional[str] = None
    questions: Optional[List[QuestionBase]] = None
    questionIds: Optional[List[str]] = None
    matrix_id: Optional[str] = None


class ExamResponse(BaseModel):
    id: str
    code: str
    name: str
    subject: str
    grade: str
    status: str
    attempts: int
    totalQuestions: int
    avgScore: float
    createdAt: str
    duration: int
    description: str
    source: str
    matrix_id: Optional[str] = None
    # Tên ma trận thật (JOIN theo matrix_id), None nếu đề không sinh từ ma trận nào — trước đây FE tự
    # bịa "Ma trận đề 01" khi thiếu dữ liệu, giờ trả None để FE hiện đúng "—"/"Không có ma trận".
    matrixName: Optional[str] = None
    # Điểm tối đa của đề: lấy từ matrix.totalScore (đã tính = Σ so_cau × diem lúc lưu ma trận) nếu đề
    # sinh theo ma trận, hoặc thang điểm (scale) trong Cấu hình môn học của đúng môn nếu không có ma
    # trận — không còn hardcode "10.00" cho mọi đề như trước.
    totalScore: float = 10.0
    questions: List[QuestionResponse]

    model_config = {"from_attributes": True}


class ExamListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[ExamResponse]


# ─── Package Schemas ─────────────────────────────────────────────────
class PackageCreate(BaseModel):
    name: str
    code: Optional[str] = None
    subject: str
    grade: str
    examIds: Optional[List[str]] = []
    accessType: Optional[str] = "standard"
    description: Optional[str] = ""
    # Chỉ dùng để gắn nhãn/lọc gói đề (không ảnh hưởng logic sinh đề hoán vị)
    matrix_id: Optional[str] = None
    is_show_result: Optional[bool] = True


class PackageUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    subject: Optional[str] = None
    grade: Optional[str] = None
    status: Optional[str] = None
    examIds: Optional[List[str]] = None
    downloadsCount: Optional[int] = None
    accessType: Optional[str] = None
    description: Optional[str] = None
    matrix_id: Optional[str] = None
    is_show_result: Optional[bool] = None


class PublishPackageRequest(BaseModel):
    # Cho phép chọn ngay lúc "Cho thi" xem có hiển thị đáp án cho học sinh sau khi nộp bài hay không
    # (PackageManagementModule.tsx: popup "Cho xem đáp án sau khi nộp bài" khi bấm icon Cho thi) —
    # None = giữ nguyên giá trị is_show_result hiện có của gói (không đổi gì).
    is_show_result: Optional[bool] = None


class PackageResponse(BaseModel):
    id: str
    code: str
    name: str
    subject: str
    grade: str
    status: str
    examsCount: int
    examIds: List[str]
    downloadsCount: int
    accessType: str
    createdAt: str
    description: str
    matrix_id: Optional[str] = None
    is_show_result: bool

    model_config = {"from_attributes": True}




class PackageListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[PackageResponse]


# ═══════════════════════════════════════════════════════════════════════
# ─── Danh mục môn học (SubjectCategory) ─────────────────────────────
# ═══════════════════════════════════════════════════════════════════════

class SubjectCategoryCreate(BaseModel):
    code: str
    name: str
    is_active: bool = True
    note: Optional[str] = ""


class SubjectCategoryUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None
    note: Optional[str] = None


class SubjectCategoryResponse(BaseModel):
    id: str
    code: str
    name: str
    is_active: bool
    note: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class SubjectCategoryListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[SubjectCategoryResponse]


# ═══════════════════════════════════════════════════════════════════════
# ─── Danh mục cấp độ tư duy (CognitiveLevel) ────────────────────────
# ═══════════════════════════════════════════════════════════════════════

class CognitiveLevelCreate(BaseModel):
    code: str
    name: str
    note: Optional[str] = ""


class CognitiveLevelUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    note: Optional[str] = None


class CognitiveLevelResponse(BaseModel):
    id: str
    code: str
    name: str
    note: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class CognitiveLevelListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[CognitiveLevelResponse]


# ═══════════════════════════════════════════════════════════════════════
# ─── Danh mục loại hình câu hỏi (QuestionType) ──────────────────────
# ═══════════════════════════════════════════════════════════════════════

class QuestionTypeCreate(BaseModel):
    code: str
    name: str
    note: Optional[str] = ""


class QuestionTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    note: Optional[str] = None


class QuestionTypeResponse(BaseModel):
    id: str
    code: str
    name: str
    note: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class QuestionTypeListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[QuestionTypeResponse]


# ═══════════════════════════════════════════════════════════════════════
# ─── Danh mục thành phần năng lực (CompetencyComponent) ─────────────
# ═══════════════════════════════════════════════════════════════════════

class CompetencyComponentCreate(BaseModel):
    code: str
    name: str
    subject_id: Optional[str] = None
    is_active: bool = True
    note: Optional[str] = ""


class CompetencyComponentUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    subject_id: Optional[str] = None
    is_active: Optional[bool] = None
    note: Optional[str] = None


class CompetencyComponentResponse(BaseModel):
    id: str
    code: str
    name: str
    subject_id: Optional[str] = None
    is_active: bool
    note: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class CompetencyComponentListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[CompetencyComponentResponse]


# ═══════════════════════════════════════════════════════════════════════
# ─── Danh mục khối lớp (GradeLevel) ─────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════

class GradeLevelCreate(BaseModel):
    code: str
    name: str
    is_active: bool = True
    note: Optional[str] = ""


class GradeLevelUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None
    note: Optional[str] = None


class GradeLevelResponse(BaseModel):
    id: str
    code: str
    name: str
    is_active: bool
    note: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class GradeLevelListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[GradeLevelResponse]



# ─── Topic (chu_de) Schemas ──────────────────────────────────────────────────
class TopicCreate(BaseModel):
    parent_id: Optional[str] = None
    code: str
    name: str
    subject_id: Optional[str] = None
    grade_id: Optional[str] = None
    status: int = 1
    created_by: Optional[str] = None
    submitted_by: Optional[str] = None
    approved_by: Optional[str] = None
    approval_note: Optional[str] = ""
    note: Optional[str] = ""

class TopicUpdate(BaseModel):
    parent_id: Optional[str] = None
    code: Optional[str] = None
    name: Optional[str] = None
    subject_id: Optional[str] = None
    grade_id: Optional[str] = None
    status: Optional[int] = None
    submitted_by: Optional[str] = None
    approved_by: Optional[str] = None
    approval_note: Optional[str] = None
    note: Optional[str] = None
    # Người thực hiện thao tác sửa này — chỉ dùng để ghi log lịch sử (TopicHistory.actor),
    # KHÔNG phải cột trên bảng topics nên phải loại trừ khỏi vòng lặp setattr generic ở route.
    actor: Optional[str] = None

class TopicResponse(BaseModel):
    id: str
    parent_id: Optional[str] = None
    code: str
    name: str
    subject_id: Optional[str] = None
    grade_id: Optional[str] = None
    status: int
    created_by: Optional[str] = None
    created_at: str
    submitted_by: Optional[str] = None
    submitted_at: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    approval_note: str
    note: str
    subject_name: Optional[str] = None
    grade_name: Optional[str] = None

    model_config = {"from_attributes": True}

class TopicListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[TopicResponse]


# ─── Lịch sử chủ đề (topic_histories) ─────────────────────────────────────────
class TopicHistoryResponse(BaseModel):
    id: str
    topic_id: str
    action: str
    actor: Optional[str] = None
    timestamp: str
    note: str
    comment: Optional[str] = None

    model_config = {"from_attributes": True}

class TopicHistoryListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[TopicHistoryResponse]


# ─── Cấu hình môn học (subject_configs) ─────────────────────────────────────────
class SubjectConfigBase(BaseModel):
    type_id_p1: Optional[str] = None
    type_id_p2: Optional[str] = None
    type_id_p3: Optional[str] = None
    subject_id: Optional[str] = None
    content_p1: Optional[str] = None
    content_p2: Optional[str] = None
    content_p3: Optional[str] = None
    p1_from: Optional[int] = None
    p1_to: Optional[int] = None
    p2_from: Optional[int] = None
    p2_to: Optional[int] = None
    p3_from: Optional[int] = None
    p3_to: Optional[int] = None
    points_for_a_correct_answers_p1: Optional[Decimal] = None
    points_for_1_correct_idea_p1: Optional[Decimal] = None
    points_for_2_correct_idea_p1: Optional[Decimal] = None
    points_for_3_correct_idea_p1: Optional[Decimal] = None
    points_for_4_correct_idea_p1: Optional[Decimal] = None
    points_for_a_correct_answers_p2: Optional[Decimal] = None
    points_for_1_correct_idea_p2: Optional[Decimal] = None
    points_for_2_correct_idea_p2: Optional[Decimal] = None
    points_for_3_correct_idea_p2: Optional[Decimal] = None
    points_for_4_correct_idea_p2: Optional[Decimal] = None
    points_for_a_correct_answers_p3: Optional[Decimal] = None
    points_for_1_correct_idea_p3: Optional[Decimal] = None
    points_for_2_correct_idea_p3: Optional[Decimal] = None
    points_for_3_correct_idea_p3: Optional[Decimal] = None
    points_for_4_correct_idea_p3: Optional[Decimal] = None
    questions_number: Optional[int] = None
    number_to_create: Optional[int] = None
    scale: Optional[int] = None
    time: Optional[int] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class SubjectConfigCreate(SubjectConfigBase):
    pass


class SubjectConfigUpdate(BaseModel):
    type_id_p1: Optional[str] = None
    type_id_p2: Optional[str] = None
    type_id_p3: Optional[str] = None
    subject_id: Optional[str] = None
    content_p1: Optional[str] = None
    content_p2: Optional[str] = None
    content_p3: Optional[str] = None
    p1_from: Optional[int] = None
    p1_to: Optional[int] = None
    p2_from: Optional[int] = None
    p2_to: Optional[int] = None
    p3_from: Optional[int] = None
    p3_to: Optional[int] = None
    points_for_a_correct_answers_p1: Optional[Decimal] = None
    points_for_1_correct_idea_p1: Optional[Decimal] = None
    points_for_2_correct_idea_p1: Optional[Decimal] = None
    points_for_3_correct_idea_p1: Optional[Decimal] = None
    points_for_4_correct_idea_p1: Optional[Decimal] = None
    points_for_a_correct_answers_p2: Optional[Decimal] = None
    points_for_1_correct_idea_p2: Optional[Decimal] = None
    points_for_2_correct_idea_p2: Optional[Decimal] = None
    points_for_3_correct_idea_p2: Optional[Decimal] = None
    points_for_4_correct_idea_p2: Optional[Decimal] = None
    points_for_a_correct_answers_p3: Optional[Decimal] = None
    points_for_1_correct_idea_p3: Optional[Decimal] = None
    points_for_2_correct_idea_p3: Optional[Decimal] = None
    points_for_3_correct_idea_p3: Optional[Decimal] = None
    points_for_4_correct_idea_p3: Optional[Decimal] = None
    questions_number: Optional[int] = None
    number_to_create: Optional[int] = None
    scale: Optional[int] = None
    time: Optional[int] = None
    updated_by: Optional[str] = None


class SubjectConfigResponse(SubjectConfigBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SubjectConfigListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[SubjectConfigResponse]
