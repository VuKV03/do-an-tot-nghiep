import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import select
from backend.shared.database import async_session
from backend.exam_service.models import Exam

async def main():
    async with async_session() as db:
        res = await db.execute(select(Exam))
        exams = res.scalars().all()
        for e in exams:
            print(f"Code: {e.code}, Name: {e.name}, Source: {e.source}, Status: {e.status}")

if __name__ == "__main__":
    asyncio.run(main())
