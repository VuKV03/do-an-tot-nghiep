# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from backend.shared.database import Base
from datetime import datetime

class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id = Column(String(50), primary_key=True, index=True)
    session_code = Column(String(50), unique=True, index=True, nullable=True) # Mã kỳ thi
    exam_id = Column(String(50), index=True, nullable=True) # ID đề thi gốc từ exam_service
    name = Column(String(255), nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=60)
    status = Column(String(50), default="pending") # pending, active, completed

    candidates = relationship("ExamCandidate", back_populates="session", cascade="all, delete-orphan")
    results = relationship("ExamResult", back_populates="session", cascade="all, delete-orphan")

class ExamCandidate(Base):
    __tablename__ = "exam_candidates"

    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("exam_sessions.id"), nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    cccd = Column(String(50), nullable=True)
    gender = Column(String(20), nullable=True)
    dob = Column(String(50), nullable=True) # or Date
    diem_thi = Column(String(255), nullable=True)
    note = Column(Text, nullable=True)
    registered_subjects = Column(String(255), nullable=True)
    status = Column(String(50), default="not_started") # not_started, in_progress, submitted

    session = relationship("ExamSession", back_populates="candidates")
    results = relationship("ExamResult", back_populates="candidate", cascade="all, delete-orphan")

class ExamResult(Base):
    __tablename__ = "exam_results"

    id = Column(String(50), primary_key=True, index=True)
    candidate_id = Column(String(50), ForeignKey("exam_candidates.id"), nullable=False)
    session_id = Column(String(50), ForeignKey("exam_sessions.id"), nullable=False)
    score = Column(Float, nullable=True)
    total_correct = Column(Integer, nullable=True)
    total_questions = Column(Integer, nullable=True)
    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    answers_json = Column(Text, nullable=True) # Lưu trữ JSON của các câu trả lời

    candidate = relationship("ExamCandidate", back_populates="results")
    session = relationship("ExamSession", back_populates="results")
