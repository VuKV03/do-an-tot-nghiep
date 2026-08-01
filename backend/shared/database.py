"""
Shared async database engine and session factory.
Used by Exam Service, Analytics Service, and Auth Service.
"""
import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # Trên Windows, khi stdout/stderr không gắn với console hỗ trợ UTF-8 (hoặc console dùng
    # codepage cp1252/"charmap" mặc định), bất kỳ print() nào có dấu tiếng Việt (rất nhiều nơi
    # trong toàn bộ backend, xem init_tables() bên dưới) sẽ ném UnicodeEncodeError không bắt được,
    # làm crash toàn bộ app ngay giữa lifespan startup — từng bị hiểu nhầm là lỗi kết nối DB vì
    # traceback cắt ngang đúng lúc DB vừa thao tác xong. Ép UTF-8 ngay từ đầu để tránh việc này ở
    # MỌI service dùng chung module này (Exam/Analytics/Auth).
    for _stream in (sys.stdout, sys.stderr):
        if hasattr(_stream, "reconfigure"):
            _stream.reconfigure(encoding="utf-8", errors="replace")

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
