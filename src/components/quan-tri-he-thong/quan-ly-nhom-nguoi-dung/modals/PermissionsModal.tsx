import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button, Checkbox, Alert, Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import { UserGroup } from '../../../../types';
import { MENU_STRUCTURE, PERMISSION_MAP } from '../GroupConstants';

interface PermissionsModalProps {
  open: boolean;
  onCancel: () => void;
  activeGroup: UserGroup | null;
  selectedPermissions: string[];
  setSelectedPermissions: React.Dispatch<React.SetStateAction<string[]>>;
  systemScopes: { category: string, items: { key: string, label: string }[] }[];
  onSave: () => void;
  saving?: boolean;
}

export default function PermissionsModal({
  open,
  onCancel,
  activeGroup,
  selectedPermissions,
  setSelectedPermissions,
  systemScopes,
  onSave,
  saving
}: PermissionsModalProps) {
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);

  // Flatten systemScopes for quick lookup of labels and categories
  const permissionLookup = useMemo(() => {
    const map: Record<string, { label: string, category: string }> = {};
    systemScopes.forEach(scope => {
      scope.items.forEach(item => {
        map[item.key] = { label: item.label, category: scope.category };
      });
    });
    return map;
  }, [systemScopes]);

  // Extract all valid menu keys to distinguish them from granular permissions
  const allMenuKeys = useMemo(() => {
    const keys = new Set<string>();
    const traverse = (nodes: any[]) => {
      nodes.forEach(n => {
        keys.add(n.key);
        if (n.children) traverse(n.children);
      });
    };
    traverse(MENU_STRUCTURE);
    keys.add('other_permissions');
    return Array.from(keys);
  }, []);

  // Determine permissions that are not mapped to any menu in PERMISSION_MAP
  const unmappedPermissions = useMemo(() => {
    const allMappedPerms = new Set<string>();
    Object.values(PERMISSION_MAP).forEach(perms => {
      perms.forEach(p => allMappedPerms.add(p));
    });

    const unmapped: string[] = [];
    systemScopes.forEach(scope => {
      scope.items.forEach(item => {
        if (!allMappedPerms.has(item.key) && !allMenuKeys.includes(item.key)) {
          unmapped.push(item.key);
        }
      });
    });
    return unmapped;
  }, [systemScopes, allMenuKeys]);

  // Compute checked keys for the Tree based on selectedPermissions
  const treeCheckedKeys = useMemo(() => {
    return selectedPermissions.filter(p => allMenuKeys.includes(p));
  }, [selectedPermissions, allMenuKeys]);

  const halfCheckedKeys = useMemo(() => {
    // A menu is half-checked if it is not fully checked, but has at least one checked descendant
    const halfChecked = new Set<string>();
    const checkDescendants = (nodes: any[]): boolean => {
      let anyChecked = false;
      for (const n of nodes) {
        const isChecked = treeCheckedKeys.includes(n.key);
        const hasCheckedChild = n.children ? checkDescendants(n.children) : false;
        if (isChecked || hasCheckedChild) {
          anyChecked = true;
          if (!isChecked) {
            halfChecked.add(n.key);
          }
        }
      }
      return anyChecked;
    };
    checkDescendants(MENU_STRUCTURE);
    return Array.from(halfChecked);
  }, [treeCheckedKeys]);

  // Construct TreeData for the left column
  const treeData = useMemo(() => {
    const buildTree = (menus: typeof MENU_STRUCTURE): TreeDataNode[] => {
      return menus.map(menu => ({
        title: menu.label,
        key: menu.key,
        children: menu.children ? buildTree(menu.children as any) : undefined
      }));
    };

    const data: TreeDataNode[] = buildTree(MENU_STRUCTURE);

    if (unmappedPermissions.length > 0) {
      data.push({
        title: 'Quyền khác (Hệ thống)',
        key: 'other_permissions'
      });
    }

    return data;
  }, [unmappedPermissions]);

  // Auto-select the first node when the modal opens
  useEffect(() => {
    if (open && !selectedNodeKey && treeData.length > 0) {
      setSelectedNodeKey(treeData[0].key as string);
    }
    if (!open) {
      setSelectedNodeKey(null);
    }
  }, [open, treeData, selectedNodeKey]);

  // Determine the permissions to display on the right based on the selected node
  const displayedPermissions = useMemo(() => {
    if (!selectedNodeKey) return [];
    
    // Only show functional buttons if the menu tab is actually checked or half-checked
    if (selectedNodeKey !== 'other_permissions' && 
        !treeCheckedKeys.includes(selectedNodeKey) && 
        !halfCheckedKeys.includes(selectedNodeKey)) {
      return [];
    }

    if (selectedNodeKey === 'other_permissions') {
      return unmappedPermissions;
    }
    return PERMISSION_MAP[selectedNodeKey] || [];
  }, [selectedNodeKey, unmappedPermissions, treeCheckedKeys, halfCheckedKeys]);

  const FALLBACK_LABELS: Record<string, string> = {
    'questions.delete': 'Xóa câu hỏi',
    'questions.export': 'Xuất câu hỏi',
  };



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
            disabled={saving}
            className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-40"
          >
            Hủy
          </Button>
          <Button
            key="submit"
            type="primary"
            onClick={onSave}
            loading={saving}
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

          <div className="grid grid-cols-12 gap-6 h-[400px]">
            {/* Left Column: Menu Tree */}
            <div className="col-span-5 border-r pr-4 h-full overflow-y-auto custom-scrollbar">
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Cấu trúc Menu / Chức năng</h3>
              <Tree
                checkable
                treeData={treeData}
                selectedKeys={selectedNodeKey ? [selectedNodeKey] : []}
                checkedKeys={treeCheckedKeys}
                onCheck={(checkedKeysValue, info) => {
                  const checked = Array.isArray(checkedKeysValue) ? checkedKeysValue : checkedKeysValue.checked;
                  
                  setSelectedPermissions(prev => {
                    // Lọc ra các quyền chức năng (không phải menu) hiện có
                    const nonMenuPerms = prev.filter(p => !allMenuKeys.includes(p));
                    
                    // Xác định các quyền chức năng nào vẫn được phép giữ lại (phải thuộc các menu đang được check)
                    const allowedFunctionalPerms = new Set<string>();
                    (checked as string[]).forEach(k => {
                      if (PERMISSION_MAP[k]) {
                        PERMISSION_MAP[k].forEach(p => allowedFunctionalPerms.add(p));
                      }
                      if (k === 'other_permissions') {
                        unmappedPermissions.forEach(p => allowedFunctionalPerms.add(p));
                      }
                    });

                    // Chỉ giữ lại các quyền chức năng hợp lệ
                    const validFunctionalPerms = nonMenuPerms.filter(p => allowedFunctionalPerms.has(p));
                    
                    // Trả về danh sách gồm các quyền chức năng đã chọn (hợp lệ) và các menu đang được check
                    return [...validFunctionalPerms, ...(checked as string[])];
                  });

                  // Select the node that was just checked/unchecked to show its permissions
                  if (info.node.key) {
                    setSelectedNodeKey(info.node.key as string);
                  }
                }}
                onSelect={(selectedKeys) => {
                  if (selectedKeys.length > 0) {
                    setSelectedNodeKey(selectedKeys[0] as string);
                  }
                }}
                defaultExpandAll
                className="text-sm font-medium"
              />
            </div>

            {/* Right Column: Permissions Checkboxes */}
            <div className="col-span-7 h-full flex flex-col pl-2 pr-2">
              {selectedNodeKey && (selectedNodeKey === 'other_permissions' || treeCheckedKeys.includes(selectedNodeKey) || halfCheckedKeys.includes(selectedNodeKey)) && (
                <>
                  <div className="border border-slate-400 rounded-md p-4 flex-1 overflow-y-auto custom-scrollbar bg-white">
                    {displayedPermissions.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                        Không có quyền chức năng nào cho menu này.
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-3">
                        {displayedPermissions.map(permKey => {
                          const isChecked = selectedPermissions.includes(permKey) || 
                                            selectedPermissions.includes('system.*') || 
                                            selectedPermissions.some(p => p.endsWith('.*') && permKey.startsWith(p.replace('.*', '')));
                          const info = permissionLookup[permKey];
                          let label = info ? info.label : (FALLBACK_LABELS[permKey] || permKey);

                          // Ghi đè label dựa trên context tab hiện tại để phù hợp với UI
                          if (permKey === 'exams.approve') {
                            if (selectedNodeKey === 'tab-tham-dinh-de-goc' || selectedNodeKey === 'quan-ly-de-thi-goi-de') {
                              label = 'Thẩm định đề gốc';
                            }
                            if (selectedNodeKey === 'tab-tham-dinh-goi-de' || selectedNodeKey === 'quan-ly-goi-de') {
                              label = 'Thẩm định gói đề';
                            }
                          }

                          return (
                            <Checkbox
                              key={permKey}
                              checked={isChecked}
                              onChange={(e) => {
                                const active = e.target.checked;
                                if (active) {
                                  setSelectedPermissions(prev => [...prev, permKey]);
                                } else {
                                  setSelectedPermissions(prev => prev.filter(p => p !== permKey && p !== 'system.*'));
                                }
                              }}
                              className="text-sm text-slate-700 font-medium"
                            >
                              {label}
                            </Checkbox>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {displayedPermissions.length > 0 && (
                    <div className="flex justify-end gap-3 mt-4">
                      <Button 
                        className="border-slate-300 text-slate-700"
                        onClick={() => {
                          setSelectedPermissions(prev => {
                            const newPerms = [...prev];
                            displayedPermissions.forEach(k => {
                              if (!newPerms.includes(k)) newPerms.push(k);
                            });
                            return newPerms;
                          });
                        }}
                      >
                        Chọn hết
                      </Button>
                      <Button 
                        className="border-slate-300 text-slate-700"
                        onClick={() => {
                          setSelectedPermissions(prev => prev.filter(p => !displayedPermissions.includes(p) && p !== 'system.*'));
                        }}
                      >
                        Bỏ chọn hết
                      </Button>
                    </div>
                  )}
                </>
              )}
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
