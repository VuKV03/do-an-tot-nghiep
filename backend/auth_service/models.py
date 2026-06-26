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
    status = Column(String(50), default="active")  # active, inactive, locked
    createdAt = Column(String(100), nullable=False)

class UserGroup(Base):
    __tablename__ = "user_groups"

    id = Column(String(255), primary_key=True)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    memberCount = Column(Integer, default=0)
    permissions = Column(Text, nullable=True)
    createdAt = Column(String(100), nullable=False)
