import asyncio
import time
# pyrefly: ignore [missing-import]
from sqlalchemy import select
from backend.shared.database import engine
from backend.auth_service.models import Permission
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession

async def run():
    async with AsyncSession(engine) as db:
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
            {"code": "questions.manage", "name": "Quản lý danh sách câu hỏi", "module": "Quản lý Ngân hàng câu hỏi"},
            {"code": "questions.submit", "name": "Gửi duyệt câu hỏi", "module": "Quản lý Ngân hàng câu hỏi"},
            {"code": "questions.export", "name": "Xuất dữ liệu câu hỏi", "module": "Quản lý Ngân hàng câu hỏi"},
            {"code": "topics.manage", "name": "Quản lý chủ đề", "module": "Quản lý Ngân hàng câu hỏi"},
            {"code": "topics.submit", "name": "Gửi duyệt chủ đề", "module": "Quản lý Ngân hàng câu hỏi"},
            {"code": "topics.approve", "name": "Duyệt chủ đề", "module": "Quản lý Ngân hàng câu hỏi"},
            # Thẩm định & Chất lượng
            {"code": "questions.approve", "name": "Duyệt câu hỏi vào Ngân hàng chính thức", "module": "Thẩm định & Chất lượng chuyên môn"},
            {"code": "questions.review", "name": "Phản hồi, chấm điểm đóng góp nội dung", "module": "Thẩm định & Chất lượng chuyên môn"},
            # Cấu trúc ma trận & Đề thi
            {"code": "matrix.create", "name": "Tạo mới mẫu ma trận phân bổ câu hỏi", "module": "Cấu trúc ma trận & Đề kiểm thi"},
            {"code": "matrix.edit", "name": "Chỉnh sửa, phân bố tỉ lệ các câu tự động", "module": "Cấu trúc ma trận & Đề kiểm thi"},
            {"code": "matrix.delete", "name": "Xóa ma trận cấu hình đề", "module": "Cấu trúc ma trận & Đề kiểm thi"},
            {"code": "exams.create", "name": "Sinh ngẫu nhiên đề thi & tráo vị trí đề", "module": "Cấu trúc ma trận & Đề kiểm thi"},
            {"code": "exams.view", "name": "Xem, tải file Word đề thi và đáp án", "module": "Cấu trúc ma trận & Đề kiểm thi"},
            # Quản trị hệ thống & Bảo mật
            {"code": "system.users", "name": "Quản lý thông tin tài khoản cán bộ", "module": "Quản trị hệ thống & Bảo mật"},
            {"code": "system.groups", "name": "Phân vai trò và điều chỉnh nhóm người dùng", "module": "Quản trị hệ thống & Bảo mật"},
            {"code": "system.policies", "name": "Thay đổi chính sách bảo mật", "module": "Quản trị hệ thống & Bảo mật"}
        ]
        
        for p in default_perms:
            existing_p = await db.execute(select(Permission).where(Permission.code == p["code"]))
            if not existing_p.scalar_one_or_none():
                db.add(Permission(
                    id=f"p-{int(time.time() * 1000)}-{p['code'].replace('.', '-')}", 
                    code=p['code'], 
                    name=p['name'], 
                    module=p['module']
                ))
                print(f"Added: {p['code']}")
        await db.commit()
        print("Permissions seeded successfully!")

import sys
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(run())
