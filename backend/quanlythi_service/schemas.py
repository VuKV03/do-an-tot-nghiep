# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# ================= Exam Candidate =================
class ExamCandidateBase(BaseModel):
    username: str
    full_name: str
    cccd: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    note: Optional[str] = None

class ExamCandidateCreate(ExamCandidateBase):
    password: str
    subjects: List[str] = []

class ExamCandidateResponse(ExamCandidateBase):
    id: str
    subjects: List[str] = []

    class Config:
        from_attributes = True

class ExamCandidateUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    cccd: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    note: Optional[str] = None
    subjects: Optional[List[str]] = None

# ================= Exam Result =================
class ExamResultBase(BaseModel):
    score: Optional[float] = None
    total_correct: Optional[int] = None
    total_questions: Optional[int] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    answers_json: Optional[str] = None

class ExamResultCreate(ExamResultBase):
    candidate_id: str
    package_id: Optional[str] = None
    exam_id: Optional[str] = None
    subject: Optional[str] = None

class ExamResultResponse(ExamResultBase):
    id: str
    candidate_id: str
    package_id: Optional[str] = None
    exam_id: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class StartExamRequest(BaseModel):
    candidate_id: str
    subject: str

class SubmitDraftRequest(BaseModel):
    answers_json: str

class SubmitFinalRequest(BaseModel):
    answers_json: str

class CandidateHistoryItem(BaseModel):
    id: str
    subject: Optional[str] = None
    package_name: Optional[str] = None
    exam_code: Optional[str] = None
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None
    total_correct: Optional[int] = None
    total_questions: Optional[int] = None

class CandidateHistoryResponse(BaseModel):
    candidate_id: str
    full_name: str
    history: List[CandidateHistoryItem]
