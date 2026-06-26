"""
Auth Service — FastAPI Microservice (Port 8004)
Handles authentication, authorization, user management, and JWT tokens.
"""
import time
from contextlib import asynccontextmanager
from datetime import datetime

# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from passlib.context import CryptContext
# pyrefly: ignore [missing-import]
from sqlalchemy import select, func

from backend.shared.database import ensure_database_exists, init_tables, async_session
from backend.auth_service.models import User, UserGroup
from backend.auth_service.routes.auth import router as auth_router

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed_admin_user():
    """Tạo tài khoản admin mặc định nếu chưa có user nào."""
    async with async_session() as db:
        result = await db.execute(select(func.count()).select_from(User))
        count = result.scalar()

        if count == 0:
            print("[Auth Service] Chưa có user nào. Đang tạo tài khoản admin mặc định...")
            admin = User(
                id=f"u-admin-{int(time.time() * 1000)}",
                username="admin",
                email="admin@smarttest.edu.vn",
                fullName="Quản trị viên hệ thống",
                password_hash=pwd_context.hash("admin123"),
                role="admin",
                status="active",
                createdAt=datetime.utcnow().isoformat() + "Z",
            )
            db.add(admin)

            teacher = User(
                id=f"u-teacher-{int(time.time() * 1000)}",
                username="teacher01",
                email="teacher01@smarttest.edu.vn",
                fullName="Nguyễn Văn Dũng",
                password_hash=pwd_context.hash("teacher123"),
                role="teacher",
                status="active",
                createdAt=datetime.utcnow().isoformat() + "Z",
            )
            db.add(teacher)

            await db.commit()
            print("[Auth Service] Da tao user admin (admin/admin123) va teacher01 (teacher01/teacher123).")

        group_count_result = await db.execute(select(func.count()).select_from(UserGroup))
        group_count = group_count_result.scalar()
        
        if group_count == 0:
            print("[Auth Service] Chua co nhom nguoi dung nao. Dang tao nhom mac dinh...")
            import json
            admin_group = UserGroup(
                id=f"g-admin-{int(time.time() * 1000)}",
                code="GRP_ADMIN",
                name="Quản trị hệ thống",
                description="Nhóm có toàn quyền quản trị hệ thống và người dùng.",
                memberCount=1,
                permissions=json.dumps(["system.*", "questions.*", "matrix.*", "exams.*"]),
                createdAt=datetime.utcnow().isoformat() + "Z",
            )
            db.add(admin_group)

            teacher_group = UserGroup(
                id=f"g-teacher-{int(time.time() * 1000)}",
                code="GRP_TEACHER",
                name="Giáo viên",
                description="Nhóm giáo viên có thể quản lý câu hỏi và đề thi.",
                memberCount=1,
                permissions=json.dumps(["questions.view", "questions.create", "matrix.create", "exams.create", "exams.view"]),
                createdAt=datetime.utcnow().isoformat() + "Z",
            )
            db.add(teacher_group)
            
            await db.commit()
            print("[Auth Service] Da tao nhom GRP_ADMIN va GRP_TEACHER.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("[Auth Service] Khoi dong tren Port 8004...")
    await ensure_database_exists()
    await init_tables()
    await seed_admin_user()
    print("[Auth Service] San sang xac thuc!")
    print("=" * 60)
    yield
    print("[Auth Service] Dang tat...")


app = FastAPI(
    title="SmartTest - Auth Service",
    description="Microservice xác thực JWT, quản lý người dùng và phân quyền RBAC.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth-service", "port": 8004}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("backend.auth_service.main:app", host="0.0.0.0", port=8004, reload=True)
