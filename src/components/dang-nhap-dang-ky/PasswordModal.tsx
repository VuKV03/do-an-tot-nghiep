import React, { useState } from 'react';
import { Modal, Button, Input, message } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import { SystemUser } from '../../types';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUser | null;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      message.error('Vui lòng điền đầy đủ các trường mật khẩu');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      message.error('Mật khẩu mới và Xác nhận mật khẩu không khớp');
      return;
    }

    setSaving(true);
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
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        onClose();
      } else {
        message.error(data.detail || data.message || 'Có lỗi xảy ra khi đổi mật khẩu');
      }
    } catch (error) {
      message.error('Không thể kết nối đến máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <div className="border-b pb-2 flex items-center gap-1.5">
          <KeyOutlined className="text-[#0f172a]" />
          <span className="font-extrabold uppercase text-[13px] text-slate-800">Thay đổi mật khẩu</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving} className="rounded-xl font-bold text-xs">
          Hủy bỏ
        </Button>,
        <Button key="save" type="primary" onClick={handleChangePassword} loading={saving} className="rounded-xl font-bold text-xs bg-[#0f172a] border-transparent text-white">
          Cập nhật mật khẩu
        </Button>
      ]}
      centered
      width={400}
      afterClose={() => setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })}
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
  );
};

export default PasswordModal;
