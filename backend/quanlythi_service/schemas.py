# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# ================= Exam Session =================
class ExamSessionBase(BaseModel):
    name: str
    session_code: Optional[str] = None
    exam_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: int = 60
    status: str = "pending"

class ExamSessionCreate(ExamSessionBase):
    pass

class ExamSessionUpdate(BaseModel):
    name: Optional[str] = None
    session_code: Optional[str] = None
    exam_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None

class ExamSessionResponse(ExamSessionBase):
    id: str

    class Config:
        from_attributes = True

# ================= Exam Candidate =================
class ExamCandidateBase(BaseModel):
    username: str
    full_name: str
    cccd: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    diem_thi: Optional[str] = None
    note: Optional[str] = None
    registered_subjects: Optional[str] = None
    status: str = "not_started"

class ExamCandidateCreate(ExamCandidateBase):
    password: str

class ExamCandidateResponse(ExamCandidateBase):
    id: str
    session_id: str

    class Config:
        from_attributes = True

class ExamCandidateUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    status: Optional[str] = None
    cccd: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    diem_thi: Optional[str] = None
    note: Optional[str] = None
    registered_subjects: Optional[str] = None

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
    session_id: str

class ExamResultResponse(ExamResultBase):
    id: str
    candidate_id: str
    session_id: str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class SubmitDraftRequest(BaseModel):
    answers_json: str

class SubmitFinalRequest(BaseModel):
    answers_json: str
