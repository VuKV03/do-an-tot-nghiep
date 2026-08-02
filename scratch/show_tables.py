import sys
import os
sys.path.append(os.getcwd())

import asyncio
from backend.shared.database import engine
from sqlalchemy import text

async def show_tables():
    async with engine.begin() as conn:
        res = await conn.execute(text('SHOW TABLES'))
        tables = [row[0] for row in res.fetchall()]
        print("Existing tables in DB:", tables)
        print("Does exam_sessions exist?", "exam_sessions" in tables)

asyncio.run(show_tables())
