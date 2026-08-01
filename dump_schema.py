import asyncio
from backend.shared.database import engine
from sqlalchemy import text
import sys

async def show_schema():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA='quan_ly_sinh_de_ai_v2';"))
        tables = [r[0] for r in res.fetchall()]
        print('Tables:', tables)
        for t in tables:
            print(f'\n--- Table: {t} ---')
            try:
                res2 = await conn.execute(text(f'SHOW CREATE TABLE {t}'))
                print(res2.fetchall()[0][1])
            except Exception as e:
                print('Error:', e)

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(show_schema())
