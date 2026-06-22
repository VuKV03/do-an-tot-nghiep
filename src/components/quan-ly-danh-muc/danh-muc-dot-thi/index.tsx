import React, { useState } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, ConfigProvider } from 'antd';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2 } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import CreateDotThiModal from './create.tsx';
import UpdateDotThiModal from './update.tsx';
import DetailDotThiModal from './detail.tsx';
import DeleteDotThiModal from './delete.tsx';

const { RangePicker } = DatePicker;

// Define type based on the provided DB schema
interface DmDotThiType {
  Id: string;
  Ma: string;
  Ten: string;
  NgayBatDau: string;
  NgayKetThuc: string;
  TrangThai: 'HOAT_DONG' | 'KHONG_HOAT_DONG';
  IsActive: boolean;
  GhiChu?: string;
  CreatedAt: string;
}

// Mock data matching the UI image
const mockData: DmDotThiType[] = [
  {
    Id: '1',
    Ma: 'D1',
    Ten: 'Thi thử nghiệm đợt 1 2025',
    NgayBatDau: '22-12-2024',
    NgayKetThuc: '22-12-2024',
    TrangThai: 'HOAT_DONG',
    IsActive: true,
    GhiChu: '',
    CreatedAt: '22-12-2024',
  },
  {
    Id: '2',
    Ma: 'D2',
    Ten: 'Thi thử nghiệm đợt 1 2025',
    NgayBatDau: '22-12-2024',
    NgayKetThuc: '22-12-2024',
    TrangThai: 'HOAT_DONG',
    IsActive: true,
    GhiChu: '',
    CreatedAt: '22-12-2024',
  },
  {
    Id: '3',
    Ma: 'VD',
    Ten: 'Thi chính thức đợt 1 2024',
    NgayBatDau: '22-12-2024',
    NgayKetThuc: '22-12-2024',
    TrangThai: 'HOAT_DONG',
    IsActive: true,
    GhiChu: '',
    CreatedAt: '22-12-2024',
  },
  {
    Id: '4',
    Ma: '...',
    Ten: '...',
    NgayBatDau: '22-12-2024',
    NgayKetThuc: '22-12-2024',
    TrangThai: 'KHONG_HOAT_DONG',
    IsActive: false,
    GhiChu: '',
    CreatedAt: '22-12-2024',
  },
  {
    Id: '5',
    Ma: '...',
    Ten: '...',
    NgayBatDau: '22-12-2024',
    NgayKetThuc: '22-12-2024',
    TrangThai: 'KHONG_HOAT_DONG',
    IsActive: false,
    GhiChu: '',
    CreatedAt: '22-12-2024',
  },
];

export default function DanhMucDotThi() {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteMultiple, setIsDeleteMultiple] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DmDotThiType | null>(null);

  const handleOpenDetail = (record: DmDotThiType) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleOpenUpdate = (record: DmDotThiType) => {
    setSelectedRecord(record);
    setIsUpdateModalOpen(true);
  };

  const handleOpenDelete = (record: DmDotThiType) => {
    setSelectedRecord(record);
    setIsDeleteMultiple(false);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeleteMultiple = () => {
    setIsDeleteMultiple(true);
    setIsDeleteModalOpen(true);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const columns: ColumnsType<DmDotThiType> = [
    {
      title: 'STT',
      dataIndex: 'stt',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Mã đợt thi',
      dataIndex: 'Ma',
      key: 'Ma',
    },
    {
      title: 'Tên đợt thi',
      dataIndex: 'Ten',
      key: 'Ten',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'CreatedAt',
      key: 'CreatedAt',
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'NgayBatDau',
      key: 'NgayBatDau',
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'NgayKetThuc',
      key: 'NgayKetThuc',
    },
    {
      title: 'Tình trạng',
      dataIndex: 'IsActive',
      key: 'IsActive',
      render: (isActive: boolean) => (
        <span
          className={`px-3 py-1 rounded border text-sm font-medium ${
            isActive
              ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
              : 'border-rose-400 text-rose-500 bg-rose-50'
          }`}
        >
          {isActive ? 'Hoạt động' : 'Không hoạt động'}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            onClick={() => handleOpenDetail(record)}
            icon={<Eye size={16} className="text-blue-600" />}
            className="bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md"
          />
          <Button
            type="text"
            onClick={() => handleOpenUpdate(record)}
            icon={<Edit size={16} className="text-blue-600" />}
            className="bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md"
          />
          <Button
            type="text"
            onClick={() => handleOpenDelete(record)}
            icon={<Trash2 size={16} className="text-red-500" />}
            className="bg-red-50 hover:bg-red-100 flex items-center justify-center p-2 rounded-md"
          />
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
                  <label className="text-gray-600 text-sm font-medium">Tên đợt thi</label>
                  <Input placeholder="Nhập" className="h-10 w-full" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Tình trạng</label>
                  <Select
                    defaultValue="Tất cả"
                    className="h-10 w-full"
                    options={[
                      { value: 'Tất cả', label: 'Tất cả' },
                      { value: 'Hoạt động', label: 'Hoạt động' },
                      { value: 'Không hoạt động', label: 'Không hoạt động' },
                    ]}
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
              </div>

              <div className="flex justify-center mt-4">
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
                className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none h-10 font-medium px-4"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Thêm mới
              </Button>
              <Button className="border-[#1d4ed8] text-[#1d4ed8] h-10 font-medium px-4 hover:bg-blue-50">
                Xuất Excel
              </Button>
              <Button
                danger
                className="border-red-500 text-red-500 h-10 font-medium px-4 hover:bg-red-50"
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
            dataSource={mockData}
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
        <CreateDotThiModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={(values) => {
            console.log('Created:', values);
          }}
        />

        <UpdateDotThiModal
          open={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          record={selectedRecord}
          onSave={(values) => {
            console.log('Updated:', values);
          }}
        />

        <DetailDotThiModal
          open={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          record={selectedRecord}
        />

        <DeleteDotThiModal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          itemName={selectedRecord?.Ten}
          isMultiple={isDeleteMultiple}
          multipleCount={selectedRowKeys.length}
          onConfirm={() => {
            if (isDeleteMultiple) {
              console.log('Deleted multiple:', selectedRowKeys);
              setSelectedRowKeys([]);
            } else {
              console.log('Deleted single:', selectedRecord?.Id);
            }
          }}
        />
      </div>
    </ConfigProvider>
  );
}
