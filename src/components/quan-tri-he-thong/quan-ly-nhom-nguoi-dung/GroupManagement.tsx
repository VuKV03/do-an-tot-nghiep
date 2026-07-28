import React, { useState, useMemo } from 'react';
import { message, Form, Modal } from 'antd';
import { AuditLog } from '../../../types';
import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api';
// import các component modal và hằng số
import PermissionsModal from './modals/PermissionsModal';
import AddEditGroupModal from './modals/AddEditGroupModal';
import MembersManagementModal from './modals/MembersManagementModal';
import AddUserToGroupModal from './modals/AddUserToGroupModal';
import { MENU_STRUCTURE, PERMISSION_MAP } from './GroupConstants';
import { UserGroup, SecurityLog } from './types';
import GroupFilters from './components/GroupFilters';
import GroupTable from './components/GroupTable';

interface GroupManagementProps {
  onAddAuditLog: (log: AuditLog) => void;
  setSecurityLogs: React.Dispatch<React.SetStateAction<SecurityLog[]>>;
}

// Component chính quản lý nhóm người dùng, bao gồm chức năng thêm, sửa, xóa và phân quyền
export default function GroupManagement({ onAddAuditLog, setSecurityLogs }: GroupManagementProps) {
  // State lưu trữ danh sách các nhóm người dùng và trạng thái tải dữ liệu
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // State phục vụ cho chức năng tìm kiếm nhóm theo mã và tên
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Hàm gọi API để lấy danh sách nhóm người dùng từ Backend
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

  // Lọc danh sách nhóm người dùng dựa trên từ khóa tìm kiếm (Mã nhóm và Tên nhóm)
  const filteredGroups = useMemo(() => {
    return userGroups.filter(g => {
      const matchCode = g.code.toLowerCase().includes(searchCode.trim().toLowerCase());
      const matchName = g.name.toLowerCase().includes(searchName.trim().toLowerCase());
      return matchCode && matchName;
    });
  }, [userGroups, searchCode, searchName]);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [activeGroupForPermissions, setActiveGroupForPermissions] = useState<UserGroup | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Tính toán và hiển thị danh sách các menu/chức năng mà nhóm hiện tại có quyền truy cập, dựa trên danh sách quyền đã chọn
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
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Hàm lưu trữ nhật ký bảo mật (Security Log) khi có các thao tác thay đổi quyền, thêm/sửa/xóa nhóm
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

  // Hàm tải toàn bộ danh sách người dùng để phục vụ cho việc thêm thành viên mới vào nhóm
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

  // Xử lý logic khi mở modal hiển thị danh sách thành viên thuộc một nhóm cụ thể
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

  const [SYSTEM_PERMISSION_SCOPES, setSYSTEM_PERMISSION_SCOPES] = useState<{ category: string, items: { key: string, label: string }[] }[]>([]);

  // Lấy danh sách toàn bộ các quyền (permissions) khả dụng từ server và nhóm chúng theo từng phân hệ
  const fetchPermissions = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/permissions`);
      if (res.data.success) {
        const grouped: Record<string, { key: string, label: string }[]> = {};
        res.data.data.forEach((p: { code: string, name: string, module: string }) => {
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

  // Mở modal để phân quyền (thiết lập quyền hạn chi tiết) cho một nhóm cụ thể
  const handleOpenPermissionEditor = (group: UserGroup) => {
    setActiveGroupForPermissions(group);
    setSelectedPermissions(group.permissions);
    setIsGroupModalOpen(true);
  };

  // Xóa form và mở modal để tiến hành thêm một nhóm người dùng mới
  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupMembers([]);
    form.resetFields();
    setIsEditGroupModalOpen(true);
  };

  // Đưa dữ liệu lên form và mở modal để chỉnh sửa thông tin cơ bản của nhóm đã tồn tại
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

  // Xử lý việc bật/tắt (khóa/mở khóa) trạng thái hoạt động của nhóm người dùng
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

  // Xử lý gửi request API để xóa hoàn toàn nhóm người dùng khỏi hệ thống
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

  const handleBulkDelete = () => {
    if (selectedGroupIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất một nhóm để xóa.');
      return;
    }

    const selectedGroups = userGroups.filter(g => selectedGroupIds.includes(g.id));
    const hasAdmin = selectedGroups.some(g => g.code === 'GRP_ADMIN' || g.code === 'QTHT' || g.name.toLowerCase().includes('quản trị hệ thống') || g.name.toLowerCase().includes('qtht'));

    if (hasAdmin) {
      message.error('Không cho phép xóa nhóm Quản trị hệ thống.');
      return;
    }

    Modal.confirm({
      title: 'Xác nhận xóa nhóm',
      content: `Bạn có chắc chắn muốn xóa ${selectedGroupIds.length} nhóm đã chọn không? Hành động này không thể hoàn tác.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await Promise.all(selectedGroupIds.map(id => axios.delete(`${API_URL}/auth/groups/${id}`)));

          await fetchGroups(); // Refresh list
          setSelectedGroupIds([]); // Clear selection

          message.success(`Đã xóa thành công ${selectedGroupIds.length} nhóm.`);

          onAddAuditLog({
            id: `log-sec-${Date.now()}`,
            user: 'Quản trị viên',
            action: 'Xóa nhóm người dùng hàng loạt',
            timestamp: new Date().toISOString(),
            details: `Đã xóa ${selectedGroupIds.length} nhóm khỏi hệ thống.`
          });
        } catch (err: any) {
          console.error('Error deleting groups:', err);
          message.error(err.response?.data?.detail || 'Đã xảy ra lỗi khi xóa nhóm.');
        }
      }
    });
  };

  // Lấy dữ liệu từ form và gọi API lưu thông tin nhóm (áp dụng cho cả Thêm mới hoặc Cập nhật)
  const handleSaveGroup = async () => {
    try {
      const values = await form.validateFields();
      setSavingGroup(true);
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
    } finally {
      setSavingGroup(false);
    }
  };

  // Gửi request API để lưu trữ danh sách các quyền đã được chọn cho nhóm vào hệ thống
  const handleSaveGroupPermissions = async () => {
    if (!activeGroupForPermissions) return;

    try {
      setSavingPermissions(true);
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
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <h1 className="text-[#1a3b70] text-lg font-bold uppercase m-0">Quản lý nhóm người dùng</h1>
      </div>
      {/* Props Modal */}
      {/* Filters */}
      <GroupFilters
        searchCode={searchCode}
        setSearchCode={setSearchCode}
        searchName={searchName}
        setSearchName={setSearchName}
      />

      {/* Groups Table */}
      <GroupTable
        loading={loading}
        filteredGroups={filteredGroups}
        handleAddGroup={handleAddGroup}
        handleOpenMembersModal={handleOpenMembersModal}
        handleToggleGroupStatus={handleToggleGroupStatus}
        handleEditGroup={handleEditGroup}
        handleOpenPermissionEditor={handleOpenPermissionEditor}
        handleDeleteGroup={handleDeleteGroup}
        handleBulkDelete={handleBulkDelete}
        selectedGroupIds={selectedGroupIds}
        setSelectedGroupIds={setSelectedGroupIds}
      />

      {/* Permissions Modal */}
      <PermissionsModal
        open={isGroupModalOpen}
        onCancel={() => setIsGroupModalOpen(false)}
        activeGroup={activeGroupForPermissions}
        selectedPermissions={selectedPermissions}
        setSelectedPermissions={setSelectedPermissions}
        systemScopes={SYSTEM_PERMISSION_SCOPES}
        accessibleMenus={accessibleMenus}
        onSave={handleSaveGroupPermissions}
        saving={savingPermissions}
      />

      {/* Edit Group Modal */}
      <AddEditGroupModal
        open={isEditGroupModalOpen}
        onCancel={() => setIsEditGroupModalOpen(false)}
        onSave={handleSaveGroup}
        saving={savingGroup}
        editingGroup={editingGroup}
        form={form}
        groupMembers={groupMembers}
        setGroupMembers={setGroupMembers}
        onOpenAddUser={async () => {
          await fetchAllUsers();
          setTempSelectedUserIds([]);
          setSearchUserAdd('');
          setIsAddUserModalOpen(true);
        }}
      />

      <MembersManagementModal
        open={isMembersModalOpen}
        onCancel={() => setIsMembersModalOpen(false)}
        activeGroup={activeGroupForMembers}
        groupMembers={groupMembers}
        loadingMembers={loadingMembers}
      />

      {/* Add User To Group Modal */}
      <AddUserToGroupModal
        open={isAddUserModalOpen}
        onCancel={() => setIsAddUserModalOpen(false)}
        allUsers={allUsers}
        groupMembers={groupMembers}
        setGroupMembers={setGroupMembers}
        tempSelectedUserIds={tempSelectedUserIds}
        setTempSelectedUserIds={setTempSelectedUserIds}
        searchUserAdd={searchUserAdd}
        setSearchUserAdd={setSearchUserAdd}
      />
    </div>
  );
}

