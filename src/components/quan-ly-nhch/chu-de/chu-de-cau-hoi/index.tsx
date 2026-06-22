import React, { useState, useMemo } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, ConfigProvider, Dropdown, MenuProps, Tag } from 'antd';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2, MoreVertical, Send, History } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import CreateChuDeModal from './create';
import UpdateChuDeModal from './update';
import DeleteChuDeModal from './delete';
import GuiThamDinhChuDeModal from './send-review';
import LichSuChuDeModal from './history';

const { RangePicker } = DatePicker;

export interface ChuDeType {
  Id: string;
  ParentId: string | null;
  Ma: string;
  Ten: string;
  IdMonThi: string;
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
  MonThiName?: string;
  KhoiLopName?: string;
  children?: ChuDeType[];
}

export const mockMonThi = [
  { Id: '1', Ma: 'TO', Ten: 'Toán học' },
  { Id: '2', Ma: 'LI', Ten: 'Vật lý' },
  { Id: '3', Ma: 'HO', Ten: 'Hóa Học' },
  { Id: '4', Ma: 'SI', Ten: 'Sinh học' },
  { Id: '5', Ma: 'SU', Ten: 'Lịch sử' },
];

export const mockKhoiLop = [
  { Id: '1', Ma: 'K12', Ten: 'Khối 12' },
  { Id: '2', Ma: 'K11', Ten: 'Khối 11' },
  { Id: '3', Ma: 'K10', Ten: 'Khối 10' },
];

export const mockData: ChuDeType[] = [
  {
    Id: '1',
    ParentId: null,
    Ma: 'CD01',
    Ten: 'Biến ngẫu nhiên rời rạc',
    IdMonThi: '1',
    IdKhoiLop: '1',
    TrangThai: 2,
    IdNguoiTao: 'user1',
    ThoiGianTao: '20/05/2025',
    IdNguoiGui: 'user1',
    ThoiGianGui: '21/05/2025',
    IdNguoiThamDinh: 'admin',
    ThoiGianThamDinh: '22/05/2025',
    NoiDungThamDinh: 'Đạt',
    GhiChu: null,
    MonThiName: 'Toán',
    KhoiLopName: 'Khối 12',
    children: []
  },
  {
    Id: '2',
    ParentId: null,
    Ma: 'CD02',
    Ten: 'Ứng dụng toán học',
    IdMonThi: '1',
    IdKhoiLop: '2',
    TrangThai: 3,
    IdNguoiTao: 'user1',
    ThoiGianTao: '20/05/2025',
    IdNguoiGui: 'user1',
    ThoiGianGui: '21/05/2025',
    IdNguoiThamDinh: 'admin',
    ThoiGianThamDinh: '22/05/2025',
    NoiDungThamDinh: 'Cần bổ sung',
    GhiChu: null,
    MonThiName: 'Toán',
    KhoiLopName: 'Khối 11',
    children: [
      {
        Id: '2-1',
        ParentId: '2',
        Ma: 'CD02-1',
        Ten: 'Ứng dụng toán học 1',
        IdMonThi: '1',
        IdKhoiLop: '2',
        TrangThai: 2,
        IdNguoiTao: 'user1',
        ThoiGianTao: '20/05/2025',
        IdNguoiGui: 'user1',
        ThoiGianGui: '21/05/2025',
        IdNguoiThamDinh: 'admin',
        ThoiGianThamDinh: '22/05/2025',
        NoiDungThamDinh: 'Đạt',
        GhiChu: 'Yêu cầu 1',
        MonThiName: 'Toán',
        KhoiLopName: 'Khối 11',
      },
      {
        Id: '2-2',
        ParentId: '2',
        Ma: 'CD02-2',
        Ten: 'Sân khấu hoá tác phẩm văn học',
        IdMonThi: '1',
        IdKhoiLop: '2',
        TrangThai: 2,
        IdNguoiTao: 'user1',
        ThoiGianTao: '20/05/2025',
        IdNguoiGui: 'user1',
        ThoiGianGui: '21/05/2025',
        IdNguoiThamDinh: 'admin',
        ThoiGianThamDinh: '22/05/2025',
        NoiDungThamDinh: 'Đạt',
        GhiChu: 'Yêu cầu 2',
        MonThiName: 'Toán',
        KhoiLopName: 'Khối 11',
      }
    ]
  },
  {
    Id: '3',
    ParentId: null,
    Ma: 'CD03',
    Ten: 'Sân khấu hoá tác phẩm văn học',
    IdMonThi: '1',
    IdKhoiLop: '1',
    TrangThai: 0,
    IdNguoiTao: 'user1',
    ThoiGianTao: '20/05/2025',
    IdNguoiGui: null,
    ThoiGianGui: null,
    IdNguoiThamDinh: null,
    ThoiGianThamDinh: null,
    NoiDungThamDinh: null,
    GhiChu: null,
    MonThiName: 'Toán',
    KhoiLopName: 'Khối 12',
  }
];

export default function ChuDeCauHoi() {
  const [data, setData] = useState<ChuDeType[]>(mockData);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

  // Filters
  const [filterMonThi, setFilterMonThi] = useState<string>('1');
  const [filterKhoiLop, setFilterKhoiLop] = useState<string>('1');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isGuiThamDinhModalOpen, setIsGuiThamDinhModalOpen] = useState(false);
  const [isLichSuModalOpen, setIsLichSuModalOpen] = useState(false);
  
  const [isMultipleAction, setIsMultipleAction] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ChuDeType | null>(null);

  const handleOpenUpdate = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsUpdateModalOpen(true);
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
    
    // Gửi thẩm định / phản biện
    if (record.TrangThai === 0 || record.TrangThai === 3) {
      items.push({
        key: 'send',
        icon: <Send size={16} />,
        label: 'Gửi thẩm định/phản biện',
        onClick: () => handleOpenGuiThamDinh(record)
      });
    }

    // Lịch sử
    items.push({
      key: 'history',
      icon: <History size={16} />,
      label: 'Lịch sử chỉnh sửa, thẩm định',
      onClick: () => handleOpenLichSu(record)
    });

    // Xóa
    items.push({
      key: 'delete',
      icon: <Trash2 size={16} className="text-red-500" />,
      label: <span className="text-red-500 font-medium">Xóa chủ đề</span>,
      onClick: () => handleOpenDelete(record)
    });

    return { items };
  };

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
      dataIndex: 'MonThiName',
      key: 'MonThiName',
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Tên chủ đề/tiểu mục</label>
                  <Input placeholder="Nhập" className="h-10 w-full" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">
                    Môn thi <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={filterMonThi}
                    onChange={setFilterMonThi}
                    className="h-10 w-full"
                    options={mockMonThi.map(m => ({ value: m.Id, label: m.Ten }))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Khối lớp</label>
                  <Select
                    value={filterKhoiLop}
                    onChange={setFilterKhoiLop}
                    className="h-10 w-full"
                    mode="multiple"
                    maxTagCount="responsive"
                    options={mockKhoiLop.map(m => ({ value: m.Id, label: m.Ten }))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Ngày tạo</label>
                  <RangePicker
                    className="h-10 w-full"
                    placeholder={['Bắt đầu', 'Kết thúc']}
                    format="DD/MM/YYYY"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Chủ đề</label>
                  <Select
                    defaultValue="Tất cả"
                    className="h-10 w-full"
                    options={[
                      { value: 'Tất cả', label: 'Tất cả' },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Trạng thái</label>
                  <Select
                    defaultValue="Tất cả"
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
              </div>

              <div className="flex justify-center mt-6">
                <Button type="primary" className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none px-8 h-10 font-medium">
                  Tìm kiếm
                </Button>
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
                className="border-blue-500 text-blue-500 h-10 font-medium px-4 hover:bg-blue-50"
                disabled={selectedRowKeys.length === 0}
                onClick={handleOpenDeleteMultiple}
              >
                Xóa
              </Button>
            </Space>
          </div>

          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={data}
            rowKey="Id"
            pagination={{
              total: 1234,
              showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
              showSizeChanger: true,
              defaultPageSize: 10,
              pageSizeOptions: ['10', '20', '50', '100'],
              locale: { items_per_page: '/ trang' },
              className: 'mt-6',
            }}
            className="border-t border-gray-200"
          />
        </div>

        {/* Modals */}
        <CreateKhoiLopModalWrapper 
          open={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onSave={(values: any) => console.log('Created:', values)}
          allData={data}
        />

        <UpdateChuDeModal
          open={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          record={selectedRecord}
          onSave={(values) => {
            console.log('Updated:', values);
            setIsUpdateModalOpen(false);
          }}
          allData={data}
        />

        <DeleteChuDeModal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          itemName={selectedRecord?.Ten}
          isMultiple={isMultipleAction}
          multipleCount={selectedRowKeys.length}
          onConfirm={() => {
            if (isMultipleAction) setSelectedRowKeys([]);
            setIsDeleteModalOpen(false);
          }}
        />

        <GuiThamDinhChuDeModal
          open={isGuiThamDinhModalOpen}
          onClose={() => setIsGuiThamDinhModalOpen(false)}
          itemName={selectedRecord?.Ten}
          isMultiple={isMultipleAction}
          multipleCount={selectedRowKeys.length}
          onConfirm={() => {
            if (isMultipleAction) setSelectedRowKeys([]);
            setIsGuiThamDinhModalOpen(false);
          }}
        />

        <LichSuChuDeModal
          open={isLichSuModalOpen}
          onClose={() => setIsLichSuModalOpen(false)}
          record={selectedRecord}
        />
      </div>
    </ConfigProvider>
  );
}

// Wrapping create modal to pass data and hide complexity from index
function CreateKhoiLopModalWrapper(props: any) {
  return <CreateChuDeModal {...props} />;
}
