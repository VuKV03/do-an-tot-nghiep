"""
Pydantic schemas for the Auth Service.
"""
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr
from typing import Optional


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


class UpdateRequest(BaseModel):
    fullName: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    fullName: str
    role: str
    status: str
    createdAt: str

    model_config = {"from_attributes": True}
