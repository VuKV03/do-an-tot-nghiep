"""
Shared configuration loader for all microservices.
Reads from .env file and provides typed access to configuration values.
"""
import os
from pathlib import Path
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load .env from project root
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)


class DatabaseConfig:
    HOST: str = os.getenv("DB_HOST", "localhost")
    PORT: int = int(os.getenv("DB_PORT", "3306"))
    USER: str = os.getenv("DB_USER", "root")
    PASSWORD: str = os.getenv("DB_PASSWORD", "")
    NAME: str = os.getenv("DB_NAME", "quan_ly_sinh_de_ai_v2")

    @property
    def USE_SSL(self) -> bool:
        env_ssl = os.getenv("DB_USE_SSL")
        if env_ssl is not None:
            return env_ssl.lower() in ("true", "1", "yes")
        return "tidbcloud.com" in self.HOST.lower()

    @property
    def url(self) -> str:
        return (
            f"mysql+aiomysql://{self.USER}:{self.PASSWORD}"
            f"@{self.HOST}:{self.PORT}/{self.NAME}"
        )

    @property
    def sync_url(self) -> str:
        return (
            f"mysql+pymysql://{self.USER}:{self.PASSWORD}"
            f"@{self.HOST}:{self.PORT}/{self.NAME}"
        )


class GeminiConfig:
    """
    3 key CHÍNH — GEMINI_API_KEY_SINGLE / _TRUEFALSE / _SHORT — mỗi key khoá cố định cho 1 phiên
    sinh câu AI độc lập ứng với Phần I/II/III của đề thi tốt nghiệp THPT (xem _KEY_INDEX_BY_TYPE ở
    ai_service/routes/generate.py và _ordered_api_keys ở ai_service/gemini_client.py), để 3 phiên
    chạy song song không tranh chấp cùng 1 key.

    Cộng thêm bao nhiêu key DỰ PHÒNG cũng được, đánh số GEMINI_API_KEY_SPARE_1, _2, ... — dùng khi
    1 trong 3 key chính hết quota. Vẫn đọc thêm GEMINI_API_KEY_1, _2, ... (kiểu cũ) như key dự
    phòng bổ sung nếu ai còn cấu hình theo cách đó. Nếu không cấu hình gì cả, dùng lại GEMINI_API_KEY
    cũ (tương thích ngược, không phân biệt nhóm).
    """

    PRIMARY_ENV_NAMES = ("GEMINI_API_KEY_SINGLE", "GEMINI_API_KEY_TRUEFALSE", "GEMINI_API_KEY_SHORT")

    def __init__(self) -> None:
        self._primary_keys, self._spare_keys = self._load_keys()

    @classmethod
    def _load_keys(cls) -> tuple[list[str], list[str]]:
        primary = [k for k in (os.getenv(name) for name in cls.PRIMARY_ENV_NAMES) if k]

        spares: list[str] = []
        for prefix in ("GEMINI_API_KEY_SPARE_", "GEMINI_API_KEY_"):
            i = 1
            while True:
                key = os.getenv(f"{prefix}{i}")
                if not key:
                    break
                spares.append(key)
                i += 1

        if not primary and not spares:
            legacy = os.getenv("GEMINI_API_KEY", "")
            if legacy:
                primary = [legacy]

        return primary, spares

    @property
    def PRIMARY_KEYS(self) -> list[str]:
        return list(self._primary_keys)

    @property
    def SPARE_KEYS(self) -> list[str]:
        return list(self._spare_keys)

    @property
    def ALL_KEYS(self) -> list[str]:
        return [*self._primary_keys, *self._spare_keys]

    @property
    def API_KEY(self) -> str:
        """Key hiện hành theo khung giờ trong ngày (dùng khi không chỉ định preferred_key_index)."""
        keys = self.ALL_KEYS
        if not keys:
            return ""
        if len(keys) == 1:
            return keys[0]
        import datetime
        hour = datetime.datetime.now().hour
        shift_len = 24 / len(keys)
        idx = min(int(hour // shift_len), len(keys) - 1)
        return keys[idx]


class JWTConfig:
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "smarttest-super-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_DAYS", "7"))


class ServiceConfig:
    """Service registry — URLs for inter-service communication."""
    GATEWAY_PORT: int = int(os.getenv("GATEWAY_PORT", "8000"))
    EXAM_SERVICE_URL: str = os.getenv("EXAM_SERVICE_URL", "http://localhost:8001")
    AI_SERVICE_URL: str = os.getenv("AI_SERVICE_URL", "http://localhost:8002")
    ANALYTICS_SERVICE_URL: str = os.getenv("ANALYTICS_SERVICE_URL", "http://localhost:8003")
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://localhost:8004")
    QUANLYTHI_SERVICE_URL: str = os.getenv("QUANLYTHI_SERVICE_URL", "http://localhost:8005")


# Singleton instances
db_config = DatabaseConfig()
gemini_config = GeminiConfig()
jwt_config = JWTConfig()
service_config = ServiceConfig()
