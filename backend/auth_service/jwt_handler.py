"""
JWT token creation and verification.
"""
from datetime import datetime, timedelta, timezone
# pyrefly: ignore [missing-import]
import jwt
from backend.shared.config import jwt_config


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=jwt_config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, jwt_config.SECRET_KEY, algorithm=jwt_config.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=jwt_config.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, jwt_config.SECRET_KEY, algorithm=jwt_config.ALGORITHM)


def verify_token(token: str) -> dict | None:
    """Verify and decode a JWT token. Returns payload or None."""
    try:
        payload = jwt.decode(token, jwt_config.SECRET_KEY, algorithms=[jwt_config.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
