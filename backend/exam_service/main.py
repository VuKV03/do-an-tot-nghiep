"""
Exam Service — FastAPI Microservice (Port 8001)
Handles CRUD operations for Exams, Questions, and Packages.
"""
import json
import time
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse

from backend.shared.database import ensure_database_exists, init_tables, async_session, engine
# pyrefly: ignore [missing-import]
from sqlalchemy import select, func, text
# pyrefly: ignore [missing-import]
from backend.exam_service.models import (
    Exam, Question, Package, MatrixConfig,  # existing models
    SubjectCategory, CognitiveLevel, QuestionType,  # category models
    CompetencyComponent, GradeLevel, Topic, SubjectConfig,
    QuestionHistory
)
from backend.exam_service.routes.exams import router as exams_router
from backend.exam_service.routes.packages import router as packages_router
from backend.exam_service.routes.subject_categories import router as subject_categories_router
from backend.exam_service.routes.subject_configs import router as subject_configs_router
from backend.exam_service.routes.cognitive_levels import router as cognitive_levels_router
from backend.exam_service.routes.question_types import router as question_types_router
from backend.exam_service.routes.competency_components import router as competency_components_router
from backend.exam_service.routes.grade_levels import router as grade_levels_router
from backend.exam_service.routes.topics import router as topics_router
from backend.exam_service.routes.questions import router as questions_router
from backend.exam_service.routes.bank_questions import router as bank_questions_router


async def seed_demo_data():
    """Nạp dữ liệu mẫu nếu database trống."""
    async with async_session() as db:
        

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
    
    # Migration: add 'status' column to old questions table if not exists
    try:
        async with engine.begin() as conn:
            column_check = await conn.execute(text("SHOW COLUMNS FROM questions LIKE 'status'"))
            if not column_check.fetchone():
                await conn.execute(text(
                    "ALTER TABLE questions ADD COLUMN status INT DEFAULT 0;"
                ))
                print("[Exam Service] ✅ Added 'status' column to questions table.")
            else:
                print("[Exam Service] ✅ 'status' column already exists in questions table.")
    except Exception as e:
        print(f"[Exam Service] Error checking/adding status column: {e}")

    # Migration: add 'matrix_id' column to exams table if not exists (create_all doesn't
    # alter already-existing tables — same pattern as the 'status' migration above).
    try:
        async with engine.begin() as conn:
            column_check = await conn.execute(text("SHOW COLUMNS FROM exams LIKE 'matrix_id'"))
            if not column_check.fetchone():
                await conn.execute(text(
                    "ALTER TABLE exams ADD COLUMN matrix_id VARCHAR(255) NULL;"
                ))
                print("[Exam Service] ✅ Added 'matrix_id' column to exams table.")
            else:
                print("[Exam Service] ✅ 'matrix_id' column already exists in exams table.")
    except Exception as e:
        print(f"[Exam Service] Error checking/adding matrix_id column: {e}")

    # Migration: add 'created_at' column to questions table if not exists — trước đây bảng
    # không có cột này nên API luôn trả về _now() (giờ hiện tại) thay vì ngày tạo thật, làm
    # "Ngày tạo" hiển thị tự nhảy theo ngày hôm nay. Câu hỏi cũ (đã tồn tại trước migration
    # này) không có ngày tạo thật để khôi phục — backfill bằng thời điểm chạy migration, coi
    # như "ngày phát hiện/vá lỗi" thay vì để NULL; từ nay các câu hỏi mới sẽ có đúng ngày tạo.
    try:
        async with engine.begin() as conn:
            column_check = await conn.execute(text("SHOW COLUMNS FROM questions LIKE 'created_at'"))
            if not column_check.fetchone():
                await conn.execute(text(
                    "ALTER TABLE questions ADD COLUMN created_at VARCHAR(50) NULL;"
                ))
                now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                await conn.execute(text(
                    f"UPDATE questions SET created_at = '{now_iso}' WHERE created_at IS NULL;"
                ))
                print("[Exam Service] ✅ Added 'created_at' column to questions table (backfilled existing rows).")
            else:
                print("[Exam Service] ✅ 'created_at' column already exists in questions table.")
    except Exception as e:
        print(f"[Exam Service] Error checking/adding created_at column: {e}")

    # Migration: add 'created_by' column to questions table if not exists — the
    # Question model gained this field (mục "thêm người soạn câu hỏi") but create_all
    # doesn't alter already-existing tables, so without this the physical table was
    # missing the column and every POST /questions/ or POST /bank-questions/ insert
    # failed with "Unknown column 'created_by'" (surfaced to the client as a bare 500).
    try:
        async with engine.begin() as conn:
            column_check = await conn.execute(text("SHOW COLUMNS FROM questions LIKE 'created_by'"))
            if not column_check.fetchone():
                await conn.execute(text(
                    "ALTER TABLE questions ADD COLUMN created_by VARCHAR(255) NULL;"
                ))
                print("[Exam Service] ✅ Added 'created_by' column to questions table.")
            else:
                print("[Exam Service] ✅ 'created_by' column already exists in questions table.")
    except Exception as e:
        print(f"[Exam Service] Error checking/adding created_by column: {e}")

    # Migration: restructure subject_configs scoring columns to be per-part.
    # Previously the 4 "correct idea" columns were shared/implicitly tied to Phần II
    # only, and there was no "per-answer" column for Phần II. Each part can now
    # independently use per-answer or per-idea scoring depending on whether its
    # selected question type is 'DS' (Đúng/Sai), so every part needs both column sets.
    try:
        async with engine.begin() as conn:
            rename_map = {
                "points_for_1_correct_idea": "points_for_1_correct_idea_p2",
                "points_for_2_correct_idea": "points_for_2_correct_idea_p2",
                "points_for_3_correct_idea": "points_for_3_correct_idea_p2",
                "points_for_4_correct_idea": "points_for_4_correct_idea_p2",
            }
            for old_name, new_name in rename_map.items():
                old_check = await conn.execute(text(f"SHOW COLUMNS FROM subject_configs LIKE '{old_name}'"))
                new_check = await conn.execute(text(f"SHOW COLUMNS FROM subject_configs LIKE '{new_name}'"))
                if old_check.fetchone() and not new_check.fetchone():
                    await conn.execute(text(
                        f"ALTER TABLE subject_configs RENAME COLUMN {old_name} TO {new_name};"
                    ))
                    print(f"[Exam Service] ✅ Renamed '{old_name}' to '{new_name}' in subject_configs table.")

            new_columns = [
                "points_for_a_correct_answers_p2",
                "points_for_1_correct_idea_p1", "points_for_2_correct_idea_p1",
                "points_for_3_correct_idea_p1", "points_for_4_correct_idea_p1",
                "points_for_1_correct_idea_p3", "points_for_2_correct_idea_p3",
                "points_for_3_correct_idea_p3", "points_for_4_correct_idea_p3",
            ]
            for column_name in new_columns:
                column_check = await conn.execute(text(f"SHOW COLUMNS FROM subject_configs LIKE '{column_name}'"))
                if not column_check.fetchone():
                    await conn.execute(text(
                        f"ALTER TABLE subject_configs ADD COLUMN {column_name} DECIMAL(65,30) NULL;"
                    ))
                    print(f"[Exam Service] ✅ Added '{column_name}' column to subject_configs table.")
            print("[Exam Service] ✅ subject_configs per-part scoring columns are up to date.")
    except Exception as e:
        print(f"[Exam Service] Error migrating subject_configs scoring columns: {e}")

    # Migration: alter matrix_configs.structure from TEXT to LONGTEXT — ds_cau_truc JSON can
    # easily exceed 64KB (MySQL TEXT limit) for complex matrix configurations, causing silent
    # data truncation or insert failure (500). Model already declares LONGTEXT but create_all
    # does NOT alter existing columns.
    try:
        async with engine.begin() as conn:
            col_check = await conn.execute(text("SHOW COLUMNS FROM matrix_configs LIKE 'structure'"))
            row = col_check.fetchone()
            if row:
                col_type = str(row[1]).upper()  # e.g. 'text', 'longtext'
                if 'LONGTEXT' not in col_type:
                    await conn.execute(text("ALTER TABLE matrix_configs MODIFY COLUMN structure LONGTEXT;"))
                    print("[Exam Service] ✅ Migrated matrix_configs.structure from TEXT to LONGTEXT.")
                else:
                    print("[Exam Service] ✅ matrix_configs.structure is already LONGTEXT.")
            else:
                print("[Exam Service] ⚠️ matrix_configs.structure column not found (table may be new).")
    except Exception as e:
        print(f"[Exam Service] Error migrating matrix_configs.structure: {e}")

    # Migration: ensure matrix_configs has 'subject_id' column (older schema may only have 'subject')
    try:
        async with engine.begin() as conn:
            col_check = await conn.execute(text("SHOW COLUMNS FROM matrix_configs LIKE 'subject_id'"))
            if not col_check.fetchone():
                await conn.execute(text(
                    "ALTER TABLE matrix_configs ADD COLUMN subject_id VARCHAR(36) NULL;"
                ))
                print("[Exam Service] ✅ Added 'subject_id' column to matrix_configs table.")
            else:
                print("[Exam Service] ✅ 'subject_id' column already exists in matrix_configs table.")
    except Exception as e:
        print(f"[Exam Service] Error checking/adding subject_id column: {e}")

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


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all for uncaught exceptions (DB errors, bugs, etc.) so the client
    always gets a JSON body with the real reason instead of a bare 500 with no
    detail — HTTPException raised explicitly by routes still uses FastAPI's own
    handler and is unaffected by this."""
    print(f"[Exam Service] Unhandled error on {request.method} {request.url.path}: {exc}")
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": str(exc) or exc.__class__.__name__})

# Register routes
app.include_router(exams_router)
app.include_router(packages_router)
from backend.exam_service.routes.matrix_configs import router as matrix_configs_router
app.include_router(matrix_configs_router)

# Category routes
app.include_router(subject_categories_router)
app.include_router(subject_configs_router)
app.include_router(cognitive_levels_router)
app.include_router(question_types_router)
app.include_router(competency_components_router)
app.include_router(grade_levels_router)
app.include_router(topics_router)
app.include_router(questions_router)
app.include_router(bank_questions_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "exam-service", "port": 8001}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("backend.exam_service.main:app", host="0.0.0.0", port=8001, reload=True)
