import React from 'react';
import { Layout, Dropdown, Avatar, Modal, Button } from 'antd';
import { toast } from '../../utils/toast';
import {
  UserOutlined,
  KeyOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { SystemUser } from '../../types';
import { getUserInitials, getRoleLabel } from '../../utils/helpers';

const { Header } = Layout;

interface AppHeaderProps {
  currentUser: SystemUser | null;
  setCurrentUser: (user: SystemUser | null) => void;
  setIsProfileOpen: (open: boolean) => void;
  setIsPasswordOpen: (open: boolean) => void;
}

export default function AppHeader({
  currentUser,
  setCurrentUser,
  setIsProfileOpen,
  setIsPasswordOpen,
}: AppHeaderProps) {

  const userMenuItems = {
    items: [
      {
        key: 'profile',
        label: 'Hồ sơ cá nhân',
        icon: <UserOutlined />,
        onClick: () => {
          setIsProfileOpen(true);
        }
      },
      {
        key: 'password',
        label: 'Đổi mật khẩu',
        icon: <KeyOutlined />,
        onClick: () => {
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
          toast.success('Bạn đã đăng xuất tài khoản một cách an toàn!');
        }
      }
    ]
  };

  return (
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
              <span className="text-[10px] text-slate-400 font-bold block leading-none truncate max-w-[120px]" title={currentUser?.groups?.map(g => g.name).join(', ') || getRoleLabel(currentUser?.role)}>
                {currentUser?.groups && currentUser.groups.length > 0 
                  ? currentUser.groups.map(g => g.name).join(', ') 
                  : getRoleLabel(currentUser?.role)}
              </span>
            </div>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
}
