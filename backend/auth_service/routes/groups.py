"""
Auth routes — Group management (Quản lý nhóm người dùng và Phân quyền RBAC).
File này định nghĩa các API Router cho việc:
1. Truy vấn danh sách nhóm người dùng và các quyền tương ứng.
2. Tạo nhóm người dùng mới (kèm gán danh sách quyền và thành viên).
3. Cập nhật thông tin nhóm, danh sách quyền và danh sách thành viên.
4. Xóa nhóm người dùng (có bảo vệ nhóm hệ thống mặc định).
"""
import time
import json
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, delete

from backend.shared.database import get_db
from backend.auth_service.models import UserGroup, UserGroupMember, Permission, GroupPermission
from backend.auth_service.schemas import GroupCreateRequest, GroupUpdateRequest

# Khởi tạo APIRouter cho phân hệ quản lý nhóm
router = APIRouter(tags=["Groups"])

# ==============================================================================
# 🛠️ CÁC HÀM BỔ TRỢ (HELPER FUNCTIONS)
# ==============================================================================

async def get_group_permissions(db, group_id: str):
    """
    Hàm bổ trợ lấy danh sách mã quyền (permission code) của một nhóm người dùng.
    Thực hiện JOIN giữa bảng Permission và GroupPermission theo group_id.
    """
    perm_result = await db.execute(
        select(Permission.code)
        .join(GroupPermission, GroupPermission.permission_id == Permission.id)
        .where(GroupPermission.group_id == group_id)
    )
    return [r[0] for r in perm_result.all()]

async def to_group_dict(db, group: UserGroup):
    """
    Hàm bổ trợ chuyển đổi đối tượng ORM UserGroup thành Dict để trả về Response.
    Đồng thời gọi hàm get_group_permissions để lấy toàn bộ danh sách quyền của nhóm.
    """
    perms = await get_group_permissions(db, group.id)
    return {
        "id": group.id,
        "code": group.code,
        "name": group.name,
        "description": group.description,
        "memberCount": group.memberCount,
        "permissions": perms,
        "createdAt": group.createdAt
    }

# ==============================================================================
# 📌 API ENDPOINTS QUẢN LÝ NHÓM NGƯỜI DÙNG (RBAC)
# ==============================================================================

@router.get("/groups")
async def list_groups(db: AsyncSession = Depends(get_db)):
    """
    [GET] /groups
    Chức năng: Lấy danh sách tất cả các nhóm người dùng trong hệ thống.
    Luồng xử lý:
    1. Truy vấn toàn bộ các bản ghi trong bảng `user_groups`.
    2. Duyệt từng nhóm và gọi `to_group_dict` để lấy kèm danh sách mã quyền (permissions).
    3. Trả về kết quả dạng JSON.
    """
    result = await db.execute(select(UserGroup))
    groups = result.scalars().all()
    return {
        "success": True,
        "data": [await to_group_dict(db, g) for g in groups],
    }

@router.post("/groups", status_code=201)
async def create_group(body: GroupCreateRequest, db: AsyncSession = Depends(get_db)):
    """
    [POST] /groups
    Chức năng: Tạo một nhóm người dùng mới kèm quyền hạn và thành viên ban đầu.
    Luồng xử lý:
    1. Kiểm tra mã nhóm (code) đã tồn tại trong CSDL hay chưa (tránh trùng mã nhóm).
    2. Khởi tạo đối tượng `UserGroup` mới với ID sinh ngẫu nhiên theo timestamp.
    3. Thêm bản ghi nhóm vào CSDL và gọi `db.flush()` để giữ transaction đang chạy.
    4. Nếu có truyền danh sách `permissions`, tra cứu `permission_id` theo `code` và chèn vào bảng trung gian `group_permissions`.
    5. Nếu có truyền danh sách `member_ids`, tạo các bản ghi liên kết trong bảng `user_group_members`.
    6. Commit transaction để lưu toàn bộ dữ liệu vào CSDL.
    """
    # Khối 1: Kiểm tra trùng lặp mã nhóm (code)
    existing = await db.execute(select(UserGroup).where(UserGroup.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Mã nhóm đã tồn tại.")

    # Khối 2: Khởi tạo bản ghi nhóm mới (UserGroup)
    group = UserGroup(
        id=f"g-{int(time.time() * 1000)}",
        code=body.code,
        name=body.name,
        description=body.description,
        memberCount=len(body.member_ids) if body.member_ids else 0,
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    db.add(group)
    await db.flush()  # Đưa bản ghi vào session để có hiệu lực tạm thời trước khi gán quan hệ

    # Khối 3: Gán các quyền (permissions) cho nhóm vừa tạo
    if body.permissions:
        for p_code in body.permissions:
            p_id = (await db.execute(select(Permission.id).where(Permission.code == p_code))).scalar_one_or_none()
            if p_id:
                db.add(GroupPermission(id=f"gp-{int(time.time() * 10000)}-{p_id}", group_id=group.id, permission_id=p_id))
    
    # Khối 4: Thêm các thành viên (member_ids) vào nhóm
    if body.member_ids:
        for user_id in body.member_ids:
            ugm = UserGroupMember(
                id=f"ugm-{int(time.time() * 1000)}-{user_id}",
                group_id=group.id,
                user_id=user_id,
                joinedAt=datetime.utcnow().isoformat() + "Z"
            )
            db.add(ugm)

    # Khối 5: Lưu thay đổi và hoàn tất transaction
    await db.commit()
    return {
        "success": True,
        "message": "Thêm nhóm mới thành công!",
        "group": await to_group_dict(db, group),
    }

@router.put("/groups/{group_id}")
async def update_group(group_id: str, body: GroupUpdateRequest, db: AsyncSession = Depends(get_db)):
    """
    [PUT] /groups/{group_id}
    Chức năng: Cập nhật thông tin chi tiết của một nhóm (Tên, mô tả, quyền hạn, danh sách thành viên).
    Luồng xử lý:
    1. Kiểm tra sự tồn tại của nhóm theo `group_id`. Trả về 404 nếu không tìm thấy.
    2. Cập nhật các thông tin cơ bản: mã nhóm, tên nhóm, mô tả, trạng thái (nếu có truyền).
    3. Cập nhật danh sách quyền (permissions):
       - Xóa toàn bộ các liên kết quyền cũ của nhóm trong `group_permissions`.
       - Duyệt danh sách mã quyền mới và thêm lại các bản ghi liên kết tương ứng.
    4. Cập nhật danh sách thành viên (member_ids):
       - Xóa toàn bộ liên kết thành viên cũ của nhóm trong `user_group_members`.
       - Thêm mới các bản ghi liên kết thành viên và cập nhật lại số lượng `memberCount`.
    5. Commit transaction và trả về đối tượng nhóm đã cập nhật.
    """
    # Khối 1: Truy vấn kiểm tra sự tồn tại của nhóm
    result = await db.execute(select(UserGroup).where(UserGroup.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Nhóm không tồn tại.")
        
    # Khối 2: Cập nhật các trường thông tin cơ bản
    if body.code is not None:
        group.code = body.code
    if body.name is not None:
        group.name = body.name
    if body.description is not None:
        group.description = body.description

    # Khối 3: Đồng bộ lại danh sách quyền (Xóa toàn bộ quyền cũ và chèn quyền mới)
    if body.permissions is not None:
        await db.execute(delete(GroupPermission).where(GroupPermission.group_id == group_id))
        for p_code in body.permissions:
            p_id = (await db.execute(select(Permission.id).where(Permission.code == p_code))).scalar_one_or_none()
            if p_id:
                db.add(GroupPermission(id=f"gp-{int(time.time() * 10000)}-{p_id}", group_id=group_id, permission_id=p_id))
            else:
                print(f"[WARN] Permission code '{p_code}' không tồn tại trong bảng permissions — bị bỏ qua!")

    if body.status is not None:
        group.status = body.status
        
    # Khối 4: Đồng bộ lại danh sách thành viên (Xóa các thành viên cũ và thêm danh sách mới)
    if body.member_ids is not None:
        await db.execute(delete(UserGroupMember).where(UserGroupMember.group_id == group_id))
        for user_id in body.member_ids:
            ugm = UserGroupMember(
                id=f"ugm-{int(time.time() * 1000)}-{user_id}",
                group_id=group_id,
                user_id=user_id,
                joinedAt=datetime.utcnow().isoformat() + "Z"
            )
            db.add(ugm)
        group.memberCount = len(body.member_ids)

    # Khối 5: Lưu tất cả thay đổi vào CSDL
    await db.commit()
    return {
        "success": True,
        "message": "Cập nhật nhóm thành công!",
        "group": await to_group_dict(db, group)
    }

@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, db: AsyncSession = Depends(get_db)):
    """
    [DELETE] /groups/{group_id}
    Chức năng: Xóa một nhóm người dùng khỏi hệ thống.
    Luồng xử lý:
    1. Kiểm tra nhóm có tồn tại hay không. Trả về 404 nếu không tìm thấy.
    2. Chặn xóa các nhóm quản trị hệ thống quan trọng (ví dụ mã nhóm 'GRP_ADMIN') để đảm bảo an toàn.
    3. Thực hiện xóa bản ghi nhóm khỏi CSDL.
    4. Commit transaction và trả về thông báo thành công.
    """
    # Khối 1: Truy vấn kiểm tra sự tồn tại của nhóm
    result = await db.execute(select(UserGroup).where(UserGroup.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Nhóm không tồn tại.")
        
    # Khối 2: Kiểm tra bảo vệ nhóm hệ thống mặc định (System Group Safeguard)
    if group.code in ["GRP_ADMIN"]:
        raise HTTPException(status_code=403, detail="Không thể xóa nhóm quản trị gốc.")
        
    # Khối 3: Thực hiện xóa và commit
    await db.delete(group)
    await db.commit()
    return {
        "success": True,
        "message": "Đã xóa nhóm thành công!"
    }
