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
    """Tạo tài khoản người dùng và nhóm quyền mặc định (Seed Data) khi hệ thống chưa có dữ liệu."""
    # Mở một phiên làm việc (session) bất đồng bộ với cơ sở dữ liệu
    async with async_session() as db:
        # Đếm số lượng người dùng hiện có trong cơ sở dữ liệu
        result = await db.execute(select(func.count()).select_from(User))
        count = result.scalar()

        # Nếu chưa có người dùng nào, tiến hành tạo 2 tài khoản mặc định
        if count == 0:
            print("[Auth Service] Chưa có user nào. Đang tạo tài khoản admin và giáo viên mặc định...")
            
            # Tạo tài khoản Quản trị viên
            admin = User(
                id=f"u-admin-{int(time.time() * 1000)}",
                username="admin",
                email="admin@gmail.com",
                fullName="Quản trị viên hệ thống",
                password_hash=pwd_context.hash("admin123"),
                role="admin",
                status="active",
                createdAt=datetime.utcnow().isoformat() + "Z",
            )
            db.add(admin)

            # Tạo tài khoản Giáo viên bộ môn
            teacher = User(
                id=f"u-teacher-{int(time.time() * 1000)}",
                username="teacher01",
                email="teacher01@gmail.com",
                fullName="Nguyễn Văn Dũng",
                password_hash=pwd_context.hash("teacher123"),
                role="teacher",
                status="active",
                createdAt=datetime.utcnow().isoformat() + "Z",
            )
            db.add(teacher)

            # Lưu thay đổi vào cơ sở dữ liệu
            await db.commit()
            print("[Auth Service] Da tao user admin (admin/admin123) va teacher01 (teacher01/teacher123).")

        # Kiểm tra xem đã có nhóm người dùng nào được tạo chưa
        group_count_result = await db.execute(select(func.count()).select_from(UserGroup))
        group_count = group_count_result.scalar()
        
        # Nếu chưa có nhóm nào, tiến hành tạo 4 nhóm mặc định chuẩn theo sơ đồ quy trình
        if group_count == 0:
            print("[Auth Service] Chua co nhom nguoi dung nao. Dang tao nhom mac dinh theo sơ đồ...")
            
            # 1. Nhóm Quản trị hệ thống: Quản lý nền tảng, danh mục, tài khoản
            admin_group = UserGroup(id=f"g-admin-{int(time.time() * 1000)}", code="GRP_ADMIN", name="Quản trị hệ thống", description="Quản lý hệ thống, người dùng, danh mục", memberCount=1, createdAt=datetime.utcnow().isoformat() + "Z")
            # 2. Nhóm Giáo viên bộ môn: Chịu trách nhiệm soạn thảo và gửi duyệt nội dung
            teacher_group = UserGroup(id=f"g-teacher-{int(time.time() * 1000)}", code="GRP_TEACHER", name="Giáo viên bộ môn", description="Quản lý chủ đề, câu hỏi, ma trận, đề thi", memberCount=1, createdAt=datetime.utcnow().isoformat() + "Z")
            # 3. Nhóm Tổ trưởng bộ môn: Phê duyệt, thẩm định các nội dung từ Giáo viên
            head_group = UserGroup(id=f"g-head-{int(time.time() * 1000)}", code="GRP_HEAD", name="Tổ trưởng bộ môn", description="Thẩm định chủ đề, câu hỏi, ma trận, đề thi", memberCount=0, createdAt=datetime.utcnow().isoformat() + "Z")
            # 4. Nhóm Trưởng phòng giáo vụ: Khai thác sử dụng (Tổ chức thi, xuất gói đề)
            academic_group = UserGroup(id=f"g-academic-{int(time.time() * 1000)}", code="GRP_ACADEMIC", name="Trưởng phòng giáo vụ", description="Quản lý sinh đề, xuất gói, tổ chức thi", memberCount=0, createdAt=datetime.utcnow().isoformat() + "Z")
            
            db.add_all([admin_group, teacher_group, head_group, academic_group])
            await db.commit()

            # Định nghĩa danh sách các quyền hạn (Permissions) chi tiết bám sát theo quy trình nghiệp vụ (Flowchart)
            default_perms = [
                # Quản trị hệ thống
                {"code": "system.groups", "name": "Quản lý nhóm người dùng", "module": "Quản trị hệ thống"},
                {"code": "system.users", "name": "Quản lý người dùng", "module": "Quản trị hệ thống"},
                {"code": "system.categories", "name": "Quản trị danh mục (môn thi, khối lớp...)", "module": "Quản trị hệ thống"},
                
                # Quản lý Chủ đề
                {"code": "topics.manage", "name": "Thêm/Sửa chủ đề", "module": "Quản lý Nội dung"},
                {"code": "topics.submit", "name": "Gửi thẩm định chủ đề", "module": "Quản lý Nội dung"},
                {"code": "topics.approve", "name": "Thẩm định chủ đề", "module": "Thẩm định"},

                # Quản lý Câu hỏi
                {"code": "questions.manage", "name": "Thêm/Sửa câu hỏi (Thủ công & AI)", "module": "Quản lý Nội dung"},
                {"code": "questions.submit", "name": "Gửi thẩm định câu hỏi", "module": "Quản lý Nội dung"},
                {"code": "questions.approve", "name": "Thẩm định câu hỏi", "module": "Thẩm định"},

                # Quản lý Ma trận
                {"code": "matrices.manage", "name": "Thêm/Sửa ma trận đề", "module": "Quản lý Nội dung"},
                {"code": "matrices.submit", "name": "Gửi thẩm định ma trận đề", "module": "Quản lý Nội dung"},
                {"code": "matrices.approve", "name": "Thẩm định ma trận đề", "module": "Thẩm định"},

                # Quản lý Đề thi
                {"code": "exams.manage", "name": "Tạo/Sửa đề thi gốc", "module": "Quản lý Nội dung"},
                {"code": "exams.submit", "name": "Gửi thẩm định đề thi gốc", "module": "Quản lý Nội dung"},
                {"code": "exams.approve", "name": "Thẩm định đề thi gốc", "module": "Thẩm định"},

                # Tổ chức thi
                {"code": "exams.generate_variants", "name": "Sinh đề hoán vị từ đề thi gốc", "module": "Tổ chức thi"},
                {"code": "exams.export", "name": "Xuất gói đề thi", "module": "Tổ chức thi"},
                {"code": "exams.test_run", "name": "Cho thi thử nghiệm", "module": "Tổ chức thi"},
            ]
            
            # Duyệt qua danh sách và thêm các quyền vào cơ sở dữ liệu (nếu chưa tồn tại)
            for p in default_perms:
                existing_p = await db.execute(select(Permission).where(Permission.code == p["code"]))
                if not existing_p.scalar_one_or_none():
                    db.add(Permission(id=f"p-{int(time.time() * 1000)}-{p['code']}", code=p["code"], name=p["name"], module=p["module"]))
            await db.commit()

            # BẢNG MA TRẬN PHÂN QUYỀN: Ánh xạ quyền hạn cụ thể cho từng nhóm người dùng
            # Cấu trúc: { "id_nhóm_quyền": ["danh_sách", "các_mã_quyền"] }
            matrix_assignments = {
                admin_group.id: ["system.groups", "system.users", "system.categories"],
                teacher_group.id: ["topics.manage", "topics.submit", "questions.manage", "questions.submit", "matrices.manage", "matrices.submit", "exams.manage", "exams.submit"],
                head_group.id: ["topics.approve", "questions.approve", "matrices.approve", "exams.approve"],
                academic_group.id: ["exams.generate_variants", "exams.export", "exams.test_run"]
            }

            # Duyệt qua ma trận và tạo liên kết (GroupPermission) giữa Nhóm và Quyền
            for group_id, perms in matrix_assignments.items():
                for p_code in perms:
                    p_id = (await db.execute(select(Permission.id).where(Permission.code == p_code))).scalar_one()
                    db.add(GroupPermission(id=f"gp-{int(time.time() * 1000)}-{p_id}", group_id=group_id, permission_id=p_id))

            await db.commit()
            print("[Auth Service] Da tao 4 nhom va phan quyen theo so do Flowchart.")


# Quản lý vòng đời (Lifespan) của ứng dụng FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("[Auth Service] Khoi dong tren Port 8004...")
    # 1. Đảm bảo database đã được tạo
    await ensure_database_exists()
    # 2. Khởi tạo cấu trúc các bảng nếu chưa có
    await init_tables()
    # 3. Chạy hàm tạo dữ liệu mẫu (nhóm, quyền, tài khoản mặc định)
    await seed_admin_user()
    print("[Auth Service] San sang xac thuc!")
    print("=" * 60)
    yield
    print("[Auth Service] Dang tat...")


# Khởi tạo ứng dụng FastAPI cho Auth Service
app = FastAPI(
    title="SmartTest - Auth Service",
    description="Microservice xác thực JWT, quản lý người dùng và phân quyền RBAC.",
    version="2.0.0",
    lifespan=lifespan,
)

# Cấu hình CORS để Frontend (React/Vue) có thể gọi API mà không bị lỗi Cross-Origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các API Routes liên quan đến xác thực (Auth)
app.include_router(auth_router)


# API kiểm tra trạng thái sức khỏe (Health Check) của Microservice
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth-service", "port": 8004}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    # Chạy server Uvicorn ở chế độ debug/reload
    uvicorn.run("backend.auth_service.main:app", host="0.0.0.0", port=8004, reload=True)
