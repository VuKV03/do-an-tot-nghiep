import React, { useState, useEffect, useMemo } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, ConfigProvider, message, Spin } from 'antd';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2 } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import CreateDotThiModal from './create.tsx';
import UpdateDotThiModal from './update.tsx';
import DetailDotThiModal from './detail.tsx';
import DeleteDotThiModal from './delete.tsx';
import { examPeriodApi } from '../../../services/danhMucApi.ts';

const { RangePicker } = DatePicker;

// Define type based on the provided DB schema
interface ExamPeriodType {
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

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`; // YYYY-MM-DD
    return `${parts[0]}/${parts[1]}/${parts[2]}`; // DD-MM-YYYY
  }
  return cleanStr;
};

export default function DanhMucDotThi() {
  const [data, setData] = useState<ExamPeriodType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

  // Search filter states
  const [searchTen, setSearchTen] = useState('');
  const [searchTinhTrang, setSearchTinhTrang] = useState('Tất cả');
  const [searchDates, setSearchDates] = useState<any>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteMultiple, setIsDeleteMultiple] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ExamPeriodType | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await examPeriodApi.list();
      const mapped = res.data.map((item: any) => {
        let computedActive = item.is_active;
        if (computedActive && item.end_date) {
          const parts = item.end_date.split('-');
          if (parts.length === 3) {
            const year = parts[0].length === 4 ? parts[0] : parts[2];
            const month = parts[1];
            const day = parts[0].length === 4 ? parts[2] : parts[0];
            const endDate = new Date(`${year}-${month}-${day}T00:00:00`);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (endDate.getTime() < today.getTime()) {
              computedActive = false;
            }
          }
        }
        return {
          Id: item.id,
          Ma: item.code,
          Ten: item.name,
          NgayBatDau: item.start_date,
          NgayKetThuc: item.end_date,
          TrangThai: (computedActive ? 'HOAT_DONG' : 'KHONG_HOAT_DONG') as 'HOAT_DONG' | 'KHONG_HOAT_DONG',
          IsActive: computedActive,
          GhiChu: item.note,
          CreatedAt: item.created_at,
        };
      });
      setData(mapped);
    } catch (e: any) {
      console.error(e);
      message.error(e.message || 'Không thể tải danh sách kỳ thi!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDetail = (record: ExamPeriodType) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleOpenUpdate = (record: ExamPeriodType) => {
    setSelectedRecord(record);
    setIsUpdateModalOpen(true);
  };

  const handleOpenDelete = (record: ExamPeriodType) => {
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

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchTen = !searchTen ||
        item.Ten.toLowerCase().includes(searchTen.toLowerCase()) ||
        item.Ma.toLowerCase().includes(searchTen.toLowerCase());

      const matchTinhTrang = searchTinhTrang === 'Tất cả' ||
        (searchTinhTrang === 'Hoạt động' && item.IsActive) ||
        (searchTinhTrang === 'Không hoạt động' && !item.IsActive);

      let matchDate = true;
      if (searchDates && searchDates[0] && searchDates[1] && item.CreatedAt) {
        const itemTime = new Date(item.CreatedAt).getTime();
        const start = searchDates[0].startOf('day').valueOf();
        const end = searchDates[1].endOf('day').valueOf();
        matchDate = itemTime >= start && itemTime <= end;
      }
      return matchTen && matchTinhTrang && matchDate;
    });
  }, [data, searchTen, searchTinhTrang, searchDates]);

  const columns: ColumnsType<ExamPeriodType> = [
    {
      title: 'STT',
      dataIndex: 'stt',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Mã kỳ thi',
      dataIndex: 'Ma',
      key: 'Ma',
    },
    {
      title: 'Tên kỳ thi',
      dataIndex: 'Ten',
      key: 'Ten',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'CreatedAt',
      key: 'CreatedAt',
      render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '',
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'NgayBatDau',
      key: 'NgayBatDau',
      render: (v) => formatDate(v),
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'NgayKetThuc',
      key: 'NgayKetThuc',
      render: (v) => formatDate(v),
    },
    {
      title: 'Tình trạng',
      dataIndex: 'IsActive',
      key: 'IsActive',
      render: (isActive: boolean) => (
        <span
          className={`px-3 py-1 rounded border text-sm font-medium ${isActive
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
                  <label className="text-gray-600 text-sm font-medium">Tên kỳ thi</label>
                  <Input
                    placeholder="Nhập"
                    className="h-10 w-full"
                    value={searchTen}
                    onChange={(e) => setSearchTen(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Tình trạng</label>
                  <Select
                    value={searchTinhTrang}
                    className="h-10 w-full"
                    onChange={setSearchTinhTrang}
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
                    value={searchDates}
                    onChange={setSearchDates}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-[#1e3a8a] font-semibold text-lg">Kết quả tìm kiếm</h2>
              {selectedRowKeys.length > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                  Đã chọn <span className="font-bold">{selectedRowKeys.length}</span> kỳ thi
                </span>
              )}
            </div>
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

          <Spin spinning={loading}>
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={filteredData}
              rowKey="Id"
              pagination={{
                total: filteredData.length,
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
        <CreateDotThiModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async (values) => {
            try {
              await examPeriodApi.create({
                code: values.Ma,
                name: values.Ten,
                start_date: values.NgayBatDau,
                end_date: values.NgayKetThuc,
                status: values.isActive ? 'HOAT_DONG' : 'KHONG_HOAT_DONG',
                is_active: values.isActive,
                note: values.GhiChu || '',
              });
              message.success('Thêm mới kỳ thi thành công!');
              fetchData();
              return true;
            } catch (e: any) {
              message.error(e.message || 'Không thể tạo kỳ thi!');
              return false;
            }
          }}
        />

        <UpdateDotThiModal
          open={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          record={selectedRecord}
          onSave={async (values) => {
            try {
              const convertDate = (dateStr: string) => {
                if (!dateStr) return '';
                if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) return dateStr;
                const parts = dateStr.split('-');
                if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                return dateStr;
              };
              await examPeriodApi.update(selectedRecord!.Id, {
                code: values.Ma,
                name: values.Ten,
                start_date: convertDate(values.NgayBatDau),
                end_date: convertDate(values.NgayKetThuc),
                status: values.isActive ? 'HOAT_DONG' : 'KHONG_HOAT_DONG',
                is_active: values.isActive,
                note: values.GhiChu || '',
              });
              message.success('Cập nhật kỳ thi thành công!');
              fetchData();
              return true;
            } catch (e: any) {
              message.error(e.message || 'Không thể cập nhật kỳ thi!');
              return false;
            }
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
          onConfirm={async () => {
            try {
              if (isDeleteMultiple) {
                for (const key of selectedRowKeys) {
                  await examPeriodApi.delete(key.toString());
                }
                message.success('Đã xóa kỳ thi được chọn!');
                setSelectedRowKeys([]);
              } else if (selectedRecord) {
                await examPeriodApi.delete(selectedRecord.Id);
                message.success(`Đã xóa kỳ thi "${selectedRecord.Ten}"!`);
              }
              setIsDeleteModalOpen(false);
              fetchData();
            } catch (e: any) {
              message.error(e.message || 'Không thể xóa kỳ thi!');
            }
          }}
        />
      </div>
    </ConfigProvider>
  );
}
