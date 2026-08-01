import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shared.database import engine
from sqlalchemy import text

async def run():
    try:
        async with engine.begin() as conn:
            # Check if columns exist
            result = await conn.execute(text('DESCRIBE exam_candidates;'))
            columns = [row[0] for row in result.fetchall()]
            print(f"Existing columns: {columns}")
            
            # Add missing columns
            queries = []
            if 'cccd' not in columns:
                queries.append('ALTER TABLE exam_candidates ADD COLUMN cccd VARCHAR(50) NULL;')
            if 'gender' not in columns:
                queries.append('ALTER TABLE exam_candidates ADD COLUMN gender VARCHAR(20) NULL;')
            if 'dob' not in columns:
                queries.append('ALTER TABLE exam_candidates ADD COLUMN dob VARCHAR(50) NULL;')
            if 'diem_thi' not in columns:
                queries.append('ALTER TABLE exam_candidates ADD COLUMN diem_thi VARCHAR(255) NULL;')
            if 'note' not in columns:
                queries.append('ALTER TABLE exam_candidates ADD COLUMN note TEXT NULL;')
            if 'registered_subjects' not in columns:
                queries.append('ALTER TABLE exam_candidates ADD COLUMN registered_subjects VARCHAR(255) NULL;')
                
            for q in queries:
                print(f"Executing: {q}")
                await conn.execute(text(q))
            
            print("Successfully updated exam_candidates table")
    except Exception as e:
        print(f"Error updating table: {e}")

if __name__ == '__main__':
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
