import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, text
from backend.shared.config import db_config
from backend.shared.database import engine, async_session
from backend.auth_service.models import User

async def list_users():
    async with async_session() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"User: {u.id} | {u.username} | {u.role}")

if __name__ == "__main__":
    asyncio.run(list_users())
