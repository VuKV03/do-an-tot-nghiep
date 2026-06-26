"""
Auth routes — Login, Register, User management.
"""
import time
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select
# pyrefly: ignore [missing-import]
from passlib.context import CryptContext

from backend.shared.database import get_db
from backend.auth_service.models import User, UserGroup
from backend.auth_service.schemas import (
    LoginRequest, RegisterRequest, UserResponse, UpdateRequest, ChangePasswordRequest,
    GroupCreateRequest, GroupUpdateRequest, GroupResponse
)
from backend.auth_service.jwt_handler import create_access_token, create_refresh_token

router = APIRouter(tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Đăng nhập và nhận JWT token."""
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không chính xác.")

    if user.status != "active":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa hoặc vô hiệu hóa.")

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
    )
    db.add(user)
    await db.commit()

    return {
        "success": True,
        "message": "Đăng ký tài khoản thành công!",
        "user": UserResponse.model_validate(user).model_dump(),
    }


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách người dùng."""
    result = await db.execute(select(User))
    users = result.scalars().all()
    return {
        "success": True,
        "count": len(users),
        "data": [UserResponse.model_validate(u).model_dump() for u in users],
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
    if body.status is not None:
        user.status = body.status
    if body.password is not None:
        user.password_hash = pwd_context.hash(body.password)
        
    await db.commit()
    return {
        "success": True,
        "message": "Cập nhật thông tin thành công!",
        "user": UserResponse.model_validate(user).model_dump()
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

def parse_group_permissions(group: UserGroup):
    perms = []
    if group.permissions:
        try:
            perms = json.loads(group.permissions)
        except:
            pass
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
    return {
        "success": True,
        "data": [parse_group_permissions(g) for g in groups],
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
        permissions=json.dumps(body.permissions) if body.permissions else "[]",
        memberCount=0,
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    db.add(group)
    await db.commit()
    
    return {
        "success": True,
        "message": "Tạo nhóm thành công!",
        "group": parse_group_permissions(group)
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
        
    if body.name is not None:
        group.name = body.name
    if body.description is not None:
        group.description = body.description
    if body.permissions is not None:
        group.permissions = json.dumps(body.permissions)
        
    await db.commit()
    return {
        "success": True,
        "message": "Cập nhật thông tin thành công!",
        "group": parse_group_permissions(group)
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
