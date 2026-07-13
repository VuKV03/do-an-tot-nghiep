# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select
from datetime import datetime
import json

from backend.shared.database import get_db
from backend.quanlythi_service import models, schemas
# Note: In a real system, you would verify the JWT token from auth_service
# from backend.auth_service.dependencies import get_current_user

router = APIRouter()

@router.post("/auth/login")
async def login_candidate(credentials: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    """Đăng nhập thí sinh, trả về JWT Token với scope là `candidate`."""
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.username == credentials.username))
    candidate = result.scalar_one_or_none()
    
    # In a real app, verify password hash
    if not candidate or candidate.password_hash != credentials.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    # In a real app, generate JWT token
    return {
        "access_token": "fake-jwt-token-for-candidate",
        "token_type": "bearer",
        "candidate": {
            "id": candidate.id,
            "username": candidate.username,
            "fullName": candidate.full_name
        },
        "session_id": candidate.session_id
    }

from backend.exam_service import models as exam_models

@router.get("/me/session-info")
async def get_session_info(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Lấy thông tin bài thi hiện tại và đồng hồ đếm ngược."""
    result = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    session_result = await db.execute(select(models.ExamSession).where(models.ExamSession.id == candidate.session_id))
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    questions_list = []
    if session.exam_id:
        q_result = await db.execute(
            select(exam_models.Question, exam_models.QuestionType)
            .outerjoin(exam_models.QuestionType, exam_models.Question.type_id == exam_models.QuestionType.id)
            .where(exam_models.Question.exam_id == session.exam_id)
        )
        questions_rows = q_result.all()
        # Parse the JSON string `options` and map to expected frontend structure
        for row in questions_rows:
            q = row.Question
            q_type = row.QuestionType
            
            parsed_options = []
            if q.options:
                try:
                    parsed_options = json.loads(q.options)
                except:
                    pass
            
            type_name = q_type.name if q_type else "Phần chung"
            type_code = q_type.code if q_type else ""

            questions_list.append({
                "id": q.id,
                "part": type_name,
                "type_code": type_code,
                "content": q.content,
                "options": parsed_options,
                "correct_answer": q.correct_answer
            })
            
    return {
        "candidate": candidate,
        "session": session,
        "questions": questions_list
    }

@router.post("/submit-draft")
async def submit_draft(candidate_id: str, payload: schemas.SubmitDraftRequest, db: AsyncSession = Depends(get_db)):
    """(Auto-save) Lưu tạm đáp án của thí sinh khi họ đang làm bài."""
    result = await db.execute(select(models.ExamResult).where(models.ExamResult.candidate_id == candidate_id))
    exam_result = result.scalar_one_or_none()
    
    if not exam_result:
        # Create draft result
        cand_res = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
        cand = cand_res.scalar_one_or_none()
        if not cand:
             raise HTTPException(status_code=404, detail="Candidate not found")
             
        exam_result = models.ExamResult(
            id=f"res-{candidate_id}",
            candidate_id=candidate_id,
            session_id=cand.session_id,
            started_at=datetime.utcnow(),
            answers_json=payload.answers_json
        )
        db.add(exam_result)
    else:
        exam_result.answers_json = payload.answers_json
        
    # Update candidate status
    cand_res = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    cand = cand_res.scalar_one_or_none()
    if cand and cand.status == "not_started":
        cand.status = "in_progress"
        
    await db.commit()
    return {"message": "Draft saved"}

@router.post("/submit-final")
async def submit_final(candidate_id: str, payload: schemas.SubmitFinalRequest, db: AsyncSession = Depends(get_db)):
    """Nộp bài chính thức. Trả về kết quả điểm số tức thì."""
    result = await db.execute(select(models.ExamResult).where(models.ExamResult.candidate_id == candidate_id))
    exam_result = result.scalar_one_or_none()
    
    cand_res = await db.execute(select(models.ExamCandidate).where(models.ExamCandidate.id == candidate_id))
    cand = cand_res.scalar_one_or_none()
    if not cand:
         raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not exam_result:
        exam_result = models.ExamResult(
            id=f"res-{candidate_id}",
            candidate_id=candidate_id,
            session_id=cand.session_id,
            started_at=datetime.utcnow(),
            answers_json=payload.answers_json
        )
        db.add(exam_result)
    else:
        exam_result.answers_json = payload.answers_json
        
    # Calculate real score
    total_correct = 0
    total_questions = 0
    
    session_result = await db.execute(select(models.ExamSession).where(models.ExamSession.id == cand.session_id))
    session = session_result.scalar_one_or_none()
    
    if session and session.exam_id:
        q_result = await db.execute(select(exam_models.Question).where(exam_models.Question.exam_id == session.exam_id))
        questions = q_result.scalars().all()
        total_questions = len(questions)
        
        try:
            answers_dict = json.loads(payload.answers_json)
        except Exception:
            answers_dict = {}
            
        for q in questions:
            user_ans = answers_dict.get(str(q.id))
            if user_ans and q.correct_answer:
                if str(user_ans).strip().lower() == str(q.correct_answer).strip().lower():
                    total_correct += 1
                
    exam_result.submitted_at = datetime.utcnow()
    exam_result.score = round((total_correct / total_questions) * 10, 2) if total_questions > 0 else 0
    exam_result.total_correct = total_correct
    exam_result.total_questions = total_questions
    
    cand.status = "submitted"
    
    await db.commit()
    await db.refresh(exam_result)
    
    return exam_result
