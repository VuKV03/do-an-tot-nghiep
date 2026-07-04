import React, { useState, useMemo } from 'react';
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
  Popconfirm,
  Table,
  Space,
  Empty,
  Pagination,
  Dropdown,
  Switch
} from 'antd';
import {
  SettingOutlined,
  TeamOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { AuditLog } from '../../../types';
import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api';

const MENU_STRUCTURE = [
  {
    key: 'xay-dung-de',
    label: 'Xây dựng đề thi',
    children: [
      { key: 'quan-ly-ma-tran-de', label: 'Quản lý ma trận đề' },
      { key: 'quan-ly-de-thi-goi-de', label: 'Quản lý đề thi & gói đề' }
    ]
  },
  {
    key: 'quan-ly-nhch',
    label: 'Quản lý ngân hàng câu hỏi',
    children: [
      { key: 'chu-de-cau-hoi', label: 'Chủ đề câu hỏi' },
      { key: 'ngan-hang-cau-hoi', label: 'Ngân hàng câu hỏi' },
      { key: 'thong-ke-nhch', label: 'Thống kê NHCH' }
    ]
  },
  {
    key: 'quan-tri-he-thong',
    label: 'Quản trị hệ thống',
    children: [
      { key: 'quan-ly-nguoi-dung', label: 'Quản lý người dùng' },
      { key: 'quan-ly-nhom-nguoi-dung', label: 'Quản lý nhóm người dùng' },
      { key: 'chinh-sach-bao-mat', label: 'Chính sách bảo mật' }
    ]
  },
  {
    key: 'quan-tri-danh-muc',
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

const PERMISSION_MAP: Record<string, string[]> = {
  'xay-dung-de': ['matrix.create', 'matrix.edit', 'matrix.delete', 'matrix.view', 'exams.create', 'exams.view', 'exams.delete', 'exams.edit'],
  'quan-ly-ma-tran-de': ['matrix.create', 'matrix.edit', 'matrix.delete', 'matrix.view'],
  'quan-ly-de-thi-goi-de': ['exams.create', 'exams.view', 'exams.delete', 'exams.edit'],
  
  'quan-ly-nhch': ['questions.view', 'questions.create', 'questions.edit', 'questions.delete', 'questions.approve', 'questions.review'],
  'chu-de-cau-hoi': ['questions.view', 'questions.approve', 'questions.review'],
  'ngan-hang-cau-hoi': ['questions.view', 'questions.create', 'questions.edit', 'questions.delete', 'questions.approve', 'questions.review'],
  'thong-ke-nhch': ['questions.view', 'questions.approve', 'questions.review'],
  
  'quan-tri-he-thong': ['system.users', 'system.groups', 'system.policies'],
  'quan-ly-nguoi-dung': ['system.users'],
  'quan-ly-nhom-nguoi-dung': ['system.groups'],
  'chinh-sach-bao-mat': ['system.policies'],
  
  'quan-tri-danh-muc': ['system.categories'],
  'danh-muc-mon-hoc': ['system.categories'],
  'danh-muc-khoi-lop': ['system.categories'],
  'cap-do-tu-duy': ['system.categories'],
  'loai-hinh-cau-hoi': ['system.categories'],
  'thanh-phan-nang-luc': ['system.categories'],
  'danh-muc-dot-thi': ['system.categories']
};
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
  status?: 'active' | 'inactive';
}

interface GroupManagementProps {
  onAddAuditLog: (log: AuditLog) => void;
  setSecurityLogs: React.Dispatch<React.SetStateAction<SecurityLog[]>>;
}

export default function GroupManagement({ onAddAuditLog, setSecurityLogs }: GroupManagementProps) {
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');

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
    fetchPermissions();
  }, []);

  const filteredGroups = useMemo(() => {
    return userGroups.filter(g => {
      const matchCode = g.code.toLowerCase().includes(searchCode.toLowerCase());
      const matchName = g.name.toLowerCase().includes(searchName.toLowerCase());
      return matchCode && matchName;
    });
  }, [userGroups, searchCode, searchName]);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [activeGroupForPermissions, setActiveGroupForPermissions] = useState<UserGroup | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const accessibleMenus = useMemo(() => {
    const hasAccess = (key: string) => {
      if (selectedPermissions.includes('system.*')) return true;
      const requiredPerms = PERMISSION_MAP[key];
      if (requiredPerms) {
        return requiredPerms.some(p => 
          selectedPermissions.includes(p) || selectedPermissions.some(vp => vp.endsWith('.*') && p.startsWith(vp.replace('.*', '')))
        );
      }
      return false;
    };

    const filterMenu = (items: any[]): any[] => {
      return items.reduce((acc, item) => {
        if (item.children) {
          const filteredChildren = filterMenu(item.children);
          if (filteredChildren.length > 0) {
            acc.push({ ...item, children: filteredChildren });
          }
        } else {
          if (hasAccess(item.key)) {
            acc.push(item);
          }
        }
        return acc;
      }, []);
    };

    return filterMenu(MENU_STRUCTURE);
  }, [selectedPermissions]);

  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [form] = Form.useForm();

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

  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [activeGroupForMembers, setActiveGroupForMembers] = useState<UserGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [tempSelectedUserIds, setTempSelectedUserIds] = useState<string[]>([]);
  const [searchUserAdd, setSearchUserAdd] = useState('');

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/users`);
      if (res.data.success) {
        setAllUsers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching all users:', err);
    }
  };

  const handleOpenMembersModal = async (group: UserGroup) => {
    setActiveGroupForMembers(group);
    setIsMembersModalOpen(true);
    setLoadingMembers(true);
    try {
      const res = await axios.get(`${API_URL}/auth/groups/${group.id}/members`);
      if (res.data.success) {
        setGroupMembers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      message.error('Không thể tải danh sách thành viên.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const [SYSTEM_PERMISSION_SCOPES, setSYSTEM_PERMISSION_SCOPES] = useState<{category: string, items: {key: string, label: string}[]}[]>([]);

  const fetchPermissions = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/permissions`);
      if (res.data.success) {
        const grouped: Record<string, {key: string, label: string}[]> = {};
        res.data.data.forEach((p: {code: string, name: string, module: string}) => {
          if (!grouped[p.module]) {
            grouped[p.module] = [];
          }
          grouped[p.module].push({ key: p.code, label: p.name });
        });
        const formatted = Object.keys(grouped).map(k => ({
          category: k,
          items: grouped[k]
        }));
        setSYSTEM_PERMISSION_SCOPES(formatted);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  const handleOpenPermissionEditor = (group: UserGroup) => {
    setActiveGroupForPermissions(group);
    setSelectedPermissions(group.permissions);
    setIsGroupModalOpen(true);
  };

  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupMembers([]);
    form.resetFields();
    setIsEditGroupModalOpen(true);
  };

  const handleEditGroup = async (group: UserGroup) => {
    setEditingGroup(group);
    form.setFieldsValue({
      code: group.code,
      name: group.name,
      description: group.description,
    });
    setIsEditGroupModalOpen(true);
    try {
      const res = await axios.get(`${API_URL}/auth/groups/${group.id}/members`);
      if (res.data.success) {
        setGroupMembers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const handleToggleGroupStatus = async (group: UserGroup, checked: boolean) => {
    const newStatus = checked ? 'active' : 'inactive';
    const statusText = checked ? 'Mở khóa' : 'Khóa';

    try {
      const res = await axios.put(`${API_URL}/auth/groups/${group.id}`, {
        status: newStatus
      });

      if (res.data.success) {
        await fetchGroups(); // Refresh list
        message.success(`Đã ${statusText.toLowerCase()} nhóm người dùng: ${group.name}`);
        
        await logSecurityAction(
          `${statusText} nhóm`,
          checked ? 'success' : 'warning',
          `Cập nhật trạng thái nhóm ${group.name} thành ${checked ? 'Hoạt động' : 'Đã khóa'}.`
        );
      }
    } catch (err: any) {
      console.error('Error toggling group status:', err);
      message.error(err.response?.data?.detail || 'Không thể thay đổi trạng thái nhóm.');
    }
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
      const payload = {
        ...values,
        member_ids: groupMembers.map(m => m.id)
      };
      if (editingGroup) {
        const res = await axios.put(`${API_URL}/auth/groups/${editingGroup.id}`, payload);
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
        const res = await axios.post(`${API_URL}/auth/groups`, payload);
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

        await logSecurityAction(
          'Thay đổi ma trận phân quyền',
          'danger',
          `Đã thiết lập lại ${selectedPermissions.length} quyền khả dụng cho nhóm ${activeGroupForPermissions.name}.`
        );

        message.success(`Cập nhật thành công quyền hạn cho nhóm "${activeGroupForPermissions.name}"`);
        setIsGroupModalOpen(false);
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Lỗi khi cập nhật quyền hạn.');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <h1 className="text-[#1a3b70] text-lg font-bold uppercase m-0">Quản lý nhóm người dùng</h1>
        <div className="w-5 h-5 bg-[#1a3b70] text-white rounded-full flex items-center justify-center font-bold text-xs cursor-pointer">
          ?
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-5">
        <h2 className="text-[#1a3b70] font-bold mb-4 text-sm">Tìm kiếm thông tin</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mã nhóm</label>
            <Input
              placeholder="Nhập mã nhóm"
              className="rounded text-sm py-1.5"
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên nhóm</label>
            <Input
              placeholder="Nhập tên nhóm"
              className="rounded text-sm py-1.5"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
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

      {/* Groups Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-[#1a3b70] font-bold text-sm m-0">Kết quả tìm kiếm</h2>
          <div className="flex gap-2">
            <Button type="primary" className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold text-xs rounded" onClick={handleAddGroup}>Thêm mới</Button>
            <Button className="border-[#1e40af] text-[#1e40af] font-semibold text-xs rounded">Xóa</Button>
            <Button className="border-[#1e40af] text-[#1e40af] font-semibold text-xs rounded">Xuất Excel</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-medium text-slate-700 border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-bold">
                <th className="py-3 px-4 text-left w-12"><input type="checkbox" className="rounded text-[#1e40af]" /></th>
                <th className="py-3 px-4 text-center w-16">STT</th>
                <th className="py-3 px-4 text-left">Mã nhóm</th>
                <th className="py-3 px-4 text-left">Tên nhóm</th>
                <th className="py-3 px-4 text-left">Mô tả chi tiết</th>
                <th className="py-3 px-4 text-center">Thành viên</th>
                <th className="py-3 px-4 text-center w-28">Trạng thái</th>
                <th className="py-3 px-4 text-center w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                    Đang tải dữ liệu nhóm...
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Empty description="Không tìm thấy thông tin nhóm nào phù hợp." />
                  </td>
                </tr>
              ) : (
                filteredGroups.map((g, index) => (
                  <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <input type="checkbox" className="rounded text-[#1e40af]" />
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{index + 1}</td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{g.code}</td>
                    <td className="py-3 px-4 text-slate-600">{g.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="truncate max-w-[200px]" title={g.description}>
                        {g.description || 'Không có mô tả'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div 
                        className="inline-flex items-center gap-1.5 text-blue-600 font-bold cursor-pointer hover:underline"
                        onClick={() => handleOpenMembersModal(g)}
                      >
                        <TeamOutlined /> {g.memberCount}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Dropdown
                        disabled={g.code === 'GRP_ADMIN'}
                        menu={{
                          items: [
                            { 
                              key: 'active', 
                              label: <span className="text-emerald-600 font-semibold text-xs">Đang hoạt động</span>, 
                              onClick: () => handleToggleGroupStatus(g, true) 
                            },
                            { 
                              key: 'inactive', 
                              label: <span className="text-red-500 font-semibold text-xs">Khóa</span>, 
                              onClick: () => handleToggleGroupStatus(g, false) 
                            }
                          ]
                        }}
                        trigger={['click']}
                      >
                        <div className={`inline-flex items-center justify-center ${g.code !== 'GRP_ADMIN' ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`} title={g.code === 'GRP_ADMIN' ? 'Không thể thay đổi trạng thái nhóm quản trị' : 'Nhấp để thay đổi trạng thái'}>
                          {g.status !== 'inactive' ? (
                            <span className="inline-flex items-center justify-center border border-emerald-500 text-emerald-600 px-3 py-1 rounded bg-white text-[11px] font-semibold w-28 hover:bg-emerald-50 transition-colors">
                              Đang hoạt động {g.code !== 'GRP_ADMIN' && <span className="ml-1 text-[8px]">▼</span>}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center border border-red-300 text-red-500 px-3 py-1 rounded bg-red-50 text-[11px] font-semibold w-28 hover:bg-red-100 transition-colors">
                              Đã khóa {g.code !== 'GRP_ADMIN' && <span className="ml-1 text-[8px]">▼</span>}
                            </span>
                          )}
                        </div>
                      </Dropdown>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Space size={12}>
                        <div 
                          className="bg-blue-50 text-[#1e40af] p-1.5 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => handleEditGroup(g)}
                          title="Chỉnh sửa thông tin nhóm"
                        >
                          <EditOutlined className="text-sm" />
                        </div>
                        <div 
                          className="bg-emerald-50 text-emerald-600 p-1.5 rounded cursor-pointer hover:bg-emerald-100 transition-colors"
                          onClick={() => handleOpenPermissionEditor(g)}
                          title="Thiết lập phân quyền"
                        >
                          <SettingOutlined className="text-sm" />
                        </div>
                        <div 
                          className="bg-rose-50 text-rose-600 p-1.5 rounded cursor-pointer hover:bg-rose-100 transition-colors"
                          onClick={() => {
                            Modal.confirm({
                              title: 'Xóa nhóm người dùng',
                              content: `Bạn có chắc chắn muốn xóa nhóm "${g.name}"?`,
                              okText: 'Xóa',
                              cancelText: 'Hủy',
                              okButtonProps: { danger: true },
                              onOk: () => handleDeleteGroup(g.id, g.name)
                            });
                          }}
                          title="Xóa nhóm"
                        >
                          <DeleteOutlined className="text-sm" />
                        </div>
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
            1 - {filteredGroups.length} / {filteredGroups.length} bản ghi
          </div>
          <Pagination 
            size="small" 
            total={filteredGroups.length} 
            showSizeChanger 
            showQuickJumper={false}
            defaultPageSize={10}
            pageSizeOptions={['10', '20', '50', '100']}
            locale={{ items_per_page: '/ trang' }}
          />
        </div>
      </div>

      {/* Permissions Modal */}
      <Modal
        title={
          <div className="text-xl font-bold text-slate-800">
            Phân quyền nhóm người dùng
          </div>
        }
        open={isGroupModalOpen}
        onCancel={() => setIsGroupModalOpen(false)}
        footer={
          <div className="flex justify-center gap-4 mt-6">
            <Button 
              key="back" 
              onClick={() => setIsGroupModalOpen(false)} 
              className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-40"
            >
              Hủy
            </Button>
            <Button 
              key="submit" 
              type="primary" 
              onClick={handleSaveGroupPermissions} 
              className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold rounded px-8 w-40"
            >
              Lưu thay đổi
            </Button>
          </div>
        }
        centered
        width={1000}
        closeIcon={<span className="text-slate-500 hover:text-slate-700 text-lg font-bold">&times;</span>}
      >
        {activeGroupForPermissions && (
          <div className="pt-4 text-sm font-medium">
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg select-none mb-4">
              <span className="text-xs font-bold text-[#1e40af] block mb-1">Nhóm người dùng:</span>
              <strong className="text-slate-800 text-sm block">{activeGroupForPermissions.name}</strong>
              {activeGroupForPermissions.description && (
                <p className="text-xs text-slate-600 mt-1 mb-0 leading-relaxed">
                  {activeGroupForPermissions.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-3">
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Danh sách Quyền hạn</h3>
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                  {SYSTEM_PERMISSION_SCOPES.map(scope => {
                    const categoryKeys = scope.items.map(item => item.key);
                    const isAllChecked = categoryKeys.every(key => 
                      selectedPermissions.includes(key) || 
                      selectedPermissions.includes('system.*') || 
                      selectedPermissions.some(p => p.endsWith('.*') && key.startsWith(p.replace('.*', '')))
                    );
                    const isIndeterminate = !isAllChecked && categoryKeys.some(key => 
                      selectedPermissions.includes(key) || 
                      selectedPermissions.includes('system.*') || 
                      selectedPermissions.some(p => p.endsWith('.*') && key.startsWith(p.replace('.*', '')))
                    );

                    return (
                    <div key={scope.category} className="space-y-3 border-b last:border-b-0 pb-4 border-slate-100 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#1e40af] block select-none">
                          {scope.category}
                        </span>
                        <Checkbox 
                          checked={isAllChecked}
                          indeterminate={isIndeterminate}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (checked) {
                              setSelectedPermissions(prev => {
                                const newPerms = [...prev];
                                categoryKeys.forEach(k => {
                                  if (!newPerms.includes(k)) newPerms.push(k);
                                });
                                return newPerms;
                              });
                            } else {
                              setSelectedPermissions(prev => prev.filter(p => !categoryKeys.includes(p) && p !== 'system.*' && !categoryKeys.some(k => p.endsWith('.*') && k.startsWith(p.replace('.*', '')))));
                            }
                          }}
                          className="text-xs font-semibold text-slate-600"
                        >
                          Chọn tất cả
                        </Checkbox>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 pl-2">
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
                              className="text-sm text-slate-700 font-medium hover:text-slate-900 transition-colors"
                            >
                              {item.label} <code className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2">{item.key}</code>
                            </Checkbox>
                          );
                        })}
                      </div>
                    </div>
                  )})}
                </div>
              </div>

              <div className="col-span-2">
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Menu Tương ứng</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-[380px] overflow-y-auto custom-scrollbar">
                  {accessibleMenus.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-4">Chưa có menu nào được cấp phép</div>
                  ) : (
                    <div className="space-y-3">
                      {accessibleMenus.map((menu: any) => (
                        <div key={menu.key} className="text-sm">
                          <div className="font-bold text-[#1e40af] mb-1.5">{menu.label}</div>
                          {menu.children && menu.children.length > 0 && (
                            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs font-semibold">
                              {menu.children.map((child: any) => (
                                <li key={child.key}>{child.label}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Alert
              type="warning"
              showIcon
              message={
                <span className="text-sm leading-relaxed block text-slate-700 font-medium select-none">
                  Lưu ý: Quyền hạn được ghi đè sẽ có hiệu lực lập tức đối với tất cả thành viên thuộc nhóm. Vui lòng kiểm tra kỹ lưỡng trước khi xác nhận.
                </span>
              }
              className="mt-4 border-amber-200 bg-amber-50"
            />
          </div>
        )}
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        title={
          <div className="text-xl font-bold text-slate-800">
            {editingGroup ? 'Chỉnh sửa nhóm người dùng' : 'Thêm mới nhóm người dùng'}
          </div>
        }
        open={isEditGroupModalOpen}
        onCancel={() => setIsEditGroupModalOpen(false)}
        footer={
          <div className="flex justify-center gap-4 mt-6">
            <Button 
              key="back" 
              onClick={() => setIsEditGroupModalOpen(false)} 
              className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-32"
            >
              Đóng
            </Button>
            <Button 
              key="submit" 
              type="primary" 
              onClick={handleSaveGroup} 
              className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold rounded px-8 w-32"
            >
              Lưu
            </Button>
          </div>
        }
        centered
        width={750}
        forceRender
        closeIcon={<span className="text-slate-500 hover:text-slate-700 text-lg font-bold">&times;</span>}
      >
        <Form form={form} layout="vertical" className="mt-6">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Thông tin nhóm người dùng</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <Form.Item
                name="code"
                label={<span className="text-sm text-slate-500 font-medium">Mã nhóm <span className="text-red-500">*</span></span>}
                rules={[{ required: true, message: 'Vui lòng nhập mã nhóm' }]}
              >
                <Input placeholder="Nhập" className="rounded py-1.5" />
              </Form.Item>
              
              <Form.Item
                name="name"
                label={<span className="text-sm text-slate-500 font-medium">Tên nhóm <span className="text-red-500">*</span></span>}
                rules={[{ required: true, message: 'Vui lòng nhập tên nhóm' }]}
              >
                <Input placeholder="Nhập" className="rounded py-1.5" />
              </Form.Item>
            </div>

            <Form.Item
              name="description"
              label={<span className="text-sm text-slate-500 font-medium">Mô tả</span>}
              className="mt-2"
            >
              <Input.TextArea placeholder="Nhập" rows={3} className="rounded py-1.5" />
            </Form.Item>
          </div>

          <div className="mb-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 m-0">Danh sách người dùng trong nhóm</h3>
              <Button 
                type="primary" 
                className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-medium rounded"
                onClick={async () => {
                  await fetchAllUsers();
                  setTempSelectedUserIds([]);
                  setSearchUserAdd('');
                  setIsAddUserModalOpen(true);
                }}
              >
                Thêm người dùng
              </Button>
            </div>
            
            <Input 
              prefix={<SearchOutlined className="text-slate-400" />} 
              placeholder="Tìm kiếm theo tài khoản, họ và tên, đơn vị" 
              className="rounded py-1.5 mb-4"
            />

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table
                dataSource={groupMembers}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50'],
                  locale: { items_per_page: '/ trang' },
                  size: 'small',
                  showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`
                }}
                className="w-full text-sm text-slate-700"
                columns={[
                  {
                    title: 'STT',
                    key: 'stt',
                    width: 60,
                    align: 'center',
                    render: (_, __, index) => index + 1,
                  },
                  {
                    title: 'Mã người dùng',
                    dataIndex: 'username',
                    key: 'username',
                  },
                  {
                    title: 'Họ và tên',
                    dataIndex: 'fullName',
                    key: 'fullName',
                  },
                  {
                    title: 'Đơn vị',
                    dataIndex: 'department',
                    key: 'department',
                    render: () => 'Đơn vị mẫu',
                  },
                  {
                    title: '',
                    key: 'action',
                    width: 60,
                    align: 'center',
                    render: (_, record) => (
                      <div 
                        className="bg-red-50 text-red-500 p-1.5 rounded inline-flex cursor-pointer hover:bg-red-100"
                        onClick={() => {
                          setGroupMembers(prev => prev.filter(m => m.id !== record.id));
                          message.success('Đã xóa người dùng khỏi danh sách.');
                        }}
                      >
                        <DeleteOutlined />
                      </div>
                    )
                  }
                ]}
                locale={{ emptyText: 'Chưa có người dùng nào được thêm.' }}
              />
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="text-xl font-bold text-slate-800">
            Danh sách thành viên: {activeGroupForMembers?.name}
          </div>
        }
        open={isMembersModalOpen}
        onCancel={() => setIsMembersModalOpen(false)}
        footer={
          <div className="flex justify-center mt-6">
            <Button 
              onClick={() => setIsMembersModalOpen(false)} 
              className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-32"
            >
              Đóng
            </Button>
          </div>
        }
        centered
        width={700}
        closeIcon={<span className="text-slate-500 hover:text-slate-700 text-lg font-bold">&times;</span>}
      >
        <Table 
          dataSource={groupMembers}
          loading={loadingMembers}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          className="mt-4"
          columns={[
            {
              title: 'Tài khoản',
              dataIndex: 'username',
              key: 'username',
              render: (text) => <strong className="text-blue-600">{text}</strong>
            },
            {
              title: 'Họ tên',
              dataIndex: 'fullName',
              key: 'fullName',
            },
            {
              title: 'Email',
              dataIndex: 'email',
              key: 'email',
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              key: 'status',
              render: (status) => (
                <Tag color={status === 'active' ? 'green' : 'red'} className="font-bold">
                  {status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                </Tag>
              )
            }
          ]}
        />
      </Modal>

      {/* Add User To Group Modal */}
      <Modal
        title={
          <div className="text-xl font-bold text-slate-800">
            Thêm người dùng
          </div>
        }
        open={isAddUserModalOpen}
        onCancel={() => setIsAddUserModalOpen(false)}
        footer={
          <div className="flex justify-center gap-4 mt-6">
            <Button 
              key="back" 
              onClick={() => setIsAddUserModalOpen(false)} 
              className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-32"
            >
              Đóng
            </Button>
            <Button 
              key="submit" 
              type="primary" 
              onClick={() => {
                const selectedUsers = allUsers.filter(u => tempSelectedUserIds.includes(u.id));
                const newMembers = [...groupMembers];
                selectedUsers.forEach(user => {
                  if (!newMembers.find(m => m.id === user.id)) {
                    newMembers.push(user);
                  }
                });
                setGroupMembers(newMembers);
                setIsAddUserModalOpen(false);
                message.success(`Đã thêm ${selectedUsers.length} người dùng vào danh sách.`);
              }} 
              className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold rounded px-8 w-32"
            >
              Lưu
            </Button>
          </div>
        }
        centered
        width={800}
        closeIcon={<span className="text-slate-500 hover:text-slate-700 text-lg font-bold">&times;</span>}
      >
        <div className="mt-4">
          <Input 
            prefix={<SearchOutlined className="text-slate-400" />} 
            placeholder="Tìm kiếm theo tài khoản, họ và tên, đơn vị" 
            className="rounded py-1.5 mb-4"
            value={searchUserAdd}
            onChange={(e) => setSearchUserAdd(e.target.value)}
          />

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table
              rowSelection={{
                type: 'checkbox',
                selectedRowKeys: tempSelectedUserIds,
                onChange: (selectedRowKeys) => {
                  setTempSelectedUserIds(selectedRowKeys as string[]);
                },
                getCheckboxProps: (record) => ({
                  disabled: groupMembers.some(m => m.id === record.id),
                })
              }}
              dataSource={allUsers.filter(u => 
                u.username?.toLowerCase().includes(searchUserAdd.toLowerCase()) || 
                u.fullName?.toLowerCase().includes(searchUserAdd.toLowerCase())
              )}
              rowKey="id"
              pagination={{
                pageSize: 5,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20'],
                locale: { items_per_page: '/ trang' },
                size: 'small',
                showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`
              }}
              className="w-full text-sm text-slate-700"
              columns={[
                {
                  title: 'STT',
                  key: 'stt',
                  width: 60,
                  align: 'center',
                  render: (_, __, index) => index + 1,
                },
                {
                  title: 'Tài khoản',
                  dataIndex: 'username',
                  key: 'username',
                  render: (text) => <strong className="text-[#1e40af]">{text}</strong>
                },
                {
                  title: 'Họ và tên',
                  dataIndex: 'fullName',
                  key: 'fullName',
                },
                {
                  title: 'Đơn vị',
                  dataIndex: 'department',
                  key: 'department',
                  render: () => 'Đơn vị mẫu',
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status) => (
                    <Tag color={status === 'active' ? 'green' : 'red'} className="font-bold">
                      {status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                    </Tag>
                  )
                }
              ]}
              locale={{ emptyText: 'Không tìm thấy người dùng.' }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

