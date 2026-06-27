import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Avatar,
  message,
  Breadcrumb,
  Modal,
  Badge,
  Input,
  Tooltip
} from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  ProjectOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  PieChartOutlined,
  SettingOutlined,
  FolderOutlined,
  UserOutlined,
  LockOutlined,
  BarsOutlined,
  QuestionCircleOutlined,
  KeyOutlined,
  LogoutOutlined,
  GlobalOutlined,
  ProfileOutlined
} from '@ant-design/icons';
import { Question, MatrixConfig, AuditLog, SystemUser } from './types';
import { INITIAL_QUESTIONS, INITIAL_MATRICES, MOCK_AUDIT_LOGS } from './data';
import DashboardOverview from './components/DashboardOverview';
import QuestionBankModule from './components/quan-ly-nhch/ngan-hang-cau-hoi/tab-ngan-hang-cau-hoi';
import MatrixConfigModule from './components/xay-dung-de-thi/quan-ly-ma-tran-de/MatrixConfigModule';
import QuestionTopicsModule from './components/QuestionTopicsModule';
import QuestionStatsModule from './components/QuestionStatsModule';
import ReviewModal from './components/ReviewModal';
import SystemAdminModule from './components/quan-tri-he-thong/SystemAdminModule';
import CategoryAdminModule from './components/CategoryAdminModule';
import ExamPackageModule from './components/ExamPackageModule';
import Login from './components/dang-nhap-dang-ky/Login';

const { Header, Sider, Content } = Layout;

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState<string>('dashboard');

  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);

  useEffect(() => {
    const cachedUser = localStorage.getItem('user_info');
    const token = localStorage.getItem('auth_token');
    if (cachedUser && token) {
      try {
        setCurrentUser(JSON.parse(cachedUser));
      } catch (e) {
        localStorage.removeItem('user_info');
        localStorage.removeItem('auth_token');
      }
    }
  }, []);

  // Core Global States
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [matrices, setMatrices] = useState<MatrixConfig[]>(INITIAL_MATRICES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);

  // Review Modal state
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedReviewQuestion, setSelectedReviewQuestion] = useState<Question | null>(null);

  // Personal Profile Modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '' });

  // Password Modal state
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  // Navigation controller helper
  const handleDashboardNavigate = (tab: 'question-bank' | 'matrix-config' | 'quan-ly-de-thi-goi-de') => {
    if (tab === 'question-bank') {
      setActiveMenuKey('ngan-hang-cau-hoi');
    } else if (tab === 'matrix-config') {
      setActiveMenuKey('quan-ly-ma-tran-de');
    } else if (tab === 'quan-ly-de-thi-goi-de') {
      setActiveMenuKey('quan-ly-de-thi-goi-de');
    }
  };

  // State handlers
  const handleAddQuestion = (q: Question) => {
    setQuestions(prev => [q, ...prev]);
    // Add transaction audit log
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: 'Hội đồng Khảo thí',
      action: q.creator.includes('AI') ? 'SmartTest AI' : 'Thêm mới câu hỏi',
      timestamp: new Date().toISOString(),
      details: `Đã khởi tạo thành công câu hỏi ${q.code} thuộc môn ${q.subject}.`
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleUpdateQuestion = (q: Question) => {
    setQuestions(prev => prev.map(item => item.id === q.id ? q : item));
    message.success(`Đã cập nhật câu hỏi ${q.code}.`);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleDeleteMatrix = (id: string) => {
    setMatrices(prev => prev.filter(m => m.id !== id));
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: 'Ban chuyên môn',
      action: 'Xóa ma trận đề',
      timestamp: new Date().toISOString(),
      details: `Đã xóa ma trận cấu hình khỏi danh sách.`
    };
    setAuditLogs(prev => [newLog, ...prev]);
    message.success('Đã gỡ bỏ cấu hình ma trận đề khỏi hệ thống.');
  };

  const handleSaveMatrix = (matrix: MatrixConfig) => {
    setMatrices(prev => {
      const exists = prev.some(m => m.id === matrix.id || m.code === matrix.code);
      if (exists) {
        return prev.map(m => (m.id === matrix.id || m.code === matrix.code) ? matrix : m);
      }
      return [matrix, ...prev];
    });

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: 'Ban chuyên môn',
      action: 'Lưu ma trận đề',
      timestamp: new Date().toISOString(),
      details: `Đã cập nhật thành công cấu hình ma trận đề: ${matrix.name}`
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Open review modal
  const handleOpenReview = (q: Question) => {
    setSelectedReviewQuestion(q);
    setIsReviewOpen(true);
  };

  // Review Modal decisions
  const handleApproveQuestion = (id: string, feedback: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, status: 'approved', feedback };
      }
      return q;
    }));

    const qItem = questions.find(item => item.id === id);
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: 'Ban giám định chuyên môn',
      action: 'Thẩm định Đạt',
      timestamp: new Date().toISOString(),
      details: `Phê duyệt thành công câu hỏi ${qItem?.code || ''} đưa vào ngân hàng chính thức.`
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleRejectQuestion = (id: string, feedback: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, status: 'draft', feedback };
      }
      return q;
    }));

    const qItem = questions.find(item => item.id === id);
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: 'Ban giám định chuyên môn',
      action: 'Thẩm định Không đạt',
      timestamp: new Date().toISOString(),
      details: `Đã từ chối câu hỏi ${qItem?.code || ''} với nhận xét: "${feedback}"`
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // User Action Menu list
  const userMenuItems = {
    items: [
      {
        key: 'profile',
        label: 'Hồ sơ cá nhân',
        icon: <UserOutlined />,
        onClick: () => {
          setProfileForm({
            fullName: currentUser?.fullName || '',
            email: currentUser?.email || ''
          });
          setIsEditingProfile(false);
          setIsProfileOpen(true);
        }
      },
      {
        key: 'password',
        label: 'Đổi mật khẩu',
        icon: <KeyOutlined />,
        onClick: () => {
          setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
          setIsPasswordOpen(true);
        }
      },
      {
        key: 'help',
        label: 'Hướng dẫn sử dụng',
        icon: <QuestionCircleOutlined />,
        onClick: () => {
          Modal.info({
            title: 'HƯỚNG DẪN SỬ DỤNG HỆ THỐNG',
            content: (
              <div className="space-y-3 pt-3 text-xs leading-relaxed text-slate-600">
                <p>1. <strong>Quản lý ngân hàng câu hỏi:</strong> Lọc danh sách theo môn học ở thanh bên, bấm vào lá cây chủ đề kiến thức để xem câu hỏi thuộc chuyên đề đó. Hỗ trợ thêm thủ công, import tài liệu, hoặc sử dụng AI để gợi ý nội dung.</p>
                <p>2. <strong>Thẩm định chất lượng:</strong> Bấm chọn nút "Thẩm định" tại bảng câu hỏi để xem chi tiết, cho điểm phản hồi chuyên môn và đồng bộ chuyển đổi trạng thái duyệt.</p>
                <p>3. <strong>Xây dựng ma trận & Sinh đề thi:</strong> Thiết lập tham số ma trận, điền phân bổ chỉ số câu hỏi và bấm nút sinh đề thi bằng AI để nhận ngay gói tệp lưu trữ kết quả kiểm thi.</p>
              </div>
            ),
            okText: 'Tôi đã hiểu!'
          });
        }
      },
      {
        type: 'divider' as const
      },
      {
        key: 'logout',
        label: <span className="text-red-600 font-bold">Đăng xuất hệ thống</span>,
        icon: <LogoutOutlined className="text-red-600" />,
        onClick: () => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_info');
          setCurrentUser(null);
          message.success('Bạn đã đăng xuất tài khoản một cách an toàn!');
        }
      }
    ]
  };

  // Navigation Sidebar paths exactly matches requested paths:
  // "Xây dựng đề" -> sub-items: ["Quản lý ma trận đề", "Quản lý đề thi & gói đề"]
  // "Quản lý ngân hàng câu hỏi" -> sub-items: ["Chủ đề câu hỏi", "Ngân hàng câu hỏi", "Thống kê NHCH"]
  // "Quản trị hệ thống" -> sub-items: ["Quản lý người dùng", "Quản lý nhóm người dùng", "Chính sách bảo mật"]
  // "Quản trị danh mục" -> sub-items: ["Danh mục môn học", "Danh mục khối lớp", "Cấp độ tư duy", "Loại hình câu hỏi"]
  const menuItems = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: 'Bảng điều khiển Tổng quan',
    },
    {
      key: 'xay-dung-de',
      icon: <ProjectOutlined />,
      label: 'Xây dựng đề thi',
      children: [
        { key: 'quan-ly-ma-tran-de', label: 'Quản lý ma trận đề' },
        { key: 'quan-ly-de-thi-goi-de', label: 'Quản lý đề thi & gói đề' }
      ]
    },
    {
      key: 'quan-ly-nhch',
      icon: <DatabaseOutlined />,
      label: 'Quản lý ngân hàng câu hỏi',
      children: [
        { key: 'chu-de-cau-hoi', label: 'Chủ đề câu hỏi' },
        { key: 'ngan-hang-cau-hoi', label: 'Ngân hàng câu hỏi' },
        { key: 'thong-ke-nhch', label: 'Thống kê NHCH' }
      ]
    },
    {
      key: 'quan-tri-he-thong',
      icon: <SettingOutlined />,
      label: 'Quản trị hệ thống',
      children: [
        { key: 'quan-ly-nguoi-dung', label: 'Quản lý người dùng' },
        { key: 'quan-ly-nhom-nguoi-dung', label: 'Quản lý nhóm người dùng' },
        { key: 'chinh-sach-bao-mat', label: 'Chính sách bảo mật' }
      ]
    },
    {
      key: 'quan-tri-danh-muc',
      icon: <FolderOutlined />,
      label: 'Quản trị danh mục',
      children: [
        { key: 'danh-muc-mon-hoc', label: 'Danh mục môn học' },
        { key: 'danh-muc-khoi-lop', label: 'Danh mục khối lớp' },
        { key: 'cap-do-tu-duy', label: 'Cấp độ tư duy' },
        { key: 'loai-hinh-cau-hoi', label: 'Loại hình câu hỏi' },
        { key: 'thanh-phan-nang-luc', label: 'Thành phần năng lực' },
        { key: 'danh-muc-dot-thi', label: 'Danh mục đợt thi' }
      ]
    }
  ];

  // Dynamic Content viewport rendering corresponding to active Tab
  const renderMainViewContent = () => {
    switch (activeMenuKey) {
      case 'dashboard':
        return (
          <DashboardOverview
            questions={questions}
            matrices={matrices}
            auditLogs={auditLogs}
            onNavigate={handleDashboardNavigate}
          />
        );
      case 'ngan-hang-cau-hoi':
        return (
          <QuestionBankModule
            questions={questions}
            onAddQuestion={handleAddQuestion}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onOpenReview={handleOpenReview}
          />
        );
      case 'quan-ly-ma-tran-de':
        return (
          <MatrixConfigModule />
        );
      case 'chu-de-cau-hoi':
        return (
          <QuestionTopicsModule
            questions={questions}
          />
        );
      case 'thong-ke-nhch':
        return (
          <QuestionStatsModule
            questions={questions}
          />
        );
      case 'quan-ly-de-thi-goi-de':
        return (
          <ExamPackageModule
            onNavigateTab={(key) => setActiveMenuKey(key)}
          />
        );
      case 'quan-ly-nguoi-dung':
      case 'quan-ly-nhom-nguoi-dung':
      case 'chinh-sach-bao-mat':
        return (
          <SystemAdminModule
            currentTabKey={activeMenuKey}
            onNavigateTab={(key) => setActiveMenuKey(key)}
            auditLogs={auditLogs}
            onAddAuditLog={(log) => setAuditLogs(prev => [log, ...prev])}
          />
        );
      case 'danh-muc-mon-hoc':
      case 'danh-muc-khoi-lop':
      case 'cap-do-tu-duy':
      case 'loai-hinh-cau-hoi':
      case 'thanh-phan-nang-luc':
      case 'danh-muc-dot-thi':
        return (
          <CategoryAdminModule
            currentTabKey={activeMenuKey}
            onNavigateTab={(key) => setActiveMenuKey(key)}
          />
        );
      default:
        // Handle placeholders nicely mapping categories
        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-xs my-8 space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center mx-auto">
              <ProfileOutlined className="text-slate-400 text-2xl" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">PHÂN HỆ ĐANG ĐƯỢC CHUẨN BỊ KHỞI TẠO</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto font-medium">
                Khu vực tính năng <strong className="text-slate-700 uppercase">"{activeMenuKey.replace(/-/g, ' ')}"</strong> hiện đang được phân quyền cấu trúc từ xa tại trung tâm quản lý.
              </p>
            </div>
            <div className="pt-2">
              <Button
                type="primary"
                className="bg-[#0f172a] border-transparent text-white rounded-lg text-xs font-black cursor-pointer"
                onClick={() => setActiveMenuKey('dashboard')}
              >
                Quay lại Bảng điều khiển chính
              </Button>
            </div>
          </div>
        );
    }
  };

  const getBreadcrumbTitle = () => {
    switch (activeMenuKey) {
      case 'dashboard': return 'Bảng tổng quan điều khiển';
      case 'quan-ly-ma-tran-de': return 'Xây dựng đề thi/ Quản lý ma trận đề';
      case 'ngan-hang-cau-hoi': return 'Quản lý ngân hàng câu hỏi / Ngân hàng câu hỏi';
      case 'chu-de-cau-hoi': return 'Quản lý ngân hàng câu hỏi / Chủ đề câu hỏi';
      case 'thong-ke-nhch': return 'Quản lý ngân hàng câu hỏi / Thống kê NHCH';
      case 'quan-ly-nguoi-dung': return 'Quản trị hệ thống / Quản lý người dùng';
      case 'quan-ly-nhom-nguoi-dung': return 'Quản trị hệ thống / Quản lý nhóm người dùng';
      case 'chinh-sach-bao-mat': return 'Quản trị hệ thống / Chính sách bảo mật';
      case 'danh-muc-mon-hoc': return 'Quản trị danh mục / Danh mục môn học';
      case 'danh-muc-khoi-lop': return 'Quản trị danh mục / Danh mục khối lớp';
      case 'cap-do-tu-duy': return 'Quản trị danh mục / Cấp độ tư duy';
      case 'loai-hinh-cau-hoi': return 'Quản trị danh mục / Loại hình câu hỏi';
      case 'thanh-phan-nang-luc': return 'Quản trị danh mục / Thành phần năng lực';
      case 'danh-muc-dot-thi': return 'Quản trị danh mục / Danh mục đợt thi';
      default: return `Phân hệ / ${activeMenuKey.replace(/-/g, ' ')}`;
    }
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin': return 'Quản trị viên';
      case 'teacher': return 'Giáo viên bộ môn';
      case 'reviewer': return 'Chuyên gia giám định';
      default: return 'Người dùng hệ thống';
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileForm.fullName || !profileForm.email) {
      message.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/auth/users/${currentUser?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: profileForm.fullName,
          email: profileForm.email
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        message.success('Cập nhật hồ sơ cá nhân thành công!');
        setCurrentUser(data.user);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        setIsEditingProfile(false);
      } else {
        message.error(data.detail || data.message || 'Có lỗi xảy ra khi cập nhật hồ sơ');
      }
    } catch (error) {
      message.error('Không thể kết nối đến máy chủ');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      message.error('Vui lòng điền đầy đủ các trường mật khẩu');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      message.error('Mật khẩu mới và Xác nhận mật khẩu không khớp');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/auth/users/${currentUser?.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          old_password: passwordForm.oldPassword,
          new_password: passwordForm.newPassword
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        message.success('Đổi mật khẩu thành công!');
        setIsPasswordOpen(false);
      } else {
        message.error(data.detail || data.message || 'Có lỗi xảy ra khi đổi mật khẩu');
      }
    } catch (error) {
      message.error('Không thể kết nối đến máy chủ');
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={setCurrentUser} />;
  }

  return (
    <Layout className="min-h-screen bg-[#f5f7fa] font-sans" id="app-root-layout">
      {/* Sider collapsible sidebar */}
      <Sider
        id="app-left-navigation-sider"
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={275}
        collapsedWidth={80}
        theme="dark"
        className="shadow-xl sticky top-0 left-0 h-screen overflow-y-auto"
        style={{ backgroundColor: '#0f172a' }}
      >
        {/* Brand system Logo / Area */}
        <div className={`h-16 flex items-center border-b border-white/[0.08] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`} id="sidebar-brand-box">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                  <GlobalOutlined className="text-white text-base animate-pulse" />
                </div>
                <div className="flex flex-col select-none overflow-hidden text-ellipsis whitespace-nowrap">
                  <strong className="text-white text-xs font-black tracking-widest uppercase">SmartTest NHCH</strong>
                  <span className="text-[9px] text-blue-200 uppercase font-semibold">Tài nguyên Quốc gia</span>
                </div>
              </div>
              <Button
                type="text"
                icon={<MenuFoldOutlined style={{ color: '#ffffff', fontSize: '20px' }} />}
                onClick={() => setCollapsed(true)}
                className="flex items-center justify-center p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: '#ffffff' }}
              />
            </>
          ) : (
            <Button
              type="text"
              icon={<MenuUnfoldOutlined style={{ color: '#ffffff', fontSize: '20px' }} />}
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: '#ffffff' }}
            />
          )}
        </div>

        {/* Sidebar menu representation */}
        <Menu
          id="sidebar-navigation-menu"
          theme="dark"
          mode="inline"
          selectedKeys={[activeMenuKey]}
          style={{ backgroundColor: '#0f172a', borderRight: 0, padding: '12px 0' }}
          items={menuItems}
          onClick={({ key }) => setActiveMenuKey(key)}
          defaultOpenKeys={['xay-dung-de', 'quan-ly-nhch']}
          className="font-medium text-xs text-slate-100"
        />


      </Sider>

      <Layout className="flex flex-col h-screen overflow-y-auto" id="app-viewport-wrapper">

        {/* Top Header */}
        <Header
          id="app-top-main-header"
          className="px-5 border-b border-slate-800 flex items-center justify-between sticky top-0 z-50 h-16 shadow-lg shrink-0 transition-colors duration-300"
          style={{ backgroundColor: '#0f172a' }}
        >
          {/* Logo Title text container with school emblem placeholder icon */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 bg-contain" id="school-emblem-container">
              {/* Gold national star badge */}
              <span className="text-yellow-400 font-black text-xs">★</span>
            </div>
            <h1 className="text-white font-extrabold text-xs lg:text-[14px] uppercase tracking-wide leading-none my-0">
              PM QUẢN LÝ NHCH VÀ XÂY DỰNG ĐỀ THI
            </h1>
          </div>

          {/* Right Actions container */}
          <div className="flex items-center gap-4">
            <Badge count={2} size="small" id="notification-bell-badge">
              <Button
                type="text"
                shape="circle"
                id="btn-notif"
                className="bg-slate-800 hover:bg-slate-700 border-none flex items-center justify-center text-slate-300 cursor-pointer"
                onClick={() => message.info('Bạn đang có 2 thông báo thẩm định mới đang chờ phê duyệt chuyên môn.')}
                icon={<span className="text-xs">🔔</span>}
              />
            </Badge>

            {/* Drodown logged-in user details */}
            <Dropdown menu={userMenuItems} trigger={['click']} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-800 rounded-xl transition-all">
                <Avatar
                  style={{ backgroundColor: '#1e293b', verticalAlign: 'middle' }}
                  size="small"
                  className="font-black font-sans shrink-0 border border-slate-700"
                >
                  {getUserInitials(currentUser?.fullName || currentUser?.username || 'User')}
                </Avatar>
                <div className="hidden sm:flex flex-col text-left text-ellipsis overflow-hidden">
                  <span className="text-xs font-extrabold text-slate-100 leading-tight">
                    {currentUser?.fullName || currentUser?.username}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block leading-none">
                    {getRoleLabel(currentUser?.role)}
                  </span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Dynamic viewport container */}
        <Content className="p-6 overflow-y-auto flex-1 flex flex-col space-y-4" id="app-viewport-container">

          {/* Custom functional breadcrumbs */}
          <div className="flex items-center justify-between shrink-0" id="breadcrumbs-bar-container">
            <Breadcrumb
              className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
              items={
                getBreadcrumbTitle().split(/\s*\/\s*/).map(title => ({ title }))
              }
            />

            {/* <span className="text-[10px] bg-sky-100/70 border border-sky-200 text-[#0f172a] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider block">
              Hệ thống bảo mật 256-bit TLS
            </span> */}
          </div>

          {/* Yielded workspace content active view */}
          <div className="flex-1" id="main-content-yield-view">
            {renderMainViewContent()}
          </div>
        </Content>
      </Layout>

      {/* Global Module 1: Questions & Exam Review / Validation modal */}
      <ReviewModal
        visible={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setSelectedReviewQuestion(null);
        }}
        question={selectedReviewQuestion}
        onApprove={handleApproveQuestion}
        onReject={handleRejectQuestion}
      />

      {/* Profile Detail Dialog */}
      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-1.5">
            <UserOutlined className="text-[#0f172a]" />
            <span className="font-extrabold uppercase text-[13px] text-slate-800">Thông tin hồ sơ cá nhân</span>
          </div>
        }
        open={isProfileOpen}
        onCancel={() => setIsProfileOpen(false)}
        footer={
          isEditingProfile ? [
            <Button key="cancel" onClick={() => setIsEditingProfile(false)} className="rounded-xl font-bold text-xs">
              Hủy bỏ
            </Button>,
            <Button key="save" type="primary" onClick={handleUpdateProfile} className="rounded-xl font-bold text-xs bg-[#0f172a] border-transparent text-white">
              Lưu thay đổi
            </Button>
          ] : [
            <Button key="edit" onClick={() => setIsEditingProfile(true)} className="rounded-xl font-bold text-xs border-slate-300">
              Chỉnh sửa hồ sơ
            </Button>,
            <Button key="close" type="primary" onClick={() => setIsProfileOpen(false)} className="rounded-xl font-bold text-xs bg-[#0f172a] border-transparent text-white">
              Đóng
            </Button>
          ]
        }
        centered
        width={450}
      >
        <div className="space-y-4 pt-4 text-xs font-medium text-slate-650" id="profile-modal-body">
          <div className="flex items-center gap-4 bg-slate-50 border p-4 rounded-2xl">
            <Avatar size={64} style={{ backgroundColor: '#0f172a' }}>
              {getUserInitials(currentUser?.fullName || currentUser?.username || 'User')}
            </Avatar>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">{currentUser?.fullName || currentUser?.username}</h3>
              <p className="text-slate-400 text-[11px] block mt-1">Tài khoản: {currentUser?.username}</p>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase mt-2 inline-block">
                {getRoleLabel(currentUser?.role)}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {isEditingProfile ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 font-bold block mb-1">Họ và tên</label>
                  <Input
                    value={profileForm.fullName}
                    onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="rounded-lg border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold block mb-1">Email liên hệ</label>
                  <Input
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="rounded-lg border-slate-300"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between border-b pb-1.5 border-dashed">
                  <span className="text-slate-400">Trạng thái:</span>
                  <strong className={currentUser?.status === 'active' ? 'text-emerald-600' : 'text-red-600'}>
                    {currentUser?.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}
                  </strong>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-dashed">
                  <span className="text-slate-400">Họ và tên:</span>
                  <strong className="text-slate-800">{currentUser?.fullName || 'Chưa cập nhật'}</strong>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-dashed">
                  <span className="text-slate-400">Email:</span>
                  <strong className="text-slate-800">{currentUser?.email || 'Chưa cập nhật'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quyền truy cập:</span>
                  <strong className="text-slate-800 uppercase text-[10px] tracking-wide">{currentUser?.role}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Password Change Dialog */}
      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-1.5">
            <KeyOutlined className="text-[#0f172a]" />
            <span className="font-extrabold uppercase text-[13px] text-slate-800">Thay đổi mật khẩu</span>
          </div>
        }
        open={isPasswordOpen}
        onCancel={() => setIsPasswordOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsPasswordOpen(false)} className="rounded-xl font-bold text-xs">
            Hủy bỏ
          </Button>,
          <Button key="save" type="primary" onClick={handleChangePassword} className="rounded-xl font-bold text-xs bg-[#0f172a] border-transparent text-white">
            Cập nhật mật khẩu
          </Button>
        ]}
        centered
        width={400}
      >
        <div className="space-y-4 pt-4 text-xs font-medium text-slate-650">
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-bold">Mật khẩu hiện tại</label>
            <Input.Password
              value={passwordForm.oldPassword}
              onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              className="rounded-lg border-slate-300"
              placeholder="Nhập mật khẩu cũ..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-bold">Mật khẩu mới</label>
            <Input.Password
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="rounded-lg border-slate-300"
              placeholder="Nhập mật khẩu mới..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-bold">Xác nhận mật khẩu mới</label>
            <Input.Password
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="rounded-lg border-slate-300"
              placeholder="Nhập lại mật khẩu mới..."
            />
          </div>
        </div>
      </Modal>

    </Layout>
  );
}
