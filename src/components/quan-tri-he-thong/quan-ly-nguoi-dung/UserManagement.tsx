import React, { useState, useMemo } from 'react';
import {
  Table,
  Input,
  Button,
  Select,
  Modal,
  Tag,
  Form,
  Space,
  Popconfirm,
  Alert,
  message,
  Empty,
  Tooltip,
  Row,
  Col,
  Pagination,
  DatePicker,
  Radio,
  Dropdown
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  UsergroupAddOutlined,
  QuestionCircleFilled,
  MoreOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { SystemUser, AuditLog } from '../../../types';
import axios from 'axios';
import dayjs from 'dayjs';
import { subjectCategoryApi, type SubjectCategoryAPI } from '../../../services/danhMucApi';

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api';

interface UserGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  memberCount: number;
  permissions: string[];
}

interface SecurityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  level: string;
  ip: string;
  details: string;
}

interface UserManagementProps {
  onAddAuditLog: (log: AuditLog) => void;
  setSecurityLogs: React.Dispatch<React.SetStateAction<SecurityLog[]>>;
}

export default function UserManagement({ onAddAuditLog, setSecurityLogs }: UserManagementProps) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchFullName, setSearchFullName] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Modals for Users
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<SystemUser | null>(null);
  const [userForm] = Form.useForm();

  const [subjects, setSubjects] = useState<SubjectCategoryAPI[]>([]);
  const [allGroups, setAllGroups] = useState<UserGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<UserGroup[]>([]);
  const [defaultGroupId, setDefaultGroupId] = useState<string | null>(null);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [tempSelectedGroupIds, setTempSelectedGroupIds] = useState<React.Key[]>([]);

  const logSecurityAction = async (action: string, level: string, details: string) => {
    try {
      const logRes = await axios.post(`${API_URL}/auth/audit-logs`, {
        user: 'admin_panel',
        action,
        level,
        ip: '',
        details
      });
      if (logRes.data.success && logRes.data.data) {
        setSecurityLogs(prev => [logRes.data.data, ...prev]);
      }
    } catch (err) {
      console.error('Lỗi khi ghi log bảo mật:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/auth/users`);
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      message.error('Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await subjectCategoryApi.list();
      if (res.data) setSubjects(res.data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/groups`);
      if (res.data && res.data.success) {
        setAllGroups(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  React.useEffect(() => {
    fetchUsers();
    fetchSubjects();
    fetchGroups();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchUsername = u.username.toLowerCase().includes(searchUsername.trim().toLowerCase());
      const matchFullName = u.fullName.toLowerCase().includes(searchFullName.trim().toLowerCase());
      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchUsername && matchFullName && matchRole;
    });
  }, [users, searchUsername, searchFullName, userRoleFilter]);

  const handleOpenCreateUser = () => {
    setUserModalMode('create');
    setEditingUserId(null);
    userForm.resetFields();
    setSelectedGroups([]);
    setDefaultGroupId(null);
    setIsUserModalOpen(true);
  };
  const handleOpenViewUser = (user: SystemUser) => {
    setViewingUser(user);
    setIsViewModalOpen(true);
  };

  const handleOpenEditUser = (user: SystemUser) => {
    setUserModalMode('edit');
    setEditingUserId(user.id);
    userForm.setFieldsValue({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      position: (user as any).position,
      phoneNumber: (user as any).phoneNumber,
      gender: (user as any).gender,
      subjects: (user as any).subjects,
      dateOfBirth: (user as any).dateOfBirth ? dayjs((user as any).dateOfBirth) : undefined
    });
    // Optional: Load user's selected groups/subjects if available in SystemUser
    setSelectedGroups((user as any).groups || []);
    setDefaultGroupId((user as any).groups && (user as any).groups.length > 0 ? (user as any).groups[0].id : null);
    setIsUserModalOpen(true);
  };

  const handleSaveUserForm = () => {
    userForm.validateFields().then(async values => {
      try {
        if (userModalMode === 'create') {
          // Generate a temporary password for new users
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
          let tempPass = '';
          for (let i = 0; i < 10; i++) {
            tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          // Generate username from fullName
          let generatedUsername = '';
          if (values.fullName) {
            const parts = values.fullName.trim().split(/\s+/);
            if (parts.length === 1) {
              generatedUsername = parts[0].toLowerCase();
            } else {
              const lastName = parts[parts.length - 1].toLowerCase();
              const initials = parts.slice(0, parts.length - 1).map((p: string) => p[0].toLowerCase()).join('');
              generatedUsername = `${lastName}${initials}`;
            }

            // Remove diacritics
            generatedUsername = generatedUsername
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/đ/g, "d")
              .replace(/Đ/g, "d");

            // Ensure no conflict with existing
            let baseUsername = generatedUsername;
            let counter = 2;
            while (users.some(u => u.username === generatedUsername)) {
              generatedUsername = `${baseUsername}${counter}`;
              counter++;
            }
          }

          const finalUsername = generatedUsername || `user_${Date.now()}`;
          const res = await axios.post(`${API_URL}/auth/register`, {
            username: finalUsername,
            email: values.email,
            fullName: values.fullName,
            password: tempPass,
            role: values.role || 'user',
            dateOfBirth: values.dateOfBirth,
            phoneNumber: values.phoneNumber,
            gender: values.gender,
            subjects: values.subjects,
            groups: selectedGroups.map(g => g.id),
            defaultGroup: defaultGroupId,
            position: values.position
          });

          if (res.data.success) {
            await fetchUsers(); // Refresh the list

            // Add to global Audit Logs
            onAddAuditLog({
              id: `log-sec-${Date.now()}`,
              user: 'Quản trị viên',
              action: 'Tạo người dùng',
              timestamp: new Date().toISOString(),
              details: `Đã tạo tài khoản cán bộ mới: ${values.fullName} (@${finalUsername}, Quyền: ${values.role})`
            });

            // Add to security log
            await logSecurityAction(
              'Tạo tài khoản cán bộ',
              'success',
              `Thêm mới tài khoản chuyên viên ${values.fullName} thành công.`
            );

            message.success(`Kích hoạt thành công tài khoản cán bộ: ${values.fullName}`);
            Modal.success({
              title: 'MẬT KHẨU TẠM THỜI',
              content: (
                <div>
                  <p>Tài khoản <strong>@{finalUsername}</strong> đã được tạo thành công.</p>
                  <p>Mật khẩu tạm thời: <code className="bg-slate-100 p-1 rounded font-bold">{tempPass}</code></p>
                  <p className="text-xs mt-2 text-slate-500">Hãy yêu cầu người dùng đổi mật khẩu trong lần đăng nhập đầu tiên.</p>
                </div>
              )
            });
          }
        } else {
          // Edit existing user
          const res = await axios.put(`${API_URL}/auth/users/${editingUserId}`, {
            fullName: values.fullName,
            email: values.email,
            role: values.role || 'user',
            status: values.status,
            dateOfBirth: values.dateOfBirth,
            phoneNumber: values.phoneNumber,
            gender: values.gender,
            subjects: values.subjects,
            groups: selectedGroups.map(g => g.id),
            defaultGroup: defaultGroupId,
            position: values.position
          });

          if (res.data.success) {
            await fetchUsers(); // Refresh list

            onAddAuditLog({
              id: `log-sec-${Date.now()}`,
              user: 'Quản trị viên',
              action: 'Sửa người dùng',
              timestamp: new Date().toISOString(),
              details: `Đã thay đổi thông tin người dùng: @${values.username}`
            });

            message.success('Cập nhật thông tin cán bộ thành công.');
          }
        }
        setIsUserModalOpen(false);
      } catch (err: any) {
        console.error('Error saving user:', err);
        message.error(err.response?.data?.detail || 'Đã xảy ra lỗi khi lưu thông tin người dùng.');
      }
    });
  };

  const handleDeleteUser = async (user: SystemUser) => {
    try {
      const res = await axios.delete(`${API_URL}/auth/users/${user.id}`);
      if (res.data.success) {
        await fetchUsers(); // Refresh list

        onAddAuditLog({
          id: `log-sec-${Date.now()}`,
          user: 'Quản trị viên',
          action: 'Xóa người dùng',
          timestamp: new Date().toISOString(),
          details: `Đã thu hồi tài khoản của: ${user.fullName} (@${user.username})`
        });

        await logSecurityAction(
          'Xóa tài khoản',
          'warning',
          `Đã xóa tài khoản @${user.username} khỏi hệ thống theo yêu cầu của hội đồng.`
        );

        message.success(`Đã gỡ quyền truy cập của cán bộ: ${user.fullName}`);
      }
    } catch (err: any) {
      console.error('Error deleting user:', err);
      message.error(err.response?.data?.detail || 'Đã xảy ra lỗi khi xóa người dùng.');
    }
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất một tài khoản để xóa.');
      return;
    }

    const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));

    // Check if any selected user is in QTHT group or is admin
    const hasAdmin = selectedUsers.some(u => {
      if (u.username === 'admin' || u.role === 'admin') return true;
      const groups = (u as any).groups;
      if (groups && Array.isArray(groups)) {
        return groups.some((g: any) =>
          g.code === 'QTHT' ||
          g.name === 'QTHT' ||
          g.name.toLowerCase().includes('quản trị hệ thống') ||
          g.name.toLowerCase().includes('qtht')
        );
      }
      return false;
    });

    if (hasAdmin) {
      message.error('Không cho phép xóa nhóm QTHT');
      return;
    }

    Modal.confirm({
      title: 'Xác nhận xóa tài khoản',
      content: `Bạn có chắc chắn muốn xóa ${selectedUserIds.length} tài khoản đã chọn không? Hành động này không thể hoàn tác.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await Promise.all(selectedUserIds.map(id => axios.delete(`${API_URL}/auth/users/${id}`)));

          await fetchUsers(); // Refresh list
          setSelectedUserIds([]); // Clear selection

          message.success(`Đã xóa thành công ${selectedUserIds.length} tài khoản.`);

          onAddAuditLog({
            id: `log-sec-${Date.now()}`,
            user: 'Quản trị viên',
            action: 'Xóa người dùng hàng loạt',
            timestamp: new Date().toISOString(),
            details: `Đã xóa ${selectedUserIds.length} tài khoản khỏi hệ thống.`
          });
        } catch (err: any) {
          console.error('Error deleting users:', err);
          message.error(err.response?.data?.detail || 'Đã xảy ra lỗi khi xóa người dùng.');
        }
      }
    });
  };

  const handleToggleUserStatus = async (user: SystemUser) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const statusText = newStatus === 'active' ? 'MỞ KHÓA' : 'TẠM KHÓA';

    try {
      const res = await axios.put(`${API_URL}/auth/users/${user.id}`, {
        status: newStatus
      });

      if (res.data.success) {
        await fetchUsers(); // Refresh list

        message.warning(`Đã chuyển trạng thái tài khoản của ${user.fullName} sang: ${statusText}`);

        await logSecurityAction(
          `${statusText} tài khoản`,
          newStatus === 'active' ? 'success' : 'danger',
          `Cập nhật trạng thái người dùng @${user.username} thành ${newStatus === 'active' ? 'Hoạt động' : 'Tạm khóa'}.`
        );
      }
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      message.error(err.response?.data?.detail || 'Không thể thay đổi trạng thái tài khoản.');
    }
  };

  const handleResetPassword = async (user: SystemUser) => {
    // Generate a temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let tempPass = '';
    for (let i = 0; i < 10; i++) {
      tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      const res = await axios.put(`${API_URL}/auth/users/${user.id}`, {
        password: tempPass
      });

      if (res.data.success) {
        Modal.success({
          title: 'ĐÃ THIẾT LẬP LẠI MẬT KHẨU TẠM THỜI',
          content: (
            <div className="space-y-3 pt-3 text-xs leading-relaxed text-slate-700">
              <p>Mã hóa lại cấu trúc an toàn mật khẩu cho tài khoản <strong>@{user.username}</strong> thành công.</p>
              <div className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-center my-3">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest mb-1">MẬT KHẨU TẠM THỜI</span>
                <code className="text-sm font-mono font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded tracking-wider">{tempPass}</code>
              </div>
              <Alert
                type="warning"
                showIcon
                title={<span className="text-[11px] font-bold">Hãy lưu lại thông tin này và yêu cầu cán bộ thay đổi mật khẩu sau lần đầu tiên đăng nhập lại hệ thống.</span>}
              />
            </div>
          ),
          okText: 'Hoàn tất, ghi nhận',
          centered: true
        });

        await logSecurityAction(
          'Reset Mật khẩu',
          'warning',
          `Yêu cầu làm mới khóa an toàn định danh cho người dùng @${user.username}.`
        );
      }
    } catch (err: any) {
      console.error('Error resetting password:', err);
      message.error(err.response?.data?.detail || 'Không thể đặt lại mật khẩu.');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <h1 className="text-[#1a3b70] text-lg font-bold uppercase m-0">Quản lý người dùng</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-5">
        <h2 className="text-[#1a3b70] font-bold mb-4 text-sm">Tìm kiếm thông tin</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mã người dùng/ tên đăng nhập</label>
            <Input
              placeholder="Nhập"
              className="rounded text-sm py-1.5"
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Họ và tên</label>
            <Input
              placeholder="Nhập"
              className="rounded text-sm py-1.5"
              value={searchFullName}
              onChange={e => setSearchFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nhóm người dùng</label>
            <Select
              value={userRoleFilter}
              onChange={setUserRoleFilter}
              className="w-full text-sm custom-select"
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'admin', label: 'Quản trị viên' },
                { value: 'reviewer', label: 'Ban thẩm định' },
                { value: 'teacher', label: 'Giáo viên bộ môn' }
              ]}
            />
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <Button
            type="primary"
            className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold rounded px-8"
          >
            Tìm kiếm
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-[#1a3b70] font-bold text-sm m-0">Kết quả tìm kiếm</h2>
          <div className="flex gap-2">
            <Button type="primary" className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold text-xs rounded" onClick={handleOpenCreateUser}>Thêm mới</Button>
            <Button className="border-[#1e40af] text-[#1e40af] font-semibold text-xs rounded" onClick={handleBulkDelete}>Xóa</Button>
            <Button className="border-[#1e40af] text-[#1e40af] font-semibold text-xs rounded">Xuất Excel</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-medium text-slate-700 border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-bold">
                <th className="py-3 px-4 text-left w-12">
                  <input
                    type="checkbox"
                    className="rounded text-[#1e40af] cursor-pointer"
                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUserIds(filteredUsers.map(u => u.id));
                      } else {
                        setSelectedUserIds([]);
                      }
                    }}
                  />
                </th>
                <th className="py-3 px-4 text-center w-16">STT</th>
                <th className="py-3 px-4 text-left">Mã người dùng<br />/tên đăng nhập</th>
                <th className="py-3 px-4 text-left">Họ và tên</th>
                <th className="py-3 px-4 text-left">Nhóm người dùng</th>
                <th className="py-3 px-4 text-left">Chức vụ</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                    Đang tải dữ liệu người dùng...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Empty description="Không tìm thấy thông tin tài khoản cán bộ nào phù hợp." />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        className="rounded text-[#1e40af] cursor-pointer"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(prev => [...prev, u.id]);
                          } else {
                            setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                          }
                        }}
                      />
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{index + 1}</td>
                    <td className="py-3 px-4 text-slate-600">{u.username}</td>
                    <td className="py-3 px-4 text-slate-600">{u.fullName}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {(u as any).groups && (u as any).groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(u as any).groups.map((g: any) => (
                            <span key={g.id} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px]">
                              {g.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Chưa phân nhóm</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{(u as any).position || 'Cán bộ'}</td>
                    <td className="py-3 px-4 text-center">
                      <Dropdown
                        disabled={u.username === 'admin'}
                        menu={{
                          items: [
                            {
                              key: 'active',
                              label: <span className="text-emerald-600 font-semibold text-xs">Đang hoạt động</span>,
                              onClick: () => { if (u.status !== 'active') handleToggleUserStatus(u); }
                            },
                            {
                              key: 'inactive',
                              label: <span className="text-red-500 font-semibold text-xs">Khóa</span>,
                              onClick: () => { if (u.status === 'active') handleToggleUserStatus(u); }
                            }
                          ]
                        }}
                        trigger={['click']}
                      >
                        <div className="cursor-pointer inline-flex items-center justify-center" title="Nhấp để thay đổi trạng thái">
                          {u.status === 'active' ? (
                            <span className="inline-flex items-center justify-center border border-emerald-500 text-emerald-600 px-3 py-1 rounded bg-white text-[11px] font-semibold w-28 hover:bg-emerald-50 transition-colors">
                              Đang hoạt động <span className="ml-1 text-[8px]">▼</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center border border-red-300 text-red-500 px-3 py-1 rounded bg-red-50 text-[11px] font-semibold w-28 hover:bg-red-100 transition-colors">
                              Khóa <span className="ml-1 text-[8px]">▼</span>
                            </span>
                          )}
                        </div>
                      </Dropdown>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Space size={12}>
                        <div
                          className="bg-emerald-50 text-emerald-600 p-1.5 rounded cursor-pointer hover:bg-emerald-100 transition-colors"
                          onClick={() => handleOpenViewUser(u)}
                          title="Xem chi tiết"
                        >
                          <EyeOutlined className="text-sm" />
                        </div>
                        <div
                          className="bg-blue-50 text-[#1e40af] p-1.5 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => handleOpenEditUser(u)}
                          title="Chỉnh sửa"
                        >
                          <EditOutlined className="text-sm" />
                        </div>
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: 'reset_pwd',
                                label: <span className="text-slate-600 font-medium text-xs">Khôi phục mật khẩu</span>,
                                icon: <KeyOutlined className="text-slate-400" />,
                                onClick: () => {
                                  Modal.confirm({
                                    title: 'Xác nhận khôi phục mật khẩu',
                                    content: `Bạn có chắc chắn muốn khôi phục mật khẩu cho người dùng ${u.fullName} (@${u.username})?`,
                                    okText: 'Đồng ý',
                                    cancelText: 'Hủy',
                                    onOk: () => handleResetPassword(u)
                                  });
                                }
                              },
                              {
                                key: 'delete',
                                label: <span className="text-red-500 font-medium text-xs">Xóa tài khoản</span>,
                                icon: <DeleteOutlined className="text-red-500" />,
                                disabled: u.username === 'admin',
                                onClick: () => {
                                  const groups = (u as any).groups;
                                  const isQTHT = u.role === 'admin' || (groups && Array.isArray(groups) && groups.some((g: any) =>
                                    g.code === 'QTHT' || g.name === 'QTHT' || g.name.toLowerCase().includes('quản trị hệ thống') || g.name.toLowerCase().includes('qtht')
                                  ));

                                  if (isQTHT) {
                                    message.error('Không cho phép xóa nhóm QTHT');
                                    return;
                                  }

                                  Modal.confirm({
                                    title: 'Xác nhận xóa tài khoản',
                                    content: `Bạn có chắc chắn muốn xóa tài khoản ${u.fullName} (@${u.username}) không? Hành động này không thể hoàn tác.`,
                                    okText: 'Xóa',
                                    okButtonProps: { danger: true },
                                    cancelText: 'Hủy',
                                    onOk: () => handleDeleteUser(u)
                                  });
                                }
                              }
                            ]
                          }}
                          trigger={['click']}
                          placement="bottomRight"
                        >
                          <MoreOutlined className="text-[#1e40af] cursor-pointer text-lg hover:bg-slate-100 rounded p-0.5" />
                        </Dropdown>
                      </Space>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white">
          <div className="text-[11px] text-slate-500 font-semibold tracking-wide">
            1 - {filteredUsers.length} / {filteredUsers.length} bản ghi
          </div>
          <Pagination
            size="small"
            total={filteredUsers.length}
            showSizeChanger
            showQuickJumper={false}
            defaultPageSize={10}
            pageSizeOptions={['10', '20', '50', '100']}
            locale={{ items_per_page: '/ trang' }}
          />
        </div>
      </div>

      {/* Foot disclaimer memo */}
      <Alert
        type="info"
        title={
          <span className="text-[11px] leading-relaxed block text-slate-600 font-medium select-none">
            📍 <strong>Mẹo quản trị:</strong> Mật khẩu tài khoản tạo mới sẽ mặc định tuân thủ theo <strong>Chính sách an toàn bảo mật</strong> đang kích hoạt. Hãy chuyển sang tab <strong>Chính sách</strong> để tăng cường các tiêu chuẩn chống mã độc.
          </span>
        }
      />
      {/* ============================================================== */}
      {/* DIALOGS: USER CREATE / EDIT FORM MODAL                         */}
      {/* ============================================================== */}
      <Modal
        title={
          <div className="text-xl font-bold text-slate-800">
            {userModalMode === 'create' ? 'Thêm mới thông tin người dùng' : 'Chỉnh sửa thông tin người dùng'}
          </div>
        }
        open={isUserModalOpen}
        forceRender
        onCancel={() => setIsUserModalOpen(false)}
        footer={
          <div className="flex justify-center gap-4 mt-6">
            <Button
              key="back"
              onClick={() => setIsUserModalOpen(false)}
              className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-32"
            >
              Đóng
            </Button>
            <Button
              key="submit"
              type="primary"
              onClick={handleSaveUserForm}
              className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold rounded px-8 w-32"
            >
              Lưu
            </Button>
          </div>
        }
        centered
        width={750}
        closeIcon={<span className="text-slate-500 hover:text-slate-700 text-lg font-bold">&times;</span>}
      >
        <Form
          form={userForm}
          layout="vertical"
          className="mt-6"
          initialValues={{ gender: 'Nam' }}
        >
          {/* Thông tin người dùng */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Thông tin người dùng</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <Form.Item
                name="fullName"
                label={<span className="text-sm text-slate-500 font-medium">Họ và tên <span className="text-red-500">*</span></span>}
                rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
              >
                <Input placeholder="Nhập" className="rounded py-1.5" />
              </Form.Item>

              <Form.Item
                name="dateOfBirth"
                label={<span className="text-sm text-slate-500 font-medium">Ngày sinh</span>}
              >
                <DatePicker placeholder="dd/mm/yyyy" format="DD/MM/YYYY" className="w-full rounded py-1.5" />
              </Form.Item>

              <Form.Item
                name="phoneNumber"
                label={<span className="text-sm text-slate-500 font-medium">Số điện thoại</span>}
                rules={[
                  { max: 12, message: 'Số điện thoại không được vượt quá 12 ký tự!' },
                  { pattern: /^[0-9+]*$/, message: 'Số điện thoại chỉ được chứa chữ số và dấu cộng!' }
                ]}
              >
                <Input placeholder="Nhập" className="rounded py-1.5" />
              </Form.Item>

              <Form.Item
                name="gender"
                label={<span className="text-sm text-slate-500 font-medium">Giới tính</span>}
              >
                <Select
                  options={[
                    { value: 'Nam', label: 'Nam' },
                    { value: 'Nữ', label: 'Nữ' },
                    { value: 'Khác', label: 'Khác' }
                  ]}
                  className="rounded"
                />
              </Form.Item>

              <Form.Item
                name="position"
                label={<span className="text-sm text-slate-500 font-medium">Chức vụ</span>}
              >
                <Input placeholder="Nhập chức vụ" className="rounded py-1.5" />
              </Form.Item>
            </div>

            <Form.Item
              name="email"
              label={<span className="text-sm text-slate-500 font-medium">Email</span>}
              rules={[
                { type: 'email', message: 'Email không hợp lệ!' }
              ]}
              className="mt-2"
            >
              <Input placeholder="abc@gmail.com" className="rounded py-1.5" />
            </Form.Item>

            <Form.Item
              name="subjects"
              label={<span className="text-sm text-slate-500 font-medium">Môn học</span>}
              className="mt-2"
            >
              <Select
                mode="multiple"
                placeholder="Chọn môn học"
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
                className="rounded"
              />
            </Form.Item>
          </div>

          {/* Nhóm người dùng */}
          <div className="mb-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 m-0">Nhóm người dùng</h3>
              <Button
                type="primary"
                className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-medium rounded"
                onClick={() => {
                  setTempSelectedGroupIds(selectedGroups.map(g => g.id));
                  setIsAddGroupModalOpen(true);
                }}
              >
                Thêm nhóm người dùng
              </Button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-slate-700 table-auto">
                <thead>
                  <tr className="border-b border-slate-200 text-left font-bold text-slate-800">
                    <th className="py-3 px-4 w-24 text-center">Mặc định</th>
                    <th className="py-3 px-4 w-16 text-center">STT</th>
                    <th className="py-3 px-4 w-32">Mã nhóm</th>
                    <th className="py-3 px-4">Tên nhóm</th>
                    <th className="py-3 px-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Chưa có nhóm người dùng nào được thêm.
                      </td>
                    </tr>
                  ) : (
                    selectedGroups.map((group, index) => (
                      <tr key={group.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-center">
                          <Radio
                            checked={defaultGroupId === group.id}
                            onChange={() => setDefaultGroupId(group.id)}
                            className="custom-radio"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">{index + 1}</td>
                        <td className="py-3 px-4">{group.code}</td>
                        <td className="py-3 px-4">{group.name}</td>
                        <td className="py-3 px-4 text-center">
                          <div
                            className="bg-red-50 text-red-500 p-1.5 rounded inline-flex cursor-pointer hover:bg-red-100"
                            onClick={() => {
                              const newGroups = selectedGroups.filter(g => g.id !== group.id);
                              setSelectedGroups(newGroups);
                              if (defaultGroupId === group.id) {
                                setDefaultGroupId(newGroups.length > 0 ? newGroups[0].id : null);
                              }
                            }}
                          >
                            <DeleteOutlined />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="p-3 border-t border-slate-200 flex justify-between items-center bg-white text-xs text-slate-500">
                <span>1 - {selectedGroups.length} / {selectedGroups.length} bản ghi</span>
                <Pagination
                  size="small"
                  total={selectedGroups.length}
                  showSizeChanger={false}
                  defaultPageSize={10}
                />
              </div>
            </div>
          </div>
        </Form>
      </Modal>

      {/* Modal Thêm nhóm người dùng */}
      <Modal
        title={<div className="text-xl font-bold text-slate-800">Chọn nhóm người dùng</div>}
        open={isAddGroupModalOpen}
        onCancel={() => setIsAddGroupModalOpen(false)}
        width={600}
        centered
        footer={
          <div className="flex justify-center gap-4 mt-6">
            <Button
              onClick={() => setIsAddGroupModalOpen(false)}
              className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-32"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              onClick={() => {
                const newlySelected = allGroups.filter(g => tempSelectedGroupIds.includes(g.id));
                setSelectedGroups(newlySelected);
                if (!defaultGroupId && newlySelected.length > 0) {
                  setDefaultGroupId(newlySelected[0].id);
                } else if (newlySelected.length === 0) {
                  setDefaultGroupId(null);
                } else if (defaultGroupId && !newlySelected.find(g => g.id === defaultGroupId)) {
                  setDefaultGroupId(newlySelected[0].id);
                }
                setIsAddGroupModalOpen(false);
              }}
              className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold rounded px-8 w-32"
            >
              Xác nhận
            </Button>
          </div>
        }
      >
        <Table
          rowSelection={{
            selectedRowKeys: tempSelectedGroupIds,
            onChange: setTempSelectedGroupIds
          }}
          columns={[
            { title: 'Mã nhóm', dataIndex: 'code', key: 'code', width: 120 },
            { title: 'Tên nhóm', dataIndex: 'name', key: 'name' }
          ]}
          dataSource={allGroups}
          rowKey="id"
          size="middle"
          className="mt-4"
          pagination={{ pageSize: 5 }}
        />
      </Modal>

      {/* Modal Xem chi tiết người dùng */}
      <Modal
        title={<span className="text-[#1e40af] text-lg font-bold">THÔNG TIN CHI TIẾT NGƯỜI DÙNG</span>}
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={
          <Button type="primary" onClick={() => setIsViewModalOpen(false)} className="bg-[#1e40af] hover:bg-[#1e3a8a] rounded px-6">
            Đóng
          </Button>
        }
        width={700}
        centered
        className="rounded-lg overflow-hidden"
      >
        {viewingUser && (
          <div className="py-4">
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <p className="mb-2"><span className="text-slate-500 font-medium">Họ và tên:</span> <span className="font-semibold text-slate-800">{viewingUser.fullName}</span></p>
                <p className="mb-2"><span className="text-slate-500 font-medium">Mã đăng nhập:</span> <span className="font-semibold text-slate-800">{viewingUser.username}</span></p>
                <p className="mb-2"><span className="text-slate-500 font-medium">Email:</span> <span className="font-semibold text-slate-800">{viewingUser.email || 'Chưa cập nhật'}</span></p>
                <p className="mb-2"><span className="text-slate-500 font-medium">Số điện thoại:</span> <span className="font-semibold text-slate-800">{(viewingUser as any).phoneNumber || 'Chưa cập nhật'}</span></p>
              </Col>
              <Col span={12}>
                <p className="mb-2"><span className="text-slate-500 font-medium">Trạng thái:</span> 
                  {viewingUser.status === 'active' ? (
                    <span className="ml-2 px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200">Đang hoạt động</span>
                  ) : (
                    <span className="ml-2 px-2 py-0.5 rounded bg-red-50 text-red-500 text-xs font-semibold border border-red-200">Khóa</span>
                  )}
                </p>
                <p className="mb-2"><span className="text-slate-500 font-medium">Giới tính:</span> <span className="font-semibold text-slate-800">{(viewingUser as any).gender || 'Chưa cập nhật'}</span></p>
                <p className="mb-2"><span className="text-slate-500 font-medium">Ngày sinh:</span> <span className="font-semibold text-slate-800">{(viewingUser as any).dateOfBirth ? new Date((viewingUser as any).dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</span></p>
                <p className="mb-2"><span className="text-slate-500 font-medium">Chức vụ:</span> <span className="font-semibold text-slate-800">{(viewingUser as any).position || 'Cán bộ'}</span></p>
              </Col>
            </Row>

            <div className="mt-6">
              <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-2">Nhóm người dùng</h4>
              {(viewingUser as any).groups && (viewingUser as any).groups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(viewingUser as any).groups.map((g: any) => (
                    <span key={g.id} className="inline-block px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-sm font-medium">
                      {g.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 italic">Chưa được phân vào nhóm nào.</span>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-2">Môn học phụ trách</h4>
              {(viewingUser as any).subjects && (viewingUser as any).subjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(viewingUser as any).subjects.map((s: string) => {
                    const sub = subjects.find(sb => sb.id === s);
                    return (
                      <span key={s} className="inline-block px-3 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded text-sm font-medium">
                        {sub ? sub.name : s}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-slate-400 italic">Chưa có môn học nào.</span>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
