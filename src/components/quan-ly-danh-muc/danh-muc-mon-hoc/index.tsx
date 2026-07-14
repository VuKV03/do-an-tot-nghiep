import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  ConfigProvider,
  DatePicker,
  Empty,
  Input,
  Select,
  Space,
  Table,
  message,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  Settings,
  Trash2,
} from 'lucide-react';
import CreateSubjectCategoryModal from './create.tsx';
import UpdateSubjectCategoryModal from './update.tsx';
import DetailSubjectCategoryModal from './detail.tsx';
import DeleteSubjectCategoryModal from './delete.tsx';
import CauHinhMonHocModal from './config.tsx';
import {
  subjectCategoryApi,
  type SubjectCategoryAPI,
} from '../../../services/danhMucApi.ts';

const { RangePicker } = DatePicker;

/** Type khớp hoàn toàn với DB / API fields */
export interface SubjectCategoryType {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  note?: string;
  created_at: string;
  updated_at?: string | null;
}

export default function DanhMucMonHoc() {
  const [data, setData] = useState<SubjectCategoryType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteMultiple, setIsDeleteMultiple] = useState(false);
  const [isCauHinhModalOpen, setIsCauHinhModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<SubjectCategoryType | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchActive, setSearchActive] = useState('all');
  const [searchDates, setSearchDates] = useState<any>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await subjectCategoryApi.list();
      // API trả về đúng tên field → dùng thẳng, không cần convert
      setData(res.data as SubjectCategoryType[]);
    } catch {
      messageApi.error('Không thể tải danh sách môn học!');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDetail = (record: SubjectCategoryType) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };
  const handleOpenUpdate = (record: SubjectCategoryType) => {
    setSelectedRecord(record);
    setIsUpdateModalOpen(true);
  };
  const handleOpenDelete = (record: SubjectCategoryType) => {
    setSelectedRecord(record);
    setIsDeleteMultiple(false);
    setIsDeleteModalOpen(true);
  };
  const handleOpenDeleteMultiple = () => {
    setIsDeleteMultiple(true);
    setIsDeleteModalOpen(true);
  };
  const handleOpenCauHinh = (record: SubjectCategoryType) => {
    setSelectedRecord(record);
    setIsCauHinhModalOpen(true);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newKeys: React.Key[]) => setSelectedRowKeys(newKeys),
  };

  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      const kw = searchKeyword.trim().toLowerCase();
      const matchKeyword =
        !kw ||
        item.code?.toLowerCase().includes(kw) ||
        item.name?.toLowerCase().includes(kw);
      const matchActive =
        searchActive === 'all' ||
        (searchActive === 'true' && item.is_active === true) ||
        (searchActive === 'false' && item.is_active === false);
      let matchDate = true;
      if (searchDates && searchDates[0] && searchDates[1] && item.created_at) {
        const itemDate = new Date(item.created_at).getTime();
        const start = searchDates[0].startOf('day').valueOf();
        const end = searchDates[1].endOf('day').valueOf();
        matchDate = itemDate >= start && itemDate <= end;
      }
      return matchKeyword && matchActive && matchDate;
    });
  }, [data, searchKeyword, searchActive, searchDates]);

  const columns: ColumnsType<SubjectCategoryType> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, i) => i + 1,
    },
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => (v ? new Date(v).toLocaleString('vi-VN') : ''),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => (
        <span
          className={`px-3 py-1 rounded border text-sm font-medium ${v ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-rose-400 text-rose-500 bg-rose-50'}`}
        >
          {v ? 'Hoạt động' : 'Không hoạt động'}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space size='small'>
          <Button
            type='text'
            onClick={() => handleOpenDetail(record)}
            icon={<Eye size={16} className='text-blue-600' />}
            className='bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md'
          />
          <Button
            type='text'
            onClick={() => handleOpenUpdate(record)}
            icon={<Edit size={16} className='text-blue-600' />}
            className='bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md'
          />
          <Button
            type='text'
            onClick={() => handleOpenDelete(record)}
            icon={<Trash2 size={16} className='text-red-500' />}
            className='bg-red-50 hover:bg-red-100 flex items-center justify-center p-2 rounded-md'
          />
          <Button
            type='text'
            onClick={() => handleOpenCauHinh(record)}
            icon={<Settings size={16} className='text-orange-500' />}
            className='bg-orange-50 hover:bg-orange-100 flex items-center justify-center p-2 rounded-md'
          />
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: '#1d4ed8', borderRadius: 6 },
        components: {
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#334155',
            rowHoverBg: '#f1f5f9',
          },
        },
      }}
    >
      {contextHolder}
      <div className='p-6 flex flex-col gap-8 bg-white min-h-[calc(100vh-200px)]'>
        <div className='flex flex-col gap-4 border-b border-gray-200 pb-8 transition-all duration-300'>
          <div
            className='flex items-center gap-2 cursor-pointer text-[#1e3a8a] font-semibold text-lg select-none w-fit'
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          >
            <span>Tìm kiếm thông tin</span>
            {isSearchExpanded ? (
              <ChevronUp size={20} />
            ) : (
              <ChevronDown size={20} />
            )}
          </div>
          {isSearchExpanded && (
            <div className='animate-in fade-in slide-in-from-top-2 duration-300'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-2'>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-gray-600 text-sm font-medium'>
                    Mã / Tên
                  </label>
                  <Input
                    placeholder='Nhập mã hoặc tên'
                    className='h-10 w-full'
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    allowClear
                  />
                </div>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-gray-600 text-sm font-medium'>
                    Trạng thái
                  </label>
                  <Select
                    value={searchActive}
                    onChange={setSearchActive}
                    className='h-10 w-full'
                    options={[
                      { value: 'all', label: 'Tất cả' },
                      { value: 'true', label: 'Hoạt động' },
                      { value: 'false', label: 'Không hoạt động' },
                    ]}
                  />
                </div>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-gray-600 text-sm font-medium'>
                    Ngày tạo
                  </label>
                  <RangePicker
                    className='h-10 w-full'
                    placeholder={['Bắt đầu', 'Kết thúc']}
                    format='DD/MM/YYYY'
                    value={searchDates}
                    onChange={setSearchDates}
                  />
                </div>
              </div>
              <div className='flex justify-center mt-4'>
                <Button
                  type='primary'
                  onClick={fetchData}
                  className='bg-[#1d4ed8] hover:bg-[#1e40af] border-none px-8 h-10 font-medium'
                >
                  Làm mới dữ liệu
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className='flex flex-col gap-4'>
          <div className='flex justify-between items-center mb-2'>
            <div className='flex items-center gap-3'>
              <h2 className='text-[#1e3a8a] font-semibold text-lg'>
                Kết quả tìm kiếm
              </h2>
              {selectedRowKeys.length > 0 && (
                <span className='px-2.5 py-0.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700'>
                  Đã chọn{' '}
                  <span className='font-bold'>{selectedRowKeys.length}</span>{' '}
                  môn học
                </span>
              )}
            </div>
            <Space>
              <Button
                type='primary'
                className='bg-[#1d4ed8] hover:bg-[#1e40af] border-none h-10 font-medium px-4'
                onClick={() => setIsCreateModalOpen(true)}
              >
                Thêm mới
              </Button>
              <Button className='border-[#1d4ed8] text-[#1d4ed8] h-10 font-medium px-4 hover:bg-blue-50'>
                Xuất Excel
              </Button>
              <Button
                danger
                className='border-red-500 text-red-500 h-10 font-medium px-4 hover:bg-red-50'
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
              rowKey='id'
              locale={{
                emptyText: <Empty description='Không có dữ liệu môn học' />,
              }}
              pagination={{
                total: filteredData.length,
                showTotal: (total: number, range: [number, number]) =>
                  `${range[0]} - ${range[1]} / ${total} bản ghi`,
                showSizeChanger: true,
                defaultPageSize: 10,
                pageSizeOptions: ['10', '20', '50', '100'],
                locale: { items_per_page: '/ trang' },
                className: 'mt-6',
              }}
              className='border-t border-gray-200'
            />
          </Spin>
        </div>

        <CreateSubjectCategoryModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async (values) => {
            try {
              await subjectCategoryApi.create({
                code: values.code!,
                name: values.name!,
                is_active: values.is_active ?? true,
                note: values.note ?? '',
              });
              messageApi.success('Thêm môn học thành công!');
              fetchData();
              return true;
            } catch (error: any) {
              messageApi.error(error.message || 'Lỗi khi thêm môn học!');
              return false;
            }
          }}
        />

        <UpdateSubjectCategoryModal
          open={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          record={selectedRecord}
          onSave={async (values) => {
            if (!selectedRecord) return false;
            try {
              await subjectCategoryApi.update(selectedRecord.id, {
                code: values.code,
                name: values.name,
                is_active: values.is_active,
                note: values.note,
              });
              messageApi.success('Cập nhật môn học thành công!');
              fetchData();
              return true;
            } catch (error: any) {
              messageApi.error(error.message || 'Lỗi khi cập nhật môn học!');
              return false;
            }
          }}
        />

        <DetailSubjectCategoryModal
          open={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          record={selectedRecord}
        />

        <DeleteSubjectCategoryModal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          itemName={selectedRecord?.name}
          isMultiple={isDeleteMultiple}
          multipleCount={selectedRowKeys.length}
          onConfirm={async () => {
            if (isDeleteMultiple) {
              const keys = selectedRowKeys.map(String);
              const results = await Promise.allSettled(keys.map((k) => subjectCategoryApi.delete(k)));
              const succeeded = keys.filter((_, i) => results[i].status === 'fulfilled');
              const failed = keys
                .map((k, i) => ({ k, r: results[i] }))
                .filter(({ r }) => r.status === 'rejected') as { k: string; r: PromiseRejectedResult }[];

              if (failed.length === 0) {
                messageApi.success(`Đã xóa ${succeeded.length} môn học!`);
              } else if (succeeded.length === 0) {
                messageApi.error(`Không thể xóa ${failed.length} mục: ${failed.map(({ r }) => (r.reason as Error)?.message || 'Lỗi không xác định').join('; ')}`);
              } else {
                messageApi.warning(`Đã xóa ${succeeded.length}/${keys.length} mục. ${failed.length} mục không thể xóa: ${failed.map(({ r }) => (r.reason as Error)?.message || 'Lỗi không xác định').join('; ')}`);
              }
              setSelectedRowKeys((prev) => prev.filter((k) => !succeeded.includes(String(k))));
            } else if (selectedRecord) {
              try {
                await subjectCategoryApi.delete(selectedRecord.id);
                messageApi.success('Đã xóa môn học!');
              } catch (e: any) {
                messageApi.error(e.message || 'Lỗi khi xóa môn học!');
              }
            }
            fetchData();
          }}
        />

        <CauHinhMonHocModal
          open={isCauHinhModalOpen}
          onClose={() => setIsCauHinhModalOpen(false)}
          record={selectedRecord}
        />
      </div>
    </ConfigProvider>
  );
}
