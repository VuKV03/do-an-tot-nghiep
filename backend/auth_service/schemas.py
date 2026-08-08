"""
Pydantic schemas for the Auth Service.
"""
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import json


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool = True
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RegisterRequest(BaseModel):
    username: str
    email: str
    fullName: str
    password: str
    role: Optional[str] = "teacher"
    position: Optional[str] = None
    groups: Optional[list[str]] = None
    dateOfBirth: Optional[str] = None
    phoneNumber: Optional[str] = None
    gender: Optional[str] = None
    subjects: Optional[list[str]] = None


class UpdateRequest(BaseModel):
    fullName: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    position: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None
    groups: Optional[list[str]] = None
    dateOfBirth: Optional[str] = None
    phoneNumber: Optional[str] = None
    gender: Optional[str] = None
    subjects: Optional[list[str]] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class UserGroupInfo(BaseModel):
    id: str
    code: str
    name: str
class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    fullName: str
    role: str
    position: Optional[str] = None
    dateOfBirth: Optional[str] = None
    phoneNumber: Optional[str] = None
    gender: Optional[str] = None
    subjects: Optional[list[str]] = None
    status: str
    createdAt: str
    groups: Optional[list[UserGroupInfo]] = []
    passwordVersion: Optional[str] = None

    @field_validator('subjects', mode='before')
    def parse_subjects(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v

    model_config = {"from_attributes": True}

class GroupCreateRequest(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    permissions: Optional[list[str]] = []
    member_ids: Optional[list[str]] = None

class GroupUpdateRequest(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[list[str]] = None
    status: Optional[str] = None
    member_ids: Optional[list[str]] = None

class GroupResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    memberCount: int
    permissions: list[str]
    status: str
    createdAt: str

    model_config = {"from_attributes": True}

class SecurityPolicyUpdate(BaseModel):
    minPasswordLength: Optional[int] = None
    requireUpperCase: Optional[bool] = None
    requireSpecialChar: Optional[bool] = None
    passwordExpiryDays: Optional[int] = None
    sessionTimeoutMinutes: Optional[int] = None
    maxLoginFailures: Optional[int] = None
    enableCaptchaOnFail: Optional[bool] = None
    enable2FAForAdmin: Optional[bool] = None

class SecurityPolicyResponse(BaseModel):
    id: str
    minPasswordLength: int
    requireUpperCase: bool
    requireSpecialChar: bool
    passwordExpiryDays: int
    sessionTimeoutMinutes: int
    maxLoginFailures: int
    enableCaptchaOnFail: bool
    enable2FAForAdmin: bool
    updatedAt: str

    model_config = {"from_attributes": True}

class AuditLogCreate(BaseModel):
    user: str
    action: str
    level: Optional[str] = "info"
    ip: Optional[str] = None
    details: Optional[str] = None

class AuditLogResponse(BaseModel):
    id: str
    user: str
    action: str
    timestamp: str
    level: str
    ip: Optional[str] = None
    details: Optional[str] = None

    model_config = {"from_attributes": True}
