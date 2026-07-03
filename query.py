import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine("sqlite+aiosqlite:///backend/shared/database.db")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT id, code, name FROM cognitive_levels"))
            print("cognitive_levels:", result.fetchall())
            
            result = await conn.execute(text("SELECT id, code, name FROM competency_components LIMIT 5"))
            print("competency_components:", result.fetchall())
    except Exception as e:
        print(e)

if __name__ == "__main__":
    asyncio.run(main())
