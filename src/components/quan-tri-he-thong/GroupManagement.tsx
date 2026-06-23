import React, { useState } from 'react';
import { 
  Button, 
  Tag, 
  Modal, 
  Checkbox, 
  Alert, 
  message, 
  Divider 
} from 'antd';
import {
  SettingOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { AuditLog } from '../../types';

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

  return (
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
