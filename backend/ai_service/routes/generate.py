"""
AI question generation routes — ported from aiService.ts
"""
import json
import re
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from backend.ai_service.gemini_client import generate_content_with_retry
from backend.ai_service.schemas import (
    SuggestInfoRequest, GenerateQuestionsRequest,
)

router = APIRouter(tags=["AI Generation"])

# Quy tắc trình bày chung để tránh Gemini trả về markdown / LaTeX gây ra ký tự lạ khi hiển thị dạng text thuần
_PLAIN_TEXT_RULES = (
    "- Không dùng cú pháp LaTeX (vd: \\frac{}{}, \\(, \\), \\[, \\], $...$, ^{}, _{}).\n"
    "- Không dùng markdown (không **in đậm**, *in nghiêng*, `code`, gạch đầu dòng -, #).\n"
    "- Chỉ dùng văn bản thuần tiếng Việt và ký hiệu toán học Unicode thông thường "
    "(×, ÷, √, π, ≤, ≥, ≠, °, phân số viết dạng a/b, số mũ viết dạng x^2 hoặc x2).\n"
)


def _clean_ai_text(value: object) -> object:
    """Dọn markdown/LaTeX còn sót lại trong text do Gemini trả về, giữ nguyên nếu không phải string."""
    if not isinstance(value, str):
        return value
    s = value
    # Bỏ markdown in đậm / in nghiêng / code inline
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"__(.+?)__", r"\1", s)
    s = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", s)
    s = re.sub(r"`(.+?)`", r"\1", s)
    # Bỏ dấu phân định LaTeX nhưng giữ nội dung bên trong
    s = s.replace("\\(", "").replace("\\)", "")
    s = s.replace("\\[", "").replace("\\]", "")
    s = s.replace("$$", "").replace("$", "")
    # Chuẩn hoá khoảng trắng thừa
    s = re.sub(r"[ \t]+", " ", s).strip()
    return s


def _clean_generated_questions(questions: list) -> list:
    """Làm sạch toàn bộ text/options/statements trong danh sách câu hỏi AI sinh ra."""
    cleaned = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        q = dict(q)
        if "text" in q:
            q["text"] = _clean_ai_text(q.get("text"))
        if q.get("options"):
            q["options"] = [_clean_ai_text(o) for o in q["options"]]
        if q.get("correctAnswer"):
            q["correctAnswer"] = _clean_ai_text(q["correctAnswer"])
        if q.get("statements"):
            q["statements"] = [
                {**st, "content": _clean_ai_text(st.get("content"))}
                if isinstance(st, dict) else st
                for st in q["statements"]
            ]
        cleaned.append(q)
    return cleaned


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


def _build_generation_prompt(body: GenerateQuestionsRequest, q_count: int) -> tuple[str, str]:
    """Xây system_instruction + prompt theo đúng định dạng câu hỏi (Thông tư 22/2024 - Bộ GD&ĐT)."""
    question_type = (body.type or "single").strip()

    common_header = (
        f"Bạn là chuyên gia biên soạn đề kiểm tra chất lượng cao của Bộ Giáo dục và Đào tạo Việt Nam.\n"
        f"Hãy biên soạn đúng {q_count} câu hỏi tiếng Việt cho môn \"{body.subject}\", "
        f"mức độ \"{body.grade}\" với trọng tâm: \"{body.topic}\".\n\n"
    )

    if question_type == "true_false":
        system_instruction = common_header + (
            "Biên soạn dạng câu hỏi Đúng/Sai theo cấu trúc Phần II của đề thi tốt nghiệp THPT "
            "(Thông tư 22/2024): mỗi câu hỏi có đúng 4 ý nhận định (a, b, c, d), mỗi ý được đánh giá "
            "độc lập là đúng hoặc sai.\n\n"
            "Quy tắc:\n"
            "- 'statements' là mảng đúng 4 phần tử, mỗi phần tử có 'content' (nội dung ý nhận định, "
            "không chèn nhãn a/b/c/d vào nội dung) và 'isCorrect' (true hoặc false).\n"
            "- 'level': 'easy', 'medium', hoặc 'hard'.\n"
            "- 'type': luôn là 'true_false'.\n"
            f"{_PLAIN_TEXT_RULES}"
            "\nTrả về JSON: {\"questions\": [{text, type, level, statements: [{content, isCorrect}, ...]}]}"
        )
    elif question_type == "short":
        system_instruction = common_header + (
            "Biên soạn dạng câu hỏi trả lời ngắn theo cấu trúc Phần III của đề thi tốt nghiệp THPT "
            "(Thông tư 22/2024): câu hỏi yêu cầu tính toán hoặc suy luận ra một đáp số/từ khóa ngắn gọn "
            "(không phải trắc nghiệm nhiều lựa chọn).\n\n"
            "Quy tắc:\n"
            "- 'correctAnswer' là đáp số chính xác, ngắn gọn.\n"
            "- 'level': 'easy', 'medium', hoặc 'hard'.\n"
            "- 'type': luôn là 'short'.\n"
            f"{_PLAIN_TEXT_RULES}"
            "\nTrả về JSON: {\"questions\": [{text, type, level, correctAnswer}]}"
        )
    else:
        system_instruction = common_header + (
            "Biên soạn dạng câu hỏi trắc nghiệm 4 phương án, chỉ 1 đáp án đúng (Phần I đề thi tốt "
            "nghiệp THPT - Thông tư 22/2024).\n\n"
            "Quy tắc:\n"
            "- 'options' chứa đúng 4 đáp án văn bản. Không chèn nhãn A/B/C/D vào nội dung.\n"
            "- 'correctAnswer' là chữ cái in hoa: 'A', 'B', 'C', hoặc 'D'.\n"
            "- 'level': 'easy', 'medium', hoặc 'hard'.\n"
            "- 'type': luôn là 'single'.\n"
            f"{_PLAIN_TEXT_RULES}"
            "\nTrả về JSON: {\"questions\": [{text, type, level, options, correctAnswer}]}"
        )

    prompt = (
        f"Tạo đúng {q_count} câu hỏi tiếng Việt môn {body.subject} "
        f"lớp {body.grade} về nội dung: {body.topic}.\n"
        f"Phân chia tỉ lệ độ khó:\n"
        f"- Dễ: {body.easyPercent}%\n"
        f"- Vừa: {body.mediumPercent}%\n"
        f"- Khó: {body.hardPercent}%"
    )

    return system_instruction, prompt


@router.post("/generate")
async def generate_questions(body: GenerateQuestionsRequest):
    """Tạo sinh gói câu hỏi bằng AI (trắc nghiệm / đúng-sai / trả lời ngắn)."""
    try:
        q_count = max(1, min(body.count or 5, 15))
        system_instruction, prompt = _build_generation_prompt(body, q_count)

        response_text = await generate_content_with_retry(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.75,
        )

        data = json.loads(response_text.strip())
        questions = _clean_generated_questions(data.get("questions", []))
        return {"success": True, "questions": questions}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi kết nối AI: {str(e)}")
