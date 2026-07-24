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


def _ordered_api_keys() -> list[str]:
    """
    Danh sách key để thử, bắt đầu từ key của khung giờ hiện tại (xoay vòng
    sáng/chiều/tối theo GEMINI_API_KEY_1, _2, ...), sau đó tới các key còn lại
    để dự phòng khi key hiện tại hết quota.
    """
    current = gemini_config.API_KEY
    if not current:
        raise ValueError(
            "Vui lòng cấu hình GEMINI_API_KEY (hoặc GEMINI_API_KEY_1, _2, ...) "
            "trong .env để sử dụng tính năng AI."
        )
    rest = [k for k in gemini_config.ALL_KEYS if k != current]
    return [current, *rest]


async def generate_content_with_retry(
    prompt: str,
    system_instruction: str,
    response_schema: dict | None = None,
    temperature: float = 0.7,
) -> str:
    """
    Generate content with automatic retry, model fallback, and API key rotation.
    Tries gemini-2.5-flash first, falls back to gemini-2.0-flash-lite.
    If a key runs out of quota (429/quota), moves on to the next configured key.
    """
    candidate_models = ["gemini-2.5-flash", "gemini-2.0-flash-lite"]
    last_error = None

    for key_index, api_key in enumerate(_ordered_api_keys()):
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
