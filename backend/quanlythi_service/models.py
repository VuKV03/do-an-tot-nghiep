# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from backend.shared.database import Base
from datetime import datetime

class StudentSubject(Base):
    __tablename__ = "student_subjects"

    id = Column(String(50), primary_key=True, index=True)
    candidate_id = Column(String(50), ForeignKey("exam_candidates.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(100), nullable=False) # Mã hoặc ID môn học
    subject_name = Column(String(255), nullable=True) # Tên môn học

    candidate = relationship("ExamCandidate", back_populates="subjects")

class ExamCandidate(Base):
    __tablename__ = "exam_candidates"

    id = Column(String(50), primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    cccd = Column(String(50), nullable=True)
    gender = Column(String(20), nullable=True)
    dob = Column(String(50), nullable=True) 
    note = Column(Text, nullable=True)
    
    # Các trường cũ (session_id, diem_thi, registered_subjects, status) 
    # được ẩn khỏi ORM để không sử dụng nữa nhưng vẫn còn trong DB để tránh mất dữ liệu.

    subjects = relationship("StudentSubject", back_populates="candidate", cascade="all, delete-orphan")
    results = relationship("ExamResult", back_populates="candidate", cascade="all, delete-orphan")

class ExamResult(Base):
    __tablename__ = "exam_results"

    id = Column(String(50), primary_key=True, index=True)
    candidate_id = Column(String(50), ForeignKey("exam_candidates.id", ondelete="CASCADE"), nullable=False)
    package_id = Column(String(255), nullable=True)
    exam_id = Column(String(255), nullable=True)
    subject = Column(String(100), nullable=True)
    status = Column(String(50), default="in_progress") # in_progress, submitted
    score = Column(Float, nullable=True)
    total_correct = Column(Integer, nullable=True)
    total_questions = Column(Integer, nullable=True)
    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    answers_json = Column(Text, nullable=True) # Lưu trữ JSON của các câu trả lời

    candidate = relationship("ExamCandidate", back_populates="results")
