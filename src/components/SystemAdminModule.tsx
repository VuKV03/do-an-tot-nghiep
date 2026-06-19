import React, { useState, useMemo } from 'react';
import { 
  Table, 
  Input, 
  Button, 
  Select, 
  Modal, 
  Tag, 
  Badge, 
  Form, 
  Switch, 
  Slider, 
  Tooltip, 
  Space, 
  Popconfirm, 
  Checkbox, 
  Tabs, 
  Alert, 
  message, 
  Empty,
  Card,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  LockOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ReloadOutlined,
  ExportOutlined,
  SearchOutlined,
  SlidersOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons';
import { SystemUser, AuditLog } from '../types';
import { SYSTEM_USERS } from '../data';

interface SystemAdminModuleProps {
  currentTabKey: string; // 'quan-ly-nguoi-dung' | 'quan-ly-nhom-nguoi-dung' | 'chinh-sach-bao-mat'
  onNavigateTab: (key: string) => void;
  auditLogs: AuditLog[];
  onAddAuditLog: (log: AuditLog) => void;
}

interface UserGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  memberCount: number;
  permissions: string[];
}

export default function SystemAdminModule({
  currentTabKey,
  onNavigateTab,
  auditLogs,
  onAddAuditLog
}: SystemAdminModuleProps) {
  // -----------------------------------------------------------------
  // 1. STATE & LOCAL DATA FOR USER MANAGEMENT
  // -----------------------------------------------------------------
  const [users, setUsers] = useState<SystemUser[]>(SYSTEM_USERS);
  const [userSearchText, setUserSearchText] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  
  // Modals for Users
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm] = Form.useForm();

  // -----------------------------------------------------------------
  // 2. STATE & LOCAL DATA FOR GROUP MANAGEMENT
  // -----------------------------------------------------------------
  const [userGroups, setUserGroups] = useState<UserGroup[]>([
    {
      id: 'g-1',
      code: 'GRP_ADMIN',
      name: 'Ban Giám hiệu & Quản trị viên',
      description: 'Toàn quyền kiểm soát hệ thống, thiết lập danh mục lõi, quản lý tài khoản người dùng và giám sát nhật ký bảo mật.',
      memberCount: 1,
      permissions: ['system.*', 'questions.*', 'matrix.*', 'exams.*', 'categories.*']
    },
    {
      id: 'g-2',
      code: 'GRP_REVIEWER',
      name: 'Hội đồng chuyên môn - Thẩm định viên',
      description: 'Quyền phê duyệt câu hỏi, phản biện nội dung thô, gán mức độ tư duy học thuật và thẩm định cấu trúc ma trận.',
      memberCount: 1,
      permissions: ['questions.view', 'questions.approve', 'questions.review', 'matrix.view', 'exams.view']
    },
    {
      id: 'g-3',
      code: 'GRP_TEACHER',
      name: 'Ban biên soạn - Giáo viên cốt cán',
      description: 'Soạn thảo câu hỏi thô, đề xuất chủ đề chuyên sâu, cấu hình ma trận đề khảo thí và xuất thử nghiệm các gói đề phối hợp.',
      memberCount: 2,
      permissions: ['questions.create', 'questions.view', 'questions.edit', 'matrix.create', 'matrix.edit', 'exams.create']
    },
    {
      id: 'g-4',
      code: 'GRP_STUDENT',
      name: 'Học sinh & Thí sinh khảo thí',
      description: 'Tra cứu ngân hàng đề công khai, thực hiện các bài thi khảo sát năng lực trực tuyến do hội đồng phân công.',
      memberCount: 120,
      permissions: ['exams.view', 'exams.take']
    }
  ]);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [activeGroupForPermissions, setActiveGroupForPermissions] = useState<UserGroup | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // System available modular permissions mapped visually
  const SYSTEM_PERMISSION_SCOPES = [
    {
      category: 'Quản lý Ngân hàng câu hỏi',
      items: [
        { key: 'questions.view', label: 'Xem danh sách & chi tiết câu hỏi công khai' },
        { key: 'questions.create', label: 'Thêm mới câu hỏi & Nhập từ Word/Excel' },
        { key: 'questions.edit', label: 'Biên sửa thông tin câu hỏi chưa kiểm duyệt' },
        { key: 'questions.delete', label: 'Hạ tải & Xóa vĩnh viễn câu hỏi khỏi ngân hàng' }
      ]
    },
    {
      category: 'Thẩm định & Chất lượng chuyên môn',
      items: [
        { key: 'questions.approve', label: 'Duyệt câu hỏi vào Ngân hàng chính thức' },
        { key: 'questions.review', label: 'Phản hồi, chấm điểm đóng góp nội dung giáo nghệ' }
      ]
    },
    {
      category: 'Cấu trúc ma trận & Đề kiểm thi',
      items: [
        { key: 'matrix.create', label: 'Tạo mới mẫu ma trận phân bổ câu hỏi' },
        { key: 'matrix.edit', label: 'Chỉnh sửa, phân bố tỉ lệ các câu tự động' },
        { key: 'matrix.delete', label: 'Xóa ma trận cấu hình đề' },
        { key: 'exams.create', label: 'Sinh ngẫu nhiên đề thi & tráo vị trí đề tự động' },
        { key: 'exams.view', label: 'Xem, tải file Word đề thi và đáp án chi tiết' }
      ]
    },
    {
      category: 'Quản trị hệ thống & Bảo mật',
      items: [
        { key: 'system.users', label: 'Quản lý thông tin tài khoản cán bộ' },
        { key: 'system.groups', label: 'Phân vai trò và điều chỉnh nhóm người dùng' },
        { key: 'system.policies', label: 'Thay đổi chính sách bảo mật và hạn mức vận hành' }
      ]
    }
  ];

  // -----------------------------------------------------------------
  // 3. STATE FOR SECURITY POLICIES
  // -----------------------------------------------------------------
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireUpperCase, setRequireUpperCase] = useState(true);
  const [requireSpecialChar, setRequireSpecialChar] = useState(true);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState(90);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [maxLoginFailures, setMaxLoginFailures] = useState(5);
  const [enableCaptchaOnFail, setEnableCaptchaOnFail] = useState(true);
  const [enable2FAForAdmin, setEnable2FAForAdmin] = useState(false);

  // Security Audit Logs
  const [securitySearchKey, setSecuritySearchKey] = useState('');
  const [securityFilterLevel, setSecurityFilterLevel] = useState<string>('all');

  // Hardcoded security logging details to look fully realistic and rich
  const [securityLogs, setSecurityLogs] = useState([
    { id: 'sec-1', user: 'system_daemon', action: 'Bật tính năng TLS 256-bit', timestamp: '2026-06-17T12:00:00Z', level: 'info', ip: '10.0.4.15', details: 'Hệ thống tự động kích hoạt bảo mật kênh truyền HTTPS.' },
    { id: 'sec-2', user: 'dungnt', action: 'Đăng nhập hệ thống', timestamp: '2026-06-17T11:45:00Z', level: 'success', ip: '192.168.1.12', details: 'Xác thực thành công thông qua tên người dùng và mật khẩu.' },
    { id: 'sec-3', user: '113.161.42.10', action: 'Thử mật khẩu sai (Brute-Force)', timestamp: '2026-06-17T10:12:00Z', level: 'warning', ip: '113.161.42.10', details: 'Tài khoản admin liên tục đăng nhập sai 3 lần từ địa chỉ lạ.' },
    { id: 'sec-4', user: 'trangpt', action: 'Cấu hình lại chính sách bảo mật', timestamp: '2026-06-17T09:30:00Z', level: 'info', ip: '192.168.1.5', details: 'Tăng độ dài ký tự tối thiểu từ 6 lên 8 chữ số.' },
    { id: 'sec-5', user: 'system_scheduler', action: 'Sao lưu cơ sở dữ liệu định kỳ', timestamp: '2026-06-17T00:00:00Z', level: 'success', ip: 'localhost', details: 'Đã hoàn tất sao lưu 2.450 câu hỏi & 12 ma trận đề lên Cloud Storage.' },
    { id: 'sec-6', user: 'hai_lh', action: 'Thay đổi nhóm quyền', timestamp: '2026-06-16T15:20:00Z', level: 'danger', ip: '192.168.1.20', details: 'Phát hiện thiết lập gán quyền ghi đè sai mục tiêu cho cán bộ thẩm định.' }
  ]);

  // -----------------------------------------------------------------
  // 4. USER FUNCTIONS
  // -----------------------------------------------------------------
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
    userForm.validateFields().then(values => {
      if (userModalMode === 'create') {
        const newUser: SystemUser = {
          id: `u-${Date.now()}`,
          fullName: values.fullName,
          username: values.username.toLowerCase().trim(),
          email: values.email,
          role: values.role,
          status: values.status || 'active'
        };

        setUsers(prev => [newUser, ...prev]);

        // Add to global Audit Logs
        onAddAuditLog({
          id: `log-sec-${Date.now()}`,
          user: 'Quản trị viên',
          action: 'Tạo người dùng',
          timestamp: new Date().toISOString(),
          details: `Đã tạo tài khoản cán bộ mới: ${newUser.fullName} (@${newUser.username}, Quyền: ${newUser.role})`
        });

        // Add to security log
        setSecurityLogs(prev => [
          {
            id: `sec-${Date.now()}`,
            user: 'admin_panel',
            action: 'Tạo tài khoản cán bộ',
            timestamp: new Date().toISOString(),
            level: 'success',
            ip: '127.0.0.1',
            details: `Thêm mới tài khoản chuyên viên ${newUser.fullName} thành công.`
          },
          ...prev
        ]);

        message.success(`Kích hoạt thành công tài khoản cán bộ: ${newUser.fullName}`);
      } else {
        setUsers(prev => prev.map(u => {
          if (u.id === editingUserId) {
            return {
              ...u,
              fullName: values.fullName,
              username: values.username.toLowerCase().trim(),
              email: values.email,
              role: values.role,
              status: values.status
            };
          }
          return u;
        }));

        onAddAuditLog({
          id: `log-sec-${Date.now()}`,
          user: 'Quản trị viên',
          action: 'Sửa người dùng',
          timestamp: new Date().toISOString(),
          details: `Đã thay đổi thông tin người dùng: @${values.username}`
        });

        message.success('Cập nhật thông tin cán bộ thành công.');
      }
      setIsUserModalOpen(false);
    });
  };

  const handleDeleteUser = (user: SystemUser) => {
    setUsers(prev => prev.filter(u => u.id !== user.id));
    
    onAddAuditLog({
      id: `log-sec-${Date.now()}`,
      user: 'Quản trị viên',
      action: 'Xóa người dùng',
      timestamp: new Date().toISOString(),
      details: `Đã thu hồi tài khoản của: ${user.fullName} (@${user.username})`
    });

    setSecurityLogs(prev => [
      {
        id: `sec-${Date.now()}`,
        user: 'admin_panel',
        action: 'Xóa tài khoản',
        timestamp: new Date().toISOString(),
        level: 'warning',
        ip: '127.0.0.1',
        details: `Đã xóa tài khoản @${user.username} khỏi hệ thống theo yêu cầu của hội đồng.`
      },
      ...prev
    ]);

    message.success(`Đã gỡ quyền truy cập của cán bộ: ${user.fullName}`);
  };

  const handleToggleUserStatus = (user: SystemUser) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    setUsers(prev => prev.map(u => {
      if (u.id === user.id) {
        return { ...u, status: newStatus };
      }
      return u;
    }));

    const statusText = newStatus === 'active' ? 'MỞ KHÓA' : 'TẠM KHÓA';
    message.warning(`Đã chuyển trạng thái tài khoản của ${user.fullName} sang: ${statusText}`);

    setSecurityLogs(prev => [
      {
        id: `sec-${Date.now()}`,
        user: 'admin_panel',
        action: `${statusText} tài khoản`,
        timestamp: new Date().toISOString(),
        level: newStatus === 'active' ? 'success' : 'danger',
        ip: '127.0.0.1',
        details: `Cập nhật trạng thái người dùng @${user.username} thành ${newStatus === 'active' ? 'Hoạt động' : 'Tạm khóa'}.`
      },
      ...prev
    ]);
  };

  const handleResetPassword = (user: SystemUser) => {
    // Generate a temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let tempPass = '';
    for (let i = 0; i < 10; i++) {
      tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }

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

    setSecurityLogs(prev => [
      {
        id: `sec-${Date.now()}`,
        user: 'admin_panel',
        action: 'Reset Mật khẩu',
        timestamp: new Date().toISOString(),
        level: 'warning',
        ip: '127.0.0.1',
        details: `Yêu cầu làm mới khóa an toàn định danh cho người dùng @${user.username}.`
      },
      ...prev
    ]);
  };

  // -----------------------------------------------------------------
  // 5. GROUP FUNCTIONS
  // -----------------------------------------------------------------
  const handleOpenPermissionEditor = (group: UserGroup) => {
    setActiveGroupForPermissions(group);
    setSelectedPermissions(group.permissions);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroupPermissions = () => {
    if (!activeGroupForPermissions) return;

    setUserGroups(prev => prev.map(g => {
      if (g.id === activeGroupForPermissions.id) {
        return {
          ...g,
          permissions: selectedPermissions
        };
      }
      return g;
    }));

    onAddAuditLog({
      id: `log-sec-${Date.now()}`,
      user: 'Quản trị viên',
      action: 'Cập nhật phân quyền',
      timestamp: new Date().toISOString(),
      details: `Đã sửa đổi ma trận vai trò, quyền hạn của nhóm: "${activeGroupForPermissions.name}"`
    });

    setSecurityLogs(prev => [
      {
        id: `sec-${Date.now()}`,
        user: 'admin_panel',
        action: 'Thay đổi ma trận phân quyền',
        timestamp: new Date().toISOString(),
        level: 'danger',
        ip: '127.0.0.1',
        details: `Đã thiết lập lại ${selectedPermissions.length} quyền khả dụng cho nhóm ${activeGroupForPermissions.name}.`
      },
      ...prev
    ]);

    message.success(`Cập nhật thành công quyền hạn cho nhóm "${activeGroupForPermissions.name}"`);
    setIsGroupModalOpen(false);
  };

  // -----------------------------------------------------------------
  // 6. POLICY FUNCTIONS
  // -----------------------------------------------------------------
  const handleSaveSecurityPolicies = () => {
    message.success('Đã áp dụng các quy chuẩn chính sách bảo mật thế hệ mới lên toàn phân hệ!');
    
    onAddAuditLog({
      id: `log-sec-${Date.now()}`,
      user: 'Quản trị viên',
      action: 'Thay đổi an ninh lõi',
      timestamp: new Date().toISOString(),
      details: `Độ dài MK tối thiểu: ${minPasswordLength}, Expiry: ${passwordExpiryDays} ngày, Timeout: ${sessionTimeoutMinutes} phút, 2FA: ${enable2FAForAdmin ? 'BẬT' : 'TẮT'}`
    });

    setSecurityLogs(prev => [
      {
        id: `sec-${Date.now()}`,
        user: 'admin_panel',
        action: 'Cập nhật an ninh hệ thống',
        timestamp: new Date().toISOString(),
        level: 'info',
        ip: '127.0.0.1',
        details: `Độ dài tối thiểu MK: ${minPasswordLength}; 2FA cho quản trị viên: ${enable2FAForAdmin ? 'BẬT' : 'TẮT'}`
      },
      ...prev
    ]);
  };

  // Filter Security logs
  const filteredSecurityLogs = useMemo(() => {
    return securityLogs.filter(log => {
      const matchSearch = log.user.toLowerCase().includes(securitySearchKey.toLowerCase()) ||
                          log.action.toLowerCase().includes(securitySearchKey.toLowerCase()) ||
                          log.details.toLowerCase().includes(securitySearchKey.toLowerCase());
      const matchLevel = securityFilterLevel === 'all' || log.level === securityFilterLevel;
      return matchSearch && matchLevel;
    });
  }, [securityLogs, securitySearchKey, securityFilterLevel]);

  const handleSimulateExportLogs = () => {
    message.loading({ content: 'Đang kết xuất tệp nhật ký bảo mật dạng CSV...', key: 'exportLogs' });
    setTimeout(() => {
      message.success({ content: 'Kết xuất thành công tệp logs_system_security_2026.csv! Trình duyệt đang tải xuống.', key: 'exportLogs', duration: 3 });
    }, 1500);
  };

  return (
    <div className="space-y-6" id="system-admin-overall-module">
      
      {/* Header section with Dynamic Titles corresponding to active key */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs shrink-0 select-none">
        <div className="space-y-1">
          <h2 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
            <SafetyCertificateOutlined className="text-[#002147] animate-pulse" />
            VÙNG AN NINH & QUẢN TRỊ HỆ THỐNG
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Quản trị thông tin cán bộ, chuẩn hóa ma trận phân lớp vai trò và giám sát các chuẩn mã hóa bảo mật thời gian thực.
          </p>
        </div>
        
        {/* Sub Navigation tabs buttons to navigate */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <Button
            type={currentTabKey === 'quan-ly-nguoi-dung' ? 'primary' : 'text'}
            size="small"
            icon={<UserOutlined />}
            onClick={() => onNavigateTab('quan-ly-nguoi-dung')}
            className={`text-xs font-black rounded-lg py-1 px-3 border-transparent ${
              currentTabKey === 'quan-ly-nguoi-dung' ? 'bg-[#002147] text-white shadow-none' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Người dùng
          </Button>
          <Button
            type={currentTabKey === 'quan-ly-nhom-nguoi-dung' ? 'primary' : 'text'}
            size="small"
            icon={<TeamOutlined />}
            onClick={() => onNavigateTab('quan-ly-nhom-nguoi-dung')}
            className={`text-xs font-black rounded-lg py-1 px-3 border-transparent ${
              currentTabKey === 'quan-ly-nhom-nguoi-dung' ? 'bg-[#002147] text-white shadow-none' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Nhóm & Phân quyền
          </Button>
          <Button
            type={currentTabKey === 'chinh-sach-bao-mat' ? 'primary' : 'text'}
            size="small"
            icon={<LockOutlined />}
            onClick={() => onNavigateTab('chinh-sach-bao-mat')}
            className={`text-xs font-black rounded-lg py-1 px-3 border-transparent ${
              currentTabKey === 'chinh-sach-bao-mat' ? 'bg-[#002147] text-white shadow-none' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            An toàn bảo mật
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: USER MANAGEMENT                                     */}
      {/* ============================================================== */}
      {currentTabKey === 'quan-ly-nguoi-dung' && (
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
                {filteredUsers.length === 0 ? (
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
                          <div className="w-7 h-7 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-[#002147] font-black text-[11px] uppercaseSelectable">
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
                              className={`rounded-lg text-xs cursor-pointer ${
                                u.status === 'active' 
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
                            centered
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

        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: GROUP & ROLE MANAGEMENT                             */}
      {/* ============================================================== */}
      {currentTabKey === 'quan-ly-nhom-nguoi-dung' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          <div className="bg-white border rounded-2xl p-4 shadow-xxs">
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest mb-1 select-none">TỔNG QUAN PHÂN VAI TRÒ CHỈ THỊ</span>
            <div className="text-xs text-slate-500 font-semibold leading-relaxed">
              Các tài khoản cán bộ sẽ thừa hưởng toàn bộ các quyền gán tương ứng theo phạm vi chức năng (Scope matrix). Việc thay đổi quyền hạ tầng sẽ lập tức đồng bộ hóa trên các phiên làm việc của người dùng.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="user-roles-group-grid">
            {userGroups.map(group => (
              <div 
                key={group.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xs transition-shadow flex flex-col space-y-4"
              >
                <div className="flex items-center justify-between border-b border-dashed pb-3 select-none">
                  <strong className="text-slate-800 text-xs font-black uppercase tracking-wider">{group.name}</strong>
                  <Tag color="blue" className="rounded-md font-mono font-black text-[9px] uppercase m-0 py-0.5 px-2.5">
                    {group.code}
                  </Tag>
                </div>

                <div className="space-y-4 text-xs font-medium">
                  <p className="text-slate-500 leading-relaxed min-h-[38px] text-[11px]">
                    {group.description}
                  </p>

                  <div className="flex justify-between items-center bg-slate-50 border rounded-xl p-2.5 select-none">
                    <span className="text-slate-400 text-[11px]">Số lượng nhân viên gán:</span>
                    <strong className="text-slate-800">{group.memberCount} Thành viên</strong>
                  </div>

                  <div className="space-y-1.5 select-none">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">Quyền gán hạn khả dụng:</span>
                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
                      {group.permissions.map(p => (
                        <span key={p} className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-mono text-[9px] tracking-wide block">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Divider className="my-3 border-dashed" />

                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-emerald-600 font-extrabold uppercase">✓ ĐỒNG BỘ ĐỒNG LOẠT TRÊN CLOUD</span>
                    <Button
                      type="primary"
                      size="small"
                      icon={<SettingOutlined />}
                      onClick={() => handleOpenPermissionEditor(group)}
                      className="bg-[#002147] border-transparent text-white font-extrabold text-[11px] rounded-lg hover:opacity-90 cursor-pointer"
                    >
                      Bố trí lại Phân quyền
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 3: AN TOÀN BẢO MẬT & CHÍNH SÁCH                        */}
      {/* ============================================================== */}
      {currentTabKey === 'chinh-sach-bao-mat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom duration-300">
          
          {/* Security policy sliders */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-6">
            <div className="flex items-center gap-2 border-b border-dashed pb-3">
              <SafetyCertificateOutlined className="text-blue-900" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 my-0">THIẾT LẬP CHÍNH SÁCH BẢO MẬT TÀI KHOẢN</h3>
            </div>

            {/* Sliders and switches */}
            <div className="space-y-4">
              
              <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest select-none">YÊU CẦU ĐỘ PHỨC TẠP MẬT KHẨU</span>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Độ dài mật khẩu tối thiểu:</span>
                    <strong className="text-blue-900">{minPasswordLength} ký tự</strong>
                  </div>
                  <Slider 
                    min={6} 
                    max={20} 
                    value={minPasswordLength} 
                    onChange={setMinPasswordLength}
                    className="m-1 pb-1"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/55 pt-3 select-none">
                  <div className="space-y-0.5">
                    <strong className="text-slate-700 text-xs font-bold block">Bắt buộc sử dụng chữ HOA và chữ thường:</strong>
                    <span className="text-[10px] text-slate-400 block font-medium">Bảo vệ chống lại tấn công brute-force cơ bản.</span>
                  </div>
                  <Switch checked={requireUpperCase} onChange={setRequireUpperCase} className="bg-slate-300" />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/55 pt-3 select-none">
                  <div className="space-y-0.5">
                    <strong className="text-slate-700 text-xs font-bold block">Bắt buộc chứa chữ số và ký tự đặc biệt (!@#...):</strong>
                    <span className="text-[10px] text-slate-400 block font-medium">Gia tăng độ mạnh mật khẩu lên mức an ninh quốc tế.</span>
                  </div>
                  <Switch checked={requireSpecialChar} onChange={setRequireSpecialChar} className="bg-slate-300" />
                </div>

                <div className="space-y-1 border-t border-slate-200/55 pt-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Thời hạn mật khẩu tự động hết hạn (ngày):</span>
                    <strong className="text-blue-900">{passwordExpiryDays} ngày</strong>
                  </div>
                  <Slider 
                    min={30} 
                    max={180} 
                    step={10}
                    value={passwordExpiryDays} 
                    onChange={setPasswordExpiryDays}
                    className="m-1 pb-1"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border rounded-xl p-4 space-y-3.5">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest select-none">KIỂM SOÁT PHIÊN VÀ ĐĂNG NHẬP SAU THẤT BẠI</span>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Thời gian tự động ngắt phiên kết nối tĩnh (Phút):</span>
                    <strong className="text-blue-900">{sessionTimeoutMinutes} phút</strong>
                  </div>
                  <Slider 
                    min={5} 
                    max={120} 
                    step={5}
                    value={sessionTimeoutMinutes} 
                    onChange={setSessionTimeoutMinutes}
                    className="m-1 pb-1"
                  />
                </div>

                <div className="space-y-1 border-t border-slate-200/55 pt-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Số lần tối đa đăng nhập sai liên tiếp:</span>
                    <strong className="text-rose-700 font-extrabold">{maxLoginFailures} lần</strong>
                  </div>
                  <Slider 
                    min={3} 
                    max={10} 
                    value={maxLoginFailures} 
                    onChange={setMaxLoginFailures}
                    className="m-1 pb-1"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/55 pt-3 select-none">
                  <div className="space-y-0.5">
                    <strong className="text-slate-700 text-xs font-bold block">Yêu cầu nhập Google CAPTCHA khi sai vượt hạn mức:</strong>
                    <span className="text-[10px] text-slate-400 block font-medium">Chặn đứng tấn công quét dọn mật khẩu bằng botnet.</span>
                  </div>
                  <Switch checked={enableCaptchaOnFail} onChange={setEnableCaptchaOnFail} className="bg-slate-300" />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/55 pt-3 select-none">
                  <div className="space-y-0.5">
                    <strong className="text-slate-700 text-xs font-bold block">Bắt buộc xác thực song hành 2 yếu tố (2FA / OTP):</strong>
                    <span className="text-[10px] text-slate-400 block font-medium">Khuyên dùng đối với các tài khoản gán quyền Quản trị viên tối cao.</span>
                  </div>
                  <Switch checked={enable2FAForAdmin} onChange={setEnable2FAForAdmin} className="bg-slate-300" />
                </div>
              </div>

            </div>

            <Button
              type="primary"
              block
              icon={<SafetyCertificateOutlined />}
              onClick={handleSaveSecurityPolicies}
              className="bg-[#002147] border-transparent text-white font-extrabold text-xs rounded-xl hover:opacity-90 py-4 cursor-pointer select-none"
            >
              Cập nhật cấu hình & Áp dụng chính sách an toàn
            </Button>
          </div>

          {/* Real-time security activities logs */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-dashed pb-3 select-none">
              <div className="flex items-center gap-2">
                <AuditOutlined className="text-indigo-900" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 my-0">NHẬT KÝ BẢO MẬT HỆ THỐNG</h3>
              </div>
              
              <Button
                type="text"
                size="small"
                icon={<ExportOutlined />}
                onClick={handleSimulateExportLogs}
                className="text-[10px] uppercase font-bold text-blue-900 bg-blue-50 border-none hover:bg-blue-100 rounded-lg cursor-pointer"
              >
                Xuất file log (CSV)
              </Button>
            </div>

            {/* Log Searching & Filtering bar */}
            <div className="flex gap-2 my-4 items-center select-none" id="log-filters-container">
              <Input
                placeholder="Tìm nhật ký..."
                size="small"
                prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                className="rounded-lg border-slate-250 text-[11px] font-semibold flex-1"
                value={securitySearchKey}
                onChange={e => setSecuritySearchKey(e.target.value)}
                allowClear
              />

              <Select
                value={securityFilterLevel}
                onChange={setSecurityFilterLevel}
                size="small"
                className="w-28 text-[11px] font-bold"
                options={[
                  { value: 'all', label: 'Tất cả log' },
                  { value: 'success', label: '🟢 Thành công' },
                  { value: 'info', label: '🔵 Thông tin' },
                  { value: 'warning', label: '🟡 Cảnh báo' },
                  { value: 'danger', label: '🔴 Nguy hiểm' }
                ]}
              />
            </div>

            {/* Real Security logs scrolling list */}
            <div className="flex-1 overflow-y-auto max-h-[520px] pr-1.5 space-y-3.5" id="security-scrolling-timeline-pane">
              {filteredSecurityLogs.length === 0 ? (
                <Empty description="Không có dòng nhật ký bảo vệ nào khớp với từ khóa tìm kiếm." />
              ) : (
                filteredSecurityLogs.map(log => (
                  <div key={log.id} className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs font-semibold relative">
                    <div className="flex items-center justify-between mb-1.5 select-none">
                      <span className="font-mono font-black text-slate-800 bg-slate-200/80 px-1.5 py-0.5 rounded text-[9.5px]">
                        {log.action}
                      </span>
                      <small className="text-[10px] text-slate-400 font-bold block">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </small>
                    </div>

                    <p className="text-slate-600 font-medium leading-relaxed my-1 text-[11px]">
                      {log.details}
                    </p>

                    <div className="flex items-center justify-between mt-2 select-none border-t border-slate-100 pt-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Tác nhân:</span>
                        <strong className="text-slate-800 text-[10.5px]">@{log.user}</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[9.5px] font-bold bg-slate-150 px-1 rounded">{log.ip}</span>
                        {log.level === 'success' && <Badge color="green" />}
                        {log.level === 'info' && <Badge color="blue" />}
                        {log.level === 'warning' && <Badge color="gold" />}
                        {log.level === 'danger' && <Badge color="red" />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>
      )}

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

          <Row gap={16} gutter={16}>
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

          <Row gap={16} gutter={16}>
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

      {/* ============================================================== */}
      {/* DIALOGS: GROUP PERMISSIONS TREE/MATRIX EDIT MODAL              */}
      {/* ============================================================== */}
      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-1.5 select-none">
            <TeamOutlined className="text-blue-900" />
            <span className="font-extrabold uppercase text-[12px] text-slate-800">
              ĐỒNG BỘ MA TRẬN PHÂN QUYỀN HẠ TẦNG
            </span>
          </div>
        }
        open={isGroupModalOpen}
        onCancel={() => setIsGroupModalOpen(false)}
        onOk={handleSaveGroupPermissions}
        okText="Ghi đè quyền khả dụng"
        cancelText="Hủy bỏ"
        centered
        width={560}
      >
        {activeGroupForPermissions && (
          <div className="pt-4 space-y-4 text-xs font-semibold">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl select-none">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">NHÓM VAI TRÒ CHỌN LỌC</span>
              <strong className="text-slate-800 text-[13px] block mt-0.5">{activeGroupForPermissions.name}</strong>
              <p className="text-[10.5px] text-slate-400 font-medium block mt-1 mb-0 leading-relaxed">
                {activeGroupForPermissions.description}
              </p>
            </div>

            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {SYSTEM_PERMISSION_SCOPES.map(scope => (
                <div key={scope.category} className="space-y-2 border-b last:border-b-0 pb-3 border-slate-100 last:pb-0">
                  <span className="text-[11px] font-black text-blue-900 border-l-2 border-blue-950 pl-2 block uppercase select-none">
                    {scope.category}
                  </span>
                  
                  <div className="grid grid-cols-1 gap-2 pl-2">
                    {scope.items.map(item => {
                      const isChecked = selectedPermissions.includes(item.key) || selectedPermissions.includes('system.*') || selectedPermissions.some(p => p.endsWith('.*') && item.key.startsWith(p.replace('.*', '')));
                      return (
                        <Checkbox
                          key={item.key}
                          checked={isChecked}
                          onChange={(e) => {
                            const active = e.target.checked;
                            if (active) {
                              setSelectedPermissions(prev => [...prev, item.key]);
                            } else {
                              setSelectedPermissions(prev => prev.filter(p => p !== item.key && p !== 'system.*'));
                            }
                          }}
                          className="text-[11px] text-slate-700 font-medium hover:text-slate-900 transition-colors"
                        >
                          {item.label} <code className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded ml-1.5">{item.key}</code>
                        </Checkbox>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Alert
              type="warning"
              showIcon
              title={
                <span className="text-[10px] leading-relaxed block text-slate-650 font-bold select-none">
                  Lưu ý: Quyền hạn được ghi đè sẽ có hiệu lực lập tức đối với tất cả thành viên thuộc nhóm. Vui lòng kiểm tra kỹ lưỡng rào cản an toàn trước khi xác nhận.
                </span>
              }
            />
          </div>
        )}
      </Modal>

    </div>
  );
}
