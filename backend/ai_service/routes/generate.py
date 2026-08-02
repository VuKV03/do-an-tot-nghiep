"""
AI question generation routes — ported from aiService.ts
"""
import json
import re
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from backend.ai_service.gemini_client import generate_content_with_retry
from backend.ai_service.schemas import (
    SuggestInfoRequest, GenerateQuestionsRequest, GenerateQuestionsBatchRequest,
)

router = APIRouter(tags=["AI Generation"])

# Gán cố định 1 key/loại câu hỏi (~Phần I/II/III của đề THPT) để nhiều phiên "Theo AI" chạy song
# song theo loại không dồn hết vào cùng 1 key — xem _ordered_api_keys() trong gemini_client.py.
_KEY_INDEX_BY_TYPE = {"single": 0, "true_false": 1, "short": 2}

# Giới hạn an toàn tổng số câu/lần gọi gộp nhiều nhóm (/generate-batch) — frontend tự chia nhóm ở
# ngưỡng thấp hơn (10), đây chỉ là chặn lạm dụng phía server.
_MAX_BATCH_TOTAL = 20

# Nhãn tiếng Việt cho từng mức độ nhận thức gửi tới Gemini (endpoint /generate — 1 request = đúng 1 mức).
_LEVEL_LABEL = {
    "easy": "Dễ (Nhận biết)",
    "medium": "Vừa (Thông hiểu)",
    "hard": "Khó (Vận dụng)",
    "very_hard": "Rất khó (Vận dụng cao)",
}

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


def _is_valid_short_answer(q: dict) -> bool:
    """
    Đáp án Phần III (trả lời ngắn) BẮT BUỘC 1-4 ký tự theo đúng khung trả lời của đề thi tốt nghiệp
    THPT (Thông tư 22/2024 — số nguyên/thập phân, tối đa 4 ký tự kể cả dấu phẩy/dấu trừ). Câu nào
    đáp án ngoài phạm vi này bị loại khỏi kết quả trả về thay vì lưu nhầm câu hỏi sai định dạng vào
    đề — FE coi cell đó là "chưa sinh đủ" và có thể bấm "Sinh tiếp"/"Sinh lại" như các trường hợp
    thiếu câu khác (xem runBucketAI ở ModalTaoDeTuDong.tsx), không cần xử lý gì thêm ở FE.
    """
    if q.get("type") != "short":
        return True
    ans = str(q.get("correctAnswer") or "").strip()
    return 1 <= len(ans) <= 4


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
            "- 'level': 'easy', 'medium', 'hard', hoặc 'very_hard'.\n"
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
            "- 'correctAnswer' BẮT BUỘC là chuỗi từ 1 đến 4 ký tự (kể cả dấu phẩy thập phân hoặc "
            "dấu trừ nếu có), đúng theo khung trả lời của đề thi tốt nghiệp THPT — ví dụ hợp lệ: "
            "'5', '-3', '12', '3,5', '0,25'. TUYỆT ĐỐI KHÔNG vượt quá 4 ký tự và KHÔNG để trống; "
            "nếu đáp số thật dài hơn 4 ký tự, phải chọn số liệu trong đề bài sao cho đáp số rút "
            "gọn về đúng phạm vi 1-4 ký tự.\n"
            "- 'level': 'easy', 'medium', 'hard', hoặc 'very_hard'.\n"
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
            "- 'level': 'easy', 'medium', 'hard', hoặc 'very_hard'.\n"
            "- 'type': luôn là 'single'.\n"
            f"{_PLAIN_TEXT_RULES}"
            "\nTrả về JSON: {\"questions\": [{text, type, level, options, correctAnswer}]}"
        )

    level = (body.level or "easy").strip()
    level_desc = _LEVEL_LABEL.get(level, _LEVEL_LABEL["easy"])
    prompt = (
        f"Tạo đúng {q_count} câu hỏi tiếng Việt môn {body.subject} "
        f"lớp {body.grade} về nội dung: {body.topic}.\n"
        f"Toàn bộ {q_count} câu PHẢI ở đúng mức độ: {level_desc}."
    )
    if level == "very_hard":
        prompt += (
            "\nCâu ở mức 'Rất khó' PHẢI khó hơn hẳn mức 'Khó' thông thường — yêu cầu vận dụng cao: "
            "kết hợp nhiều đơn vị kiến thức, suy luận đa bước hoặc liên hệ thực tiễn phức tạp, không "
            "chỉ đơn thuần áp dụng công thức."
        )

    return system_instruction, prompt


@router.post("/generate")
async def generate_questions(body: GenerateQuestionsRequest):
    """Tạo sinh gói câu hỏi bằng AI (trắc nghiệm / đúng-sai / trả lời ngắn)."""
    try:
        q_count = max(1, min(body.count or 5, 15))
        system_instruction, prompt = _build_generation_prompt(body, q_count)
        preferred_key_index = _KEY_INDEX_BY_TYPE.get((body.type or "single").strip())

        response_text = await generate_content_with_retry(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.75,
            preferred_key_index=preferred_key_index,
        )

        data = json.loads(response_text.strip())
        questions = _clean_generated_questions(data.get("questions", []))
        questions = [q for q in questions if _is_valid_short_answer(q)]
        return {"success": True, "questions": questions}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi kết nối AI: {str(e)}")


def _build_batch_generation_prompt(body: GenerateQuestionsBatchRequest) -> tuple[str, str]:
    """
    Gộp nhiều NHÓM (mỗi nhóm = 1 cell ma trận: tiểu mục × mức độ) vào 1 lần gọi AI duy nhất — thay vì
    1 lần gọi/cell như trước — để giảm số round-trip khi ma trận có nhiều tiểu mục/mức độ. AI phải
    gắn đúng 'groupIndex' (vị trí trong `items`, bắt đầu từ 0) cho mỗi câu hỏi để FE biết câu đó
    thuộc cell nào; frontend tự giới hạn tổng số câu/lần gọi ở mức thấp (xem BATCH_CALL_CAP ở
    ModalTaoDeTuDong.tsx) để hạn chế rủi ro AI đếm sai/gán nhầm nhóm khi phải chia quá nhiều nhóm.
    """
    question_type = (body.type or "single").strip()
    total = sum(max(0, item.count or 0) for item in body.items)

    groups_desc = "\n".join(
        f"- Nhóm {i} (groupIndex={i}): chủ đề \"{item.topic}\", trình độ \"{item.grade}\", "
        f"độ khó \"{item.level}\", số câu: {item.count}"
        for i, item in enumerate(body.items)
    )

    common_header = (
        f"Bạn là chuyên gia biên soạn đề kiểm tra chất lượng cao của Bộ Giáo dục và Đào tạo Việt Nam.\n"
        f"Hãy biên soạn CHÍNH XÁC tổng {total} câu hỏi tiếng Việt cho môn \"{body.subject}\", chia theo "
        f"đúng các nhóm sau — MỖI câu hỏi PHẢI gắn trường 'groupIndex' bằng đúng số của nhóm nó thuộc "
        f"về, và số câu mỗi nhóm phải khớp CHÍNH XÁC với 'số câu' yêu cầu, không thiếu không thừa:\n"
        f"{groups_desc}\n\n"
        f"'level' của mỗi câu PHẢI đúng bằng độ khó của nhóm đó.\n\n"
    )

    if question_type == "true_false":
        system_instruction = common_header + (
            "Biên soạn dạng câu hỏi Đúng/Sai theo cấu trúc Phần II của đề thi tốt nghiệp THPT "
            "(Thông tư 22/2024): mỗi câu hỏi có đúng 4 ý nhận định (a, b, c, d), mỗi ý được đánh giá "
            "độc lập là đúng hoặc sai.\n\n"
            "Quy tắc:\n"
            "- 'groupIndex': số nguyên, đúng bằng groupIndex của nhóm câu hỏi này thuộc về.\n"
            "- 'statements' là mảng đúng 4 phần tử, mỗi phần tử có 'content' (nội dung ý nhận định, "
            "không chèn nhãn a/b/c/d vào nội dung) và 'isCorrect' (true hoặc false).\n"
            "- 'level': 'easy', 'medium', hoặc 'hard'.\n"
            "- 'type': luôn là 'true_false'.\n"
            f"{_PLAIN_TEXT_RULES}"
            "\nTrả về JSON: {\"questions\": [{groupIndex, text, type, level, statements: [{content, isCorrect}, ...]}]}"
        )
    elif question_type == "short":
        system_instruction = common_header + (
            "Biên soạn dạng câu hỏi trả lời ngắn theo cấu trúc Phần III của đề thi tốt nghiệp THPT "
            "(Thông tư 22/2024): câu hỏi yêu cầu tính toán hoặc suy luận ra một đáp số/từ khóa ngắn gọn "
            "(không phải trắc nghiệm nhiều lựa chọn).\n\n"
            "Quy tắc:\n"
            "- 'groupIndex': số nguyên, đúng bằng groupIndex của nhóm câu hỏi này thuộc về.\n"
            "- 'correctAnswer' BẮT BUỘC là chuỗi từ 1 đến 4 ký tự (kể cả dấu phẩy thập phân hoặc "
            "dấu trừ nếu có), đúng theo khung trả lời của đề thi tốt nghiệp THPT — ví dụ hợp lệ: "
            "'5', '-3', '12', '3,5', '0,25'. TUYỆT ĐỐI KHÔNG vượt quá 4 ký tự và KHÔNG để trống; "
            "nếu đáp số thật dài hơn 4 ký tự, phải chọn số liệu trong đề bài sao cho đáp số rút "
            "gọn về đúng phạm vi 1-4 ký tự.\n"
            "- 'level': 'easy', 'medium', hoặc 'hard'.\n"
            "- 'type': luôn là 'short'.\n"
            f"{_PLAIN_TEXT_RULES}"
            "\nTrả về JSON: {\"questions\": [{groupIndex, text, type, level, correctAnswer}]}"
        )
    else:
        system_instruction = common_header + (
            "Biên soạn dạng câu hỏi trắc nghiệm 4 phương án, chỉ 1 đáp án đúng (Phần I đề thi tốt "
            "nghiệp THPT - Thông tư 22/2024).\n\n"
            "Quy tắc:\n"
            "- 'groupIndex': số nguyên, đúng bằng groupIndex của nhóm câu hỏi này thuộc về.\n"
            "- 'options' chứa đúng 4 đáp án văn bản. Không chèn nhãn A/B/C/D vào nội dung.\n"
            "- 'correctAnswer' là chữ cái in hoa: 'A', 'B', 'C', hoặc 'D'.\n"
            "- 'level': 'easy', 'medium', hoặc 'hard'.\n"
            "- 'type': luôn là 'single'.\n"
            f"{_PLAIN_TEXT_RULES}"
            "\nTrả về JSON: {\"questions\": [{groupIndex, text, type, level, options, correctAnswer}]}"
        )

    prompt = (
        f"Hãy sinh đúng tổng {total} câu hỏi theo danh sách nhóm đã mô tả ở trên, phân bổ đúng số "
        f"lượng cho từng nhóm theo groupIndex, không thiếu không thừa câu nào ở bất kỳ nhóm nào."
    )

    return system_instruction, prompt


@router.post("/generate-batch")
async def generate_questions_batch(body: GenerateQuestionsBatchRequest):
    """Sinh nhiều nhóm câu hỏi (khác tiểu mục/mức độ) trong 1 lần gọi AI duy nhất — xem
    _build_batch_generation_prompt để biết lý do và cách gắn groupIndex."""
    try:
        total = sum(max(0, item.count or 0) for item in body.items)
        if not body.items or total <= 0:
            return {"success": True, "questions": []}
        if total > _MAX_BATCH_TOTAL:
            raise HTTPException(
                status_code=400,
                detail=f"Tổng số câu 1 lần gọi gộp không được vượt quá {_MAX_BATCH_TOTAL} (đang yêu cầu {total}).",
            )

        system_instruction, prompt = _build_batch_generation_prompt(body)
        preferred_key_index = _KEY_INDEX_BY_TYPE.get((body.type or "single").strip())

        response_text = await generate_content_with_retry(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.75,
            preferred_key_index=preferred_key_index,
        )

        data = json.loads(response_text.strip())
        questions = _clean_generated_questions(data.get("questions", []))
        questions = [q for q in questions if _is_valid_short_answer(q)]
        return {"success": True, "questions": questions}

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi kết nối AI: {str(e)}")
