"""
AI question generation routes — ported from aiService.ts
"""
import json
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from backend.ai_service.gemini_client import generate_content_with_retry
from backend.ai_service.schemas import (
    SuggestInfoRequest, GenerateQuestionsRequest,
)

router = APIRouter(tags=["AI Generation"])


@router.post("/suggest")
async def suggest_exam_info(body: SuggestInfoRequest):
    """Gợi ý thông số cấu hình đề thi (tiêu đề, thời gian, mô tả)."""
    try:
        system_instruction = (
            f"Bạn là trợ lý ảo cố vấn xây dựng cấu hình học thuật. Nhiệm vụ của bạn là đưa ra đề xuất cho:\n"
            f"- Tiêu đề kiểm tra (suggestedTitle) bám sát môn học {body.subject} lớp {body.grade}. Tiếng Việt chuẩn.\n"
            f"- Thời gian tối ưu (suggestedDuration) tính bằng số phút hợp lý (ví dụ: 15, 45, 60, 90).\n"
            f"- Mô tả tổng quan đề thi (suggestedDescription) khoa học, khái quát mục tiêu nhận thức.\n"
            f"\nTrả về JSON với đúng 3 trường: suggestedTitle (string), suggestedDuration (integer), suggestedDescription (string)."
        )

        prompt = (
            f"Gợi ý cấu hình đề thi môn {body.subject} khối {body.grade} "
            f"với trọng tâm nội dung: {body.topic}."
        )

        response_text = await generate_content_with_retry(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.7,
        )

        data = json.loads(response_text.strip())
        return {"success": True, **data}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi kết nối AI: {str(e)}")


@router.post("/generate")
async def generate_questions(body: GenerateQuestionsRequest):
    """Tạo sinh gói câu hỏi trắc nghiệm bằng AI."""
    try:
        q_count = max(1, min(body.count or 5, 15))

        system_instruction = (
            f"Bạn là chuyên gia biên soạn đề kiểm tra chất lượng cao của Bộ Giáo dục và Đào tạo Việt Nam.\n"
            f"Hãy biên soạn đúng {q_count} câu hỏi trắc nghiệm tiếng Việt cho môn \"{body.subject}\", "
            f"mức độ \"{body.grade}\" với trọng tâm: \"{body.topic}\".\n\n"
            f"Quy tắc:\n"
            f"- 'options' chứa đúng 4 đáp án văn bản. Không chèn nhãn A/B/C/D vào nội dung.\n"
            f"- 'correctAnswer' là chữ cái in hoa: 'A', 'B', 'C', hoặc 'D'.\n"
            f"- 'level': 'easy', 'medium', hoặc 'hard'.\n"
            f"- 'type': luôn là 'single'.\n"
            f"\nTrả về JSON: {{\"questions\": [{{text, type, level, options, correctAnswer}}]}}"
        )

        prompt = (
            f"Tạo đúng {q_count} câu hỏi trắc nghiệm tiếng Việt môn {body.subject} "
            f"lớp {body.grade} về nội dung: {body.topic}.\n"
            f"Phân chia tỉ lệ độ khó:\n"
            f"- Dễ: {body.easyPercent}%\n"
            f"- Vừa: {body.mediumPercent}%\n"
            f"- Khó: {body.hardPercent}%"
        )

        response_text = await generate_content_with_retry(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.75,
        )

        data = json.loads(response_text.strip())
        return {"success": True, "questions": data.get("questions", [])}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi kết nối AI: {str(e)}")
