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
from backend.auth_service.models import User, UserGroup, Permission, GroupPermission
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
                createdAt=datetime.utcnow().isoformat() + "Z",
            )
            db.add(admin_group)

            teacher_group = UserGroup(
                id=f"g-teacher-{int(time.time() * 1000)}",
                code="GRP_TEACHER",
                name="Giáo viên",
                description="Nhóm giáo viên có thể quản lý câu hỏi và đề thi.",
                memberCount=1,
                createdAt=datetime.utcnow().isoformat() + "Z",
            )
            db.add(teacher_group)
            
            await db.commit()

            # Create default permissions
            default_perms = [
                # Wildcards
                {"code": "system.*", "name": "Tất cả quyền hệ thống", "module": "Hệ thống"},
                {"code": "questions.*", "name": "Tất cả quyền câu hỏi", "module": "Ngân hàng câu hỏi"},
                {"code": "matrix.*", "name": "Tất cả quyền ma trận", "module": "Ma trận & Đề thi"},
                {"code": "exams.*", "name": "Tất cả quyền đề thi", "module": "Ma trận & Đề thi"},
                # Quản lý Ngân hàng câu hỏi
                {"code": "questions.view", "name": "Xem danh sách & chi tiết câu hỏi công khai", "module": "Quản lý Ngân hàng câu hỏi"},
                {"code": "questions.create", "name": "Thêm mới câu hỏi & Nhập từ Word/Excel", "module": "Quản lý Ngân hàng câu hỏi"},
                {"code": "questions.edit", "name": "Biên sửa thông tin câu hỏi chưa kiểm duyệt", "module": "Quản lý Ngân hàng câu hỏi"},
                {"code": "questions.delete", "name": "Hạ tải & Xóa vĩnh viễn câu hỏi khỏi ngân hàng", "module": "Quản lý Ngân hàng câu hỏi"},
                # Thẩm định & Chất lượng
                {"code": "questions.approve", "name": "Duyệt câu hỏi vào Ngân hàng chính thức", "module": "Thẩm định & Chất lượng chuyên môn"},
                {"code": "questions.review", "name": "Phản hồi, chấm điểm đóng góp nội dung", "module": "Thẩm định & Chất lượng chuyên môn"},
                # Cấu trúc ma trận & Đề thi
                {"code": "matrix.view", "name": "Xem danh sách ma trận đề thi", "module": "Cấu trúc ma trận & Đề kiểm thi"},
                {"code": "matrix.create", "name": "Tạo mới mẫu ma trận phân bổ câu hỏi", "module": "Cấu trúc ma trận & Đề kiểm thi"},
                {"code": "matrix.edit", "name": "Chỉnh sửa, phân bố tỉ lệ các câu tự động", "module": "Cấu trúc ma trận & Đề kiểm thi"},
                {"code": "matrix.delete", "name": "Xóa ma trận cấu hình đề", "module": "Cấu trúc ma trận & Đề kiểm thi"},
                {"code": "exams.view", "name": "Xem, tải file Word đề thi và đáp án", "module": "Cấu trúc ma trận & Đề kiểm thi"},
                {"code": "exams.create", "name": "Sinh ngẫu nhiên đề thi & tráo vị trí đề", "module": "Cấu trúc ma trận & Đề kiểm thi"},
                {"code": "exams.edit", "name": "Biên tập lại đề thi", "module": "Cấu trúc ma trận & Đề kiểm thi"},
                {"code": "exams.delete", "name": "Xóa đề thi", "module": "Cấu trúc ma trận & Đề kiểm thi"},
                # Quản trị hệ thống & Bảo mật
                {"code": "system.categories", "name": "Quản lý danh mục dùng chung", "module": "Quản trị hệ thống & Bảo mật"},
                {"code": "system.users", "name": "Quản lý thông tin tài khoản cán bộ", "module": "Quản trị hệ thống & Bảo mật"},
                {"code": "system.groups", "name": "Phân vai trò và điều chỉnh nhóm người dùng", "module": "Quản trị hệ thống & Bảo mật"},
                {"code": "system.policies", "name": "Thay đổi chính sách bảo mật", "module": "Quản trị hệ thống & Bảo mật"},
            ]
            for p in default_perms:
                existing_p = await db.execute(select(Permission).where(Permission.code == p["code"]))
                if not existing_p.scalar_one_or_none():
                    db.add(Permission(id=f"p-{int(time.time() * 1000)}-{p['code']}", code=p["code"], name=p["name"], module=p["module"]))
            await db.commit()

            # Assign permissions to groups
            admin_perms = ["system.*", "questions.*", "matrix.*", "exams.*"]
            for p in admin_perms:
                p_id = (await db.execute(select(Permission.id).where(Permission.code == p))).scalar_one()
                db.add(GroupPermission(id=f"gp-{int(time.time() * 1000)}-{p_id}", group_id=admin_group.id, permission_id=p_id))
            
            teacher_perms = ["questions.view", "questions.create", "matrix.create", "exams.create", "exams.view"]
            for p in teacher_perms:
                p_id = (await db.execute(select(Permission.id).where(Permission.code == p))).scalar_one()
                db.add(GroupPermission(id=f"gp-{int(time.time() * 1000)}-{p_id}", group_id=teacher_group.id, permission_id=p_id))

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
