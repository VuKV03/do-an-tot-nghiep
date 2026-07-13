import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from backend.shared.database import engine
from sqlalchemy import text

async def alter_table():
    async with engine.begin() as conn:
        print("Checking if session_code exists...")
        try:
            # Add session_code
            await conn.execute(text("ALTER TABLE exam_sessions ADD COLUMN session_code VARCHAR(50) UNIQUE INDEX NULL;"))
            print("Added session_code column.")
        except Exception as e:
            print(f"session_code column might already exist or error: {e}")

        try:
            # Modify exam_id to be nullable
            await conn.execute(text("ALTER TABLE exam_sessions MODIFY COLUMN exam_id VARCHAR(50) NULL;"))
            print("Modified exam_id to nullable.")
        except Exception as e:
            print(f"exam_id might already be nullable or error: {e}")

if __name__ == "__main__":
    asyncio.run(alter_table())
