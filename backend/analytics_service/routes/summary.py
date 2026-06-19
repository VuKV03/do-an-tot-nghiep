"""
Analytics summary route — ported from analyticsService.ts.
Queries the database directly instead of importing from exam service.
"""
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select

from backend.shared.database import get_db
from backend.exam_service.models import Exam, Question

router = APIRouter(tags=["Analytics"])


@router.get("/summary")
async def get_analytics_summary(db: AsyncSession = Depends(get_db)):
    """Tính toán chỉ số hoạch định ma trận kiểm tra."""
    result = await db.execute(select(Exam))
    exams = result.scalars().all()

    total_exams = len(exams)
    active_exams = sum(1 for e in exams if e.status == "active")
    pending_exams = sum(1 for e in exams if e.status == "pending")
    draft_exams = sum(1 for e in exams if e.status == "draft")
    closed_exams = sum(1 for e in exams if e.status == "closed")

    total_attempts = 0
    combined_scores = 0.0
    exams_with_scores = 0
    total_questions_count = 0
    subject_distribution: dict[str, int] = {}
    grade_distribution: dict[str, int] = {}

    for e in exams:
        total_attempts += e.attempts or 0
        total_questions_count += e.totalQuestions or 0

        if e.avgScore and e.avgScore > 0:
            combined_scores += e.avgScore
            exams_with_scores += 1

        subject_distribution[e.subject] = subject_distribution.get(e.subject, 0) + 1
        grade_distribution[e.grade] = grade_distribution.get(e.grade, 0) + 1

    average_score = (
        round(combined_scores / exams_with_scores, 2)
        if exams_with_scores > 0
        else 7.0
    )

    return {
        "success": True,
        "data": {
            "totalExams": total_exams,
            "activeExams": active_exams,
            "pendingExams": pending_exams,
            "draftExams": draft_exams,
            "closedExams": closed_exams,
            "totalAttempts": total_attempts,
            "averageScore": average_score,
            "totalQuestionsCount": total_questions_count,
            "subjectDistribution": subject_distribution,
            "gradeDistribution": grade_distribution,
            "systemHealth": "100%",
            "updatedAt": datetime.utcnow().isoformat() + "Z",
        },
    }
