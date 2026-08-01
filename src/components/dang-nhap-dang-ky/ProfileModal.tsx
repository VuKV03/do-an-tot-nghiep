import React, { useState, useEffect } from 'react';
import { Modal, Button, Avatar, Input, Tooltip } from 'antd';
import { toast } from '../../utils/toast';
import { UserOutlined } from '@ant-design/icons';
import { SystemUser } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUser | null;
  setCurrentUser: (user: SystemUser) => void;
  getUserInitials: (name: string) => string;
  getRoleLabel: (role?: string) => string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  setCurrentUser,
  getUserInitials,
  getRoleLabel,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setProfileForm({
        fullName: currentUser.fullName || '',
        email: currentUser.email || ''
      });
      setIsEditingProfile(false);
    }
  }, [isOpen, currentUser]);

  const handleUpdateProfile = async () => {
    if (!profileForm.fullName || !profileForm.email) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setSaving(true);
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
        toast.success('Cập nhật hồ sơ cá nhân thành công!');
        setCurrentUser(data.user);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        setIsEditingProfile(false);
      } else {
        toast.error(data.detail || data.message || 'Có lỗi xảy ra khi cập nhật hồ sơ');
      }
    } catch (error) {
      toast.error('Không thể kết nối đến máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <div className="border-b pb-2 flex items-center gap-1.5">
          <UserOutlined className="text-[#0f172a]" />
          <span className="font-extrabold uppercase text-[13px] text-slate-800">Thông tin hồ sơ cá nhân</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={
        isEditingProfile ? [
          <Button key="cancel" onClick={() => setIsEditingProfile(false)} disabled={saving} className="rounded-xl font-bold text-xs">
            Hủy bỏ
          </Button>,
          <Button key="save" type="primary" onClick={handleUpdateProfile} loading={saving} className="rounded-xl font-bold text-xs bg-[#0f172a] border-transparent text-white">
            Lưu thay đổi
          </Button>
        ] : [
          <Button key="edit" onClick={() => setIsEditingProfile(true)} className="rounded-xl font-bold text-xs border-slate-300">
            Chỉnh sửa hồ sơ
          </Button>,
          <Button key="close" type="primary" onClick={onClose} className="rounded-xl font-bold text-xs bg-[#0f172a] border-transparent text-white">
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
              {currentUser?.groups && currentUser.groups.length > 0 
                ? currentUser.groups.map(g => g.name).join(', ') 
                : getRoleLabel(currentUser?.role)}
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
              <div className="flex flex-col gap-1.5 pt-1.5">
                <span className="text-slate-400">Quyền truy cập & Nhóm:</span>
                {currentUser?.groups && currentUser.groups.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {currentUser.groups.map(g => (
                       <Tooltip 
                          title={
                            <div className="text-xs">
                              <div className="font-bold mb-1 border-b border-white/20 pb-1">Chi tiết phân quyền:</div>
                              {g.permissions && g.permissions.length > 0 
                                ? g.permissions.join(', ')
                                : 'Không có quyền cụ thể'}
                            </div>
                          } 
                          key={g.id}
                          placement="top"
                       >
                         <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] px-2 py-0.5 rounded cursor-help uppercase font-bold">
                           {g.name}
                         </span>
                       </Tooltip>
                    ))}
                  </div>
                ) : (
                  <strong className="text-slate-800 uppercase text-[10px] tracking-wide">{currentUser?.role}</strong>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProfileModal;
