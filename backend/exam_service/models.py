"""
SQLAlchemy ORM models for the Exam Service.
Tables: exams, questions, packages
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey
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
    examId = Column(String(255), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    type = Column(String(50), default="single")
    level = Column(String(50), default="medium")
    options = Column(Text)  # JSON string of options array
    correctAnswer = Column(String(255), nullable=False)

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

