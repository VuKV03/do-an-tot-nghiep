import asyncio
from backend.shared.database import engine
from sqlalchemy import text

async def run():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN position VARCHAR(100) NULL;"))
            print("Successfully added 'position' column to 'users' table.")
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(run())
