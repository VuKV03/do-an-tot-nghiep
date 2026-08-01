import asyncio
from backend.shared.database import engine
from sqlalchemy import text

async def show():
    async with engine.begin() as conn:
        res = await conn.execute(text('SHOW CREATE TABLE exam_candidates'))
        print(res.fetchall())
        
        res2 = await conn.execute(text('SHOW CREATE TABLE exam_results'))
        print(res2.fetchall())

asyncio.run(show())
