import asyncio
from backend.shared.database import engine
from sqlalchemy import text

async def test():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, name, exam_id FROM exam_sessions"))
        data = res.fetchall()
        for row in data:
            print(str(row).encode('utf-8'))

asyncio.run(test())
