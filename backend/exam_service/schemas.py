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


# ═══════════════════════════════════════════════════════════════════════
# ─── Danh mục môn học (DmMonHoc) ────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════

class DmMonHocCreate(BaseModel):
    code: str
    name: str
    is_active: bool = True
    note: Optional[str] = ""


class DmMonHocUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None
    note: Optional[str] = None


class DmMonHocResponse(BaseModel):
    id: str
    code: str
    name: str
    is_active: bool
    note: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class DmMonHocListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[DmMonHocResponse]


# ═══════════════════════════════════════════════════════════════════════
# ─── Danh mục cấp độ tư duy (DmCapDoTuDuy) ──────────────────────────
# ═══════════════════════════════════════════════════════════════════════

class DmCapDoTuDuyCreate(BaseModel):
    code: str
    name: str
    note: Optional[str] = ""


class DmCapDoTuDuyUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    note: Optional[str] = None


class DmCapDoTuDuyResponse(BaseModel):
    id: str
    code: str
    name: str
    note: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class DmCapDoTuDuyListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[DmCapDoTuDuyResponse]


# ═══════════════════════════════════════════════════════════════════════
# ─── Danh mục loại hình câu hỏi (DmLoaiHinhCauHoi) ──────────────────
# ═══════════════════════════════════════════════════════════════════════

class DmLoaiHinhCauHoiCreate(BaseModel):
    code: str
    name: str
    note: Optional[str] = ""


class DmLoaiHinhCauHoiUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    note: Optional[str] = None


class DmLoaiHinhCauHoiResponse(BaseModel):
    id: str
    code: str
    name: str
    note: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class DmLoaiHinhCauHoiListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[DmLoaiHinhCauHoiResponse]


# ═══════════════════════════════════════════════════════════════════════
# ─── Danh mục thành phần năng lực (DmThanhPhanNangLuc) ───────────────
# ═══════════════════════════════════════════════════════════════════════

class DmThanhPhanNangLucCreate(BaseModel):
    code: str
    name: str
    subject_id: Optional[str] = None
    is_active: bool = True
    note: Optional[str] = ""


class DmThanhPhanNangLucUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    subject_id: Optional[str] = None
    is_active: Optional[bool] = None
    note: Optional[str] = None


class DmThanhPhanNangLucResponse(BaseModel):
    id: str
    code: str
    name: str
    subject_id: Optional[str] = None
    is_active: bool
    note: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class DmThanhPhanNangLucListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[DmThanhPhanNangLucResponse]


# ═══════════════════════════════════════════════════════════════════════
# ─── Danh mục khối lớp (DmKhoiLop) ──────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════

class DmKhoiLopCreate(BaseModel):
    code: str
    name: str
    is_active: bool = True
    note: Optional[str] = ""


class DmKhoiLopUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None
    note: Optional[str] = None


class DmKhoiLopResponse(BaseModel):
    id: str
    code: str
    name: str
    is_active: bool
    note: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class DmKhoiLopListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[DmKhoiLopResponse]


# ─── Exam Period (DmDotThi) Schemas ──────────────────────────────────────────
class ExamPeriodCreate(BaseModel):
    code: str
    name: str
    start_date: str
    end_date: str
    status: Optional[str] = "HOAT_DONG"
    is_active: bool = True
    note: Optional[str] = ""
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class ExamPeriodUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    note: Optional[str] = None
    updated_by: Optional[str] = None

class ExamPeriodResponse(BaseModel):
    id: str
    code: str
    name: str
    start_date: str
    end_date: str
    status: str
    is_active: bool
    note: str
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}

class ExamPeriodListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[ExamPeriodResponse]


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

    model_config = {"from_attributes": True}

class TopicHistoryListResponse(BaseModel):
    success: bool = True
    count: int
    data: List[TopicHistoryResponse]
