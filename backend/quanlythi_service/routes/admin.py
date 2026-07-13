# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select
from typing import List
import uuid

from backend.shared.database import get_db
from backend.quanlythi_service import models, schemas
# Note: In a real system, you would verify the JWT token from auth_service
# from backend.auth_service.dependencies import get_current_user

router = APIRouter()

@router.get("/sessions", response_model=List[schemas.ExamSessionResponse])
async def get_exam_sessions(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả các kỳ thi."""
    result = await db.execute(select(models.ExamSession))
    return result.scalars().all()

@router.post("/sessions", response_model=schemas.ExamSessionResponse)
async def create_exam_session(session_data: schemas.ExamSessionCreate, db: AsyncSession = Depends(get_db)):
    """Khởi tạo kỳ thi mới từ một đề thi có sẵn."""
    new_session = models.ExamSession(
        id=str(uuid.uuid4()),
        **session_data.dict()
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session

@router.put("/sessions/{session_id}", response_model=schemas.ExamSessionResponse)
async def update_exam_session(session_id: str, session_data: schemas.ExamSessionUpdate, db: AsyncSession = Depends(get_db)):
    """Cập nhật thông tin kỳ thi."""
    result = await db.execute(select(models.ExamSession).where(models.ExamSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    
    # Không cho phép đổi đề thi nếu kỳ thi đang diễn ra hoặc đã kết thúc
    if session.status in ["active", "completed"] and (session_data.exam_id is not None or session_data.duration_minutes is not None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Không thể thay đổi đề thi khi kỳ thi đang diễn ra hoặc đã kết thúc."
        )

    update_data = session_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(session, key, value)
    
    await db.commit()
    await db.refresh(session)
    return session

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa kỳ thi."""
    result = await db.execute(select(models.ExamSession).where(models.ExamSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    
    await db.delete(session)
    await db.commit()
    return None

@router.put("/sessions/{session_id}/status", response_model=schemas.ExamSessionResponse)
async def update_exam_session_status(session_id: str, status_data: schemas.ExamSessionUpdate, db: AsyncSession = Depends(get_db)):
    """Đổi trạng thái kỳ thi (Mở thi, Kết thúc)."""
    result = await db.execute(select(models.ExamSession).where(models.ExamSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    
    if status_data.status:
        session.status = status_data.status
    
    await db.commit()
    await db.refresh(session)
    return session

@router.post("/sessions/{session_id}/candidates", response_model=List[schemas.ExamCandidateResponse])
async def add_exam_candidates(session_id: str, candidates: List[schemas.ExamCandidateCreate], db: AsyncSession = Depends(get_db)):
    """Import hoặc sinh danh sách tài khoản thí sinh dự thi."""
    result = await db.execute(select(models.ExamSession).where(models.ExamSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    
    new_candidates = []
    for cand_data in candidates:
        new_cand = models.ExamCandidate(
            id=str(uuid.uuid4()),
            session_id=session_id,
            username=cand_data.username,
            full_name=cand_data.full_name,
            password_hash=cand_data.password, # Note: Should be hashed
            status=cand_data.status,
            cccd=cand_data.cccd,
            gender=cand_data.gender,
            dob=cand_data.dob,
            diem_thi=cand_data.diem_thi,
            note=cand_data.note,
            registered_subjects=cand_data.registered_subjects
        )
        db.add(new_cand)
        new_candidates.append(new_cand)
        
    await db.commit()
    for cand in new_candidates:
        await db.refresh(cand)
    return new_candidates

@router.get("/sessions/{session_id}/candidates", response_model=List[schemas.ExamCandidateResponse])
async def get_exam_candidates(session_id: str, db: AsyncSession = Depends(get_db)):
    """Lấy danh sách thí sinh của một kỳ thi."""
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.session_id == session_id))
    return result.scalars().all()

@router.get("/candidates", response_model=List[schemas.ExamCandidateResponse])
async def get_all_candidates(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả thí sinh."""
    result = await db.execute(select(models.ExamCandidate))
    return result.scalars().all()

@router.put("/candidates/{candidate_id}", response_model=schemas.ExamCandidateResponse)
async def update_exam_candidate(candidate_id: str, candidate_data: schemas.ExamCandidateUpdate, db: AsyncSession = Depends(get_db)):
    """Cập nhật thông tin thí sinh."""
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Exam candidate not found")
    
    update_data = candidate_data.dict(exclude_unset=True)
    if 'password' in update_data and update_data['password']:
        candidate.password_hash = update_data['password'] # Note: Should be hashed
        del update_data['password']

    for key, value in update_data.items():
        setattr(candidate, key, value)
    
    await db.commit()
    await db.refresh(candidate)
    return candidate

@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_candidate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa thí sinh."""
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Exam candidate not found")
    
    await db.delete(candidate)
    await db.commit()
    return None

@router.get("/sessions/{session_id}/results", response_model=List[schemas.ExamResultResponse])
async def get_exam_results(session_id: str, db: AsyncSession = Depends(get_db)):
    """Xem điểm và thống kê của một kỳ thi."""
    result = await db.execute(select(models.ExamResult).where(models.ExamResult.session_id == session_id))
    return result.scalars().all()

@router.get("/results", response_model=List[schemas.ExamResultResponse])
async def get_all_results(db: AsyncSession = Depends(get_db)):
    """Xem điểm của tất cả các kỳ thi."""
    result = await db.execute(select(models.ExamResult))
    return result.scalars().all()
