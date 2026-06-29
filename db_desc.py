import asyncio
import os
import sys

sys.path.append(os.getcwd())

from backend.shared.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        try:
            res = await conn.execute(text("SELECT id, code, name, parent_id, subject_id FROM topics"))
            with open("topics_parent_output.txt", "w", encoding="utf-8") as f:
                f.write("--- ROWS IN topics WITH parent_id ---\n")
                for row in res.fetchall():
                    f.write(repr(row) + "\n")
            print("Successfully written to topics_parent_output.txt")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
