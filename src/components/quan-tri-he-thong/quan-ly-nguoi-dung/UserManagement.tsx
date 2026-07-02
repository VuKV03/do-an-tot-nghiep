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
  Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons';
import { SystemUser, AuditLog } from '../../../types';
import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api';

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
  const [userSearchText, setUserSearchText] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');

  // Modals for Users
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm] = Form.useForm();

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

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.fullName.toLowerCase().includes(userSearchText.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearchText.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchText.toLowerCase());
      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      const matchStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, userSearchText, userRoleFilter, userStatusFilter]);

  const handleOpenCreateUser = () => {
    setUserModalMode('create');
    setEditingUserId(null);
    userForm.resetFields();
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: SystemUser) => {
    setUserModalMode('edit');
    setEditingUserId(user.id);
    userForm.setFieldsValue({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    });
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

          const res = await axios.post(`${API_URL}/auth/register`, {
            username: values.username.toLowerCase().trim(),
            email: values.email,
            fullName: values.fullName,
            password: tempPass,
            role: values.role
          });

          if (res.data.success) {
            await fetchUsers(); // Refresh the list

            // Add to global Audit Logs
            onAddAuditLog({
              id: `log-sec-${Date.now()}`,
              user: 'Quản trị viên',
              action: 'Tạo người dùng',
              timestamp: new Date().toISOString(),
              details: `Đã tạo tài khoản cán bộ mới: ${values.fullName} (@${values.username}, Quyền: ${values.role})`
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
                  <p>Tài khoản <strong>@{values.username}</strong> đã được tạo thành công.</p>
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
            role: values.role,
            status: values.status
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
      {/* Filters and Add user button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">

        <div className="flex flex-1 flex-col md:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Input
              placeholder="Tra cứu theo Họ và tên, tài khoản hoặc email..."
              prefix={<SearchOutlined className="text-slate-400" />}
              className="rounded-xl border-slate-200 text-xs font-semibold py-1.5"
              value={userSearchText}
              onChange={e => setUserSearchText(e.target.value)}
              allowClear
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Vai trò:</span>
            <Select
              value={userRoleFilter}
              onChange={setUserRoleFilter}
              className="w-36 text-xs font-semibold"
              options={[
                { value: 'all', label: 'Tất cả các quyền' },
                { value: 'admin', label: 'Quản trị viên (Admin)' },
                { value: 'reviewer', label: 'Ban thẩm định (Reviewer)' },
                { value: 'teacher', label: 'Giáo viên bộ môn (Teacher)' }
              ]}
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Trực trạng:</span>
            <Select
              value={userStatusFilter}
              onChange={setUserStatusFilter}
              className="w-32 text-xs font-semibold"
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'active', label: '🟢 Đang hoạt động' },
                { value: 'inactive', label: '🔴 Tạm khóa' }
              ]}
            />
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateUser}
          className="bg-[#002147] border-transparent text-white font-black text-xs rounded-xl hover:opacity-90 active:scale-95 cursor-pointer shrink-0"
        >
          Thêm cán bộ mới
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-xs font-medium text-slate-700 border-collapse table-auto">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
              <th className="py-3 px-4 text-left">Họ và tên cán bộ</th>
              <th className="py-3 px-4 text-left">Định danh tài khoản</th>
              <th className="py-3 px-4 text-left">Email công vụ</th>
              <th className="py-3 px-4 text-center">Vai trò phân nhiệm</th>
              <th className="py-3 px-4 text-center">Trạng thái định danh</th>
              <th className="py-3 px-4 text-right">Hành động thực thi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  Đang tải dữ liệu người dùng...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <Empty description="Không tìm thấy thông tin tài khoản cán bộ nào phù hợp." />
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-[#002147] font-black text-[11px] uppercase select-none">
                        {u.fullName.split(' ').slice(-1)[0][0]}
                      </div>
                      <span className="font-bold text-slate-800 text-[12px]">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      @{u.username}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-600">
                    {u.email}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {u.role === 'admin' && (
                      <Tag className="bg-blue-50 border-blue-150 text-blue-900 rounded-md font-bold text-[9px] uppercase">
                        ⚙️ Quản trị viên
                      </Tag>
                    )}
                    {u.role === 'reviewer' && (
                      <Tag className="bg-purple-50 border-purple-150 text-purple-900 rounded-md font-bold text-[9px] uppercase">
                        🔍 Ban thẩm định
                      </Tag>
                    )}
                    {u.role === 'teacher' && (
                      <Tag className="bg-emerald-50 border-emerald-150 text-emerald-900 rounded-md font-bold text-[9px] uppercase">
                        ✍️ Giáo viên soạn đề
                      </Tag>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center select-none">
                    {u.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-100 rounded-md font-extrabold text-[10px]">
                        🟢 ĐANG HOẠT ĐỘNG
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 border border-red-100 rounded-md font-extrabold text-[10px]">
                        🔴 TẠM BỊ KHÓA
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Space size={6} className="justify-end">
                      <Tooltip title="Chỉnh sửa tài khoản">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenEditUser(u)}
                          className="bg-slate-50 border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-100 cursor-pointer"
                        />
                      </Tooltip>

                      <Tooltip title="Nhập lại mật khẩu (Reset)">
                        <Button
                          size="small"
                          icon={<KeyOutlined />}
                          onClick={() => handleResetPassword(u)}
                          className="bg-amber-50 border-amber-200 text-amber-700 rounded-lg text-xs hover:bg-amber-100 cursor-pointer"
                        />
                      </Tooltip>

                      <Tooltip title={u.status === 'active' ? 'Khóa tạm thời tài khoản' : 'Mở khóa tài khoản'}>
                        <Button
                          size="small"
                          icon={u.status === 'active' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                          onClick={() => handleToggleUserStatus(u)}
                          className={`rounded-lg text-xs cursor-pointer ${u.status === 'active'
                            ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                        />
                      </Tooltip>

                      {/* Avoid listing self-deletion of 'dungnt' or 'trangpt' login sessions */}
                      <Popconfirm
                        title={`Bạn chắc chắn muốn hủy tài khoản của ${u.fullName} khỏi hệ thống?`}
                        onConfirm={() => handleDeleteUser(u)}
                        okText="Có, gỡ bỏ"
                        cancelText="Hủy bỏ"
                        disabled={u.username === 'trangpt' || u.username === 'dungnt'}
                      >
                        <Button
                          size="small"
                          danger
                          disabled={u.username === 'trangpt' || u.username === 'dungnt'}
                          icon={<DeleteOutlined />}
                          className="bg-red-50 border-red-150 text-red-600 rounded-lg text-xs hover:bg-red-100 cursor-pointer disabled:opacity-50"
                        />
                      </Popconfirm>
                    </Space>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
          <div className="border-b pb-2 flex items-center gap-1.5 select-none">
            <UsergroupAddOutlined className="text-[#002147]" />
            <span className="font-extrabold uppercase text-[12px] text-slate-800">
              {userModalMode === 'create' ? 'KHỞI TẠO TÀI KHOẢN CÁN BỘ MỚI' : 'CHỈNH SỬA THÔNG TIN CÁN BỘ'}
            </span>
          </div>
        }
        open={isUserModalOpen}
        forceRender
        onCancel={() => setIsUserModalOpen(false)}
        onOk={handleSaveUserForm}
        okText={userModalMode === 'create' ? 'Kích hoạt tài khoản' : 'Lưu thay đổi'}
        cancelText="Hủy bỏ"
        centered
        width={480}
      >
        <Form
          form={userForm}
          layout="vertical"
          className="pt-4 text-xs font-semibold"
          initialValues={{ status: 'active', role: 'teacher' }}
        >
          <Form.Item
            name="fullName"
            label={<span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">Họ và tên cán bộ</span>}
            rules={[{ required: true, message: 'Họ và tên không được bỏ trống!' }]}
          >
            <Input placeholder="Ví dụ: ThS. Nguyễn Văn A" className="rounded-xl border-slate-200 font-bold" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label={<span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">Tên tài khoản (Username)</span>}
                rules={[
                  { required: true, message: 'Vui lòng xác định tên tài khoản!' },
                  { pattern: /^[a-zA-Z0-9_\.]+$/, message: 'Địa chỉ tài khoản chỉ bao gồm ký tự không dấu!' }
                ]}
              >
                <Input placeholder="Ví dụ: anhnv" disabled={userModalMode === 'edit'} className="rounded-xl border-slate-200 font-bold font-mono text-slate-800" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="email"
                label={<span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">Email công vụ nhận mã</span>}
                rules={[
                  { required: true, message: 'Email không được để trống!' },
                  { type: 'email', message: 'Cấu trúc email không hợp lệ!' }
                ]}
              >
                <Input placeholder="anhnv@school.edu.vn" className="rounded-xl border-slate-200 font-bold" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label={<span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">Vai trò phân nhiệm chính</span>}
                rules={[{ required: true }]}
              >
                <Select
                  className="font-bold text-xs"
                  options={[
                    { value: 'admin', label: '⚙️ Quản trị viên' },
                    { value: 'reviewer', label: '🔍 Cán bộ Thẩm định tốt nghiệp' },
                    { value: 'teacher', label: '✍️ Giáo viên biên soạn đề' }
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="status"
                label={<span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">Trực hợp định danh</span>}
                rules={[{ required: true }]}
              >
                <Select
                  className="font-bold text-xs"
                  placeholder="Chọn trạng thái"
                  options={[
                    { value: 'active', label: '🟢 Đang hoạt động' },
                    { value: 'inactive', label: '🔴 Tạm khóa tài khoản' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {userModalMode === 'create' && (
            <div className="bg-blue-50/60 border border-blue-150 p-3 rounded-xl block mt-1">
              <span className="text-[#002147] font-bold text-[11px] leading-relaxed block">
                💡 Khi tạo người dùng mới, mật khẩu sẽ mặc định được gán tự động ngẫu nhiên mã khóa bám sát tiêu chí an toàn, và được gửi tự động về hòm thư công vụ đã đăng ký.
              </span>
            </div>
          )}
        </Form>
      </Modal>

    </div>
  );
}
