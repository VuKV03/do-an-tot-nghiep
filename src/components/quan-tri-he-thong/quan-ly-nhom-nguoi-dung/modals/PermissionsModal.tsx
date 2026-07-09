import React from 'react';
import { Modal, Button, Checkbox, Alert } from 'antd';
import { UserGroup } from '../../../../types';

interface PermissionsModalProps {
  open: boolean;
  onCancel: () => void;
  activeGroup: UserGroup | null;
  selectedPermissions: string[];
  setSelectedPermissions: React.Dispatch<React.SetStateAction<string[]>>;
  systemScopes: { category: string, items: { key: string, label: string }[] }[];
  accessibleMenus: any[];
  onSave: () => void;
}
// interface định nghĩa các props cần thiết cho component PermissionsModal
export default function PermissionsModal({
  open,
  onCancel,
  activeGroup,
  selectedPermissions,
  setSelectedPermissions,
  systemScopes,
  accessibleMenus,
  onSave
}: PermissionsModalProps) {
  return (
    <Modal
      title={
        <div className="text-xl font-bold text-slate-800">
          Phân quyền nhóm người dùng
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <div className="flex justify-center gap-4 mt-6">
          <Button
            key="back"
            onClick={onCancel}
            className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-40"
          >
            Hủy
          </Button>
          <Button
            key="submit"
            type="primary"
            onClick={onSave}
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
      {activeGroup && (
        <div className="pt-4 text-sm font-medium">
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg select-none mb-4">
            <span className="text-xs font-bold text-[#1e40af] block mb-1">Nhóm người dùng:</span>
            <strong className="text-slate-800 text-sm block">{activeGroup.name}</strong>
            {activeGroup.description && (
              <p className="text-xs text-slate-600 mt-1 mb-0 leading-relaxed">
                {activeGroup.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-5 gap-6">
            <div className="col-span-3">
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Danh sách Quyền hạn</h3>
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                {systemScopes.map(scope => {
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
                  )
                })}
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
  );
}
