"""
Exam Service — FastAPI Microservice (Port 8001)
Handles CRUD operations for Exams, Questions, and Packages.
"""
import json
import time
from contextlib import asynccontextmanager
from datetime import datetime

# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from backend.shared.database import ensure_database_exists, init_tables, async_session, engine
# pyrefly: ignore [missing-import]
from sqlalchemy import select, func, text
from backend.exam_service.models import (
    Exam, Question, Package, MatrixConfig,  # existing models
    SubjectCategory, CognitiveLevel, QuestionType,  # category models
    CompetencyComponent, GradeLevel, ExamPeriod, Topic, SubjectConfig
)
from backend.exam_service.routes.exams import router as exams_router
from backend.exam_service.routes.packages import router as packages_router
from backend.exam_service.routes.subject_categories import router as subject_categories_router
from backend.exam_service.routes.cognitive_levels import router as cognitive_levels_router
from backend.exam_service.routes.question_types import router as question_types_router
from backend.exam_service.routes.competency_components import router as competency_components_router
from backend.exam_service.routes.grade_levels import router as grade_levels_router
from backend.exam_service.routes.exam_periods import router as exam_periods_router
from backend.exam_service.routes.topics import router as topics_router


async def seed_demo_data():
    """Nạp dữ liệu mẫu nếu database trống."""
    async with async_session() as db:
        
        # Build dynamic mappings for foreign keys to prevent IntegrityError
        # Fetch subjects
        subj_res = await db.execute(select(SubjectCategory))
        subj_map = {}
        for s in subj_res.scalars().all():
            subj_map[s.name.lower()] = s.id
            subj_map[s.code.lower()] = s.id

        # Fetch grades
        grade_res = await db.execute(select(GradeLevel))
        grade_map = {}
        for g in grade_res.scalars().all():
            grade_map[g.name.lower()] = g.id
            grade_map[g.code.lower()] = g.id
            name_clean = g.name.lower().replace("lớp", "").replace("khối", "").strip()
            grade_map[name_clean] = g.id

        # Fetch levels
        level_res = await db.execute(select(CognitiveLevel))
        level_map = {}
        for l in level_res.scalars().all():
            level_map[l.name.lower()] = l.id
            level_map[l.code.lower()] = l.id

        # Fetch types
        type_res = await db.execute(select(QuestionType))
        type_map = {}
        for t in type_res.scalars().all():
            type_map[t.name.lower()] = t.id
            type_map[t.code.lower()] = t.id

        def get_subject_id(subject_name: str) -> str | None:
            if not subject_name:
                return None
            name_lower = subject_name.lower()
            if "toán" in name_lower:
                return subj_map.get("toán") or subj_map.get("math") or subj_map.get("to")
            elif "văn" in name_lower:
                return subj_map.get("văn") or subj_map.get("ngữ văn") or subj_map.get("lit") or subj_map.get("va")
            elif "anh" in name_lower:
                return subj_map.get("tiếng anh") or subj_map.get("english") or subj_map.get("eng") or subj_map.get("n1")
            return subj_map.get(name_lower)

        def get_grade_id(grade_name: str) -> str | None:
            if not grade_name:
                return None
            name_lower = grade_name.lower().replace("lớp", "").replace("khối", "").strip()
            return grade_map.get(name_lower) or grade_map.get(grade_name.lower())

        def get_level_id(level_name: str) -> str | None:
            if not level_name:
                return None
            name_lower = level_name.lower()
            if name_lower in ["easy", "nhận biết", "nhan biet", "l1", "vv"]:
                return level_map.get("nhận biết") or level_map.get("l1") or level_map.get("vv")
            elif name_lower in ["medium", "hiểu", "thông hiểu", "thong hieu", "l2", "zz"]:
                return level_map.get("thông hiểu") or level_map.get("l2") or level_map.get("zz")
            elif name_lower in ["hard", "vận dụng", "van dung", "l3", "xx"]:
                return level_map.get("vận dụng") or level_map.get("l3") or level_map.get("xx")
            return level_map.get(name_lower)

        def get_type_id(type_name: str) -> str | None:
            if not type_name:
                return None
            name_lower = type_name.lower()
            if name_lower in ["single", "trắc nghiệm một đáp án", "trắc nghiệm", "tn"]:
                return type_map.get("trắc nghiệm") or type_map.get("single") or type_map.get("tn") or type_map.get("lhch-01")
            return type_map.get(name_lower)

        result = await db.execute(select(func.count()).select_from(Exam))
        exam_count = result.scalar()

        if exam_count == 0:
            print("[Exam Service] Bảng exams trống. Đang nạp đề thi mẫu...")
            ts = int(time.time() * 1000)

            demo_exams = [
                {
                    "id": "exam-1",
                    "code": "DE-MATH12-001",
                    "name": "Khảo sát Toán 12 Học kỳ 2 Chuyên sâu",
                    "subject": "Toán học",
                    "grade": "Khối 12",
                    "status": "active",
                    "attempts": 412,
                    "totalQuestions": 5,
                    "duration": 90,
                    "source": "matrix",
                    "createdAt": "2026-06-01T14:30:00Z",
                    "avgScore": 7.2,
                    "description": "Khảo sát chuyên đề Giải tích Hàm số, Nguyên hàm Tích phân và phương pháp tọa độ Oxyz.",
                    "questions": [
                        {"text": "Hàm số y = x^3 - 3x có bao nhiêu điểm cực trị?", "type": "single", "level": "easy", "options": ["0", "1", "2", "3"], "correctAnswer": "C"},
                        {"text": "Tích phân từ 0 đến 1 của e^x dx bằng?", "type": "single", "level": "easy", "options": ["e", "e - 1", "e + 1", "1"], "correctAnswer": "B"},
                    ],
                },
                {
                    "id": "exam-2",
                    "code": "DE-LIT11-GK2",
                    "name": "Kiểm tra Ngữ văn 11 Giữa kỳ II",
                    "subject": "Ngữ văn",
                    "grade": "Khối 11",
                    "status": "pending",
                    "attempts": 0,
                    "totalQuestions": 3,
                    "duration": 90,
                    "source": "manual",
                    "createdAt": "2026-06-10T08:15:00Z",
                    "avgScore": 0,
                    "description": "Kiểm tra định kỳ kiến thức thơ mới Việt Nam và lý luận văn học giữa kỳ II khối 11.",
                    "questions": [
                        {"text": "Chủ đề bao trùm tác phẩm Vội vàng của Xuân Diệu là gì?", "type": "single", "level": "medium", "options": ["Lòng căm thù giặc sâu sắc", "Lòng yêu cuộc sống trần thế cuồng nhiệt", "Nỗi sầu muộn u uẩn", "Ý chí cách mạng"], "correctAnswer": "B"},
                    ],
                },
                {
                    "id": "exam-3",
                    "code": "DE-ENG10-003",
                    "name": "Thi thử Tiếng Anh Thống nhất Khối 10",
                    "subject": "Tiếng Anh",
                    "grade": "Khối 10",
                    "status": "draft",
                    "attempts": 0,
                    "totalQuestions": 4,
                    "duration": 45,
                    "source": "ai",
                    "createdAt": "2026-06-12T10:00:00Z",
                    "avgScore": 0,
                    "description": "Đề phát sinh tự động hỗ trợ bồi dưỡng học sinh yếu kém môn Ngoại ngữ.",
                    "questions": [
                        {"text": "If I ________ rich, I would buy a high-performance computer.", "type": "single", "level": "easy", "options": ["am", "was", "were", "would be"], "correctAnswer": "C"},
                    ],
                },
            ]

            for exam_data in demo_exams:
                questions_data = exam_data.pop("questions")
                exam = Exam(**exam_data)
                db.add(exam)

                for i, q in enumerate(questions_data):
                    question = Question(
                        id=f"q-{ts}-{exam_data['id']}-{i}",
                        exam_id=exam_data["id"],
                        code=f"Q-{str(ts)[-6:]}-{exam_data['id'][-1]}-{i}",
                        content=q["text"],
                        options=json.dumps(q["options"], ensure_ascii=False),
                        correct_answer=q["correctAnswer"],
                        subject_id=get_subject_id(exam_data["subject"]),
                        grade_id=get_grade_id(exam_data["grade"]),
                        level_id=get_level_id(q["level"]),
                        type_id=get_type_id(q["type"]),
                        line_number=i + 1,
                        status=2,
                        status_ai=2 if exam_data.get("source") == "ai" else 0,
                        approved_note="Seed data",
                    )
                    db.add(question)

            await db.commit()
            print("[Exam Service] ✅ Đã nạp đề thi mẫu và câu hỏi mẫu thành công.")

        # Check and seed questions if empty but exams exist
        result_q = await db.execute(select(func.count()).select_from(Question))
        q_count = result_q.scalar()
        if q_count == 0 and exam_count > 0:
            print("[Exam Service] Bảng questions trống nhưng exams đã tồn tại. Đang nạp câu hỏi mẫu cho exams...")
            ts = int(time.time() * 1000)
            
            # Seed questions for exam-1
            exam1_questions = [
                {"text": "Hàm số y = x^3 - 3x có bao nhiêu điểm cực trị?", "level": "easy", "options": ["0", "1", "2", "3"], "correctAnswer": "C"},
                {"text": "Tích phân từ 0 đến 1 của e^x dx bằng?", "level": "easy", "options": ["e", "e - 1", "e + 1", "1"], "correctAnswer": "B"},
            ]
            for i, q in enumerate(exam1_questions):
                db.add(Question(
                    id=f"q-{ts}-exam-1-{i}",
                    exam_id="exam-1",
                    code=f"Q-{str(ts)[-6:]}-1-{i}",
                    content=q["text"],
                    options=json.dumps(q["options"], ensure_ascii=False),
                    correct_answer=q["correctAnswer"],
                    subject_id=get_subject_id("Toán học"),
                    grade_id=get_grade_id("Khối 12"),
                    level_id=get_level_id(q["level"]),
                    type_id=get_type_id("single"),
                    line_number=i + 1,
                    status=2,
                    status_ai=0,
                    approved_note="Seed data",
                ))

            # Seed questions for exam-2
            exam2_questions = [
                {"text": "Chủ đề bao trùm tác phẩm Vội vàng của Xuân Diệu là gì?", "level": "medium", "options": ["Lòng căm thù giặc sâu sắc", "Lòng yêu cuộc sống trần thế cuồng nhiệt", "Nỗi sầu muộn u uẩn", "Ý chí cách mạng"], "correctAnswer": "B"},
            ]
            for i, q in enumerate(exam2_questions):
                db.add(Question(
                    id=f"q-{ts}-exam-2-{i}",
                    exam_id="exam-2",
                    code=f"Q-{str(ts)[-6:]}-2-{i}",
                    content=q["text"],
                    options=json.dumps(q["options"], ensure_ascii=False),
                    correct_answer=q["correctAnswer"],
                    subject_id=get_subject_id("Ngữ văn"),
                    grade_id=get_grade_id("Khối 11"),
                    level_id=get_level_id(q["level"]),
                    type_id=get_type_id("single"),
                    line_number=i + 1,
                    status=2,
                    status_ai=0,
                    approved_note="Seed data",
                ))

            # Seed questions for exam-3
            exam3_questions = [
                {"text": "If I ________ rich, I would buy a high-performance computer.", "level": "easy", "options": ["am", "was", "were", "would be"], "correctAnswer": "C"},
            ]
            for i, q in enumerate(exam3_questions):
                db.add(Question(
                    id=f"q-{ts}-exam-3-{i}",
                    exam_id="exam-3",
                    code=f"Q-{str(ts)[-6:]}-3-{i}",
                    content=q["text"],
                    options=json.dumps(q["options"], ensure_ascii=False),
                    correct_answer=q["correctAnswer"],
                    subject_id=get_subject_id("Tiếng Anh"),
                    grade_id=get_grade_id("Khối 10"),
                    level_id=get_level_id(q["level"]),
                    type_id=get_type_id("single"),
                    line_number=i + 1,
                    status=2,
                    status_ai=2,
                    approved_note="Seed data",
                ))
            await db.commit()
            print("[Exam Service] ✅ Đã bổ sung câu hỏi mẫu thành công.")

        # Seed packages
        result2 = await db.execute(select(func.count()).select_from(Package))
        pkg_count = result2.scalar()

        if pkg_count == 0:
            print("[Exam Service] Bảng packages trống. Đang nạp gói đề thi mẫu...")
            demo_packages = [
                Package(
                    id="pkg-1", code="GP-MATH12-01",
                    name="Bộ 10 Đề luyện thi THPT Quốc gia 2026 Môn Toán",
                    subject="Toán học", grade="Khối 12", status="active",
                    examsCount=1, examIds=json.dumps(["exam-1"]),
                    downloadsCount=1540, accessType="premium",
                    createdAt="2026-06-05T09:00:00Z",
                    description="Tổng hợp các mẫu đề thi thử bám sát đề minh họa của Bộ Giáo dục và Đào tạo.",
                ),
                Package(
                    id="pkg-2", code="GP-ENG10-05",
                    name="Chuyên đề rèn luyện ngữ pháp Tiếng Anh nâng cao",
                    subject="Tiếng Anh", grade="Khối 10", status="active",
                    examsCount=1, examIds=json.dumps(["exam-3"]),
                    downloadsCount=520, accessType="free",
                    createdAt="2026-06-11T16:00:00Z",
                    description="Gói tổng hợp các nguồn đề thi thử điều kiện 45 phút học kỳ dành cho lớp 10.",
                ),
            ]
            for pkg in demo_packages:
                db.add(pkg)
            await db.commit()
            print("[Exam Service] \u2705 Đã nạp gói đề thi mẫu thành công.")

        # ─── Seed subject_categories (SubjectCategory) ──────────────────────
        result3 = await db.execute(select(func.count()).select_from(SubjectCategory))
        if result3.scalar() == 0:
            print("[Exam Service] Seeding subject_categories...")
            now = datetime.utcnow().isoformat() + "Z"
            subjects = [
                SubjectCategory(id="mon-01", code="MATH", name="Toán học",       is_active=True,  note="Môn khoa học tự nhiên.",  created_at=now),
                SubjectCategory(id="mon-02", code="PHYS", name="Vật Lý",         is_active=True,  note="Dùng cho khối tự nhiên.",  created_at=now),
                SubjectCategory(id="mon-03", code="CHEM", name="Hóa Học",        is_active=True,  note="Ngân hàng hóa học.",       created_at=now),
                SubjectCategory(id="mon-04", code="BIO",  name="Sinh học",       is_active=False, note="Tạm ngưng khai thác.",    created_at=now),
                SubjectCategory(id="mon-05", code="HIST", name="Lịch sử",        is_active=True,  note="Khoa học xã hội.",        created_at=now),
                SubjectCategory(id="mon-06", code="LIT",  name="Ngữ văn",        is_active=True,  note="Môn học bắt buộc.",       created_at=now),
                SubjectCategory(id="mon-07", code="ENG",  name="Tiếng Anh",      is_active=True,  note="Ngoại ngữ chính.",        created_at=now),
            ]
            for s in subjects:
                db.add(s)
            await db.commit()
            print("[Exam Service] \u2705 subject_categories seeded.")

        # ─── Seed cognitive_levels (CognitiveLevel) ────────────────────
        result4 = await db.execute(select(func.count()).select_from(CognitiveLevel))
        if result4.scalar() == 0:
            print("[Exam Service] Seeding cognitive_levels...")
            now = datetime.utcnow().isoformat() + "Z"
            levels = [
                CognitiveLevel(id="cdtd-01", code="L1", name="Biết",          note="Nhận biết, ghi nhớ kiến thức.",      created_at=now),
                CognitiveLevel(id="cdtd-02", code="L2", name="Hiểu",          note="Hiểu và diễn giải kiến thức.",       created_at=now),
                CognitiveLevel(id="cdtd-03", code="L3", name="Vận dụng",      note="Áp dụng kiến thức vào bài tập.",     created_at=now),
                CognitiveLevel(id="cdtd-04", code="L4", name="Vận dụng cao",  note="Phân tích, tổng hợp, đánh giá.",    created_at=now),
            ]
            for lv in levels:
                db.add(lv)
            await db.commit()
            print("[Exam Service] \u2705 cognitive_levels seeded.")

        # ─── Seed question_types (QuestionType) ──────────────────
        result5 = await db.execute(select(func.count()).select_from(QuestionType))
        if result5.scalar() == 0:
            print("[Exam Service] Seeding question_types...")
            now = datetime.utcnow().isoformat() + "Z"
            qtypes = [
                QuestionType(id="lhch-01", code="SINGLE",    name="Trắc nghiệm một đáp án",  note="Chọn 1 trong 4 đáp án.",          created_at=now),
                QuestionType(id="lhch-02", code="MULTI",     name="Trắc nghiệm nhiều đáp án", note="Chọn nhiều đáp án đúng.",         created_at=now),
                QuestionType(id="lhch-03", code="TRUEFALSE", name="Đúng / Sai",               note="Xác định mệnh đề đúng/sai.",      created_at=now),
                QuestionType(id="lhch-04", code="SHORT",     name="Trả lời ngắn",             note="Điền đáp án bằng văn bản ngắn.", created_at=now),
                QuestionType(id="lhch-05", code="ESSAY",     name="Tự luận",                  note="Trả lời dạng đoạn văn.",          created_at=now),
            ]
            for qt in qtypes:
                db.add(qt)
            await db.commit()
            print("[Exam Service] \u2705 question_types seeded.")

        # ─── Seed competency_components (CompetencyComponent) ─────────
        result6 = await db.execute(select(func.count()).select_from(CompetencyComponent))
        if result6.scalar() == 0:
            print("[Exam Service] Seeding competency_components...")
            now = datetime.utcnow().isoformat() + "Z"
            comps = [
                CompetencyComponent(id="tpnl-01", code="PC1", name="Nhận thức vật lí",                                     subject_id="mon-02", is_active=True,  note="", created_at=now),
                CompetencyComponent(id="tpnl-02", code="PC2", name="Tìm hiểu thế giới tự nhiên dưới góc độ vật lí",        subject_id="mon-02", is_active=True,  note="", created_at=now),
                CompetencyComponent(id="tpnl-03", code="PC3", name="Vận dụng kiến thức kỹ năng đã học",                    subject_id="mon-02", is_active=True,  note="", created_at=now),
                CompetencyComponent(id="tpnl-04", code="MC1", name="Tư duy và lập luận toán học",                          subject_id="mon-01", is_active=True,  note="", created_at=now),
                CompetencyComponent(id="tpnl-05", code="MC2", name="Mô hình hóa toán học",                                 subject_id="mon-01", is_active=True,  note="", created_at=now),
            ]
            for c in comps:
                db.add(c)
            await db.commit()
            print("[Exam Service] \u2705 competency_components seeded.")

        # ─── Seed grade_levels (GradeLevel) ───────────────────────────
        result7 = await db.execute(select(func.count()).select_from(GradeLevel))
        if result7.scalar() == 0:
            print("[Exam Service] Seeding grade_levels...")
            now = datetime.utcnow().isoformat() + "Z"
            grades = [
                GradeLevel(id="kl-10", code="G10", name="Khối 10", is_active=True,  note="", created_at=now),
                GradeLevel(id="kl-11", code="G11", name="Khối 11", is_active=True,  note="", created_at=now),
                GradeLevel(id="kl-12", code="G12", name="Khối 12", is_active=True,  note="", created_at=now),
            ]
            for g in grades:
                db.add(g)
            await db.commit()
            print("[Exam Service] \u2705 grade_levels seeded.")

        # ─── Seed exam_periods (ExamPeriod) ──────────────────────────
        result8 = await db.execute(select(func.count()).select_from(ExamPeriod))
        if result8.scalar() == 0:
            print("[Exam Service] Seeding exam_periods...")
            now = datetime.utcnow().isoformat() + "Z"
            periods = [
                ExamPeriod(
                    id="ep-1", code="D1", name="Thi thử nghiệm đợt 1 2025",
                    start_date="2025-12-22", end_date="2025-12-25",
                    status="HOAT_DONG", is_active=True, note="Đợt khảo sát chất lượng đầu năm",
                    created_at=now
                ),
                ExamPeriod(
                    id="ep-2", code="D2", name="Thi chính thức đợt 1 2024",
                    start_date="2024-12-22", end_date="2024-12-23",
                    status="HOAT_DONG", is_active=True, note="Đợt chính thức kỳ thi TN THPT",
                    created_at=now
                )
            ]
            for p in periods:
                db.add(p)
            await db.commit()
            print("[Exam Service] \u2705 exam_periods seeded.")

        # ─── Seed topics (Topic) ─────────────────────────────────────
        result9 = await db.execute(select(func.count()).select_from(Topic))
        if result9.scalar() == 0:
            print("[Exam Service] Seeding topics...")
            now = datetime.utcnow().isoformat() + "Z"
            
            # Fetch first subject and grade IDs dynamically to avoid foreign key errors!
            subj_res = await db.execute(select(SubjectCategory.id))
            first_subject_id = subj_res.scalars().first()
            
            grade_res = await db.execute(select(GradeLevel.id))
            first_grade_id = grade_res.scalars().first()
            
            # Fallback if somehow they are empty
            first_subject_id = first_subject_id or "mon-01"
            first_grade_id = first_grade_id or "kl-12"
            
            topics = [
                Topic(
                    id="t-1", parent_id=None, code="CD01", name="Biến ngẫu nhiên rời rạc",
                    subject_id=first_subject_id, grade_id=first_grade_id, status=2,
                    created_by="user1", created_at=now, submitted_by="user1", submitted_at=now,
                    approved_by="admin", approved_at=now, approval_note="Đạt yêu cầu", note="Chuyên đề xác suất"
                ),
                Topic(
                    id="t-2", parent_id=None, code="CD02", name="Ứng dụng toán học",
                    subject_id=first_subject_id, grade_id=first_grade_id, status=1,
                    created_by="user1", created_at=now, submitted_by="user1", submitted_at=now,
                    note="Chuyên đề thực tế"
                ),
                Topic(
                    id="t-2-1", parent_id="t-2", code="CD02-1", name="Ứng dụng toán học trong tài chính",
                    subject_id=first_subject_id, grade_id=first_grade_id, status=0,
                    created_by="user1", created_at=now, note="Lãi đơn lãi kép"
                )
            ]
            for t in topics:
                db.add(t)
            await db.commit()
            print("[Exam Service] \u2705 topics seeded.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    print("=" * 60)
    print("[Exam Service] Starting on Port 8001...")
    await ensure_database_exists()
    
    # Drop old subject_config table if exists
    try:
        async with engine.begin() as conn:
            print("[Exam Service] Dropping old subject_config table if exists...")
            await conn.execute(text("DROP TABLE IF EXISTS subject_config;"))
    except Exception as e:
        print(f"[Exam Service] Error dropping old subject_config: {e}")

    await init_tables()
    
    # DEBUG: Describe columns of questions and exams tables
    try:
        async with engine.begin() as conn:
            for table in ["questions", "exams"]:
                res = await conn.execute(text(f"DESCRIBE {table};"))
                rows = res.fetchall()
                print("==================================")
                print(f"[DEBUG] columns in {table} table:")
                for r in rows:
                    print(repr(r))
                print("==================================")
    except Exception as e:
        print(f"[DEBUG] Error describing tables: {e}")

    await seed_demo_data()
    print("[Exam Service] Ready!")
    print("=" * 60)
    yield
    print("[Exam Service] Shutting down...")


app = FastAPI(
    title="SmartTest - Exam Service",
    description="Microservice quản lý CRUD đề thi, câu hỏi và gói đề thi.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(exams_router)
app.include_router(packages_router)
from backend.exam_service.routes.matrix_configs import router as matrix_configs_router
app.include_router(matrix_configs_router)

# Category routes
app.include_router(subject_categories_router)
app.include_router(cognitive_levels_router)
app.include_router(question_types_router)
app.include_router(competency_components_router)
app.include_router(grade_levels_router)
app.include_router(exam_periods_router)
app.include_router(topics_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "exam-service", "port": 8001}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("backend.exam_service.main:app", host="0.0.0.0", port=8001, reload=True)
