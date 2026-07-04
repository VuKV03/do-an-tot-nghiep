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
            await conn.execute(text('ALTER TABLE user_groups DROP COLUMN permissions;'))
            print("Successfully dropped permissions column")
    except Exception as e:
        print(f"Error dropping column: {e}")

    try:
        async with engine.begin() as conn:
            result = await conn.execute(text('DESCRIBE user_groups;'))
            print("user_groups schema:", result.fetchall())
            
            result2 = await conn.execute(text('SELECT * FROM users LIMIT 1;'))
            print("users sample:", result2.fetchall())
    except Exception as e:
        print(f"Error describing: {e}")

if __name__ == '__main__':
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
