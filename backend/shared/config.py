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
    Quản lý nhiều GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... và xoay vòng theo
    khung giờ trong ngày (chia đều 24h cho số lượng key đang cấu hình) để
    tránh dồn hết lượt gọi/token vào một key duy nhất.
    Nếu không cấu hình key đánh số nào, dùng lại GEMINI_API_KEY cũ (tương thích ngược).
    """

    def __init__(self) -> None:
        self._keys: list[str] = self._load_keys()

    @staticmethod
    def _load_keys() -> list[str]:
        keys = []
        i = 1
        while True:
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if not key:
                break
            keys.append(key)
            i += 1
        if not keys:
            legacy = os.getenv("GEMINI_API_KEY", "")
            if legacy:
                keys.append(legacy)
        return keys

    @property
    def ALL_KEYS(self) -> list[str]:
        return list(self._keys)

    @property
    def API_KEY(self) -> str:
        """Key hiện hành theo khung giờ trong ngày."""
        if not self._keys:
            return ""
        if len(self._keys) == 1:
            return self._keys[0]
        import datetime
        hour = datetime.datetime.now().hour
        shift_len = 24 / len(self._keys)
        idx = min(int(hour // shift_len), len(self._keys) - 1)
        return self._keys[idx]


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
