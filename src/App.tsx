import React, { useState, useEffect } from 'react';
import {
  Layout,
  Button,
  Breadcrumb
} from 'antd';
import {
  LockOutlined,
  ProfileOutlined
} from '@ant-design/icons';
import { Question, MatrixConfig, AuditLog, SystemUser } from './types';
import { useAppState } from './hooks/useAppState';
import DashboardOverview from './components/DashboardOverview';
import QuestionBankModule from './components/quan-ly-nhch/ngan-hang-cau-hoi/tab-ngan-hang-cau-hoi';
import MatrixConfigModule from './components/xay-dung-de-thi/quan-ly-ma-tran-de/MatrixConfigModule';
import QuestionTopicsModule from './components/quan-ly-nhch/QuestionTopicsModule';
import QuestionStatsModule from './components/quan-ly-nhch/thong-ke-nhch/QuestionStatsModule';
import ReviewModal from './components/ReviewModal';
import SystemAdminModule from './components/quan-tri-he-thong/SystemAdminModule';
import CategoryAdminModule from './components/CategoryAdminModule';
import ExamManagementModule from './components/xay-dung-de-thi/quan-ly-de-goc/ExamManagementModule';
import PackageManagementModule from './components/xay-dung-de-thi/quan-ly-goi-de/PackageManagementModule';
import QuanLyThiSinh from './components/quan-ly-thi/QuanLyThiSinh';
import QuanLyKetQuaThi from './components/quan-ly-thi/QuanLyKetQuaThi';
import Login from './components/dang-nhap-dang-ky/Login';
import ExamPortal from './components/quan-ly-thi/quan-ly-dang-nhap-thi/ExamPortal';
import CandidateLogin from './components/quan-ly-thi/quan-ly-dang-nhap-thi/CandidateLogin';
import CandidateDashboard from './components/quan-ly-thi/quan-ly-dang-nhap-thi/CandidateDashboard';
import ProfileModal from './components/dang-nhap-dang-ky/ProfileModal';
import PasswordModal from './components/dang-nhap-dang-ky/PasswordModal';
import { checkUserPermission } from './utils/permissionUtils';
import { getBreadcrumbTitle, getUserInitials, getRoleLabel } from './utils/helpers';
import { rawMenuItems } from './config/menuConfig';
import AppSidebar from './components/layout/AppSidebar';
import AppHeader from './components/layout/AppHeader';
import { ToastContainer, toast } from './utils/toast';
import { API_ORIGIN } from './config/apiBase';

const { Header, Sider, Content } = Layout;

export default function App() {
  const isPortalPort = window.location.port === '5174' || window.location.hostname.startsWith('thi.');

  const [collapsed, setCollapsed] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    if (isPortalPort) return hash || 'dang-nhap-thi';
    if (hash === 'login-admin') return 'dashboard';
    return hash || 'dashboard';
  });

  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    const cachedUser = localStorage.getItem('user_info');
    const token = localStorage.getItem('auth_token');
    if (cachedUser && token) {
      try {
        return JSON.parse(cachedUser);
      } catch (e) {
        localStorage.removeItem('user_info');
        localStorage.removeItem('auth_token');
        return null;
      }
    }
    return null;
  });
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  // Sync latest user profile on page reload (F5) so assignments like subjects update without logout
  useEffect(() => {
    const fetchLatestUserInfo = async () => {
      const cachedUser = localStorage.getItem('user_info');
      const token = localStorage.getItem('auth_token');
      if (cachedUser && token) {
        try {
          const userObj = JSON.parse(cachedUser);
          const res = await fetch(`${API_ORIGIN}/api/auth/users`);
          const data = await res.json();
          if (data.success && data.data) {
            const latestUser = data.data.find((u: any) => u.id === userObj.id);
            if (latestUser) {
              if (
                latestUser.status !== 'active' || 
                (userObj.passwordVersion && latestUser.passwordVersion && userObj.passwordVersion !== latestUser.passwordVersion)
              ) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user_info');
                setCurrentUser(null);
                toast.error('Phiên đăng nhập đã hết hạn do thay đổi thông tin xác thực từ Quản trị viên. Vui lòng đăng nhập lại.');
                return;
              }
              setCurrentUser(latestUser);
              localStorage.setItem('user_info', JSON.stringify(latestUser));
            }
          }
        } catch (e) {
          console.error('Failed to sync latest user info on reload', e);
        }
      }
    };
    fetchLatestUserInfo();
  }, []);

  // Listen for cross-tab force logout events and persistent F5 logout (from Admin)
  useEffect(() => {
    const checkForceLogout = () => {
      const cachedUser = localStorage.getItem('user_info');
      if (cachedUser) {
        try {
          const userObj = JSON.parse(cachedUser);
          const forceLogoutKey = 'force_logout_' + userObj.id;
          if (localStorage.getItem(forceLogoutKey)) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_info');
            localStorage.removeItem(forceLogoutKey);
            setCurrentUser(null);
            toast.error('Phiên đăng nhập đã bị vô hiệu hóa do thay đổi thông tin từ Quản trị viên. Vui lòng đăng nhập lại.');
          }
        } catch (e) {}
      }
    };

    checkForceLogout(); // Check on mount (handles F5)

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('force_logout_')) {
        checkForceLogout();
      }
    };
    window.addEventListener('storage', handleStorage);

    try {
      const bc = new BroadcastChannel('auth_channel');
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'force_logout') {
          checkForceLogout();
        }
      };
      return () => {
        bc.close();
        window.removeEventListener('storage', handleStorage);
      };
    } catch(e) {
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, []);

  // ── Set document title based on port ──
  useEffect(() => {
    if (isPortalPort) {
      document.title = 'CỔNG THI TRỰC TUYẾN';
    }
  }, [isPortalPort]);

  // Sync state to URL hash (admin portal only)
  useEffect(() => {
    if (isPortalPort) return; // Portal uses its own hash routing

    if (!currentUser) {
      if (window.location.hash !== '#login-admin') {
        window.location.hash = 'login-admin';
      }
    } else {
      if (window.location.hash === '#login-admin' || !window.location.hash) {
        window.location.hash = activeMenuKey || 'dashboard';
      } else if (activeMenuKey && window.location.hash !== `#${activeMenuKey}`) {
        window.location.hash = activeMenuKey;
      }
    }
  }, [activeMenuKey, isPortalPort, currentUser]);

  // Listen to hash changes — admin portal only
  useEffect(() => {
    if (isPortalPort) return;
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');

      if (!currentUser) {
        if (hash !== 'login-admin') {
          window.location.hash = 'login-admin';
        }
      } else {
        if (hash === 'login-admin') {
          window.location.hash = activeMenuKey || 'dashboard';
        } else if (hash && hash !== activeMenuKey) {
          setActiveMenuKey(hash);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeMenuKey, isPortalPort, currentUser]);

  const {
    questions,
    matrices,
    auditLogs,
    setAuditLogs,
    isReviewOpen,
    setIsReviewOpen,
    selectedReviewQuestion,
    setSelectedReviewQuestion,
    handleAddQuestion,
    handleUpdateQuestion,
    handleDeleteQuestion,
    handleDeleteMatrix,
    handleSaveMatrix,
    handleOpenReview,
    handleApproveQuestion,
    handleRejectQuestion,
    exams,
  } = useAppState();

  // Personal Profile Modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Password Modal state
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  // Navigation controller helper
  const [targetSubTab, setTargetSubTab] = useState<string | null>(null);

  const handleDashboardNavigate = (tab: 'question-bank' | 'matrix-config' | 'quan-ly-de-thi-goi-de', subTab?: string) => {
    if (subTab) {
      setTargetSubTab(subTab);
    } else {
      setTargetSubTab(null);
    }

    if (tab === 'question-bank') {
      setActiveMenuKey('ngan-hang-cau-hoi');
    } else if (tab === 'matrix-config') {
      setActiveMenuKey('quan-ly-ma-tran-de');
    } else if (tab === 'quan-ly-de-thi-goi-de') {
      setActiveMenuKey('quan-ly-de-thi-goi-de');
    }
  };

  const hasPermission = React.useCallback((key: string) => {
    return checkUserPermission(currentUser, key);
  }, [currentUser]);

  const menuItems = React.useMemo(() => {
    const filterMenuByPermissions = (items: any[]): any[] => {
      return items.reduce((acc, item) => {
        if (item.children) {
          const filteredChildren = filterMenuByPermissions(item.children);
          if (filteredChildren.length > 0) {
            acc.push({ ...item, children: filteredChildren });
          }
        } else {
          if (hasPermission(item.key)) {
            acc.push(item);
          }
        }
        return acc;
      }, []);
    };
    return filterMenuByPermissions(rawMenuItems);
  }, [rawMenuItems, hasPermission]);

  useEffect(() => {
    if (currentUser && menuItems.length > 0) {
      if (activeMenuKey === 'no-access') {
        setActiveMenuKey('dashboard');
      } else if (activeMenuKey !== 'dashboard' && !hasPermission(activeMenuKey)) {
        const findFirstLeaf = (items: any[]): string | null => {
          for (const item of items) {
            if (item.children) {
              const leaf = findFirstLeaf(item.children);
              if (leaf) return leaf;
            } else {
              return item.key;
            }
          }
          return null;
        };
        const first = findFirstLeaf(menuItems);
        if (first) {
          setActiveMenuKey(first);
        } else {
          setActiveMenuKey('no-access');
        }
      }
    } else if (currentUser && menuItems.length === 0) {
      setActiveMenuKey('no-access');
    }
  }, [currentUser, activeMenuKey, menuItems, hasPermission]);

  // Dynamic Content viewport rendering corresponding to active Tab
  const renderMainViewContent = () => {
    if (activeMenuKey !== 'dashboard' && activeMenuKey !== 'no-access' && !hasPermission(activeMenuKey)) {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-xs my-8 space-y-5 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-red-50 border border-red-150 rounded-full flex items-center justify-center mx-auto">
            <LockOutlined className="text-red-400 text-2xl" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">TRUY CẬP BỊ TỪ CHỐI</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto font-medium">
              Bạn không có quyền truy cập vào chức năng này. Vui lòng liên hệ quản trị viên để được cấp quyền.
            </p>
          </div>
        </div>
      );
    }

    if (activeMenuKey === 'no-access') {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-xs my-8 space-y-5 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center mx-auto">
            <LockOutlined className="text-slate-400 text-2xl" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">KHÔNG CÓ QUYỀN TRUY CẬP</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto font-medium">
              Tài khoản của bạn chưa được phân quyền sử dụng bất kỳ chức năng nào trong hệ thống.
            </p>
          </div>
        </div>
      );
    }

    switch (activeMenuKey) {
      case 'dashboard':
        return (
          <DashboardOverview
            questions={questions}
            matrices={matrices}
            auditLogs={auditLogs}
            exams={exams}
            onNavigate={handleDashboardNavigate}
          />
        );
      case 'ngan-hang-cau-hoi':
        return (
          <QuestionBankModule
            onAddQuestion={handleAddQuestion}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onOpenReview={handleOpenReview}
            initialTab={targetSubTab as 'bank' | 'review'}
            currentUser={currentUser}
          />
        );
      case 'quan-ly-ma-tran-de':
        return (
          <MatrixConfigModule
            initialTab={targetSubTab as 'list' | 'evaluation'}
            currentUser={currentUser}
          />
        );
      case 'chu-de-cau-hoi':
        return (
          <QuestionTopicsModule
            questions={questions}
            currentUser={currentUser}
          />
        );
      case 'thong-ke-nhch':
        return (
          <QuestionStatsModule
            questions={questions}
            currentUser={currentUser}
          />
        );
      case 'quan-ly-de-thi-goi-de':
        return (
          <ExamManagementModule
            onNavigateTab={(key) => setActiveMenuKey(key)}
            currentUser={currentUser}
          />
        );
      case 'quan-ly-goi-de':
        return (
          <PackageManagementModule
            currentUser={currentUser}
          />
        );

      case 'quan-ly-thi-sinh':
        return <QuanLyThiSinh />;
      case 'quan-ly-ket-qua-thi':
        return <QuanLyKetQuaThi />;
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

  // ── Portal hash routing (port 5174) ──
  // Sync portal state → URL hash
  useEffect(() => {
    if (!isPortalPort) return;
    if (!currentUser) {
      window.location.hash = 'dang-nhap-thi';
    } else if (currentUser.role === 'candidate' && !activeSubject) {
      window.location.hash = 'chon-mon-thi';
    } else if (currentUser.role === 'candidate' && activeSubject) {
      // thong-tin-thi-sinh is the "waiting" screen, lam-bai-thi is set by ExamPortal internally
      const currentHash = window.location.hash.replace('#', '');
      if (currentHash !== 'lam-bai-thi') {
        window.location.hash = 'thong-tin-thi-sinh';
      }
    }
  }, [isPortalPort, currentUser, activeSubject]);

  // Handle browser back/forward for portal
  useEffect(() => {
    if (!isPortalPort) return;
    const handlePortalHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'dang-nhap-thi') {
        localStorage.removeItem('user_info');
        localStorage.removeItem('auth_token');
        setCurrentUser(null);
        setActiveSubject(null);
      } else if (hash === 'chon-mon-thi') {
        setActiveSubject(null);
      }
    };
    window.addEventListener('hashchange', handlePortalHash);
    return () => window.removeEventListener('hashchange', handlePortalHash);
  }, [isPortalPort]);

  if (isPortalPort) {
    if (!currentUser) {
      return <CandidateLogin onLoginSuccess={setCurrentUser} />;
    }
    if (currentUser.role === 'candidate') {
      if (!activeSubject) {
        return (
          <CandidateDashboard
            currentUser={currentUser}
            onLogout={() => {
              localStorage.removeItem('user_info');
              localStorage.removeItem('auth_token');
              setCurrentUser(null);
              setActiveSubject(null);
              window.location.hash = 'dang-nhap-thi';
            }}
            onStartExam={(subject) => {
              setActiveSubject(subject);
              window.location.hash = 'thong-tin-thi-sinh';
            }}
          />
        );
      }
      return (
        <ExamPortal
          currentUser={currentUser}
          subject={activeSubject}
          onLogout={() => {
            setActiveSubject(null);
            window.location.hash = 'chon-mon-thi';
          }}
          onExamStart={() => {
            window.location.hash = 'lam-bai-thi';
          }}
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <h2 className="text-xl font-bold text-red-600 mb-4">Đây là cổng thi dành cho thí sinh</h2>
        <p className="mb-4 text-slate-600">Tài khoản quản trị viên không thể truy cập tại đây.</p>
        <Button onClick={() => {
          localStorage.removeItem('user_info');
          localStorage.removeItem('auth_token');
          setCurrentUser(null);
          window.location.hash = 'dang-nhap-thi';
        }}>Đăng xuất</Button>
      </div>
    );
  }

  // Giao diện Quản trị (Port 5173)
  if (!currentUser) {
    return <Login onLoginSuccess={setCurrentUser} />;
  }

  if (currentUser.role === 'candidate') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <h2 className="text-xl font-bold text-red-600 mb-4">Đây là cổng dành cho Quản trị viên</h2>
        <p className="mb-4 text-slate-600">Thí sinh vui lòng truy cập cổng thi.</p>
        <Button onClick={() => {
          localStorage.removeItem('user_info');
          localStorage.removeItem('auth_token');
          setCurrentUser(null);
        }}>Đăng xuất</Button>
      </div>
    );
  }

  return (
    <Layout className="min-h-screen bg-[#f5f7fa] font-sans" id="app-root-layout">
      <ToastContainer />
      <AppSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeMenuKey={activeMenuKey}
        setActiveMenuKey={(key) => {
          setTargetSubTab(null);
          setActiveMenuKey(key);
        }}
        menuItems={menuItems}
      />

      <Layout className="flex flex-col h-screen overflow-y-auto" id="app-viewport-wrapper">

        <AppHeader
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          setIsProfileOpen={setIsProfileOpen}
          setIsPasswordOpen={setIsPasswordOpen}
        />

        {/* Dynamic viewport container */}
        <Content className="p-6 overflow-y-auto flex-1 flex flex-col space-y-4" id="app-viewport-container">

          {/* Custom functional breadcrumbs - hidden on dashboard */}
          {activeMenuKey !== 'dashboard' && (
            <div className="flex items-center justify-between shrink-0" id="breadcrumbs-bar-container">
              <Breadcrumb
                className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
                items={
                  getBreadcrumbTitle(activeMenuKey).split(/\s*\/\s*/).map(title => ({ title }))
                }
              />
            </div>
          )}

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
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        getUserInitials={getUserInitials}
        getRoleLabel={getRoleLabel}
      />

      {/* Password Change Dialog */}
      <PasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        currentUser={currentUser}
      />

    </Layout>
  );
}
