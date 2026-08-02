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
    # 'easy' | 'medium' | 'hard' | 'very_hard' — mọi câu sinh ra trong request PHẢI đúng 1 mức độ
    # nhận thức này. Trước đây field này là easy/medium/hard/veryHardPercent (%) kế thừa từ 1 wizard
    # trộn nhiều mức độ trong cùng 1 lần gọi (đã xoá, xem ExamPackageModule.tsx cũ) — nhưng 2 nơi gọi
    # thực tế (ai-generate.tsx, ModalTaoDeTuDong.tsx) luôn ép 100% về đúng 1 mức nên rút gọn về đây.
    level: Optional[str] = "easy"
    # 'single' | 'true_false' | 'short' — quyết định định dạng câu hỏi Gemini phải sinh ra
    type: Optional[str] = "single"


class TopicGroupItem(BaseModel):
    """1 nhóm (= 1 cell của ma trận: tiểu mục × mức độ) cần sinh trong 1 lần gọi AI gộp nhiều nhóm."""
    topic: Optional[str] = "Kiến thức tổng hợp"
    grade: Optional[str] = "Lớp 12"
    level: Optional[str] = "medium"  # 'easy' | 'medium' | 'hard'
    count: int = 1


class GenerateQuestionsBatchRequest(BaseModel):
    subject: Optional[str] = "Toán"
    # 'single' | 'true_false' | 'short' — CHUNG cho toàn bộ items trong 1 lần gọi (khác aiType phải
    # tách lần gọi khác, vì mỗi loại có prompt/schema câu trả lời khác nhau).
    type: Optional[str] = "single"
    items: List[TopicGroupItem] = []


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
