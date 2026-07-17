"""
Shared async database engine and session factory.
Used by Exam Service, Analytics Service, and Auth Service.
"""
import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import DeclarativeBase
# pyrefly: ignore [missing-import]
from sqlalchemy import text
import ssl

from .config import db_config

# Configure SSL context
ssl_context = ssl.create_default_context()


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# Async engine (connection pool)
engine = create_async_engine(
    db_config.url,
    echo=False,
    pool_size=1,
    max_overflow=5,
    pool_recycle=3600,
    pool_pre_ping=True,
    connect_args={"ssl": ssl_context} if db_config.USE_SSL else {}
)

# Session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def ensure_database_exists():
    """Create the database if it doesn't exist yet (runs before ORM init)."""
    # pyrefly: ignore [missing-import]
    import aiomysql
    import pymysql.err
    try:
        conn = await aiomysql.connect(
            host=db_config.HOST,
            port=db_config.PORT,
            user=db_config.USER,
            password=db_config.PASSWORD,
            ssl=ssl_context if db_config.USE_SSL else None,
        )
        try:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{db_config.NAME}` "
                    f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
                )
            await conn.commit()
            print(f"[Database] Database '{db_config.NAME}' sẵn sàng.")
        finally:
            conn.close()
    except Exception as e:
        print(f"[Database] Could not verify/create database (might be restricted on cloud): {e}")


async def init_tables():
    """Create all ORM tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[Database] Cấu trúc bảng đã được tạo thành công.")
