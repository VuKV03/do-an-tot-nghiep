import React, { useState } from 'react';
import { 
  Button, 
  Tag, 
  Modal, 
  Checkbox, 
  Alert, 
  message, 
  Divider,
  Form,
  Input,
  Popconfirm
} from 'antd';
import {
  SettingOutlined,
  TeamOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { AuditLog } from '../../../types';
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

interface UserGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  memberCount: number;
  permissions: string[];
}

interface GroupManagementProps {
  onAddAuditLog: (log: AuditLog) => void;
  setSecurityLogs: React.Dispatch<React.SetStateAction<SecurityLog[]>>;
}

export default function GroupManagement({ onAddAuditLog, setSecurityLogs }: GroupManagementProps) {
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/auth/groups`);
      if (res.data.success) {
        setUserGroups(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      message.error('Không thể tải danh sách nhóm.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchGroups();
  }, []);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [activeGroupForPermissions, setActiveGroupForPermissions] = useState<UserGroup | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [form] = Form.useForm();

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

  const handleOpenPermissionEditor = (group: UserGroup) => {
    setActiveGroupForPermissions(group);
    setSelectedPermissions(group.permissions);
    setIsGroupModalOpen(true);
  };

  const handleAddGroup = () => {
    setEditingGroup(null);
    form.resetFields();
    setIsEditGroupModalOpen(true);
  };

  const handleEditGroup = (group: UserGroup) => {
    setEditingGroup(group);
    form.setFieldsValue({
      code: group.code,
      name: group.name,
      description: group.description,
    });
    setIsEditGroupModalOpen(true);
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    try {
      const res = await axios.delete(`${API_URL}/auth/groups/${groupId}`);
      if (res.data.success) {
        setUserGroups(prev => prev.filter(g => g.id !== groupId));
        message.success(`Đã xóa nhóm "${groupName}"`);
        onAddAuditLog({
          id: `log-sec-${Date.now()}`,
          user: 'Quản trị viên',
          action: 'Xóa nhóm người dùng',
          timestamp: new Date().toISOString(),
          details: `Đã xóa nhóm: "${groupName}"`
        });
      }
    } catch (err: any) {
      console.error('Error deleting group:', err);
      message.error(err.response?.data?.detail || 'Không thể xóa nhóm.');
    }
  };

  const handleSaveGroup = async () => {
    try {
      const values = await form.validateFields();
      if (editingGroup) {
        const res = await axios.put(`${API_URL}/auth/groups/${editingGroup.id}`, values);
        if (res.data.success) {
          setUserGroups(prev => prev.map(g => g.id === editingGroup.id ? res.data.group : g));
          message.success(`Đã cập nhật nhóm "${values.name}"`);
          onAddAuditLog({
            id: `log-sec-${Date.now()}`,
            user: 'Quản trị viên',
            action: 'Cập nhật nhóm người dùng',
            timestamp: new Date().toISOString(),
            details: `Đã cập nhật thông tin nhóm: "${values.name}"`
          });
        }
      } else {
        const res = await axios.post(`${API_URL}/auth/groups`, values);
        if (res.data.success) {
          setUserGroups(prev => [...prev, res.data.group]);
          message.success(`Đã thêm mới nhóm "${values.name}"`);
          onAddAuditLog({
            id: `log-sec-${Date.now()}`,
            user: 'Quản trị viên',
            action: 'Thêm mới nhóm người dùng',
            timestamp: new Date().toISOString(),
            details: `Đã tạo nhóm mới: "${values.name}"`
          });
        }
      }
      setIsEditGroupModalOpen(false);
    } catch (err: any) {
      if (err.response) {
        message.error(err.response?.data?.detail || 'Lỗi khi lưu thông tin nhóm.');
      } else {
        // form validation failed
      }
    }
  };

  const handleSaveGroupPermissions = async () => {
    if (!activeGroupForPermissions) return;

    try {
      const res = await axios.put(`${API_URL}/auth/groups/${activeGroupForPermissions.id}`, {
        permissions: selectedPermissions
      });

      if (res.data.success) {
        setUserGroups(prev => prev.map(g => {
          if (g.id === activeGroupForPermissions.id) {
            return res.data.group;
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
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Lỗi khi cập nhật quyền hạn.');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-white border rounded-2xl p-4 shadow-xxs">
        <div className="flex-1 mr-4">
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest mb-1 select-none">TỔNG QUAN PHÂN VAI TRÒ CHỈ THỊ</span>
          <div className="text-xs text-slate-500 font-semibold leading-relaxed">
            Các tài khoản cán bộ sẽ thừa hưởng toàn bộ các quyền gán tương ứng theo phạm vi chức năng (Scope matrix). Việc thay đổi quyền hạ tầng sẽ lập tức đồng bộ hóa trên các phiên làm việc của người dùng.
          </div>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAddGroup}
          className="bg-blue-600 h-10 px-5 rounded-xl font-bold shadow-sm hover:shadow-md transition-all text-xs"
        >
          Thêm Nhóm
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="user-roles-group-grid">
        {userGroups.map(group => (
          <div 
            key={group.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xs transition-shadow flex flex-col space-y-4"
          >
            <div className="flex items-center justify-between border-b border-dashed pb-3 select-none">
              <div className="flex items-center gap-2">
                <strong className="text-slate-800 text-xs font-black uppercase tracking-wider">{group.name}</strong>
                <Tag color="blue" className="rounded-md font-mono font-black text-[9px] uppercase m-0 py-0.5 px-2.5">
                  {group.code}
                </Tag>
              </div>
              <div className="flex gap-1">
                <Button 
                  size="small" 
                  type="text" 
                  icon={<EditOutlined />} 
                  onClick={() => handleEditGroup(group)}
                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors w-7 h-7 flex items-center justify-center"
                />
                <Popconfirm
                  title="Xóa nhóm người dùng"
                  description="Bạn có chắc chắn muốn xóa nhóm này?"
                  onConfirm={() => handleDeleteGroup(group.id, group.name)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button 
                    size="small" 
                    type="text" 
                    icon={<DeleteOutlined />} 
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors w-7 h-7 flex items-center justify-center"
                  />
                </Popconfirm>
              </div>
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

      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-1.5 select-none">
            <TeamOutlined className="text-blue-900" />
            <span className="font-extrabold uppercase text-[12px] text-slate-800">
              {editingGroup ? 'CẬP NHẬT THÔNG TIN NHÓM' : 'THÊM MỚI NHÓM NGƯỜI DÙNG'}
            </span>
          </div>
        }
        open={isEditGroupModalOpen}
        onCancel={() => setIsEditGroupModalOpen(false)}
        onOk={handleSaveGroup}
        okText={editingGroup ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy bỏ"
        centered
        width={480}
      >
        <div className="pt-4">
          <Form form={form} layout="vertical" className="text-xs">
            <Form.Item
              name="code"
              label={<span className="text-[11px] font-bold text-slate-700">Mã nhóm (VD: GRP_ADMIN)</span>}
              rules={[{ required: true, message: 'Vui lòng nhập mã nhóm' }]}
            >
              <Input placeholder="Nhập mã nhóm" className="rounded-lg text-sm" />
            </Form.Item>
            
            <Form.Item
              name="name"
              label={<span className="text-[11px] font-bold text-slate-700">Tên nhóm</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên nhóm' }]}
            >
              <Input placeholder="Nhập tên nhóm" className="rounded-lg text-sm" />
            </Form.Item>

            <Form.Item
              name="description"
              label={<span className="text-[11px] font-bold text-slate-700">Mô tả chi tiết</span>}
            >
              <Input.TextArea placeholder="Mô tả chức năng, vai trò của nhóm này" rows={3} className="rounded-lg text-sm" />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
