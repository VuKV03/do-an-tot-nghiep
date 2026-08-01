import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import select
from backend.shared.database import async_session
from backend.exam_service.models import Exam, Question

async def main():
    async with async_session() as db:
        try:
            res = await db.execute(select(Exam))
            exams = res.scalars().all()
            print('Exams:', len(exams))
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
