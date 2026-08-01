import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.shared.database import engine
from sqlalchemy import text

async def alter_table():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE exam_candidates ADD COLUMN cccd VARCHAR(50);"))
            print("Added cccd")
        except Exception as e:
            print(e)
            
        try:
            await conn.execute(text("ALTER TABLE exam_candidates ADD COLUMN gender VARCHAR(20);"))
            print("Added gender")
        except Exception as e:
            print(e)
            
        try:
            await conn.execute(text("ALTER TABLE exam_candidates ADD COLUMN dob VARCHAR(50);"))
            print("Added dob")
        except Exception as e:
            print(e)
            
        try:
            await conn.execute(text("ALTER TABLE exam_candidates ADD COLUMN diem_thi VARCHAR(255);"))
            print("Added diem_thi")
        except Exception as e:
            print(e)
            
        try:
            await conn.execute(text("ALTER TABLE exam_candidates ADD COLUMN note TEXT;"))
            print("Added note")
        except Exception as e:
            print(e)
            
    print("Done")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(alter_table())
