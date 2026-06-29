"""
SQLAlchemy ORM models for the Exam Service.
Tables: exams, questions, packages, dm_mon_hoc, dm_cap_do_tu_duy,
        dm_loai_hinh_cau_hoi, dm_thanh_phan_nang_luc, dm_khoi_lop
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, Boolean
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

    # Relationship
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(255), primary_key=True)
    code = Column(String(100), nullable=True)
    examId = Column("exam_id", String(255), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    text = Column("content", Text, nullable=False)
    type = Column("type_id", String(50), default="single")
    level = Column("level_id", String(50), default="medium")
    options = Column(Text)  # JSON string of options array
    correctAnswer = Column("correct_answer", String(255), nullable=False)
    topicId = Column("topic_id", String(36), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    parentId = Column("parent_id", String(36), nullable=True)
    subjectId = Column("subject_id", String(36), ForeignKey("subject_categories.id", ondelete="SET NULL"), nullable=True)
    gradeId = Column("grade_id", String(36), ForeignKey("grade_levels.id", ondelete="SET NULL"), nullable=True)
    competencyComponentId = Column("competency_component_id", String(36), nullable=True)
    status = Column("status", Integer, default=1)
    approvedNote = Column("approved_note", Text, default="")

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


# ─── Danh mục đợt thi (ExamPeriod) ────────────────────────────────────
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
