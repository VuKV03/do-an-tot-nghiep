"""Test serialization of ORM objects through Pydantic schemas."""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import asyncio

from sqlalchemy.future import select
from backend.shared.database import async_session
from backend.quanlythi_service.models import ExamSession, ExamCandidate
from backend.quanlythi_service import schemas

async def main():
    async with async_session() as session:
        # Test Sessions serialization
        print("1. Querying ExamSession...")
        result = await session.execute(select(ExamSession))
        sessions = result.scalars().all()
        print(f"   Got {len(sessions)} sessions")
        
        print("2. Trying Pydantic serialization...")
        try:
            for s in sessions:
                resp = schemas.ExamSessionResponse.model_validate(s)
                print(f"   OK: {resp.id} - {resp.name}")
        except Exception as e:
            print(f"   FAIL on ExamSession: {type(e).__name__}: {e}")
        
        # Test Candidates serialization
        print("3. Querying ExamCandidate...")
        result2 = await session.execute(select(ExamCandidate))
        candidates = result2.scalars().all()
        print(f"   Got {len(candidates)} candidates")
        
        print("4. Trying Pydantic serialization...")
        try:
            for c in candidates:
                resp = schemas.ExamCandidateResponse.model_validate(c)
                print(f"   OK: {resp.id} - {resp.full_name}")
        except Exception as e:
            print(f"   FAIL on ExamCandidate: {type(e).__name__}: {e}")

if __name__ == '__main__':
    asyncio.run(main())
