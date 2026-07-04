"""
SQLAlchemy ORM models for the Auth Service.
Tables: users
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Boolean, Text, Integer
from backend.shared.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(255), primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    fullName = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="teacher")  # admin, reviewer, teacher, student
    position = Column(String(100), nullable=True) # Chức vụ
    status = Column(String(50), default="active")  # active, inactive, locked
    createdAt = Column(String(100), nullable=False)

class UserGroupMember(Base):
    __tablename__ = "user_group_members"

    id = Column(String(255), primary_key=True)
    group_id = Column(String(255), nullable=False)
    user_id = Column(String(255), nullable=False)
    joinedAt = Column(String(100), nullable=False)

class UserGroup(Base):
    __tablename__ = "user_groups"

    id = Column(String(255), primary_key=True)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    memberCount = Column(Integer, default=0)
    permissions = Column(Text, nullable=True)
    status = Column(String(50), default="active")
    createdAt = Column(String(100), nullable=False)

class SecurityPolicy(Base):
    __tablename__ = "security_policies"

    id = Column(String(255), primary_key=True, default="default")
    minPasswordLength = Column(Integer, default=8)
    requireUpperCase = Column(Boolean, default=True)
    requireSpecialChar = Column(Boolean, default=True)
    passwordExpiryDays = Column(Integer, default=90)
    sessionTimeoutMinutes = Column(Integer, default=30)
    maxLoginFailures = Column(Integer, default=5)
    enableCaptchaOnFail = Column(Boolean, default=True)
    enable2FAForAdmin = Column(Boolean, default=False)
    updatedAt = Column(String(100), nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(255), primary_key=True)
    user = Column(String(255), nullable=False)
    action = Column(String(255), nullable=False)
    timestamp = Column(String(100), nullable=False)
    level = Column(String(50), default="info") # info, success, warning, danger
    ip = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
