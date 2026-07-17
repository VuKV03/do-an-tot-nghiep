import asyncio
from backend.shared.database import engine
from sqlalchemy import text

async def alter():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE exam_candidates DROP FOREIGN KEY exam_candidates_ibfk_1'))
        except Exception as e: 
            print("FK Error:", e)
        try:
            await conn.execute(text('ALTER TABLE exam_candidates MODIFY session_id VARCHAR(50) NULL'))
        except Exception as e: 
            print("Modify Error:", e)
        
        try:
            # Also let's alter exam_results to make session_id nullable just in case
            await conn.execute(text('ALTER TABLE exam_results DROP FOREIGN KEY exam_results_ibfk_2'))
            await conn.execute(text('ALTER TABLE exam_results MODIFY session_id VARCHAR(50) NULL'))
        except Exception as e:
            print("Result error:", e)
            
    print('Done')

asyncio.run(alter())
