"""
SQLAlchemy ORM models for the Exam Service.
Tables: exams, questions, packages, dm_mon_hoc, dm_cap_do_tu_duy,
        dm_loai_hinh_cau_hoi, dm_thanh_phan_nang_luc, dm_khoi_lop
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, Boolean, Numeric
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.mysql import LONGTEXT, DATETIME
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from backend.shared.database import Base


class Exam(Base):
    __tablename__ = "exams"

    id = Column(String(255), primary_key=True)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False)
    grade = Column(String(100), nullable=False)
    status = Column(String(50), default="draft")
    attempts = Column(Integer, default=0)
    totalQuestions = Column(Integer, default=0)
    avgScore = Column(Float, default=0.0)
    createdAt = Column(String(100), nullable=False)
    duration = Column(Integer, nullable=False)
    description = Column(Text, default="")
    source = Column(String(50), default="manual")
    # Ma trận đề dùng để sinh đề này (chỉ có ở luồng "Thêm mới tự động" > Theo ma trận đề).
    # NULL nghĩa là đề tự chọn/thủ công/AI-config, không gắn với ma trận nào.
    matrix_id = Column(String(255), nullable=True)

    # Relationship
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True)
    code = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    options = Column(Text, nullable=True)
    correct_answer = Column(Text, nullable=True)
    
    # Foreign keys
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    parent_id = Column(String(36), nullable=True)
    subject_id = Column(String(36), ForeignKey("subject_categories.id", ondelete="SET NULL"), nullable=True)
    grade_id = Column(String(36), ForeignKey("grade_levels.id", ondelete="SET NULL"), nullable=True)
    level_id = Column(String(36), ForeignKey("cognitive_levels.id", ondelete="SET NULL"), nullable=True)
    type_id = Column(String(36), ForeignKey("question_types.id", ondelete="SET NULL"), nullable=True)
    competency_component_id = Column(String(36), ForeignKey("competency_components.id", ondelete="SET NULL"), nullable=True)
    
    # Optional relation to exams (to maintain compatibility)
    exam_id = Column(String(255), ForeignKey("exams.id", ondelete="CASCADE"), nullable=True)
    
    line_number = Column(Integer, default=1)
    status = Column(Integer, default=0)
    status_ai = Column(Integer, default=0)
    approved_note = Column(Text, default="")
    statements = Column(Text, nullable=True)

    # Relationship
    exam = relationship("Exam", back_populates="questions")



class Package(Base):
    __tablename__ = "packages"

    id = Column(String(255), primary_key=True)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False)
    grade = Column(String(100), nullable=False)
    status = Column(String(50), default="active")
    examsCount = Column(Integer, default=0)
    examIds = Column(Text)  # JSON string of exam IDs array
    downloadsCount = Column(Integer, default=0)
    accessType = Column(String(50), default="standard")
    createdAt = Column(String(100), nullable=False)
    description = Column(Text, default="")
    matrix_id = Column(String(255), nullable=True)
    exam_period_id = Column(String(36), nullable=True)


class MatrixConfig(Base):
    __tablename__ = "matrix_configs"

    id = Column(String(255), primary_key=True)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False)
    totalScore = Column(Float, default=0.0)
    totalQuestions = Column(Integer, default=0)
    duration = Column(Integer, default=45)
    status = Column(String(50), default="new")
    createdAt = Column(String(100), nullable=False)
    structure = Column(Text)  # JSON string of ds_cau_truc array


# ─── Danh mục môn học (SubjectCategory) ──────────────────────────────
class SubjectCategory(Base):
    __tablename__ = "subject_categories"

    id = Column(String(36), primary_key=True)
    code = Column(String(50), unique=True, nullable=False)        # Ma
    name = Column(String(255), nullable=False)                    # Ten
    is_active = Column(Boolean, default=True)                     # IsActive
    note = Column(Text, default="")                               # GhiChu
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=True)

    # Relationship
    thanh_phan_nang_lucs = relationship(
        "CompetencyComponent", back_populates="mon_hoc", cascade="all, delete-orphan"
    )


# ─── Danh mục cấp độ tư duy (CognitiveLevel) ─────────────────────────
class CognitiveLevel(Base):
    __tablename__ = "cognitive_levels"

    id = Column(String(36), primary_key=True)
    code = Column(String(50), unique=True, nullable=False)        # Ma
    name = Column(String(255), nullable=False)                    # Ten
    note = Column(Text, default="")                               # GhiChu
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=True)


# ─── Danh mục loại hình câu hỏi (QuestionType) ───────────────────────
class QuestionType(Base):
    __tablename__ = "question_types"

    id = Column(String(36), primary_key=True)
    code = Column(String(50), unique=True, nullable=False)        # Ma
    name = Column(String(255), nullable=False)                    # Ten
    note = Column(Text, default="")                               # GhiChu
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=True)


# ─── Danh mục thành phần năng lực (CompetencyComponent) ──────────────
class CompetencyComponent(Base):
    __tablename__ = "competency_components"

    id = Column(String(36), primary_key=True)
    code = Column(String(50), unique=True, nullable=False)        # Ma
    name = Column(String(255), nullable=False)                    # Ten
    subject_id = Column(                                          # IdMonHoc
        String(36), ForeignKey("subject_categories.id", ondelete="SET NULL"), nullable=True
    )
    is_active = Column(Boolean, default=True)                     # IsActive
    note = Column(Text, default="")                               # GhiChu
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=True)

    # Relationship
    mon_hoc = relationship("SubjectCategory", back_populates="thanh_phan_nang_lucs")


# ─── Danh mục khối lớp (GradeLevel) ──────────────────────────────────
class GradeLevel(Base):
    __tablename__ = "grade_levels"

    id = Column(String(36), primary_key=True)
    code = Column(String(50), unique=True, nullable=False)        # Ma
    name = Column(String(255), nullable=False)                    # Ten
    is_active = Column(Boolean, default=True)                     # IsActive
    note = Column(Text, default="")                               # GhiChu
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=True)


# ─── Danh mục kỳ thi (ExamPeriod) ────────────────────────────────────
class ExamPeriod(Base):
    __tablename__ = "exam_periods"

    id = Column(String(36), primary_key=True)                     # Id
    code = Column(String(50), unique=True, nullable=False)        # Ma
    name = Column(String(255), nullable=False)                    # Ten
    start_date = Column(String(50), nullable=False)               # NgayBatDau
    end_date = Column(String(50), nullable=False)                 # NgayKetThuc
    status = Column(String(50), default="HOAT_DONG")              # TrangThai
    is_active = Column(Boolean, default=True)                     # IsActive
    note = Column(Text, default="")                               # GhiChu
    created_by = Column(String(36), nullable=True)                # CreatedBy
    updated_by = Column(String(36), nullable=True)                # UpdatedBy
    created_at = Column(String(50), nullable=False)               # CreatedAt
    updated_at = Column(String(50), nullable=True)                # UpdatedAt


# ─── Chủ đề (chu_de) ────────────────────────────────────────────────
class Topic(Base):
    __tablename__ = "topics"

    id = Column(String(36), primary_key=True)                     # id
    parent_id = Column(String(36), nullable=True)                 # parent_id
    code = Column(String(50), nullable=False)                     # ma
    name = Column(String(255), nullable=False)                    # ten
    subject_id = Column(                                          # id_mon_hoc
        String(36), ForeignKey("subject_categories.id", ondelete="SET NULL"), nullable=True
    )
    grade_id = Column(                                            # id_khoi_lop
        String(36), ForeignKey("grade_levels.id", ondelete="SET NULL"), nullable=True
    )
    status = Column(Integer, default=1)                           # trang_thai
    created_by = Column(String(36), nullable=True)                # id_nguoi_tao
    created_at = Column(String(50), nullable=False)               # thoi_gian_tao
    submitted_by = Column(String(36), nullable=True)              # id_nguoi_gui
    submitted_at = Column(String(50), nullable=True)              # thoi_gian_gui
    approved_by = Column(String(36), nullable=True)               # id_nguoi_tham_dinh
    approved_at = Column(String(50), nullable=True)               # thoi_gian_tham_dinh
    approval_note = Column(Text, default="")                      # noi_dung_tham_dinh
    note = Column(Text, default="")                               # ghi_chu


# ─── Lịch sử chủ đề (topic_histories) ───────────────────────────────
class TopicHistory(Base):
    __tablename__ = "topic_histories"

    id = Column(String(36), primary_key=True)                     # id
    topic_id = Column(                                            # topic_id
        String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )
    action = Column(String(50), nullable=False)                   # action: 'Thêm mới', 'Sửa', 'Gửi thẩm định', 'Đồng ý', 'Từ chối'
    actor = Column(String(255), nullable=True)                    # user who did this (nguoiThucHien)
    timestamp = Column(String(50), nullable=False)                # thoi_gian (ISO 8601 string)
    note = Column(Text, default="")                               # noi_dung (Details)

    # Relationship to Topic (optional but good to have)
    # topic = relationship("Topic", backref="histories")


# ─── Lịch sử câu hỏi (question_histories) ───────────────────────────
class QuestionHistory(Base):
    __tablename__ = "question_histories"

    id = Column(String(36), primary_key=True)
    question_id = Column(
        String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    actor = Column(String(255), nullable=True)
    action = Column(String(50), nullable=False)                   # action: 'Thêm mới', 'Sửa', 'Xóa', 'Gửi thẩm định', 'Đồng ý', 'Từ chối'
    timestamp = Column(String(50), nullable=False)
    note = Column(Text, default="")



# ─── Cấu hình môn học (subject_configs) ──────────────────────────────
class SubjectConfig(Base):
    __tablename__ = "subject_configs"

    id = Column(String(36), primary_key=True)
    type_id_p1 = Column(String(36), ForeignKey("question_types.id", ondelete="SET NULL"), nullable=True)
    type_id_p2 = Column(String(36), ForeignKey("question_types.id", ondelete="SET NULL"), nullable=True)
    type_id_p3 = Column(String(36), ForeignKey("question_types.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(String(36), ForeignKey("subject_categories.id", ondelete="SET NULL"), nullable=True)
    content_p1 = Column(LONGTEXT, nullable=True)
    content_p2 = Column(LONGTEXT, nullable=True)
    content_p3 = Column(LONGTEXT, nullable=True)
    p1_from = Column(Integer, nullable=True)
    p1_to = Column(Integer, nullable=True)
    p2_from = Column(Integer, nullable=True)
    p2_to = Column(Integer, nullable=True)
    p3_from = Column(Integer, nullable=True)
    p3_to = Column(Integer, nullable=True)
    points_for_a_correct_answers_p1 = Column(Numeric(65, 30), nullable=True)
    points_for_1_correct_idea = Column(Numeric(65, 30), nullable=True)
    points_for_2_correct_idea = Column(Numeric(65, 30), nullable=True)
    points_for_3_correct_idea = Column(Numeric(65, 30), nullable=True)
    points_for_4_correct_idea = Column(Numeric(65, 30), nullable=True)
    points_for_a_correct_answers_p3 = Column(Numeric(65, 30), nullable=True)
    questions_number = Column(Integer, nullable=True)
    number_to_create = Column(Integer, nullable=True)
    scale = Column(Integer, nullable=True)
    time = Column(Integer, nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DATETIME(fsp=6), nullable=False)
    updated_by = Column(String(255), nullable=True)
    updated_at = Column(DATETIME(fsp=6), nullable=True)

    # Relationships
    subject = relationship("SubjectCategory")
    type_p1 = relationship("QuestionType", foreign_keys=[type_id_p1])
    type_p2 = relationship("QuestionType", foreign_keys=[type_id_p2])
    type_p3 = relationship("QuestionType", foreign_keys=[type_id_p3])
