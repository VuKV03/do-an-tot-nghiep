import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  ConfigProvider,
  DatePicker,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Pagination,
} from 'antd';
import { toast } from '../../../utils/toast';
import { exportToExcel, type ExcelColumn } from '../../../utils/excelExport';
import { useResizableColumns, ColResizeHandle, ResizableTableStyles, RESIZABLE_TABLE_CLASS, TruncatedText } from '../../../utils/resizableTable';
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  Settings,
  Trash2,
} from 'lucide-react';
import { FileExcelOutlined } from '@ant-design/icons';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { colGroup: monHocColGroup, startResize: startMonHocColResize, totalWidth: monHocTableTotalWidth } = useResizableColumns(
    [40, 60, 140, 220, 160, 140, 160]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await subjectCategoryApi.list();
      // API trả về đúng tên field → dùng thẳng, không cần convert
      setData(res.data as SubjectCategoryType[]);
    } catch {
      toast.error('Không thể tải danh sách môn học!');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => { setCurrentPage(1); }, [searchKeyword, searchActive, searchDates]);

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const isAllSelected = paginatedData.length > 0 && paginatedData.every(r => selectedRowKeys.includes(r.id));
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedRowKeys(prev => prev.filter(k => !paginatedData.some(r => r.id === k)));
    else setSelectedRowKeys(prev => Array.from(new Set([...prev, ...paginatedData.map(r => r.id)])));
  };
  const toggleSelectRow = (id: string) => {
    setSelectedRowKeys(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  const excelColumns: ExcelColumn<SubjectCategoryType>[] = [
    { header: 'STT', accessor: (_row, i) => i + 1, width: 6, align: 'center' },
    { header: 'Mã', accessor: row => row.code, width: 16 },
    { header: 'Tên', accessor: row => row.name, width: 30 },
    { header: 'Ngày tạo', accessor: row => row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : '', width: 18, align: 'center' },
    { header: 'Trạng thái', accessor: row => row.is_active ? 'Hoạt động' : 'Không hoạt động', width: 16, align: 'center' },
  ];

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.warning('Không có dữ liệu để xuất Excel.');
      return;
    }
    const fileName = `MonHoc_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(filteredData, excelColumns, fileName, 'Môn học');
    toast.success('Xuất báo cáo Excel thành công!');
  };

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
              <Button type='primary' icon={<FileExcelOutlined />} className='!bg-green-600 !border-green-600 !text-white h-10 font-medium px-4 hover:!bg-green-700' onClick={handleExportExcel}>
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
          <ResizableTableStyles />
          <Spin spinning={loading}>
            <div className='overflow-x-auto border-t border-gray-200'>
              <table style={{ minWidth: monHocTableTotalWidth }} className={`w-full text-sm text-slate-700 border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}>
                {monHocColGroup}
                <thead>
                  <tr className='bg-[#f8fafc] border-b border-gray-200 text-[#334155] font-semibold'>
                    <th className='relative py-3 px-3 text-center'>
                      <input type='checkbox' className='cursor-pointer' checked={isAllSelected} onChange={toggleSelectAll} />
                      <ColResizeHandle onMouseDown={startMonHocColResize(0)} />
                    </th>
                    <th className='relative py-3 px-3 text-center'>STT<ColResizeHandle onMouseDown={startMonHocColResize(1)} /></th>
                    <th className='relative py-3 px-3 text-left'>Mã<ColResizeHandle onMouseDown={startMonHocColResize(2)} /></th>
                    <th className='relative py-3 px-3 text-left'>Tên<ColResizeHandle onMouseDown={startMonHocColResize(3)} /></th>
                    <th className='relative py-3 px-3 text-left'>Ngày tạo<ColResizeHandle onMouseDown={startMonHocColResize(4)} /></th>
                    <th className='relative py-3 px-3 text-center'>Trạng thái<ColResizeHandle onMouseDown={startMonHocColResize(5)} /></th>
                    <th className='relative py-3 px-3 text-center'>Thao tác<ColResizeHandle onMouseDown={startMonHocColResize(6)} /></th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={7} className='py-12 text-center'><Empty description='Không có dữ liệu môn học' /></td></tr>
                  ) : paginatedData.map((r, idx) => (
                    <tr key={r.id} className='hover:bg-[#f1f5f9] transition-colors'>
                      <td className='py-3 px-3 text-center'>
                        <input type='checkbox' className='cursor-pointer' checked={selectedRowKeys.includes(r.id)} onChange={() => toggleSelectRow(r.id)} />
                      </td>
                      <td className='py-3 px-3 text-center'>{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className='py-3 px-3'><TruncatedText text={r.code} /></td>
                      <td className='py-3 px-3'><TruncatedText text={r.name} /></td>
                      <td className='py-3 px-3'><TruncatedText text={r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : ''} /></td>
                      <td className='py-3 px-3 text-center'>
                        <span className={`px-3 py-1 rounded border text-sm font-medium ${r.is_active ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-rose-400 text-rose-500 bg-rose-50'}`}>{r.is_active ? 'Hoạt động' : 'Không hoạt động'}</span>
                      </td>
                      <td className='py-3 px-3 text-center'>
                        <Space size='small'>
                          <Button type='text' onClick={() => handleOpenDetail(r)} icon={<Eye size={16} className='text-blue-600' />} className='bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md' />
                          <Button type='text' onClick={() => handleOpenUpdate(r)} icon={<Edit size={16} className='text-blue-600' />} className='bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md' />
                          <Button type='text' onClick={() => handleOpenDelete(r)} icon={<Trash2 size={16} className='text-red-500' />} className='bg-red-50 hover:bg-red-100 flex items-center justify-center p-2 rounded-md' />
                          <Button type='text' onClick={() => handleOpenCauHinh(r)} icon={<Settings size={16} className='text-orange-500' />} className='bg-orange-50 hover:bg-orange-100 flex items-center justify-center p-2 rounded-md' />
                        </Space>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Spin>
          <div className='flex justify-between items-center mt-2'>
            <div className='text-xs text-slate-500 font-medium'>
              {filteredData.length === 0 ? '0 - 0' : `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredData.length)}`} / {filteredData.length} bản ghi
            </div>
            <Pagination
              current={currentPage}
              total={filteredData.length}
              pageSize={pageSize}
              onChange={(page, size) => { setCurrentPage(page); setPageSize(size); }}
              showSizeChanger
              showQuickJumper={false}
              pageSizeOptions={['10', '20', '50', '100']}
              locale={{ items_per_page: '/ trang' }}
            />
          </div>
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
              toast.success('Thêm môn học thành công!');
              fetchData();
              return true;
            } catch (error: any) {
              toast.error(error.message || 'Lỗi khi thêm môn học!');
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
              toast.success('Cập nhật môn học thành công!');
              fetchData();
              return true;
            } catch (error: any) {
              toast.error(error.message || 'Lỗi khi cập nhật môn học!');
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
                toast.success(`Đã xóa ${succeeded.length} môn học!`);
              } else if (succeeded.length === 0) {
                toast.error(`Không thể xóa ${failed.length} mục: ${failed.map(({ r }) => (r.reason as Error)?.message || 'Lỗi không xác định').join('; ')}`);
              } else {
                toast.warning(`Đã xóa ${succeeded.length}/${keys.length} mục. ${failed.length} mục không thể xóa: ${failed.map(({ r }) => (r.reason as Error)?.message || 'Lỗi không xác định').join('; ')}`);
              }
              setSelectedRowKeys((prev) => prev.filter((k) => !succeeded.includes(String(k))));
            } else if (selectedRecord) {
              try {
                await subjectCategoryApi.delete(selectedRecord.id);
                toast.success('Đã xóa môn học!');
              } catch (e: any) {
                toast.error(e.message || 'Lỗi khi xóa môn học!');
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
