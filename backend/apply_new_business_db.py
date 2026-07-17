import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shared.database import engine
# pyrefly: ignore [missing-import]
from sqlalchemy import text

async def run():
    try:
        async with engine.begin() as conn:
            # 1. Tao bang trung gian student_subjects
            print("1. Creating student_subjects table if not exists...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS student_subjects (
                    id VARCHAR(50) PRIMARY KEY,
                    candidate_id VARCHAR(50) NOT NULL,
                    subject_id VARCHAR(100) NOT NULL,
                    subject_name VARCHAR(255),
                    FOREIGN KEY (candidate_id) REFERENCES exam_candidates(id) ON DELETE CASCADE
                )
            """))
            print("-> Success!")

            # 2. Kiem tra va cap nhat bang exam_results
            print("2. Checking exam_results table...")
            result = await conn.execute(text('DESCRIBE exam_results;'))
            columns = [row[0] for row in result.fetchall()]
            
            if 'status' not in columns:
                print("-> Adding status column to exam_results...")
                await conn.execute(text('ALTER TABLE exam_results ADD COLUMN status VARCHAR(50) DEFAULT "in_progress";'))
                print("-> Success!")
            else:
                print("-> status column already exists.")
                
            print("Database schema updated successfully for new business logic!")
    except Exception as e:
        print(f"Error updating DB: {e}")

if __name__ == '__main__':
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
