# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, delete
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import selectinload, joinedload
from typing import List
import uuid

from backend.shared.database import get_db
from backend.quanlythi_service import models, schemas
# Note: In a real system, you would verify the JWT token from auth_service
# from backend.auth_service.dependencies import get_current_user

router = APIRouter()

# ─── Helper: serialize ORM → dict (avoids async lazy-loading issues) ────────
def _candidate_to_dict(c: models.ExamCandidate) -> dict:
    return {
        "id": c.id,
        "username": c.username,
        "full_name": c.full_name,
        "cccd": c.cccd,
        "gender": c.gender,
        "dob": c.dob,
        "note": c.note,
        "subjects": [s.subject_name for s in c.subjects] if getattr(c, 'subjects', None) else []
    }

def _result_to_dict(r: models.ExamResult) -> dict:
    return schemas.ExamResultResponse.model_validate(r).model_dump()


# ═══════════════════ Candidates ═══════════════════

@router.post("/candidates")
async def add_exam_candidates(candidates: List[schemas.ExamCandidateCreate], db: AsyncSession = Depends(get_db)):
    """Import hoặc sinh danh sách tài khoản thí sinh dự thi."""
    new_candidates = []
    for cand_data in candidates:
        new_cand = models.ExamCandidate(
            id=str(uuid.uuid4()),
            username=cand_data.username,
            full_name=cand_data.full_name,
            password_hash=cand_data.password, # Note: Should be hashed
            cccd=cand_data.cccd,
            gender=cand_data.gender,
            dob=cand_data.dob,
            note=cand_data.note,
        )
        db.add(new_cand)
        
        # Thêm các môn thi
        if cand_data.subjects:
            for sub_name in cand_data.subjects:
                new_sub = models.StudentSubject(
                    id=str(uuid.uuid4()),
                    candidate_id=new_cand.id,
                    subject_id=sub_name,
                    subject_name=sub_name
                )
                db.add(new_sub)
                
        new_candidates.append(new_cand)
        
    await db.commit()
    
    # Reload with subjects
    for cand in new_candidates:
        await db.refresh(cand, ["subjects"])
    return [_candidate_to_dict(c) for c in new_candidates]


@router.get("/candidates")
async def get_all_candidates(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả thí sinh."""
    result = await db.execute(select(models.ExamCandidate).options(selectinload(models.ExamCandidate.subjects)))
    candidates = result.scalars().all()
    return [_candidate_to_dict(c) for c in candidates]

@router.put("/candidates/{candidate_id}")
async def update_exam_candidate(candidate_id: str, candidate_data: schemas.ExamCandidateUpdate, db: AsyncSession = Depends(get_db)):
    """Cập nhật thông tin thí sinh."""
    result = await db.execute(
        select(models.ExamCandidate)
        .options(selectinload(models.ExamCandidate.subjects))
        .where(models.ExamCandidate.id == candidate_id)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Exam candidate not found")
    
    update_data = candidate_data.dict(exclude_unset=True)
    if 'password' in update_data and update_data['password']:
        candidate.password_hash = update_data['password'] # Note: Should be hashed
        del update_data['password']

    if 'subjects' in update_data:
        subjects_data = update_data.pop('subjects')
        # Delete old subjects
        await db.execute(delete(models.StudentSubject).where(models.StudentSubject.candidate_id == candidate_id))
        
        # Add new subjects
        if subjects_data:
            for sub_name in subjects_data:
                new_sub = models.StudentSubject(
                    id=str(uuid.uuid4()),
                    candidate_id=candidate.id,
                    subject_id=sub_name,
                    subject_name=sub_name
                )
                db.add(new_sub)

    for key, value in update_data.items():
        setattr(candidate, key, value)
    
    await db.commit()
    await db.refresh(candidate, ["subjects"])
    return _candidate_to_dict(candidate)

@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_candidate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa thí sinh."""
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Exam candidate not found")
    
    # Manually delete related results to avoid foreign key constraint errors
    await db.execute(delete(models.ExamResult).where(models.ExamResult.candidate_id == candidate_id))
    
    await db.delete(candidate)
    await db.commit()
    return None

@router.delete("/candidates/{candidate_id}/results/{subject}", status_code=status.HTTP_204_NO_CONTENT)
async def reset_candidate_exam_result(candidate_id: str, subject: str, db: AsyncSession = Depends(get_db)):
    """Reset (xóa) kết quả thi của thí sinh cho một môn học cụ thể."""
    result = await db.execute(
        select(models.ExamResult)
        .where(models.ExamResult.candidate_id == candidate_id)
        .where(models.ExamResult.subject == subject)
    )
    exam_results = result.scalars().all()
    if not exam_results:
        raise HTTPException(status_code=404, detail="Không tìm thấy kết quả thi cho môn học này")
    
    for r in exam_results:
        await db.delete(r)
        
    await db.commit()
    return None


# ═══════════════════ History ═══════════════════

@router.get("/candidates/{candidate_id}/history")
async def get_candidate_history(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Xem lịch sử thi của thí sinh (Quick View)."""
    # 1. Check candidate exists
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # 2. Get results for this candidate
    res_result = await db.execute(
        select(models.ExamResult)
        .where(models.ExamResult.candidate_id == candidate_id)
        .where(models.ExamResult.submitted_at.is_not(None))  # Only completed exams
        .order_by(models.ExamResult.submitted_at.desc())
    )
    results = res_result.scalars().all()

    # 3. Join with exam_service.models to get package_name and exam_code
    from backend.exam_service.models import Package, Exam
    
    history_items = []
    for r in results:
        package_name = "N/A"
        exam_code = "N/A"
        
        if r.package_id:
            pkg_res = await db.execute(select(Package).where(Package.id == r.package_id))
            pkg = pkg_res.scalar_one_or_none()
            if pkg:
                package_name = pkg.name
                
        if r.exam_id:
            ex_res = await db.execute(select(Exam).where(Exam.id == r.exam_id))
            ex = ex_res.scalar_one_or_none()
            if ex:
                exam_code = ex.code if ex.code else ex.name

        history_items.append(
            schemas.CandidateHistoryItem(
                id=r.id,
                subject=r.subject or "N/A",
                package_name=package_name,
                exam_code=exam_code,
                submitted_at=r.submitted_at,
                score=r.score,
                total_correct=r.total_correct,
                total_questions=r.total_questions,
            )
        )
        
    return schemas.CandidateHistoryResponse(
        candidate_id=candidate.id,
        full_name=candidate.full_name,
        history=history_items
    )


# ═══════════════════ Results ═══════════════════

@router.get("/results")
async def get_all_results(db: AsyncSession = Depends(get_db)):
    """Xem điểm của tất cả các bài thi."""
    result = await db.execute(select(models.ExamResult))
    results = result.scalars().all()
    return [_result_to_dict(r) for r in results]

@router.get("/packages/{package_id}/results")
async def get_results_by_package(package_id: str, db: AsyncSession = Depends(get_db)):
    """Xem kết quả thi theo gói đề."""
    result = await db.execute(
        select(models.ExamResult)
        .options(joinedload(models.ExamResult.candidate))
        .where(models.ExamResult.package_id == package_id)
    )
    results = result.unique().scalars().all()
    
    from backend.exam_service.models import Exam
    exam_ids = list(set([r.exam_id for r in results if r.exam_id]))
    exam_code_map = {}
    if exam_ids:
        ex_res = await db.execute(select(Exam).where(Exam.id.in_(exam_ids)))
        exams = ex_res.scalars().all()
        exam_code_map = {ex.id: ex.code if ex.code else ex.name for ex in exams}

    response = []
    for r in results:
        response.append({
            "id": r.id,
            "candidate_id": r.candidate_id,
            "full_name": r.candidate.full_name if r.candidate else "N/A",
            "sbd": r.candidate.username if r.candidate else "N/A",
            "exam_id": r.exam_id,
            "exam_code": exam_code_map.get(r.exam_id, "N/A") if r.exam_id else "N/A",
            "status": "Đã nộp" if r.submitted_at else "Đang làm",
            "score": r.score,
            "started_at": r.started_at,
            "submitted_at": r.submitted_at,
            "total_correct": r.total_correct,
            "total_questions": r.total_questions
        })
    return response
