"""
SQLAlchemy ORM models for the Auth Service.
Tables: users
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Boolean, Text, Integer
from backend.shared.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(255), primary_key=True)  # Khóa chính: ID định danh duy nhất của người dùng
    username = Column(String(100), unique=True, nullable=False)  # Tên đăng nhập (duy nhất)
    email = Column(String(255), unique=True, nullable=False)  # Địa chỉ email (duy nhất)
    fullName = Column(String(255), nullable=False)  # Họ và tên đầy đủ của người dùng
    password_hash = Column(String(255), nullable=False)  # Mật khẩu đã được mã hóa (Hash)
    role = Column(String(50), default="teacher")  # Vai trò chính của người dùng (vd: admin, reviewer, teacher, student)
    position = Column(String(100), nullable=True)  # Chức vụ hiện tại (vd: Trưởng phòng, Giáo viên)
    status = Column(String(50), default="active")  # Trạng thái tài khoản (vd: active, inactive, locked)
    createdAt = Column(String(100), nullable=False)  # Thời gian tạo tài khoản

class UserGroupMember(Base):
    __tablename__ = "user_group_members"

    id = Column(String(255), primary_key=True)  # Khóa chính: ID định danh bản ghi liên kết
    # Khóa ngoại liên kết tới id của bảng user_groups (Bảng Nhóm người dùng)
    group_id = Column(String(255), nullable=False)
    # Khóa ngoại liên kết tới id của bảng users (Bảng Người dùng)
    user_id = Column(String(255), nullable=False)
    joinedAt = Column(String(100), nullable=False)  # Thời gian người dùng tham gia vào nhóm

class UserGroup(Base):
    __tablename__ = "user_groups"

    id = Column(String(255), primary_key=True)  # Khóa chính: ID định danh duy nhất của nhóm
    code = Column(String(100), unique=True, nullable=False)  # Mã nhóm (duy nhất, dùng làm định danh rút gọn)
    name = Column(String(255), nullable=False)  # Tên hiển thị của nhóm
    description = Column(Text, nullable=True)  # Mô tả chi tiết về nhóm
    memberCount = Column(Integer, default=0)  # Tổng số lượng thành viên hiện tại trong nhóm
    status = Column(String(50), default="active")  # Trạng thái của nhóm (vd: active, inactive)
    createdAt = Column(String(100), nullable=False)  # Thời gian khởi tạo nhóm

class SecurityPolicy(Base):
    __tablename__ = "security_policies"

    id = Column(String(255), primary_key=True, default="default")  # Khóa chính: ID của chính sách (mặc định là 'default')
    minPasswordLength = Column(Integer, default=8)  # Độ dài tối thiểu của mật khẩu
    requireUpperCase = Column(Boolean, default=True)  # Yêu cầu phải có chữ viết hoa trong mật khẩu
    requireSpecialChar = Column(Boolean, default=True)  # Yêu cầu phải có ký tự đặc biệt trong mật khẩu
    passwordExpiryDays = Column(Integer, default=90)  # Số ngày hết hạn mật khẩu (bắt buộc đổi)
    sessionTimeoutMinutes = Column(Integer, default=30)  # Thời gian (phút) phiên đăng nhập hết hạn nếu không hoạt động
    maxLoginFailures = Column(Integer, default=5)  # Số lần đăng nhập sai tối đa trước khi khóa tài khoản
    enableCaptchaOnFail = Column(Boolean, default=True)  # Bật Captcha sau khi đăng nhập sai nhiều lần
    enable2FAForAdmin = Column(Boolean, default=False)  # Yêu cầu bảo mật 2 lớp (2FA) đối với Admin
    updatedAt = Column(String(100), nullable=False)  # Thời gian cập nhật chính sách lần cuối

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(255), primary_key=True)  # Khóa chính: ID định danh bản ghi nhật ký
    user = Column(String(255), nullable=False)  # Tên hoặc ID người dùng thực hiện hành động
    action = Column(String(255), nullable=False)  # Hành động đã thực hiện (vd: LOGIN, UPDATE_USER)
    timestamp = Column(String(100), nullable=False)  # Thời gian xảy ra hành động
    level = Column(String(50), default="info")  # Mức độ của log (vd: info, success, warning, danger)
    ip = Column(String(100), nullable=True)  # Địa chỉ IP của người dùng khi thực hiện hành động
    details = Column(Text, nullable=True)  # Chi tiết cụ thể của hành động (dữ liệu thay đổi, lỗi,...)

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(255), primary_key=True)  # Khóa chính: ID định danh duy nhất của quyền
    code = Column(String(100), unique=True, nullable=False)  # Mã quyền hạn (duy nhất, vd: questions.view, system.*)
    name = Column(String(255), nullable=False)  # Tên hiển thị của quyền hạn
    module = Column(String(100), nullable=False)  # Nhóm/Module chức năng chứa quyền hạn này (vd: Ngân hàng câu hỏi)
    description = Column(Text, nullable=True)  # Mô tả chi tiết về quyền hạn

class GroupPermission(Base):
    __tablename__ = "group_permissions"

    id = Column(String(255), primary_key=True)  # Khóa chính: ID định danh bản ghi liên kết
    # Khóa ngoại liên kết tới id của bảng user_groups (Bảng Nhóm người dùng)
    group_id = Column(String(255), nullable=False)
    # Khóa ngoại liên kết tới id của bảng permissions (Bảng Quyền hệ thống)
    permission_id = Column(String(255), nullable=False)
