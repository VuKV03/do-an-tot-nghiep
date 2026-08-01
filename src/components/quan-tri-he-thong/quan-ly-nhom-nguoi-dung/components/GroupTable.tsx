import React from 'react';
import { Button, Table, Space, Empty, Pagination, Dropdown, Modal } from 'antd';
import {
  SettingOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import { UserGroup } from '../types';
import { useResizableColumns, ColResizeHandle, ResizableTableStyles, RESIZABLE_TABLE_CLASS, TruncatedText } from '../../../../utils/resizableTable';
import { exportToExcel, type ExcelColumn } from '../../../../utils/excelExport';
import { toast } from '../../../../utils/toast';
// interface định nghĩa các props cần thiết cho component GroupTable
interface GroupTableProps {
  loading: boolean;
  filteredGroups: UserGroup[];
  handleAddGroup: () => void;
  handleOpenMembersModal: (group: UserGroup) => void;
  handleToggleGroupStatus: (group: UserGroup, checked: boolean) => void;
  handleEditGroup: (group: UserGroup) => void;
  handleOpenPermissionEditor: (group: UserGroup) => void;
  handleDeleteGroup: (groupId: string, groupName: string) => void;
  handleBulkDelete: () => void;
  selectedGroupIds: string[];
  setSelectedGroupIds: React.Dispatch<React.SetStateAction<string[]>>;
}
// component bảng nhóm người dùng
export default function GroupTable({
  loading,
  filteredGroups,
  handleAddGroup,
  handleOpenMembersModal,
  handleToggleGroupStatus,
  handleEditGroup,
  handleOpenPermissionEditor,
  handleDeleteGroup,
  handleBulkDelete,
  selectedGroupIds,
  setSelectedGroupIds
}: GroupTableProps) {
  const { colGroup: groupTableColGroup, startResize: startGroupColResize, totalWidth: groupTableTotalWidth } = useResizableColumns(
    [48, 64, 140, 180, 260, 120, 112, 128]
  );

  const groupExcelColumns: ExcelColumn<UserGroup>[] = [
    { header: 'STT', accessor: (_row, i) => i + 1, width: 6, align: 'center' },
    { header: 'Mã nhóm', accessor: row => row.code, width: 16 },
    { header: 'Tên nhóm', accessor: row => row.name, width: 24 },
    { header: 'Mô tả chi tiết', accessor: row => row.description || 'Không có mô tả', width: 40 },
    { header: 'Thành viên', accessor: row => row.memberCount, width: 12, align: 'center' },
    { header: 'Trạng thái', accessor: row => row.status !== 'inactive' ? 'Đang hoạt động' : 'Đã khóa', width: 16, align: 'center' },
  ];

  const handleExportExcel = () => {
    if (filteredGroups.length === 0) {
      toast.warning('Không có dữ liệu để xuất Excel.');
      return;
    }
    const fileName = `NhomNguoiDung_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(filteredGroups, groupExcelColumns, fileName, 'Nhóm người dùng');
    toast.success('Xuất báo cáo Excel thành công!');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mt-6">
      <ResizableTableStyles />
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-[#1a3b70] font-bold text-sm m-0">Kết quả tìm kiếm</h2>
        <div className="flex gap-2">
          <Button type="primary" className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold text-xs rounded" onClick={handleAddGroup}>Thêm mới</Button>
          <Button className="border-[#1e40af] text-[#1e40af] font-semibold text-xs rounded" onClick={handleBulkDelete}>Xóa</Button>
          <Button type="primary" icon={<FileExcelOutlined />} className="!bg-green-600 !border-green-600 !text-white font-semibold text-xs rounded hover:!bg-green-700" onClick={handleExportExcel}>Xuất Excel</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table style={{ minWidth: groupTableTotalWidth }} className={`w-full text-xs font-medium text-slate-700 border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}>
          {groupTableColGroup}
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-bold">
              <th className="relative py-3 px-4 text-left">
                <input
                  type="checkbox"
                  className="rounded text-[#1e40af] cursor-pointer"
                  checked={filteredGroups.length > 0 && selectedGroupIds.length === filteredGroups.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedGroupIds(filteredGroups.map(g => g.id));
                    } else {
                      setSelectedGroupIds([]);
                    }
                  }}
                />
                <ColResizeHandle onMouseDown={startGroupColResize(0)} />
              </th>
              <th className="relative py-3 px-4 text-center">STT<ColResizeHandle onMouseDown={startGroupColResize(1)} /></th>
              <th className="relative py-3 px-4 text-left">Mã nhóm<ColResizeHandle onMouseDown={startGroupColResize(2)} /></th>
              <th className="relative py-3 px-4 text-left">Tên nhóm<ColResizeHandle onMouseDown={startGroupColResize(3)} /></th>
              <th className="relative py-3 px-4 text-left">Mô tả chi tiết<ColResizeHandle onMouseDown={startGroupColResize(4)} /></th>
              <th className="relative py-3 px-4 text-center">Thành viên<ColResizeHandle onMouseDown={startGroupColResize(5)} /></th>
              <th className="relative py-3 px-4 text-center">Trạng thái<ColResizeHandle onMouseDown={startGroupColResize(6)} /></th>
              <th className="relative py-3 px-4 text-center">Thao tác<ColResizeHandle onMouseDown={startGroupColResize(7)} /></th>
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
                    <input
                      type="checkbox"
                      className="rounded text-[#1e40af] cursor-pointer"
                      checked={selectedGroupIds.includes(g.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGroupIds(prev => [...prev, g.id]);
                        } else {
                          setSelectedGroupIds(prev => prev.filter(id => id !== g.id));
                        }
                      }}
                    />
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600">{index + 1}</td>
                  <td className="py-3 px-4 text-slate-600 font-semibold"><TruncatedText text={g.code} /></td>
                  <td className="py-3 px-4 text-slate-600"><TruncatedText text={g.name} /></td>
                  <td className="py-3 px-4 text-slate-600">
                    <TruncatedText text={g.description || 'Không có mô tả'} />
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
  );
}
