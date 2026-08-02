import sys
import os
sys.path.append(os.getcwd())

import asyncio
from backend.shared.database import engine
from sqlalchemy import text

async def cleanup_permissions():
    async with engine.begin() as conn:
        try:
            print("Cleaning up deprecated permissions from database...")
            
            # 1. Delete group permissions linking to the deprecated permissions
            await conn.execute(text("""
                DELETE gp FROM group_permissions gp
                JOIN permissions p ON gp.permission_id = p.id
                WHERE p.code IN ('quan-ly-ky-thi', 'quan-ly-de-thi', 'danh-muc-dot-thi')
            """))
            
            # 2. Delete the permissions themselves
            res = await conn.execute(text("""
                DELETE FROM permissions 
                WHERE code IN ('quan-ly-ky-thi', 'quan-ly-de-thi', 'danh-muc-dot-thi')
            """))
            print(f"Deleted {res.rowcount} deprecated permission records.")
            
        except Exception as e:
            print(f"Error cleaning up permissions: {e}")

asyncio.run(cleanup_permissions())
