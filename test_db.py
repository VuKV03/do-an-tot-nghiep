import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')

from backend.shared.database import async_session
from sqlalchemy import text

async def test():
    async with async_session() as session:
        result = await session.execute(text("SELECT id, username, role FROM users WHERE username='ngan'"))
        users = result.fetchall()
        print('User:', users)
        
        if not users:
            print("User ngan not found")
            return
            
        user_id = users[0][0]
        
        result2 = await session.execute(text(f"SELECT * FROM user_group_members WHERE user_id='{user_id}'"))
        members = result2.fetchall()
        print('Members:', members)
        
        for m in members:
            group_id = m[1] # group_id
            result3 = await session.execute(text(f"SELECT id, name, permissions FROM user_groups WHERE id='{group_id}'"))
            print('Group:', result3.fetchall())
        
asyncio.run(test())
