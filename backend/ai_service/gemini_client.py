"""
Google Gemini client wrapper with retry logic and model fallback.
Ported from aiService.ts generateContentWithRetry().
"""
import asyncio
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types
from backend.shared.config import gemini_config



def get_gemini_client() -> genai.Client:
    """Get a configured Gemini client."""
    if not gemini_config.API_KEY:
        raise ValueError(
            "Vui lòng cấu hình GEMINI_API_KEY trong .env để sử dụng tính năng AI."
        )
    return genai.Client(api_key=gemini_config.API_KEY)


async def generate_content_with_retry(
    prompt: str,
    system_instruction: str,
    response_schema: dict | None = None,
    temperature: float = 0.7,
) -> str:
    """
    Generate content with automatic retry and model fallback.
    Tries gemini-2.5-flash first, falls back to gemini-2.0-flash-lite.
    """
    client = get_gemini_client()
    candidate_models = ["gemini-2.5-flash", "gemini-2.0-flash-lite"]
    last_error = None

    for model_name in candidate_models:
        attempts_left = 3
        while attempts_left > 0:
            try:
                print(f"[AI Service] Gửi yêu cầu đến mô hình: {model_name} "
                      f"(Còn {attempts_left - 1} lần thử lại)")

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
                print(f"[AI Service] Mô hình {model_name} gặp lỗi: {err_str}")

                is_transient = any(
                    kw in err_str
                    for kw in [
                        "503", "unavailable", "demand", "429", "limit",
                        "overloaded", "rate", "fetch", "network", "socket",
                    ]
                )

                if is_transient and attempts_left > 0:
                    wait_ms = (3 - attempts_left) * 1.2
                    print(f"[AI Service] Lỗi tạm thời. Đợi {wait_ms}s và thử lại...")
                    await asyncio.sleep(wait_ms)
                else:
                    break

    raise last_error or RuntimeError(
        "Mô hình AI hiện đang bận hoặc quá tải. Vui lòng thử lại sau."
    )
