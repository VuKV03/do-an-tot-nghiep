import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, ConfigProvider, Dropdown, MenuProps, message, Spin } from 'antd';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2, MoreVertical, Send, History } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import CreateChuDeModal from './create';
import UpdateChuDeModal from './update';
import DeleteChuDeModal from './delete';
import DetailChuDeModal from './detail';
import GuiThamDinhChuDeModal from './send-review';
import LichSuChuDeModal from './history';
import { topicsApi, dmMonHocApi, dmKhoiLopApi } from '../../../../services/danhMucApi.ts';

const { RangePicker } = DatePicker;

export interface ChuDeType {
  Id: string;
  ParentId: string | null;
  Ma: string;
  Ten: string;
  IdMonHoc: string;
  IdKhoiLop: string;
  TrangThai: number; // 0: Tạo mới, 1: Chờ thẩm định, 2: Đã thẩm định, 3: Từ chối
  IdNguoiTao: string;
  ThoiGianTao: string;
  IdNguoiGui: string | null;
  ThoiGianGui: string | null;
  IdNguoiThamDinh: string | null;
  ThoiGianThamDinh: string | null;
  NoiDungThamDinh: string | null;
  GhiChu: string | null;
  MonHocName?: string;
  KhoiLopName?: string;
  children?: ChuDeType[];
}

// Fallback mocks if needed for typescript type exports
export const mockMonHoc = [
  { Id: 'mon-01', Ma: 'MATH', Ten: 'Toán học' },
  { Id: 'mon-02', Ma: 'PHYS', Ten: 'Vật lý' },
];

export const mockKhoiLop = [
  { Id: 'kl-12', Ma: 'G12', Ten: 'Khối 12' },
  { Id: 'kl-11', Ma: 'G11', Ten: 'Khối 11' },
];

function buildTopicTree(flatList: ChuDeType[]): ChuDeType[] {
  const map: { [key: string]: ChuDeType } = {};
  const roots: ChuDeType[] = [];

  flatList.forEach((item) => {
    map[item.Id] = { ...item, children: [] };
  });

  flatList.forEach((item) => {
    const cloned = map[item.Id];
    if (cloned.ParentId && map[cloned.ParentId]) {
      if (!map[cloned.ParentId].children) {
        map[cloned.ParentId].children = [];
      }
      map[cloned.ParentId].children!.push(cloned);
    } else {
      roots.push(cloned);
    }
  });

  const cleanEmptyChildren = (nodes: ChuDeType[]) => {
    nodes.forEach(node => {
      if (node.children && node.children.length === 0) {
        delete node.children;
      } else if (node.children) {
        cleanEmptyChildren(node.children);
      }
    });
  };
  cleanEmptyChildren(roots);

  return roots;
}

export default function ChuDeCauHoi() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [monHocs, setMonHocs] = useState<{ Id: string; Ma: string; Ten: string; IsActive?: boolean }[]>([]);
  const [khoiLops, setKhoiLops] = useState<{ Id: string; Ma: string; Ten: string; IsActive?: boolean }[]>([]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

  // Filters
  const [searchTen, setSearchTen] = useState('');
  const [filterMonHoc, setFilterMonHoc] = useState<string>('');
  const [filterKhoiLop, setFilterKhoiLop] = useState<string[]>([]);
  const [filterParentTopic, setFilterParentTopic] = useState<string>('Tất cả');
  const [filterStatus, setFilterStatus] = useState<any>('Tất cả');
  const [filterDates, setFilterDates] = useState<any>(null);

  const parentTopicsOptions = useMemo(() => {
    const parents = rawData
      .filter((item: any) => !item.parent_id)
      .filter((item: any) => {
        const matchMonHoc = !filterMonHoc || item.subject_id === filterMonHoc;
        const matchKhoiLop = filterKhoiLop.length === 0 || filterKhoiLop.includes(item.grade_id);
        return matchMonHoc && matchKhoiLop;
      });
    return parents.map((p: any) => ({ value: p.id, label: p.name }));
  }, [rawData, filterMonHoc, filterKhoiLop]);

  useEffect(() => {
    setFilterParentTopic('Tất cả');
  }, [filterMonHoc, filterKhoiLop]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGuiThamDinhModalOpen, setIsGuiThamDinhModalOpen] = useState(false);
  const [isLichSuModalOpen, setIsLichSuModalOpen] = useState(false);
  
  const [isMultipleAction, setIsMultipleAction] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ChuDeType | null>(null);

  const fetchFilters = async () => {
    try {
      const [mtRes, klRes] = await Promise.all([
        dmMonHocApi.list(),
        dmKhoiLopApi.list()
      ]);
      const mappedMonHoc = mtRes.data.map((i: any) => ({ Id: i.id, Ma: i.code, Ten: i.name, IsActive: i.is_active }));
      const mappedKhoiLop = klRes.data.map((i: any) => ({ Id: i.id, Ma: i.code, Ten: i.name, IsActive: i.is_active }));
      setMonHocs(mappedMonHoc);
      setKhoiLops(mappedKhoiLop);
      if (mappedMonHoc.length > 0) {
        setFilterMonHoc('');
      }
    } catch (e: any) {
      console.error(e);
      message.error('Không thể tải bộ lọc Môn học / Khối lớp!');
    }
  };

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await topicsApi.list();
      setRawData(res.data);
    } catch (e: any) {
      console.error(e);
      message.error(e.message || 'Không thể tải danh sách chủ đề!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
    fetchTopics();
  }, [fetchTopics]);

  const handleOpenUpdate = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsUpdateModalOpen(true);
  };

  const handleOpenDetail = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleOpenDelete = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsMultipleAction(false);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeleteMultiple = () => {
    setIsMultipleAction(true);
    setIsDeleteModalOpen(true);
  };

  const handleOpenGuiThamDinh = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsMultipleAction(false);
    setIsGuiThamDinhModalOpen(true);
  };

  const handleOpenGuiThamDinhMultiple = () => {
    setIsMultipleAction(true);
    setIsGuiThamDinhModalOpen(true);
  };

  const handleOpenLichSu = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsLichSuModalOpen(true);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    checkStrictly: false,
  };

  const getTrangThaiTag = (trangThai: number) => {
    switch (trangThai) {
      case 0:
        return <span className="px-3 py-1 rounded border border-gray-400 text-gray-600 bg-gray-50 text-sm font-medium">Tạo mới</span>;
      case 1:
        return <span className="px-3 py-1 rounded border border-amber-400 text-amber-600 bg-amber-50 text-sm font-medium">Chờ thẩm định</span>;
      case 2:
        return <span className="px-3 py-1 rounded border border-emerald-400 text-emerald-600 bg-emerald-50 text-sm font-medium">Đã thẩm định</span>;
      case 3:
        return <span className="px-3 py-1 rounded border border-rose-400 text-rose-500 bg-rose-50 text-sm font-medium">Từ chối</span>;
      default:
        return null;
    }
  };

  const renderActionMenu = (record: ChuDeType): MenuProps => {
    const items: MenuProps['items'] = [];
    
    if (record.TrangThai === 0 || record.TrangThai === 3) {
      items.push({
        key: 'send',
        icon: <Send size={16} />,
        label: 'Gửi thẩm định/phản biện',
        onClick: () => handleOpenGuiThamDinh(record)
      });
    }

    items.push({
      key: 'history',
      icon: <History size={16} />,
      label: 'Lịch sử chỉnh sửa, thẩm định',
      onClick: () => handleOpenLichSu(record)
    });

    items.push({
      key: 'delete',
      icon: <Trash2 size={16} className="text-red-500" />,
      label: <span className="text-red-500 font-medium">Xóa chủ đề</span>,
      onClick: () => handleOpenDelete(record)
    });

    return { items };
  };

  const filteredTree = useMemo(() => {
    const mapped: ChuDeType[] = rawData.map((item: any) => ({
      Id: item.id,
      ParentId: item.parent_id,
      Ma: item.code,
      Ten: item.name,
      IdMonHoc: item.subject_id,
      IdKhoiLop: item.grade_id,
      TrangThai: item.status,
      IdNguoiTao: item.created_by || 'user1',
      ThoiGianTao: item.created_at,
      IdNguoiGui: item.submitted_by,
      ThoiGianGui: item.submitted_at,
      IdNguoiThamDinh: item.approved_by,
      ThoiGianThamDinh: item.approved_at,
      NoiDungThamDinh: item.approval_note,
      GhiChu: item.note,
      MonHocName: item.subject_name || '',
      KhoiLopName: item.grade_name || '',
    }));

    const filteredFlat = mapped.filter((item) => {
      const matchTen = !searchTen || 
        item.Ten.toLowerCase().includes(searchTen.toLowerCase()) || 
        item.Ma.toLowerCase().includes(searchTen.toLowerCase());
      
      const matchMonHoc = !filterMonHoc || item.IdMonHoc === filterMonHoc;
      const matchKhoiLop = filterKhoiLop.length === 0 || filterKhoiLop.includes(item.IdKhoiLop);
      const matchStatus = filterStatus === 'Tất cả' || item.TrangThai === filterStatus;
      
      const matchParent = filterParentTopic === 'Tất cả' || item.Id === filterParentTopic || item.ParentId === filterParentTopic;

      let matchDate = true;
      if (filterDates && filterDates[0] && filterDates[1] && item.ThoiGianTao) {
        const itemTime = new Date(item.ThoiGianTao).getTime();
        const start = filterDates[0].startOf('day').valueOf();
        const end = filterDates[1].endOf('day').valueOf();
        matchDate = itemTime >= start && itemTime <= end;
      }
      
      return matchTen && matchMonHoc && matchKhoiLop && matchStatus && matchDate && matchParent;
    });

    return buildTopicTree(filteredFlat);
  }, [rawData, searchTen, filterMonHoc, filterKhoiLop, filterStatus, filterDates, filterParentTopic]);

  const columns: ColumnsType<ChuDeType> = [
    {
      title: 'Mã chủ đề/tiểu mục',
      dataIndex: 'Ma',
      key: 'Ma',
      width: 180,
    },
    {
      title: 'Nội dung chủ đề/tiểu mục',
      dataIndex: 'Ten',
      key: 'Ten',
    },
    {
      title: 'Môn học',
      dataIndex: 'MonHocName',
      key: 'MonHocName',
      width: 120,
    },
    {
      title: 'Khối lớp',
      dataIndex: 'KhoiLopName',
      key: 'KhoiLopName',
      width: 120,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'ThoiGianTao',
      key: 'ThoiGianTao',
      width: 150,
      render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      key: 'TrangThai',
      width: 160,
      render: (val) => getTrangThaiTag(val),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<Eye size={16} className="text-blue-600" />}
            className="hover:bg-blue-50 flex items-center justify-center p-2 rounded-md"
            title="Xem chi tiết"
            onClick={() => handleOpenDetail(record)}
          />
          {(record.TrangThai === 0 || record.TrangThai === 3) && (
            <Button
              type="text"
              onClick={() => handleOpenUpdate(record)}
              icon={<Edit size={16} className="text-blue-600" />}
              className="hover:bg-blue-50 flex items-center justify-center p-2 rounded-md"
            />
          )}
          <Dropdown menu={renderActionMenu(record)} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              icon={<MoreVertical size={16} className="text-gray-600" />}
              className="hover:bg-gray-100 flex items-center justify-center p-2 rounded-md"
            />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 6,
        },
        components: {
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#334155',
            rowHoverBg: '#f1f5f9',
          },
        },
      }}
    >
      <div className="p-6 flex flex-col gap-8 bg-white min-h-[calc(100vh-200px)]">
        {/* Search Section */}
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-8 transition-all duration-300">
          <div
            className="flex items-center gap-2 cursor-pointer text-[#1e3a8a] font-semibold text-lg select-none w-fit"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          >
            <span>Tìm kiếm thông tin</span>
            {isSearchExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {isSearchExpanded && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Tên chủ đề/tiểu mục</label>
                  <Input 
                    placeholder="Nhập" 
                    className="h-10 w-full" 
                    value={searchTen}
                    onChange={(e) => setSearchTen(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">
                    Môn học <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={filterMonHoc}
                    onChange={setFilterMonHoc}
                    className="h-10 w-full"
                    options={[
                      { value: '', label: 'Tất cả' },
                      ...monHocs.map(m => ({ value: m.Id, label: m.Ten }))
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Khối lớp</label>
                  <Select
                    value={filterKhoiLop}
                    onChange={setFilterKhoiLop}
                    className="h-10 w-full text-sm"
                    mode="multiple"
                    placeholder="Chọn khối lớp"
                    maxTagCount="responsive"
                    options={khoiLops.map(m => ({ value: m.Id, label: m.Ten }))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Chủ đề</label>
                  <Select
                    value={filterParentTopic}
                    onChange={setFilterParentTopic}
                    className="h-10 w-full"
                    options={[
                      { value: 'Tất cả', label: 'Tất cả' },
                      ...parentTopicsOptions
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Trạng thái</label>
                  <Select
                    value={filterStatus}
                    onChange={setFilterStatus}
                    className="h-10 w-full"
                    options={[
                      { value: 'Tất cả', label: 'Tất cả' },
                      { value: 0, label: 'Tạo mới' },
                      { value: 1, label: 'Chờ thẩm định' },
                      { value: 2, label: 'Đã thẩm định' },
                      { value: 3, label: 'Từ chối' },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Ngày tạo</label>
                  <RangePicker
                    className="h-10 w-full text-sm"
                    placeholder={['Bắt đầu', 'Kết thúc']}
                    format="DD/MM/YYYY"
                    value={filterDates}
                    onChange={setFilterDates}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[#1e3a8a] font-semibold text-lg">Kết quả tìm kiếm</h2>
            <Space>
              <Button
                type="primary"
                className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none h-10 font-medium px-4 outline-none"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Thêm mới
              </Button>
              <Button 
                className="border-[#1d4ed8] text-[#1d4ed8] h-10 font-medium px-4 hover:bg-blue-50"
                disabled={selectedRowKeys.length === 0}
                onClick={handleOpenGuiThamDinhMultiple}
              >
                Gửi thẩm định
              </Button>
              <Button
                className="border-red-500 text-red-500 h-10 font-medium px-4 hover:bg-red-50"
                disabled={selectedRowKeys.length === 0}
                onClick={handleOpenDeleteMultiple}
              >
                Xóa
              </Button>
            </Space>
          </div>

          <Spin spinning={loading}>
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={filteredTree}
              rowKey="Id"
              pagination={{
                total: filteredTree.length,
                showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
                showSizeChanger: true,
                defaultPageSize: 10,
                pageSizeOptions: ['10', '20', '50', '100'],
                locale: { items_per_page: '/ trang' },
                className: 'mt-6',
              }}
              className="border-t border-gray-200"
            />
          </Spin>
        </div>

        {/* Modals */}
        <CreateKhoiLopModalWrapper 
          open={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          monHocs={monHocs.filter(m => m.IsActive !== false)}
          khoiLops={khoiLops.filter(k => k.IsActive !== false)}
          onSave={async (values: any) => {
            try {
              await topicsApi.create({
                parent_id: values.ParentId || null,
                code: values.Ma,
                name: values.Ten,
                subject_id: values.IdMonHoc,
                grade_id: values.IdKhoiLop,
                status: 0,
                note: values.GhiChu || '',
              });
              message.success('Tạo chủ đề/tiểu mục thành công!');
              fetchTopics();
              return true;
            } catch (e: any) {
              if (e.message?.includes('Mã chủ đề đã tồn tại')) {
                message.warning(`Mã "${values.Ma}" đã tồn tại trong hệ thống. Vui lòng nhập mã khác!`);
                return 'duplicate_code';
              }
              if (e.message?.includes('Failed to fetch')) {
                message.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend!');
                return false;
              }
              message.error(e.message || 'Không thể tạo chủ đề!');
              return false;
            }
          }}
          allData={rawData.map(i => ({ Id: i.id, ParentId: i.parent_id, Ma: i.code, Ten: i.name, IdMonHoc: i.subject_id, IdKhoiLop: i.grade_id, TrangThai: i.status, IdNguoiTao: i.created_by, ThoiGianTao: i.created_at, IdNguoiGui: i.submitted_by, ThoiGianGui: i.submitted_at, IdNguoiThamDinh: i.approved_by, ThoiGianThamDinh: i.approved_at, NoiDungThamDinh: i.approval_note, GhiChu: i.note }))}
        />

        <UpdateChuDeModal
          open={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          record={selectedRecord}
          monHocs={monHocs}
          khoiLops={khoiLops}
          onSave={async (values) => {
            try {
              await topicsApi.update(selectedRecord!.Id, {
                parent_id: values.ParentId || null,
                code: values.Ma,
                name: values.Ten,
                subject_id: values.IdMonHoc,
                grade_id: values.IdKhoiLop,
                note: values.GhiChu || '',
              });
              message.success('Cập nhật chủ đề/tiểu mục thành công!');
              fetchTopics();
              return true;
            } catch (e: any) {
              if (e.message?.includes('Mã chủ đề đã tồn tại')) {
                message.warning(`Mã "${values.Ma}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác!`);
                return 'duplicate_code';
              }
              if (e.message?.includes('Failed to fetch')) {
                message.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend!');
                return false;
              }
              message.error(e.message || 'Không thể cập nhật chủ đề!');
              return false;
            }
          }}
          allData={rawData.map(i => ({ Id: i.id, ParentId: i.parent_id, Ma: i.code, Ten: i.name, IdMonHoc: i.subject_id, IdKhoiLop: i.grade_id, TrangThai: i.status, IdNguoiTao: i.created_by, ThoiGianTao: i.created_at, IdNguoiGui: i.submitted_by, ThoiGianGui: i.submitted_at, IdNguoiThamDinh: i.approved_by, ThoiGianThamDinh: i.approved_at, NoiDungThamDinh: i.approval_note, GhiChu: i.note }))}
        />

        <DeleteChuDeModal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          itemName={selectedRecord?.Ten}
          isMultiple={isMultipleAction}
          multipleCount={selectedRowKeys.length}
          onConfirm={async () => {
            try {
              if (isMultipleAction) {
                for (const key of selectedRowKeys) {
                  await topicsApi.delete(key.toString());
                }
                message.success('Đã xóa các chủ đề được chọn!');
                setSelectedRowKeys([]);
              } else if (selectedRecord) {
                await topicsApi.delete(selectedRecord.Id);
                message.success(`Đã xóa chủ đề "${selectedRecord.Ten}"!`);
              }
              setIsDeleteModalOpen(false);
              fetchTopics();
            } catch (e: any) {
              message.error(e.message || 'Không thể xóa chủ đề!');
            }
          }}
        />

        <GuiThamDinhChuDeModal
          open={isGuiThamDinhModalOpen}
          onClose={() => setIsGuiThamDinhModalOpen(false)}
          itemName={selectedRecord?.Ten}
          isMultiple={isMultipleAction}
          multipleCount={selectedRowKeys.length}
          onConfirm={async () => {
            try {
              if (isMultipleAction) {
                for (const key of selectedRowKeys) {
                  await topicsApi.submit(key.toString());
                }
                message.success('Đã gửi thẩm định các chủ đề được chọn!');
                setSelectedRowKeys([]);
              } else if (selectedRecord) {
                await topicsApi.submit(selectedRecord.Id);
                message.success(`Đã gửi thẩm định chủ đề "${selectedRecord.Ten}"!`);
              }
              setIsGuiThamDinhModalOpen(false);
              fetchTopics();
            } catch (e: any) {
              message.error(e.message || 'Không thể gửi thẩm định!');
            }
          }}
        />

        <LichSuChuDeModal
          open={isLichSuModalOpen}
          onClose={() => setIsLichSuModalOpen(false)}
          record={selectedRecord}
        />

        <DetailChuDeModal
          open={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          record={selectedRecord}
          allData={rawData.map(i => ({ Id: i.id, ParentId: i.parent_id, Ma: i.code, Ten: i.name, IdMonHoc: i.subject_id, IdKhoiLop: i.grade_id, TrangThai: i.status, IdNguoiTao: i.created_by, ThoiGianTao: i.created_at, IdNguoiGui: i.submitted_by, ThoiGianGui: i.submitted_at, IdNguoiThamDinh: i.approved_by, ThoiGianThamDinh: i.approved_at, NoiDungThamDinh: i.approval_note, GhiChu: i.note, MonHocName: i.subject_name || '', KhoiLopName: i.grade_name || '' }))}
        />
      </div>
    </ConfigProvider>
  );
}

function CreateKhoiLopModalWrapper(props: any) {
  return <CreateChuDeModal {...props} />;
}
