"""
Auth routes — Login, Register, User management.
"""
import time
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

router = APIRouter(tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("/permissions")
async def list_permissions(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả các quyền hệ thống."""
    result = await db.execute(select(Permission))
    perms = result.scalars().all()
    return {
        "success": True,
        "data": [{"code": p.code, "name": p.name, "module": p.module} for p in perms if not p.code.endswith(".*")]
    }


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Đăng nhập và nhận JWT token."""
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không chính xác.")

    if user.status != "active":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa hoặc vô hiệu hóa.")

    # Fetch groups and permissions
    ugm_result = await db.execute(
        select(UserGroup.id, UserGroup.code, UserGroup.name)
        .join(UserGroupMember, UserGroupMember.group_id == UserGroup.id)
        .where(UserGroupMember.user_id == user.id)
    )
    user_groups = []
    for r in ugm_result.all():
        perms = await get_group_permissions(db, r[0])
        user_groups.append({"id": r[0], "code": r[1], "name": r[2], "permissions": perms})

    token_data = {"sub": user.id, "username": user.username, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

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
        },
    }


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Đăng ký tài khoản mới."""
    # Check existing
    existing = await db.execute(
        select(User).where((User.username == body.username) | (User.email == body.email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Tên đăng nhập hoặc email đã tồn tại.")

    user = User(
        id=f"u-{int(time.time() * 1000)}",
        username=body.username.lower().strip(),
        email=body.email,
        fullName=body.fullName,
        password_hash=pwd_context.hash(body.password),
        role=body.role or "teacher",
        status="active",
        createdAt=datetime.utcnow().isoformat() + "Z",
        position=body.position
    )
    db.add(user)
    
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


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách người dùng."""
    result = await db.execute(select(User))
    users = result.scalars().all()
    
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
    """Cập nhật thông tin người dùng."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")
        
    if body.fullName is not None:
        user.fullName = body.fullName
    if body.email is not None:
        user.email = body.email
    if body.role is not None:
        user.role = body.role
    if body.position is not None:
        user.position = body.position
    if body.status is not None:
        if user.username == "admin" and body.status != "active":
            raise HTTPException(status_code=403, detail="Không thể khóa tài khoản quản trị hệ thống gốc.")
        user.status = body.status
    if body.password is not None:
        user.password_hash = pwd_context.hash(body.password)
        
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
        
        # Đồng bộ role dựa trên nhóm được gán (ưu tiên: admin > reviewer > teacher)
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
        
        # Tìm role có priority cao nhất
        best_role = "user"  # Mặc định nếu không thuộc nhóm nào
        for priority_role in role_priority:
            for g_code in group_codes:
                if role_map.get(g_code) == priority_role:
                    best_role = priority_role
                    break
            if best_role != "user":
                break
        
        if body.role is None:
            user.role = best_role
            
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
    """Xóa người dùng khỏi hệ thống."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")
        
    # Prevent deletion of admin/teacher01 or self if needed (hardcode safety for seed users here if desired)
    if user.username in ["admin"]:
        raise HTTPException(status_code=403, detail="Không thể xóa tài khoản quản trị hệ thống gốc.")
        
    await db.delete(user)
    await db.commit()
    return {
        "success": True,
        "message": "Đã xóa người dùng thành công!"
    }


@router.put("/users/{user_id}/password")
async def change_password(user_id: str, body: ChangePasswordRequest, db: AsyncSession = Depends(get_db)):
    """Đổi mật khẩu người dùng."""
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


import json

async def get_group_permissions(db, group_id: str):
    perm_result = await db.execute(
        select(Permission.code)
        .join(GroupPermission, GroupPermission.permission_id == Permission.id)
        .where(GroupPermission.group_id == group_id)
    )
    return [r[0] for r in perm_result.all()]

async def parse_group_permissions(db, group: UserGroup):
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
    """Lấy danh sách nhóm người dùng."""
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
    """Tạo mới nhóm người dùng."""
    existing = await db.execute(select(UserGroup).where(UserGroup.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Mã nhóm đã tồn tại.")

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
    if body.permissions:
        for p_code in body.permissions:
            p_id = (await db.execute(select(Permission.id).where(Permission.code == p_code))).scalar_one_or_none()
            if p_id:
                db.add(GroupPermission(id=f"gp-{int(time.time() * 10000)}-{p_id}", group_id=group.id, permission_id=p_id))
    
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
    """Cập nhật thông tin nhóm."""
    result = await db.execute(select(UserGroup).where(UserGroup.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Nhóm không tồn tại.")
        
    if body.code is not None and body.code != group.code:
        existing = await db.execute(select(UserGroup).where(UserGroup.code == body.code))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Mã nhóm đã tồn tại.")
        group.code = body.code
        
    if body.status is not None:
        if group.code == "GRP_ADMIN" and body.status == "inactive":
            raise HTTPException(status_code=403, detail="Không thể khóa nhóm quản trị hệ thống gốc.")
        group.status = body.status
        
    if body.name is not None:
        group.name = body.name
    if body.description is not None:
        group.description = body.description
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
        
        # Đồng bộ role cho users MỚI thêm vào nhóm
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
        
        # Đồng bộ role cho users BỊ XÓA khỏi nhóm
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
                
                # Xác định role cao nhất từ các nhóm còn lại
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
    """Xóa nhóm khỏi hệ thống."""
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
    """Lấy danh sách người dùng thuộc nhóm."""
    result = await db.execute(select(UserGroup).where(UserGroup.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Nhóm không tồn tại.")
        
    # Chỉ lấy users thực sự có bản ghi trong bảng user_group_members
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

# ----------------- SECURITY POLICY & AUDIT LOGS -----------------

@router.get("/security/policy")
async def get_security_policy(db: AsyncSession = Depends(get_db)):
    """Lấy cấu hình chính sách bảo mật."""
    result = await db.execute(select(SecurityPolicy).where(SecurityPolicy.id == "default"))
    policy = result.scalar_one_or_none()
    
    if not policy:
        # Create default if not exists
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
    """Cập nhật cấu hình chính sách bảo mật."""
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
    """Lấy danh sách nhật ký bảo mật."""
    result = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()))
    logs = result.scalars().all()
    return {
        "success": True,
        "data": [AuditLogResponse.model_validate(log).model_dump() for log in logs]
    }

@router.post("/audit-logs", status_code=201)
async def create_audit_log(body: AuditLogCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Tạo mới nhật ký bảo mật."""
    
    # Capture real client IP
    client_ip = request.client.host if request.client else "127.0.0.1"
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        
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
