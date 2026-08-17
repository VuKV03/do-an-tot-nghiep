"""
Auth routes — Phân hệ Xác thực, Quản lý Người dùng, Nhóm người dùng, Chính sách bảo mật và Nhật ký hệ thống (Audit Logs).

File này chịu trách nhiệm:
1. Đăng nhập, đăng ký, cấp phát và quản lý mã thông báo JWT (Access Token & Refresh Token).
2. Quản lý danh mục người dùng (thêm, sửa, xóa, đổi mật khẩu, phân quyền nhóm).
3. Quản lý danh mục quyền (Permissions) và Nhóm người dùng (User Groups / RBAC).
4. Đồng bộ vai trò (Role) tự động theo cấp bậc ưu tiên nhóm.
5. Cấu hình chính sách bảo mật (Security Policy) và Ghi nhật ký truy cập hệ thống (Audit Logs).
"""
import time
import json
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Request
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, func, delete
# pyrefly: ignore [missing-import]
from passlib.context import CryptContext

from backend.shared.database import get_db
from backend.auth_service.models import User, UserGroup, UserGroupMember, SecurityPolicy, AuditLog, Permission, GroupPermission
from backend.auth_service.schemas import (
    LoginRequest, RegisterRequest, UserResponse, UpdateRequest, ChangePasswordRequest,
    GroupCreateRequest, GroupUpdateRequest, GroupResponse,
    SecurityPolicyUpdate, SecurityPolicyResponse, AuditLogCreate, AuditLogResponse
)
from backend.auth_service.jwt_handler import create_access_token, create_refresh_token

# Khởi tạo APIRouter cho phân hệ Xác thực và Quản lý Người dùng
router = APIRouter(tags=["Authentication"])

# Khởi tạo ngữ cảnh băm mật khẩu bcrypt bảo mật cao
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==============================================================================
# 🔑 PHÂN HỆ 1: QUẢN LÝ QUYỀN HỆ THỐNG & ĐĂNG NHẬP / ĐĂNG KÝ
# ==============================================================================

@router.get("/permissions")
async def list_permissions(db: AsyncSession = Depends(get_db)):
    """
    [GET] /permissions
    Chức năng: Lấy danh sách tất cả các quyền (Permissions) khả dụng trong hệ thống.
    Luồng xử lý:
    1. Truy vấn toàn bộ các bản ghi trong bảng `permissions`.
    2. Lọc bỏ các quyền wildcard kết thúc bằng '.*' (dành riêng cho nội bộ).
    3. Trả về danh sách quyền gồm code, name và module.
    """
    result = await db.execute(select(Permission))
    perms = result.scalars().all()
    return {
        "success": True,
        "data": [{"code": p.code, "name": p.name, "module": p.module} for p in perms if not p.code.endswith(".*")]
    }


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    [POST] /login
    Chức năng: Xác thực đăng nhập người dùng và cấp phát mã thông báo JWT (Access Token & Refresh Token).
    Luồng xử lý:
    1. Tra cứu người dùng trong CSDL theo `username`.
    2. Kiểm tra sự tồn tại và xác minh hash mật khẩu bằng `pwd_context.verify`.
    3. Kiểm tra trạng thái tài khoản (`status == 'active'`). Nếu bị khóa -> ném lỗi 403.
    4. Tra cứu danh sách nhóm người dùng (`UserGroup`) và tập hợp các quyền (`permissions`) tương ứng.
    5. Tạo Access Token và Refresh Token mã hóa thông tin người dùng (id, username, role).
    6. Trả về Response chứa Token và toàn bộ thông tin profile người dùng.
    """
    # Khối 1: Tìm kiếm tài khoản theo username
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    # Khối 2: Kiểm tra sự tồn tại và mật khẩu bcrypt
    if not user or not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không chính xác.")

    # Khối 3: Kiểm tra trạng thái hoạt động của tài khoản
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa hoặc vô hiệu hóa.")

    # Khối 4: Truy vấn danh sách Nhóm & Quyền hạn của người dùng (RBAC Aggregation)
    ugm_result = await db.execute(
        select(UserGroup.id, UserGroup.code, UserGroup.name)
        .join(UserGroupMember, UserGroupMember.group_id == UserGroup.id)
        .where(UserGroupMember.user_id == user.id)
    )
    user_groups = []
    for r in ugm_result.all():
        perms = await get_group_permissions(db, r[0])
        user_groups.append({"id": r[0], "code": r[1], "name": r[2], "permissions": perms})

    # Khối 5: Tạo JWT Tokens (Access Token & Refresh Token)
    token_data = {"sub": user.id, "username": user.username, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Khối 6: Trả về kết quả đăng nhập thành công
    return {
        "success": True,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "fullName": user.fullName,
            "role": user.role,
            "status": user.status,
            "groups": user_groups,
            "dob": user.dateOfBirth,
            "gender": user.gender,
            "position": user.position,
            "phoneNumber": user.phoneNumber,
            "subjects": json.loads(user.subjects) if user.subjects else [],
            "passwordVersion": user.passwordVersion,
        },
    }


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    [POST] /register
    Chức năng: Đăng ký tạo mới tài khoản Cán bộ / Giáo viên / Quản trị viên trong hệ thống.
    Luồng xử lý:
    1. Kiểm tra sự trùng lặp của `username` hoặc `email` trong CSDL.
    2. Băm mật khẩu người dùng bằng bcrypt trước khi lưu trữ (`pwd_context.hash`).
    3. Tạo bản ghi `User` mới với ID định dạng timestamp.
    4. Nếu có truyền danh sách nhóm (`groups`), khởi tạo liên kết trong `user_group_members`.
    5. Commit giao dịch và trả về thông tin chi tiết của người dùng vừa đăng ký.
    """
    # pyrefly: ignore [missing-import]
    from sqlalchemy import or_
    
    # Khối 1: Kiểm tra trùng lặp Username hoặc Email
    conditions = [User.username == body.username]
    if body.email:
        conditions.append(User.email == body.email)
    
    existing = await db.execute(select(User).where(or_(*conditions)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Tên đăng nhập hoặc email đã tồn tại.")

    # Khối 2: Khởi tạo đối tượng User mới và băm mật khẩu
    user = User(
        id=f"u-{int(time.time() * 1000)}",
        username=body.username.lower().strip(),
        email=body.email if body.email else None,
        fullName=body.fullName,
        password_hash=pwd_context.hash(body.password),
        role=body.role or "teacher",
        status="active",
        createdAt=datetime.utcnow().isoformat() + "Z",
        position=body.position,
        dateOfBirth=body.dateOfBirth,
        phoneNumber=body.phoneNumber,
        gender=body.gender,
        subjects=json.dumps(body.subjects) if body.subjects is not None else None
    )
    db.add(user)
    
    # Khối 3: Gán nhóm mặc định cho người dùng mới (nếu có)
    if body.groups is not None:
        for group_id in body.groups:
            ugm = UserGroupMember(
                id=f"ugm-{int(time.time() * 1000)}-{group_id}",
                group_id=group_id,
                user_id=user.id,
                joinedAt=datetime.utcnow().isoformat() + "Z"
            )
            db.add(ugm)

    await db.commit()

    # Khối 4: Truy vấn lại thông tin nhóm & quyền hạn để trả về kết quả
    ugm_result = await db.execute(
        select(UserGroup.id, UserGroup.code, UserGroup.name)
        .join(UserGroupMember, UserGroupMember.group_id == UserGroup.id)
        .where(UserGroupMember.user_id == user.id)
    )
    user_groups = []
    for r in ugm_result.all():
        perms = await get_group_permissions(db, r[0])
        user_groups.append({"id": r[0], "code": r[1], "name": r[2], "permissions": perms})
    
    u_dict = UserResponse.model_validate(user).model_dump()
    u_dict["groups"] = user_groups

    return {
        "success": True,
        "message": "Đăng ký tài khoản thành công!",
        "user": u_dict,
    }

# ==============================================================================
# 👤 PHÂN HỆ 2: QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG (USER MANAGEMENT)
# ==============================================================================

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    """
    [GET] /users
    Chức năng: Truy vấn danh sách toàn bộ người dùng trong hệ thống kèm thông tin nhóm và quyền hạn.
    Luồng xử lý:
    1. Truy vấn toàn bộ danh sách bản ghi trong bảng `users`.
    2. Gom nhóm thông tin nhóm (`UserGroup`) theo từng `user_id` từ bảng trung gian.
    3. Duyệt danh sách người dùng và ghép thông tin nhóm tương ứng vào kết quả trả về.
    """
    # Khối 1: Lấy danh sách người dùng
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    # Khối 2: Lấy sơ đồ nhóm của tất cả người dùng (User-Group Mapping)
    ugm_result = await db.execute(
        select(UserGroupMember.user_id, UserGroup.id, UserGroup.code, UserGroup.name)
        .join(UserGroup, UserGroupMember.group_id == UserGroup.id)
    )
    ugm_rows = ugm_result.all()
    user_groups_map = {}
    for user_id, g_id, g_code, g_name in ugm_rows:
        if user_id not in user_groups_map:
            user_groups_map[user_id] = []
        perms = await get_group_permissions(db, g_id)
        user_groups_map[user_id].append({"id": g_id, "code": g_code, "name": g_name, "permissions": perms})
        
    # Khối 3: Tổng hợp danh sách phản hồi
    data = []
    for u in users:
        u_dict = UserResponse.model_validate(u).model_dump()
        u_dict["groups"] = user_groups_map.get(u.id, [])
        data.append(u_dict)
        
    return {
        "success": True,
        "count": len(users),
        "data": data,
    }


@router.put("/users/{user_id}")
async def update_user(user_id: str, body: UpdateRequest, db: AsyncSession = Depends(get_db)):
    """
    [PUT] /users/{user_id}
    Chức năng: Cập nhật thông tin hồ sơ, vai trò, trạng thái hoặc nhóm của một người dùng.
    Luồng xử lý:
    1. Kiểm tra sự tồn tại của người dùng theo `user_id`.
    2. Cập nhật các trường thông tin cá nhân (họ tên, email, chức danh, ngày sinh, số điện thoại, giới tính, môn học).
    3. Kiểm tra ràng buộc bảo vệ: Không cho phép vô hiệu hóa/khóa tài khoản quản trị hệ thống gốc (`admin`).
    4. Nếu có truyền mật khẩu mới -> băm mật khẩu bằng bcrypt và cập nhật.
    5. Nếu có truyền danh sách nhóm mới (`groups`):
       - Xóa toàn bộ liên kết nhóm cũ của người dùng.
       - Thêm lại liên kết nhóm mới vào `user_group_members`.
       - Tự động đồng bộ vai trò (Role Syncing) của người dùng dựa trên nhóm có cấp độ ưu tiên cao nhất (`admin` > `reviewer` > `teacher` > `student`).
    6. Commit giao dịch và trả về đối tượng người dùng đã cập nhật.
    """
    # Khối 1: Truy vấn kiểm tra sự tồn tại người dùng
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")
        
    # Khối 2: Cập nhật thông tin hồ sơ cá nhân
    if body.fullName is not None:
        user.fullName = body.fullName
    if body.email is not None:
        user.email = body.email if body.email else None
    if body.role is not None:
        user.role = body.role
    if body.position is not None:
        user.position = body.position
    if body.dateOfBirth is not None:
        user.dateOfBirth = body.dateOfBirth
    if body.phoneNumber is not None:
        user.phoneNumber = body.phoneNumber
    if body.gender is not None:
        user.gender = body.gender
    if body.subjects is not None:
        user.subjects = json.dumps(body.subjects)
        
    # Khối 3: Kiểm tra ràng buộc bảo vệ tài khoản Admin gốc
    if body.status is not None:
        if user.username == "admin" and body.status != "active":
            raise HTTPException(status_code=403, detail="Không thể khóa tài khoản quản trị hệ thống gốc.")
        user.status = body.status
        
    # Khối 4: Đổi mật khẩu nếu có truyền password mới
    if body.password is not None:
        user.password_hash = pwd_context.hash(body.password)
        
    # Khối 5: Cập nhật danh sách nhóm & Tự động đồng bộ Vai trò (Role Auto-Resolution)
    if body.groups is not None:
        await db.execute(delete(UserGroupMember).where(UserGroupMember.user_id == user_id))
        for group_id in body.groups:
            ugm = UserGroupMember(
                id=f"ugm-{int(time.time() * 1000)}-{group_id}",
                group_id=group_id,
                user_id=user_id,
                joinedAt=datetime.utcnow().isoformat() + "Z"
            )
            db.add(ugm)
        
        # Bảng ánh xạ mã nhóm sang vai trò hệ thống
        role_map = {
            "GRP_ADMIN": "admin",
            "GRP_REVIEWER": "reviewer",
            "GRP_TEACHER": "teacher",
            "GRP_STUDENT": "student"
        }
        role_priority = ["admin", "reviewer", "teacher", "student"]
        
        group_codes_result = await db.execute(
            select(UserGroup.code).where(UserGroup.id.in_(body.groups))
        )
        group_codes = [r[0] for r in group_codes_result.all()]
        
        # Tìm vai trò có độ ưu tiên cao nhất từ danh sách nhóm được gán
        best_role = "user"  # Mặc định nếu không thuộc nhóm chuẩn nào
        for priority_role in role_priority:
            for g_code in group_codes:
                if role_map.get(g_code) == priority_role:
                    best_role = priority_role
                    break
            if best_role != "user":
                break
        
        if body.role is None:
            user.role = best_role
            
    # Khối 6: Hoàn tất transaction và trả về thông tin mới
    await db.commit()
    
    ugm_result = await db.execute(
        select(UserGroup.id, UserGroup.code, UserGroup.name)
        .join(UserGroupMember, UserGroupMember.group_id == UserGroup.id)
        .where(UserGroupMember.user_id == user_id)
    )
    user_groups = []
    for r in ugm_result.all():
        perms = await get_group_permissions(db, r[0])
        user_groups.append({"id": r[0], "code": r[1], "name": r[2], "permissions": perms})
    
    u_dict = UserResponse.model_validate(user).model_dump()
    u_dict["groups"] = user_groups
    
    return {
        "success": True,
        "message": "Cập nhật thông tin thành công!",
        "user": u_dict
    }


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    """
    [DELETE] /users/{user_id}
    Chức năng: Xóa một tài khoản người dùng khỏi hệ thống.
    Luồng xử lý:
    1. Kiểm tra sự tồn tại của người dùng.
    2. Chặn xóa tài khoản `admin` gốc.
    3. Kiểm tra xem người dùng có thuộc nhóm Quản trị hệ thống (`QTHT` hoặc `GRP_ADMIN`) hoặc có `role == 'admin'` hay không. Nếu có -> Ném lỗi 403 ngăn xóa.
    4. Xóa các bản ghi liên kết trong bảng `user_group_members`.
    5. Xóa bản ghi người dùng khỏi CSDL và commit.
    """
    # Khối 1: Kiểm tra người dùng tồn tại
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")
        
    # Khối 2: Chặn xóa tài khoản Admin gốc
    if user.username in ["admin"]:
        raise HTTPException(status_code=403, detail="Không thể xóa tài khoản quản trị hệ thống gốc.")

    # Khối 3: Kiểm tra và ngăn chặn xóa người dùng thuộc nhóm QTHT / Admin
    ugm_result = await db.execute(
        select(UserGroup.code)
        .join(UserGroupMember, UserGroupMember.group_id == UserGroup.id)
        .where(UserGroupMember.user_id == user.id)
    )
    group_codes = [r[0] for r in ugm_result.all()]
    if any(code in ["QTHT", "GRP_ADMIN"] for code in group_codes) or user.role == "admin":
        raise HTTPException(status_code=403, detail="Không cho phép xóa nhóm QTHT")

    # Khối 4: Xóa liên kết nhóm và xóa tài khoản
    await db.execute(delete(UserGroupMember).where(UserGroupMember.user_id == user_id))
    await db.delete(user)
    await db.commit()
    return {
        "success": True,
        "message": "Đã xóa người dùng thành công!"
    }


@router.put("/users/{user_id}/password")
async def change_password(user_id: str, body: ChangePasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    [PUT] /users/{user_id}/password
    Chức năng: Người dùng tự thay đổi mật khẩu tài khoản cá nhân.
    Luồng xử lý:
    1. Kiểm tra sự tồn tại của người dùng.
    2. Khai báo mật khẩu cũ và xác thực hash bằng `pwd_context.verify`. Nếu sai -> ném lỗi 400.
    3. Băm mật khẩu mới bằng bcrypt và cập nhật trường `password_hash`.
    4. Commit thay đổi vào CSDL.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")
        
    if not pwd_context.verify(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác.")
        
    user.password_hash = pwd_context.hash(body.new_password)
    await db.commit()
    
    return {
        "success": True,
        "message": "Đổi mật khẩu thành công!"
    }

# ==============================================================================
# 👥 PHÂN HỆ 3: CÁC HÀM BỔ TRỢ VÀ ENDPOINT QUẢN LÝ NHÓM & THÀNH VIÊN (GROUPS & MEMBERS)
# ==============================================================================

async def get_group_permissions(db, group_id: str):
    """
    Hàm bổ trợ tra cứu tất cả các mã quyền (permission code) của nhóm từ bảng `group_permissions` và `permissions`.
    """
    perm_result = await db.execute(
        select(Permission.code)
        .join(GroupPermission, GroupPermission.permission_id == Permission.id)
        .where(GroupPermission.group_id == group_id)
    )
    return [r[0] for r in perm_result.all()]

async def parse_group_permissions(db, group: UserGroup):
    """
    Hàm bổ trợ chuyển đổi đối tượng UserGroup thành dict kèm theo danh sách mã quyền.
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

@router.get("/groups")
async def list_groups(db: AsyncSession = Depends(get_db)):
    """
    [GET] /groups
    Chức năng: Lấy danh sách toàn bộ các Nhóm người dùng kèm tính toán số lượng thành viên thực tế (Dynamic Member Count).
    Luồng xử lý:
    1. Lấy toàn bộ danh sách bản ghi `UserGroup`.
    2. Với mỗi nhóm, thực hiện truy vấn COUNT tính tổng số người dùng có vai trò tương ứng hoặc có bản ghi liên kết trong `user_group_members`.
    3. Trả về danh sách nhóm gồm thông tin mã quyền và số lượng thành viên thực tế.
    """
    result = await db.execute(select(UserGroup))
    groups = result.scalars().all()
    
    role_map = {
        "GRP_ADMIN": "admin",
        "GRP_TEACHER": "teacher",
        "GRP_STUDENT": "student",
        "GRP_REVIEWER": "reviewer"
    }
    
    response_data = []
    for g in groups:
        mapped_role = role_map.get(g.code)
        fallback_role = g.code.split('_')[-1].lower() if '_' in g.code else g.code.lower()
        
        # Đếm số người dùng thuộc nhóm trực tiếp hoặc thông qua Role
        count_result = await db.execute(
            select(func.count(func.distinct(User.id)))
            .outerjoin(UserGroupMember, User.id == UserGroupMember.user_id)
            .where(
                (User.role == g.code) | 
                (User.role == mapped_role) | 
                (User.role == fallback_role) |
                (UserGroupMember.group_id == g.id)
            )
        )
        actual_count = count_result.scalar()
        
        g_dict = await parse_group_permissions(db, g)
        g_dict["memberCount"] = actual_count
        response_data.append(g_dict)
        
    return {
        "success": True,
        "data": response_data,
    }

@router.post("/groups", status_code=201)
async def create_group(body: GroupCreateRequest, db: AsyncSession = Depends(get_db)):
    """
    [POST] /groups
    Chức năng: Tạo một nhóm người dùng mới kèm gán danh sách quyền và thành viên ban đầu.
    """
    # Khối 1: Kiểm tra mã nhóm đã tồn tại
    existing = await db.execute(select(UserGroup).where(UserGroup.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Mã nhóm đã tồn tại.")

    # Khối 2: Khởi tạo nhóm mới
    group = UserGroup(
        id=f"g-{int(time.time() * 1000)}",
        code=body.code,
        name=body.name,
        description=body.description,
        memberCount=0,
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    db.add(group)
    await db.flush()

    # Khối 3: Gán danh sách quyền cho nhóm
    if body.permissions:
        for p_code in body.permissions:
            p_id = (await db.execute(select(Permission.id).where(Permission.code == p_code))).scalar_one_or_none()
            if p_id:
                db.add(GroupPermission(id=f"gp-{int(time.time() * 10000)}-{p_id}", group_id=group.id, permission_id=p_id))
    
    # Khối 4: Thêm danh sách thành viên ban đầu
    if body.member_ids is not None:
        for u_id in body.member_ids:
            ugm = UserGroupMember(
                id=f"ugm-{int(time.time() * 1000)}-{u_id}",
                group_id=group.id,
                user_id=u_id,
                joinedAt=datetime.utcnow().isoformat() + "Z"
            )
            db.add(ugm)
            
    await db.commit()
    
    return {
        "success": True,
        "message": "Tạo nhóm thành công!",
        "group": await parse_group_permissions(db, group)
    }

@router.put("/groups/{group_id}")
async def update_group(group_id: str, body: GroupUpdateRequest, db: AsyncSession = Depends(get_db)):
    """
    [PUT] /groups/{group_id}
    Chức năng: Cập nhật thông tin nhóm, đồng bộ danh sách quyền và tự động nâng/hạ vai trò (Role Promotion/Demotion) của các thành viên khi được thêm hoặc xóa khỏi nhóm.
    """
    # Khối 1: Tìm nhóm theo ID
    result = await db.execute(select(UserGroup).where(UserGroup.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Nhóm không tồn tại.")
        
    # Khối 2: Cập nhật mã nhóm (nếu có và không trùng)
    if body.code is not None and body.code != group.code:
        existing = await db.execute(select(UserGroup).where(UserGroup.code == body.code))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Mã nhóm đã tồn tại.")
        group.code = body.code
        
    # Khối 3: Kiểm tra trạng thái và bảo vệ nhóm GRP_ADMIN
    if body.status is not None:
        if group.code == "GRP_ADMIN" and body.status == "inactive":
            raise HTTPException(status_code=403, detail="Không thể khóa nhóm quản trị hệ thống gốc.")
        group.status = body.status
        
    if body.name is not None:
        group.name = body.name
    if body.description is not None:
        group.description = body.description

    # Khối 4: Cập nhật lại danh sách quyền của nhóm
    if body.permissions is not None:
        await db.execute(delete(GroupPermission).where(GroupPermission.group_id == group_id))
        for p_code in body.permissions:
            p_id = (await db.execute(select(Permission.id).where(Permission.code == p_code))).scalar_one_or_none()
            if p_id:
                db.add(GroupPermission(id=f"gp-{int(time.time() * 10000)}-{p_id}", group_id=group_id, permission_id=p_id))
        
    role_map = {
        "GRP_ADMIN": "admin",
        "GRP_TEACHER": "teacher",
        "GRP_STUDENT": "student",
        "GRP_REVIEWER": "reviewer"
    }
    mapped_role = role_map.get(group.code)
    fallback_role = group.code.split('_')[-1].lower() if '_' in group.code else group.code.lower()
    
    # Khối 5: Cập nhật thành viên và tính toán lại Vai trò (Role Promotion/Demotion)
    if body.member_ids is not None:
        # Lấy danh sách members cũ trước khi xóa
        old_members_result = await db.execute(
            select(UserGroupMember.user_id).where(UserGroupMember.group_id == group_id)
        )
        old_member_ids = set(r[0] for r in old_members_result.all())
        new_member_ids = set(body.member_ids)
        
        # Xác định users bị xóa khỏi nhóm
        removed_user_ids = old_member_ids - new_member_ids
        
        # Xóa toàn bộ members cũ và thêm members mới
        await db.execute(delete(UserGroupMember).where(UserGroupMember.group_id == group_id))
        for u_id in body.member_ids:
            ugm = UserGroupMember(
                id=f"ugm-{int(time.time() * 1000)}-{u_id}",
                group_id=group.id,
                user_id=u_id,
                joinedAt=datetime.utcnow().isoformat() + "Z"
            )
            db.add(ugm)
        
        await db.flush()  # Flush để các thay đổi trên có hiệu lực cho query bên dưới
        
        role_priority = ["admin", "reviewer", "teacher", "student"]
        
        # Nâng vai trò (Role Promotion) cho thành viên MỚI được thêm vào nhóm
        if mapped_role:
            for u_id in (new_member_ids - old_member_ids):
                user_result = await db.execute(select(User).where(User.id == u_id))
                user_obj = user_result.scalar_one_or_none()
                if user_obj:
                    # Chỉ nâng role nếu role mới có priority cao hơn
                    current_priority = role_priority.index(user_obj.role) if user_obj.role in role_priority else len(role_priority)
                    new_priority = role_priority.index(mapped_role) if mapped_role in role_priority else len(role_priority)
                    if new_priority < current_priority:
                        user_obj.role = mapped_role
        
        # Hạ vai trò (Role Demotion / Re-evaluation) cho thành viên BỊ XÓA khỏi nhóm
        for u_id in removed_user_ids:
            user_result = await db.execute(select(User).where(User.id == u_id))
            user_obj = user_result.scalar_one_or_none()
            if user_obj:
                # Tìm tất cả nhóm còn lại mà user này thuộc về
                remaining_groups_result = await db.execute(
                    select(UserGroup.code)
                    .join(UserGroupMember, UserGroupMember.group_id == UserGroup.id)
                    .where(UserGroupMember.user_id == u_id)
                )
                remaining_codes = [r[0] for r in remaining_groups_result.all()]
                
                # Xác định vai trò cao nhất từ các nhóm còn lại
                best_role = "user"  # Mặc định nếu không còn nhóm nào
                for priority_role in role_priority:
                    for g_code in remaining_codes:
                        if role_map.get(g_code) == priority_role:
                            best_role = priority_role
                            break
                    if best_role != "user":
                        break
                
                user_obj.role = best_role
            
    await db.commit()
    
    # Khối 6: Đếm lại số thành viên và trả về response
    count_result = await db.execute(
        select(func.count(func.distinct(UserGroupMember.user_id)))
        .where(UserGroupMember.group_id == group_id)
    )
    actual_count = count_result.scalar()
    
    g_dict = await parse_group_permissions(db, group)
    g_dict["memberCount"] = actual_count
    
    return {
        "success": True,
        "message": "Cập nhật thông tin thành công!",
        "group": g_dict
    }

@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, db: AsyncSession = Depends(get_db)):
    """
    [DELETE] /groups/{group_id}
    Chức năng: Xóa một nhóm người dùng khỏi CSDL (Có bảo vệ nhóm quản trị gốc GRP_ADMIN).
    """
    result = await db.execute(select(UserGroup).where(UserGroup.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Nhóm không tồn tại.")
        
    if group.code in ["GRP_ADMIN"]:
        raise HTTPException(status_code=403, detail="Không thể xóa nhóm quản trị hệ thống gốc.")
        
    await db.delete(group)
    await db.commit()
    return {
        "success": True,
        "message": "Đã xóa nhóm thành công!"
    }

@router.get("/groups/{group_id}/members")
async def list_group_members(group_id: str, db: AsyncSession = Depends(get_db)):
    """
    [GET] /groups/{group_id}/members
    Chức năng: Truy vấn danh sách toàn bộ người dùng thuộc về một nhóm cụ thể.
    """
    result = await db.execute(select(UserGroup).where(UserGroup.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Nhóm không tồn tại.")
        
    user_result = await db.execute(
        select(User)
        .join(UserGroupMember, User.id == UserGroupMember.user_id)
        .where(UserGroupMember.group_id == group_id)
        .distinct()
    )
    users = user_result.scalars().all()
    
    return {
        "success": True,
        "data": [UserResponse.model_validate(u).model_dump() for u in users]
    }

# ==============================================================================
# 🛡️ PHÂN HỆ 4: CHÍNH SÁCH BẢO MẬT VÀ NHẬT KÝ TRUY CẬP (SECURITY & AUDIT LOGS)
# ==============================================================================

@router.get("/security/policy")
async def get_security_policy(db: AsyncSession = Depends(get_db)):
    """
    [GET] /security/policy
    Chức năng: Lấy cấu hình chính sách bảo mật hệ thống (Độ dài mật khẩu, thời gian hết hạn phiên, Captcha, 2FA...).
    Tự động khởi tạo cấu hình mặc định nếu chưa tồn tại trong CSDL.
    """
    result = await db.execute(select(SecurityPolicy).where(SecurityPolicy.id == "default"))
    policy = result.scalar_one_or_none()
    
    if not policy:
        # Tự động tạo chính sách mặc định nếu lần đầu truy cập
        policy = SecurityPolicy(id="default", updatedAt=datetime.utcnow().isoformat() + "Z")
        db.add(policy)
        await db.commit()
        await db.refresh(policy)
        
    return {
        "success": True,
        "data": SecurityPolicyResponse.model_validate(policy).model_dump()
    }

@router.put("/security/policy")
async def update_security_policy(body: SecurityPolicyUpdate, db: AsyncSession = Depends(get_db)):
    """
    [PUT] /security/policy
    Chức năng: Cập nhật các thông số trong chính sách bảo mật hệ thống.
    """
    result = await db.execute(select(SecurityPolicy).where(SecurityPolicy.id == "default"))
    policy = result.scalar_one_or_none()
    
    if not policy:
        policy = SecurityPolicy(id="default", updatedAt=datetime.utcnow().isoformat() + "Z")
        db.add(policy)
        
    if body.minPasswordLength is not None:
        policy.minPasswordLength = body.minPasswordLength
    if body.requireUpperCase is not None:
        policy.requireUpperCase = body.requireUpperCase
    if body.requireSpecialChar is not None:
        policy.requireSpecialChar = body.requireSpecialChar
    if body.passwordExpiryDays is not None:
        policy.passwordExpiryDays = body.passwordExpiryDays
    if body.sessionTimeoutMinutes is not None:
        policy.sessionTimeoutMinutes = body.sessionTimeoutMinutes
    if body.maxLoginFailures is not None:
        policy.maxLoginFailures = body.maxLoginFailures
    if body.enableCaptchaOnFail is not None:
        policy.enableCaptchaOnFail = body.enableCaptchaOnFail
    if body.enable2FAForAdmin is not None:
        policy.enable2FAForAdmin = body.enable2FAForAdmin
        
    policy.updatedAt = datetime.utcnow().isoformat() + "Z"
    await db.commit()
    await db.refresh(policy)
    
    return {
        "success": True,
        "message": "Cập nhật chính sách bảo mật thành công!",
        "data": SecurityPolicyResponse.model_validate(policy).model_dump()
    }

@router.get("/audit-logs")
async def list_audit_logs(db: AsyncSession = Depends(get_db)):
    """
    [GET] /audit-logs
    Chức năng: Lấy danh sách lịch sử nhật ký bảo mật/truy cập (Audit Logs) sắp xếp theo thời gian mới nhất.
    """
    result = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()))
    logs = result.scalars().all()
    return {
        "success": True,
        "data": [AuditLogResponse.model_validate(log).model_dump() for log in logs]
    }

@router.post("/audit-logs", status_code=201)
async def create_audit_log(body: AuditLogCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """
    [POST] /audit-logs
    Chức năng: Ghi nhận một sự kiện nhật ký bảo mật mới vào hệ thống.
    Đặc điểm: Tự động trích xuất IP thực của người dùng qua HTTP Header `X-Forwarded-For` hoặc `request.client.host`.
    """
    # Khối 1: Xác định địa chỉ IP thực của Client
    client_ip = request.client.host if request.client else "127.0.0.1"
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        
    # Khối 2: Khởi tạo bản ghi AuditLog
    log = AuditLog(
        id=f"log-{int(time.time() * 1000)}",
        user=body.user,
        action=body.action,
        timestamp=datetime.utcnow().isoformat() + "Z",
        level=body.level or "info",
        ip=body.ip if body.ip and body.ip != "127.0.0.1" else client_ip,
        details=body.details
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return {
        "success": True,
        "message": "Đã ghi nhật ký",
        "data": AuditLogResponse.model_validate(log).model_dump()
    }
