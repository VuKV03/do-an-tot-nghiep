"""
Google Gemini client wrapper with retry logic and model fallback.
Ported from aiService.ts generateContentWithRetry().
"""
import asyncio
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types
from backend.shared.config import gemini_config



def get_gemini_client(api_key: str) -> genai.Client:
    """Get a configured Gemini client for a specific API key."""
    return genai.Client(api_key=api_key)


def _ordered_api_keys(preferred_key_index: int | None = None) -> list[str]:
    """
    Danh sách key để thử.

    Nếu preferred_key_index hợp lệ (dùng khi caller đã gán sẵn 1 key cố định
    cho phiên sinh câu của mình, vd theo loại câu hỏi/Phần I-II-III để 3 phiên
    chạy song song không tranh chấp cùng 1 key), key đó được thử trước tiên,
    kế đến là key cuối cùng làm "key dự phòng chung", rồi mới tới các key còn
    lại — để khi 1 phiên hết quota, nó ưu tiên mượn key dự phòng chung thay vì
    key đang là primary của phiên khác.

    Nếu không truyền (hoặc không hợp lệ), giữ hành vi cũ: bắt đầu từ key của
    khung giờ hiện tại (xoay vòng theo GEMINI_API_KEY_1, _2, ...).
    """
    keys = gemini_config.ALL_KEYS
    if not keys:
        raise ValueError(
            "Vui lòng cấu hình GEMINI_API_KEY_SINGLE/_TRUEFALSE/_SHORT (hoặc GEMINI_API_KEY_SPARE_1, "
            "_2, ...) trong .env để sử dụng tính năng AI."
        )

    if preferred_key_index is not None and 0 <= preferred_key_index < len(keys):
        primary = keys[preferred_key_index]
    else:
        primary = gemini_config.API_KEY

    # Ưu tiên các key DỰ PHÒNG chung trước, rồi mới tới key chính của các nhóm khác — để 1 phiên
    # (vd Phần I) hết quota sẽ mượn key dự phòng trước, hạn chế tranh chấp với Phần II/III đang
    # chạy song song trên key chính riêng của họ.
    spares = [k for k in gemini_config.SPARE_KEYS if k != primary]
    other_primaries = [k for k in gemini_config.PRIMARY_KEYS if k != primary]
    return [primary, *spares, *other_primaries]


async def generate_content_with_retry(
    prompt: str,
    system_instruction: str,
    response_schema: dict | None = None,
    temperature: float = 0.7,
    preferred_key_index: int | None = None,
) -> str:
    """
    Generate content with automatic retry, model fallback, and API key rotation.
    Tries gemini-flash-latest first, falls back to gemini-flash-lite-latest.
    If a key runs out of quota (429/quota), moves on to the next configured key.
    """
    # Các model ghi version cố định (gemini-2.5-flash, gemini-2.0-flash-lite, ...) đã bị Google
    # ngừng cấp cho project/API key mới ("no longer available to new users", lỗi 404) — chỉ còn
    # dùng được qua alias "-latest". Đã xác nhận thực tế 2 model dưới đây chạy được với key hiện tại.
    candidate_models = ["gemini-flash-latest", "gemini-flash-lite-latest"]
    last_error = None

    for key_index, api_key in enumerate(_ordered_api_keys(preferred_key_index)):
        client = get_gemini_client(api_key)
        key_exhausted = False

        for model_name in candidate_models:
            attempts_left = 3
            while attempts_left > 0:
                try:
                    print(f"[AI Service] Gửi yêu cầu đến mô hình: {model_name} "
                          f"(key #{key_index + 1}, còn {attempts_left - 1} lần thử lại)")

                    config = types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=temperature,
                        response_mime_type="application/json",
                    )

                    # Run sync client in thread pool for async compatibility
                    response = await asyncio.to_thread(
                        client.models.generate_content,
                        model=model_name,
                        contents=prompt,
                        config=config,
                    )

                    if response.text:
                        return response.text
                    raise ValueError("Không nhận được nội dung trả về từ mô hình AI.")

                except Exception as err:
                    last_error = err
                    attempts_left -= 1
                    err_str = str(err).lower()
                    print(f"[AI Service] Mô hình {model_name} (key #{key_index + 1}) gặp lỗi: {err_str}")

                    is_quota = any(
                        kw in err_str for kw in ["quota", "429", "resource_exhausted"]
                    )
                    is_transient = is_quota or any(
                        kw in err_str
                        for kw in [
                            "503", "unavailable", "demand", "limit",
                            "overloaded", "rate", "fetch", "network", "socket",
                        ]
                    )

                    if is_quota:
                        # Key này đã hết quota, không thử lại nữa mà chuyển key khác ngay.
                        key_exhausted = True
                        break

                    if is_transient and attempts_left > 0:
                        wait_ms = (3 - attempts_left) * 1.2
                        print(f"[AI Service] Lỗi tạm thời. Đợi {wait_ms}s và thử lại...")
                        await asyncio.sleep(wait_ms)
                    else:
                        break

            if key_exhausted:
                break

    raise last_error or RuntimeError(
        "Mô hình AI hiện đang bận hoặc quá tải. Vui lòng thử lại sau."
    )
