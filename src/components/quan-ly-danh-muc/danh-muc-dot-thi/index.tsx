import React, { useState, useEffect, useMemo } from 'react';
import { Input, Select, DatePicker, Button, Space, ConfigProvider, Spin, Empty, Pagination } from 'antd';
import { toast } from '../../../utils/toast';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2 } from 'lucide-react';
import { FileExcelOutlined } from '@ant-design/icons';
import CreateDotThiModal from './create.tsx';
import UpdateDotThiModal from './update.tsx';
import DetailDotThiModal from './detail.tsx';
import DeleteDotThiModal from './delete.tsx';
import { examPeriodApi } from '../../../services/danhMucApi.ts';
import { formatDateTime } from '../../../utils/formatDate';
import { useResizableColumns, ColResizeHandle, ResizableTableStyles, RESIZABLE_TABLE_CLASS, TruncatedText } from '../../../utils/resizableTable';
import { exportToExcel, type ExcelColumn } from '../../../utils/excelExport';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { colGroup: dotThiColGroup, startResize: startDotThiColResize, totalWidth: dotThiTableTotalWidth } = useResizableColumns(
    [40, 60, 140, 220, 150, 130, 130, 140, 140]
  );

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
      toast.error(e.message || 'Không thể tải danh sách kỳ thi!');
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

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const kwTen = searchTen.trim().toLowerCase();
      const matchTen = !kwTen ||
        item.Ten.toLowerCase().includes(kwTen) ||
        item.Ma.toLowerCase().includes(kwTen);

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

  useEffect(() => { setCurrentPage(1); }, [searchTen, searchTinhTrang, searchDates]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const isAllSelected = paginatedData.length > 0 && paginatedData.every(r => selectedRowKeys.includes(r.Id));
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedRowKeys(prev => prev.filter(k => !paginatedData.some(r => r.Id === k)));
    else setSelectedRowKeys(prev => Array.from(new Set([...prev, ...paginatedData.map(r => r.Id)])));
  };
  const toggleSelectRow = (id: string) => {
    setSelectedRowKeys(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  const excelColumns: ExcelColumn<ExamPeriodType>[] = [
    { header: 'STT', accessor: (_row, i) => i + 1, width: 6, align: 'center' },
    { header: 'Mã kỳ thi', accessor: row => row.Ma, width: 16 },
    { header: 'Tên kỳ thi', accessor: row => row.Ten, width: 30 },
    { header: 'Ngày tạo', accessor: row => formatDateTime(row.CreatedAt), width: 18, align: 'center' },
    { header: 'Ngày bắt đầu', accessor: row => formatDate(row.NgayBatDau), width: 14, align: 'center' },
    { header: 'Ngày kết thúc', accessor: row => formatDate(row.NgayKetThuc), width: 14, align: 'center' },
    { header: 'Tình trạng', accessor: row => row.IsActive ? 'Hoạt động' : 'Không hoạt động', width: 16, align: 'center' },
  ];

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.warning('Không có dữ liệu để xuất Excel.');
      return;
    }
    const fileName = `DotThi_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(filteredData, excelColumns, fileName, 'Đợt thi');
    toast.success('Xuất báo cáo Excel thành công!');
  };

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
              <Button type="primary" icon={<FileExcelOutlined />} className="!bg-green-600 !border-green-600 !text-white h-10 font-medium px-4 hover:!bg-green-700" onClick={handleExportExcel}>
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

          <ResizableTableStyles />
          <Spin spinning={loading}>
            <div className="overflow-x-auto border-t border-gray-200">
              <table style={{ minWidth: dotThiTableTotalWidth }} className={`w-full text-sm text-slate-700 border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}>
                {dotThiColGroup}
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-gray-200 text-[#334155] font-semibold">
                    <th className="relative py-3 px-3 text-center">
                      <input type="checkbox" className="cursor-pointer" checked={isAllSelected} onChange={toggleSelectAll} />
                      <ColResizeHandle onMouseDown={startDotThiColResize(0)} />
                    </th>
                    <th className="relative py-3 px-3 text-center">STT<ColResizeHandle onMouseDown={startDotThiColResize(1)} /></th>
                    <th className="relative py-3 px-3 text-left">Mã kỳ thi<ColResizeHandle onMouseDown={startDotThiColResize(2)} /></th>
                    <th className="relative py-3 px-3 text-left">Tên kỳ thi<ColResizeHandle onMouseDown={startDotThiColResize(3)} /></th>
                    <th className="relative py-3 px-3 text-left">Ngày tạo<ColResizeHandle onMouseDown={startDotThiColResize(4)} /></th>
                    <th className="relative py-3 px-3 text-left">Ngày bắt đầu<ColResizeHandle onMouseDown={startDotThiColResize(5)} /></th>
                    <th className="relative py-3 px-3 text-left">Ngày kết thúc<ColResizeHandle onMouseDown={startDotThiColResize(6)} /></th>
                    <th className="relative py-3 px-3 text-center">Tình trạng<ColResizeHandle onMouseDown={startDotThiColResize(7)} /></th>
                    <th className="relative py-3 px-3 text-center">Thao tác<ColResizeHandle onMouseDown={startDotThiColResize(8)} /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center"><Empty description="Không có dữ liệu kỳ thi" /></td></tr>
                  ) : paginatedData.map((r, idx) => (
                    <tr key={r.Id} className="hover:bg-[#f1f5f9] transition-colors">
                      <td className="py-3 px-3 text-center">
                        <input type="checkbox" className="cursor-pointer" checked={selectedRowKeys.includes(r.Id)} onChange={() => toggleSelectRow(r.Id)} />
                      </td>
                      <td className="py-3 px-3 text-center">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="py-3 px-3"><TruncatedText text={r.Ma} /></td>
                      <td className="py-3 px-3"><TruncatedText text={r.Ten} /></td>
                      <td className="py-3 px-3"><TruncatedText text={formatDateTime(r.CreatedAt)} /></td>
                      <td className="py-3 px-3"><TruncatedText text={formatDate(r.NgayBatDau)} /></td>
                      <td className="py-3 px-3"><TruncatedText text={formatDate(r.NgayKetThuc)} /></td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-3 py-1 rounded border text-sm font-medium ${r.IsActive ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-rose-400 text-rose-500 bg-rose-50'}`}>{r.IsActive ? 'Hoạt động' : 'Không hoạt động'}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Space size="small">
                          <Button type="text" onClick={() => handleOpenDetail(r)} icon={<Eye size={16} className="text-blue-600" />} className="bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md" />
                          <Button type="text" onClick={() => handleOpenUpdate(r)} icon={<Edit size={16} className="text-blue-600" />} className="bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md" />
                          <Button type="text" onClick={() => handleOpenDelete(r)} icon={<Trash2 size={16} className="text-red-500" />} className="bg-red-50 hover:bg-red-100 flex items-center justify-center p-2 rounded-md" />
                        </Space>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Spin>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-slate-500 font-medium">
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
              toast.success('Thêm mới kỳ thi thành công!');
              fetchData();
              return true;
            } catch (e: any) {
              toast.error(e.message || 'Không thể tạo kỳ thi!');
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
              toast.success('Cập nhật kỳ thi thành công!');
              fetchData();
              return true;
            } catch (e: any) {
              toast.error(e.message || 'Không thể cập nhật kỳ thi!');
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
                toast.success('Đã xóa kỳ thi được chọn!');
                setSelectedRowKeys([]);
              } else if (selectedRecord) {
                await examPeriodApi.delete(selectedRecord.Id);
                toast.success(`Đã xóa kỳ thi "${selectedRecord.Ten}"!`);
              }
              setIsDeleteModalOpen(false);
              fetchData();
            } catch (e: any) {
              toast.error(e.message || 'Không thể xóa kỳ thi!');
            }
          }}
        />
      </div>
    </ConfigProvider>
  );
}
