"""
Pydantic schemas for the AI Service.
"""
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional, List


class SuggestInfoRequest(BaseModel):
    subject: Optional[str] = "Toán"
    grade: Optional[str] = "Lớp 12"
    topic: Optional[str] = "Kiến thức tổng hợp"


class SuggestInfoResponse(BaseModel):
    success: bool = True
    suggestedTitle: str
    suggestedDuration: int
    suggestedDescription: str


class GenerateQuestionsRequest(BaseModel):
    subject: Optional[str] = "Toán"
    grade: Optional[str] = "Lớp 12"
    topic: Optional[str] = "Kiến thức tổng hợp"
    count: Optional[int] = 5
    easyPercent: Optional[int] = 40
    mediumPercent: Optional[int] = 40
    hardPercent: Optional[int] = 20
    # 'single' | 'true_false' | 'short' — quyết định định dạng câu hỏi Gemini phải sinh ra
    type: Optional[str] = "single"


class GeneratedStatement(BaseModel):
    content: str
    isCorrect: bool


class GeneratedQuestion(BaseModel):
    text: str
    type: str
    level: str
    options: Optional[List[str]] = None
    correctAnswer: Optional[str] = None
    statements: Optional[List[GeneratedStatement]] = None


class GenerateQuestionsResponse(BaseModel):
    success: bool = True
    questions: List[GeneratedQuestion]
