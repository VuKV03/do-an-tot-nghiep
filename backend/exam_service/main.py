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
from backend.exam_service.models import Exam, Question, Package, MatrixConfig  # Register models
from backend.exam_service.routes.exams import router as exams_router
from backend.exam_service.routes.packages import router as packages_router


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
            print("[Exam Service] ✅ Đã nạp gói đề thi mẫu thành công.")


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


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "exam-service", "port": 8001}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("backend.exam_service.main:app", host="0.0.0.0", port=8001, reload=True)
