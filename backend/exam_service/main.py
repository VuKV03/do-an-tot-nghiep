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

from backend.shared.database import ensure_database_exists, init_tables, async_session
from backend.exam_service.models import (
    Exam, Question, Package, MatrixConfig,  # existing models
    DmMonHoc, DmCapDoTuDuy, DmLoaiHinhCauHoi,  # category models
    DmThanhPhanNangLuc, DmKhoiLop, ExamPeriod, Topic
)
from backend.exam_service.routes.exams import router as exams_router
from backend.exam_service.routes.packages import router as packages_router
from backend.exam_service.routes.dm_mon_hoc import router as dm_mon_hoc_router
from backend.exam_service.routes.dm_cap_do_tu_duy import router as dm_cap_do_tu_duy_router
from backend.exam_service.routes.dm_loai_hinh_cau_hoi import router as dm_loai_hinh_cau_hoi_router
from backend.exam_service.routes.dm_thanh_phan_nang_luc import router as dm_thanh_phan_nang_luc_router
from backend.exam_service.routes.dm_khoi_lop import router as dm_khoi_lop_router
from backend.exam_service.routes.dm_dot_thi import router as dm_dot_thi_router
from backend.exam_service.routes.topics import router as topics_router


async def seed_demo_data():
    """Nạp dữ liệu mẫu nếu database trống."""
    async with async_session() as db:
        # pyrefly: ignore [missing-import]
        from sqlalchemy import select, func
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
                        examId=exam_data["id"],
                        text=q["text"],
                        type=q["type"],
                        level=q["level"],
                        options=json.dumps(q["options"], ensure_ascii=False),
                        correctAnswer=q["correctAnswer"],
                    )
                    db.add(question)

            await db.commit()
            print("[Exam Service] ✅ Đã nạp đề thi mẫu và câu hỏi mẫu thành công.")

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

        # ─── Seed subject_categories (DmMonHoc) ──────────────────────
        result3 = await db.execute(select(func.count()).select_from(DmMonHoc))
        if result3.scalar() == 0:
            print("[Exam Service] Seeding subject_categories...")
            now = datetime.utcnow().isoformat() + "Z"
            subjects = [
                DmMonHoc(id="mon-01", code="MATH", name="Toán học",       is_active=True,  note="Môn khoa học tự nhiên.",  created_at=now),
                DmMonHoc(id="mon-02", code="PHYS", name="Vật Lý",         is_active=True,  note="Dùng cho khối tự nhiên.",  created_at=now),
                DmMonHoc(id="mon-03", code="CHEM", name="Hóa Học",        is_active=True,  note="Ngân hàng hóa học.",       created_at=now),
                DmMonHoc(id="mon-04", code="BIO",  name="Sinh học",       is_active=False, note="Tạm ngưng khai thác.",    created_at=now),
                DmMonHoc(id="mon-05", code="HIST", name="Lịch sử",        is_active=True,  note="Khoa học xã hội.",        created_at=now),
                DmMonHoc(id="mon-06", code="LIT",  name="Ngữ văn",        is_active=True,  note="Môn học bắt buộc.",       created_at=now),
                DmMonHoc(id="mon-07", code="ENG",  name="Tiếng Anh",      is_active=True,  note="Ngoại ngữ chính.",        created_at=now),
            ]
            for s in subjects:
                db.add(s)
            await db.commit()
            print("[Exam Service] \u2705 subject_categories seeded.")

        # ─── Seed cognitive_levels (DmCapDoTuDuy) ────────────────────
        result4 = await db.execute(select(func.count()).select_from(DmCapDoTuDuy))
        if result4.scalar() == 0:
            print("[Exam Service] Seeding cognitive_levels...")
            now = datetime.utcnow().isoformat() + "Z"
            levels = [
                DmCapDoTuDuy(id="cdtd-01", code="L1", name="Biết",          note="Nhận biết, ghi nhớ kiến thức.",      created_at=now),
                DmCapDoTuDuy(id="cdtd-02", code="L2", name="Hiểu",          note="Hiểu và diễn giải kiến thức.",       created_at=now),
                DmCapDoTuDuy(id="cdtd-03", code="L3", name="Vận dụng",      note="Áp dụng kiến thức vào bài tập.",     created_at=now),
                DmCapDoTuDuy(id="cdtd-04", code="L4", name="Vận dụng cao",  note="Phân tích, tổng hợp, đánh giá.",    created_at=now),
            ]
            for lv in levels:
                db.add(lv)
            await db.commit()
            print("[Exam Service] \u2705 cognitive_levels seeded.")

        # ─── Seed question_types (DmLoaiHinhCauHoi) ──────────────────
        result5 = await db.execute(select(func.count()).select_from(DmLoaiHinhCauHoi))
        if result5.scalar() == 0:
            print("[Exam Service] Seeding question_types...")
            now = datetime.utcnow().isoformat() + "Z"
            qtypes = [
                DmLoaiHinhCauHoi(id="lhch-01", code="SINGLE",    name="Trắc nghiệm một đáp án",  note="Chọn 1 trong 4 đáp án.",          created_at=now),
                DmLoaiHinhCauHoi(id="lhch-02", code="MULTI",     name="Trắc nghiệm nhiều đáp án", note="Chọn nhiều đáp án đúng.",         created_at=now),
                DmLoaiHinhCauHoi(id="lhch-03", code="TRUEFALSE", name="Đúng / Sai",               note="Xác định mệnh đề đúng/sai.",      created_at=now),
                DmLoaiHinhCauHoi(id="lhch-04", code="SHORT",     name="Trả lời ngắn",             note="Điền đáp án bằng văn bản ngắn.", created_at=now),
                DmLoaiHinhCauHoi(id="lhch-05", code="ESSAY",     name="Tự luận",                  note="Trả lời dạng đoạn văn.",          created_at=now),
            ]
            for qt in qtypes:
                db.add(qt)
            await db.commit()
            print("[Exam Service] \u2705 question_types seeded.")

        # ─── Seed competency_components (DmThanhPhanNangLuc) ─────────
        result6 = await db.execute(select(func.count()).select_from(DmThanhPhanNangLuc))
        if result6.scalar() == 0:
            print("[Exam Service] Seeding competency_components...")
            now = datetime.utcnow().isoformat() + "Z"
            comps = [
                DmThanhPhanNangLuc(id="tpnl-01", code="PC1", name="Nhận thức vật lí",                                     subject_id="mon-02", is_active=True,  note="", created_at=now),
                DmThanhPhanNangLuc(id="tpnl-02", code="PC2", name="Tìm hiểu thế giới tự nhiên dưới góc độ vật lí",        subject_id="mon-02", is_active=True,  note="", created_at=now),
                DmThanhPhanNangLuc(id="tpnl-03", code="PC3", name="Vận dụng kiến thức kỹ năng đã học",                    subject_id="mon-02", is_active=True,  note="", created_at=now),
                DmThanhPhanNangLuc(id="tpnl-04", code="MC1", name="Tư duy và lập luận toán học",                          subject_id="mon-01", is_active=True,  note="", created_at=now),
                DmThanhPhanNangLuc(id="tpnl-05", code="MC2", name="Mô hình hóa toán học",                                 subject_id="mon-01", is_active=True,  note="", created_at=now),
            ]
            for c in comps:
                db.add(c)
            await db.commit()
            print("[Exam Service] \u2705 competency_components seeded.")

        # ─── Seed grade_levels (DmKhoiLop) ───────────────────────────
        result7 = await db.execute(select(func.count()).select_from(DmKhoiLop))
        if result7.scalar() == 0:
            print("[Exam Service] Seeding grade_levels...")
            now = datetime.utcnow().isoformat() + "Z"
            grades = [
                DmKhoiLop(id="kl-10", code="G10", name="Khối 10", is_active=True,  note="", created_at=now),
                DmKhoiLop(id="kl-11", code="G11", name="Khối 11", is_active=True,  note="", created_at=now),
                DmKhoiLop(id="kl-12", code="G12", name="Khối 12", is_active=True,  note="", created_at=now),
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
            subj_res = await db.execute(select(DmMonHoc.id))
            first_subject_id = subj_res.scalars().first()
            
            grade_res = await db.execute(select(DmKhoiLop.id))
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
    print("🔧 [Exam Service] Khởi động trên Port 8001...")
    await ensure_database_exists()
    
    # Drop table to force recreate with correct schema
    # from backend.shared.database import engine
    # from sqlalchemy import text
    # try:
    #     async with engine.begin() as conn:
    #         print("[Exam Service] Dropping matrix_configs table if exists to update schema...")
    #         await conn.execute(text("DROP TABLE IF EXISTS matrix_configs;"))
    # except Exception as e:
    #     print(f"[Exam Service] Error dropping matrix_configs: {e}")

    await init_tables()
    await seed_demo_data()
    print("✅ [Exam Service] Sẵn sàng phục vụ!")
    print("=" * 60)
    yield
    print("[Exam Service] Đang tắt...")


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
app.include_router(dm_mon_hoc_router)
app.include_router(dm_cap_do_tu_duy_router)
app.include_router(dm_loai_hinh_cau_hoi_router)
app.include_router(dm_thanh_phan_nang_luc_router)
app.include_router(dm_khoi_lop_router)
app.include_router(dm_dot_thi_router)
app.include_router(topics_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "exam-service", "port": 8001}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("backend.exam_service.main:app", host="0.0.0.0", port=8001, reload=True)
