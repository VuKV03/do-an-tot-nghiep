import sys
import os
sys.path.append(os.getcwd())

import asyncio
from backend.shared.database import engine
from sqlalchemy import text

async def show_schema():
    output = []
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA='quan_ly_sinh_de_ai_v2';"))
        tables = [r[0] for r in res.fetchall()]
        output.append(f'Tables: {tables}')
        for t in tables:
            output.append(f'\n--- Table: {t} ---')
            try:
                res2 = await conn.execute(text(f'SHOW CREATE TABLE {t}'))
                output.append(res2.fetchall()[0][1])
            except Exception as e:
                output.append(f'Error: {e}')
                
    content = '\n'.join(output)
    
    with open('schema_output.txt', 'w', encoding='utf-8') as f:
        f.write(content)
        
    with open('schema_utf8.txt', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Schema dumped successfully to schema_output.txt and schema_utf8.txt")

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(show_schema())
