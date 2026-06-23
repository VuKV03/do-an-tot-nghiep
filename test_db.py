import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from backend.shared.config import db_config
from backend.shared.database import get_db, async_session, engine
from backend.auth_service.models import User
from backend.auth_service.main import pwd_context
import time
from datetime import datetime

async def test_insert():
    async with async_session() as db:
        user = User(
            id=f"u-test-{int(time.time() * 1000)}",
            username="test_insert_user",
            email="test@example.com",
            fullName="Test Insert",
            password_hash="fakehash",
            role="teacher",
            status="active",
            createdAt=datetime.utcnow().isoformat() + "Z",
        )
        db.add(user)
        print("Before commit")
        await db.commit()
        print("After commit")

if __name__ == "__main__":
    asyncio.run(test_insert())
