import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shared.database import async_session
from auth_service.routes.auth import list_users, list_groups

async def run():
    async with async_session() as db:
        try:
            print("Fetching users...")
            res1 = await list_users(db)
            print("Users success")
        except Exception as e:
            print(f"Error list_users: {e}")

        try:
            print("Fetching groups...")
            res2 = await list_groups(db)
            print("Groups success")
        except Exception as e:
            print(f"Error list_groups: {e}")

if __name__ == '__main__':
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
