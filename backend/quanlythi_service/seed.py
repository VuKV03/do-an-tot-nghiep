import asyncio
from backend.shared.database import async_session
from backend.quanlythi_service import models
import uuid
from datetime import datetime, timedelta

async def seed():
    async with async_session() as db:
        # Clear existing seed data to make script idempotent
        from sqlalchemy import text
        await db.execute(text("DELETE FROM exam_results"))
        await db.execute(text("DELETE FROM student_subjects"))
        await db.execute(text("DELETE FROM exam_candidates"))
        await db.commit()
        
        # Create candidates
        candidates = [
            models.ExamCandidate(
                id=str(uuid.uuid4()),
                username='0100203',
                password_hash='xxx',
                full_name='Nguyễn Văn An',
                gender='Nam',
                dob='2008-05-15'
            ),
            models.ExamCandidate(
                id=str(uuid.uuid4()),
                username='0100205',
                password_hash='xxx',
                full_name='Trần Thị Bích',
                gender='Nữ',
                dob='2008-09-20'
            ),
            models.ExamCandidate(
                id=str(uuid.uuid4()),
                username='0100206',
                password_hash='xxx',
                full_name='Lê Hoàng Cường',
                gender='Nam',
                dob='2008-02-10'
            ),
            models.ExamCandidate(
                id=str(uuid.uuid4()),
                username='0100207',
                password_hash='xxx',
                full_name='Phạm Thị Duyên',
                gender='Nữ',
                dob='2008-11-25'
            ),
            models.ExamCandidate(
                id=str(uuid.uuid4()),
                username='0100208',
                password_hash='xxx',
                full_name='Bùi Văn Em',
                gender='Nam',
                dob='2008-07-04'
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
                score=8.5,
                total_correct=42,
                total_questions=50,
                started_at=datetime.now() - timedelta(minutes=90),
                submitted_at=datetime.now() - timedelta(minutes=30),
                subject='Toán học',
                status='submitted'
            ),
            models.ExamResult(
                id=str(uuid.uuid4()),
                candidate_id=candidates[1].id,
                score=6.0,
                total_correct=30,
                total_questions=50,
                started_at=datetime.now() - timedelta(minutes=110),
                submitted_at=datetime.now() - timedelta(minutes=50),
                subject='Vật lý',
                status='submitted'
            ),
            models.ExamResult(
                id=str(uuid.uuid4()),
                candidate_id=candidates[4].id,
                score=9.2,
                total_correct=46,
                total_questions=50,
                started_at=datetime.now() - timedelta(minutes=80),
                submitted_at=datetime.now() - timedelta(minutes=20),
                subject='Hóa học',
                status='submitted'
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

