"""
Pydantic schemas for request/response validation — Exam Service.
"""
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import Optional, List, Literal


# ─── Question Schemas ────────────────────────────────────────────────
class QuestionBase(BaseModel):
    text: str
    type: str = "single"
    level: str = "medium"
    options: Optional[List[str]] = None
    correctAnswer: str


class QuestionResponse(QuestionBase):
    pass


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

    model_config = {"from_attributes": True}


class PackageListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[PackageResponse]
