import asyncio
from sqlalchemy import select
from database import async_session, engine
from models import User, UserGroup, GroupPermission

async def check_user():
    async with async_session() as db:
        user = (await db.execute(select(User).where(User.username == 'ngandh'))).scalar_one_or_none()
        if not user:
            print('User: Not found')
            await engine.dispose()
            return
            
        print('User:', user.username)
        groups = (await db.execute(select(UserGroup).where(UserGroup.user_id == user.id))).scalars().all()
        print('Groups:', [g.name for g in groups])
        
        perms = []
        for g in groups:
            gp = (await db.execute(select(GroupPermission).where(GroupPermission.group_name == g.name))).scalars().all()
            for p in gp:
                perms.append(p.permission_code)
                
        print('Permissions:', set(perms))
    await engine.dispose()

asyncio.run(check_user())
