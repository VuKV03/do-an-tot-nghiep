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
    API_KEY: str = os.getenv("GEMINI_API_KEY", "")


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
