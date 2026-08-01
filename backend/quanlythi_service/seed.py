import asyncio
from backend.shared.database import async_session
from backend.quanlythi_service import models
import uuid
from datetime import datetime, timedelta

async def seed():
    async with async_session() as db:
        # Create a session
        session_id = str(uuid.uuid4())
        session = models.ExamSession(
            id=session_id,
            exam_id='exam-123',
            name='kỳ thi tốt nghiệp THPT 2026',
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(hours=2),
            duration_minutes=120,
            status='active'
        )
        db.add(session)
        
        # Create candidates
        candidates = [
            models.ExamCandidate(
                id=str(uuid.uuid4()),
                session_id=session_id,
                username='0100203',
                password_hash='xxx',
                full_name='Nguyễn Văn An',
                status='submitted'
            ),
            models.ExamCandidate(
                id=str(uuid.uuid4()),
                session_id=session_id,
                username='0100205',
                password_hash='xxx',
                full_name='Trần Thị Bích',
                status='submitted'
            ),
            models.ExamCandidate(
                id=str(uuid.uuid4()),
                session_id=session_id,
                username='0100206',
                password_hash='xxx',
                full_name='Lê Hoàng Cường',
                status='in_progress'
            ),
            models.ExamCandidate(
                id=str(uuid.uuid4()),
                session_id=session_id,
                username='0100207',
                password_hash='xxx',
                full_name='Phạm Thị Duyên',
                status='not_started'
            ),
            models.ExamCandidate(
                id=str(uuid.uuid4()),
                session_id=session_id,
                username='0100208',
                password_hash='xxx',
                full_name='Bùi Văn Em',
                status='submitted'
            )
        ]
        db.add_all(candidates)
        await db.commit()
        
        for cand in candidates:
            await db.refresh(cand)
        
        # Create results
        results = [
            models.ExamResult(
                id=str(uuid.uuid4()),
                candidate_id=candidates[0].id,
                session_id=session_id,
                score=8.5,
                total_correct=42,
                total_questions=50,
                started_at=datetime.now() - timedelta(minutes=90),
                submitted_at=datetime.now() - timedelta(minutes=30)
            ),
            models.ExamResult(
                id=str(uuid.uuid4()),
                candidate_id=candidates[1].id,
                session_id=session_id,
                score=6.0,
                total_correct=30,
                total_questions=50,
                started_at=datetime.now() - timedelta(minutes=110),
                submitted_at=datetime.now() - timedelta(minutes=50)
            ),
            models.ExamResult(
                id=str(uuid.uuid4()),
                candidate_id=candidates[4].id,
                session_id=session_id,
                score=9.2,
                total_correct=46,
                total_questions=50,
                started_at=datetime.now() - timedelta(minutes=80),
                submitted_at=datetime.now() - timedelta(minutes=20)
            )
        ]
        db.add_all(results)
        
        await db.commit()
        print('Seed successful')

if __name__ == '__main__':
    # Needed for windows
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
