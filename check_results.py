import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from backend.shared.database import async_session
from backend.quanlythi_service.models import ExamResult, ExamCandidate

async def main():
    async with async_session() as session:
        result = await session.execute(
            select(ExamResult)
            .options(joinedload(ExamResult.candidate))
            .where(ExamResult.package_id == 'pkg-2')
        )
        results = result.scalars().all()
        print(f"Found {len(results)} results")
        for r in results:
            print(f"Result ID: {r.id}, Candidate ID: {r.candidate_id}")
            if hasattr(r, 'candidate') and r.candidate:
                name = r.candidate.full_name
                print(f"  Candidate Name: {name.encode('utf-8').decode('utf-8', 'ignore')}")
            else:
                print("  Candidate: None")

if __name__ == '__main__':
    asyncio.run(main())
