"""
Auth routes — Group management.
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
from backend.auth_service.models import UserGroup, UserGroupMember
from backend.auth_service.schemas import GroupCreateRequest, GroupUpdateRequest

router = APIRouter(tags=["Groups"])

def to_group_dict(g: UserGroup):
    try:
        perms = json.loads(g.permissions) if g.permissions else []
    except:
        perms = []
    return {
        "id": g.id,
        "code": g.code,
        "name": g.name,
        "description": g.description,
        "memberCount": g.memberCount,
        "permissions": perms,
        "status": g.status,
        "createdAt": g.createdAt
    }

@router.get("/groups")
async def list_groups(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserGroup))
    groups = result.scalars().all()
    return {
        "success": True,
        "data": [to_group_dict(g) for g in groups],
    }

@router.post("/groups", status_code=201)
async def create_group(body: GroupCreateRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(UserGroup).where(UserGroup.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Mã nhóm đã tồn tại.")

    group = UserGroup(
        id=f"g-{int(time.time() * 1000)}",
        code=body.code,
        name=body.name,
        description=body.description,
        memberCount=len(body.member_ids) if body.member_ids else 0,
        permissions=json.dumps(body.permissions or []),
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    db.add(group)
    
    if body.member_ids:
        for user_id in body.member_ids:
            ugm = UserGroupMember(
                id=f"ugm-{int(time.time() * 1000)}-{user_id}",
                group_id=group.id,
                user_id=user_id,
                joinedAt=datetime.utcnow().isoformat() + "Z"
            )
            db.add(ugm)

    await db.commit()
    return {
        "success": True,
        "message": "Thêm nhóm mới thành công!",
        "group": to_group_dict(group),
    }

@router.put("/groups/{group_id}")
async def update_group(group_id: str, body: GroupUpdateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserGroup).where(UserGroup.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Nhóm không tồn tại.")
        
    if body.code is not None:
        group.code = body.code
    if body.name is not None:
        group.name = body.name
    if body.description is not None:
        group.description = body.description
    if body.permissions is not None:
        group.permissions = json.dumps(body.permissions)
    if body.status is not None:
        group.status = body.status
        
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

    await db.commit()
    return {
        "success": True,
        "message": "Cập nhật nhóm thành công!",
        "group": to_group_dict(group)
    }

@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserGroup).where(UserGroup.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Nhóm không tồn tại.")
        
    if group.code in ["GRP_ADMIN"]:
        raise HTTPException(status_code=403, detail="Không thể xóa nhóm quản trị gốc.")
        
    await db.delete(group)
    await db.commit()
    return {
        "success": True,
        "message": "Đã xóa nhóm thành công!"
    }
