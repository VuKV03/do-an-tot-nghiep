import React, { useState, useEffect, useCallback } from 'react';
import { Input, Select, DatePicker, Button, Space, ConfigProvider, Empty, Spin, Pagination } from 'antd';
import { toast } from '../../../utils/toast';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2 } from 'lucide-react';
import { FileExcelOutlined } from '@ant-design/icons';
import { gradeLevelApi, type GradeLevelAPI } from '../../../services/danhMucApi.ts';
import { formatDateTime } from '../../../utils/formatDate';
import { exportToExcel, type ExcelColumn } from '../../../utils/excelExport';
import { useResizableColumns, ColResizeHandle, ResizableTableStyles, RESIZABLE_TABLE_CLASS, TruncatedText } from '../../../utils/resizableTable';

const { RangePicker } = DatePicker;

/** Type khớp hoàn toàn với DB / API fields */
export interface GradeLevelType {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  note?: string;
  created_at: string;
  updated_at?: string | null;
}

// ─── Inline modals ──────────────────────────────────────────────────
type FieldErrors = { code?: string; name?: string };

function validateCodeName(form: { code?: string; name?: string }, entityLabel: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.code?.trim()) errors.code = `Vui lòng nhập mã ${entityLabel}`;
  if (!form.name?.trim()) errors.name = `Vui lòng nhập tên ${entityLabel}`;
  return errors;
}

function CreateModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (v: Partial<GradeLevelType>) => Promise<boolean> }) {
  const [form, setForm] = React.useState<Partial<GradeLevelType>>({ is_active: true });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [saving, setSaving] = React.useState(false);
  useEffect(() => { if (open) { setForm({ is_active: true }); setErrors({}); } }, [open]);
  const handleSave = async () => {
    const nextErrors = validateCodeName(form, 'khối lớp');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const success = await onSave(form);
      if (success) {
        setForm({ is_active: true });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[560px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-4">Thêm mới khối lớp</div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-gray-700 font-medium text-[15px] block mb-1">Mã <span className="text-red-500">*</span></label>
            <Input status={errors.code ? 'error' : undefined} className="h-[42px] uppercase" value={form.code} onChange={e => { setForm(f => ({ ...f, code: e.target.value })); setErrors(er => ({ ...er, code: undefined })); }} />
            {errors.code && <div className="text-red-500 text-xs mt-1">{errors.code}</div>}
          </div>
          <div>
            <label className="text-gray-700 font-medium text-[15px] block mb-1">Tên <span className="text-red-500">*</span></label>
            <Input status={errors.name ? 'error' : undefined} className="h-[42px]" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: undefined })); }} />
            {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
          </div>
          <div><label className="text-gray-700 font-medium text-[15px] block mb-1">Ghi chú</label><Input.TextArea rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
          <div className="flex items-center gap-3">
            <label className="text-gray-700 font-medium text-[15px]">Trạng thái</label>
            <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
            <span className="text-gray-700">{form.is_active ? 'Hoạt động' : 'Không hoạt động'}</span>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-gray-200">
          <Button onClick={() => { setForm({ is_active: true }); setErrors({}); onClose(); }} disabled={saving} className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold">Đóng</Button>
          <Button type="primary" loading={saving} className="bg-[#1d4ed8] px-10 h-10 font-semibold" onClick={handleSave}>Lưu</Button>
        </div>
      </div>
    </div>
  ) : null;
}

function UpdateModal({ open, onClose, record, onSave }: { open: boolean; onClose: () => void; record: GradeLevelType | null; onSave: (v: Partial<GradeLevelType>) => Promise<boolean> }) {
  const [form, setForm] = React.useState<Partial<GradeLevelType>>({});
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [saving, setSaving] = React.useState(false);
  useEffect(() => { if (open && record) { setForm({ code: record.code, name: record.name, is_active: record.is_active, note: record.note || '' }); setErrors({}); } }, [open, record]);
  const handleSave = async () => {
    const nextErrors = validateCodeName(form, 'khối lớp');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const success = await onSave(form);
      if (success) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[560px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-4">Cập nhật khối lớp</div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-gray-700 font-medium text-[15px] block mb-1">Mã <span className="text-red-500">*</span></label>
            <Input status={errors.code ? 'error' : undefined} className="h-[42px] uppercase" value={form.code} onChange={e => { setForm(f => ({ ...f, code: e.target.value })); setErrors(er => ({ ...er, code: undefined })); }} />
            {errors.code && <div className="text-red-500 text-xs mt-1">{errors.code}</div>}
          </div>
          <div>
            <label className="text-gray-700 font-medium text-[15px] block mb-1">Tên <span className="text-red-500">*</span></label>
            <Input status={errors.name ? 'error' : undefined} className="h-[42px]" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: undefined })); }} />
            {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
          </div>
          <div><label className="text-gray-700 font-medium text-[15px] block mb-1">Ghi chú</label><Input.TextArea rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
          <div className="flex items-center gap-3">
            <label className="text-gray-700 font-medium text-[15px]">Trạng thái</label>
            <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
            <span className="text-gray-700">{form.is_active ? 'Hoạt động' : 'Không hoạt động'}</span>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-gray-200">
          <Button onClick={onClose} disabled={saving} className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold">Đóng</Button>
          <Button type="primary" loading={saving} className="bg-[#1d4ed8] px-10 h-10 font-semibold" onClick={handleSave}>Lưu</Button>
        </div>
      </div>
    </div>
  ) : null;
}

function DetailModal({ open, onClose, record }: { open: boolean; onClose: () => void; record: GradeLevelType | null }) {
  return open && record ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[560px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-4">Chi tiết khối lớp</div>
        <div className="flex flex-col gap-3">
          {([['code','Mã'],['name','Tên'],['note','Ghi chú'],['created_at','Ngày tạo'],['updated_at','Ngày cập nhật']] as [keyof GradeLevelType, string][]).map(([key, label]) => {
            const isDate = key === 'created_at' || key === 'updated_at';
            const value = isDate ? formatDateTime(record[key] as string | null) : String(record[key] ?? '');
            return (
              <div key={key}><label className="text-gray-600 text-sm font-medium block mb-1">{label}</label><Input disabled value={value} className="h-[38px] bg-gray-50 text-gray-800" /></div>
            );
          })}
          <div className="flex items-center gap-3"><label className="text-gray-600 text-sm font-medium">Trạng thái:</label><span className={`px-3 py-1 rounded border text-sm font-medium ${record.is_active ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-rose-400 text-rose-500 bg-rose-50'}`}>{record.is_active ? 'Hoạt động' : 'Không hoạt động'}</span></div>
        </div>
        <div className="flex justify-center mt-6 pt-4 border-t border-gray-200"><Button onClick={onClose} className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold">Đóng</Button></div>
      </div>
    </div>
  ) : null;
}

function DeleteModal({ open, onClose, onConfirm, itemName, isMultiple, multipleCount }: { open: boolean; onClose: () => void; onConfirm: () => void; itemName?: string; isMultiple?: boolean; multipleCount?: number }) {
  const [deleting, setDeleting] = React.useState(false);
  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
      onClose();
    }
  };
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[460px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-6">Xác nhận xóa</div>
        <p className="text-[17px] text-slate-700 mb-8">{isMultiple ? `Xóa ${multipleCount || 0} bản ghi đã chọn?` : `Xóa khối lớp "${itemName || ''}"?`}</p>
        <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
          <Button onClick={onClose} disabled={deleting} className="border-gray-400 text-gray-600 px-10 h-10 font-semibold">Hủy</Button>
          <Button danger type="primary" loading={deleting} onClick={handleConfirm} className="px-10 h-10 font-semibold">Xóa</Button>
        </div>
      </div>
    </div>
  ) : null;
}

// ─── Main Component ────────────────────────────────────────────────
export default function DanhMucKhoiLop() {
  const [data, setData] = useState<GradeLevelType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteMultiple, setIsDeleteMultiple] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GradeLevelType | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchActive, setSearchActive] = useState('all');
  const [searchDates, setSearchDates] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { colGroup: khoiLopColGroup, startResize: startKhoiLopColResize, totalWidth: khoiLopTableTotalWidth } = useResizableColumns(
    [40, 60, 140, 220, 160, 140, 140]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await gradeLevelApi.list(); setData(res.data as GradeLevelType[]); }
    catch { toast.error('Không thể tải dữ liệu!'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredData = React.useMemo(() => {
    return data.filter(item => {
      const kw = searchKeyword.trim().toLowerCase();
      const matchKeyword = !kw || (item.code?.toLowerCase().includes(kw) || item.name?.toLowerCase().includes(kw));
      const matchActive = searchActive === 'all' || 
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

  const excelColumns: ExcelColumn<GradeLevelType>[] = [
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
    const fileName = `KhoiLop_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(filteredData, excelColumns, fileName, 'Khối lớp');
    toast.success('Xuất báo cáo Excel thành công!');
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1d4ed8', borderRadius: 6 }, components: { Table: { headerBg: '#f8fafc', headerColor: '#334155', rowHoverBg: '#f1f5f9' } } }}>
      <div className="p-6 flex flex-col gap-8 bg-white min-h-[calc(100vh-200px)]">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-8">
          <div className="flex items-center gap-2 cursor-pointer text-[#1e3a8a] font-semibold text-lg select-none w-fit" onClick={() => setIsSearchExpanded(!isSearchExpanded)}>
            <span>Tìm kiếm thông tin</span>{isSearchExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {isSearchExpanded && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                <div className="flex flex-col gap-1.5"><label className="text-gray-600 text-sm font-medium">Mã / Tên</label><Input placeholder="Nhập mã hoặc tên" className="h-10 w-full" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} allowClear /></div>
                <div className="flex flex-col gap-1.5"><label className="text-gray-600 text-sm font-medium">Trạng thái</label><Select value={searchActive} onChange={setSearchActive} className="h-10 w-full" options={[{ value: 'all', label: 'Tất cả' }, { value: 'true', label: 'Hoạt động' }, { value: 'false', label: 'Không hoạt động' }]} /></div>
                <div className="flex flex-col gap-1.5"><label className="text-gray-600 text-sm font-medium">Ngày tạo</label><RangePicker className="h-10 w-full" placeholder={['Bắt đầu', 'Kết thúc']} format="DD/MM/YYYY" value={searchDates} onChange={setSearchDates} /></div>
              </div>
              <div className="flex justify-center mt-4"><Button type="primary" onClick={fetchData} className="bg-[#1d4ed8] border-none px-8 h-10 font-medium">Làm mới dữ liệu</Button></div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-[#1e3a8a] font-semibold text-lg">Kết quả tìm kiếm</h2>
              {selectedRowKeys.length > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                  Đã chọn <span className="font-bold">{selectedRowKeys.length}</span> khối lớp
                </span>
              )}
            </div>
            <Space>
              <Button type="primary" className="bg-[#1d4ed8] border-none h-10 font-medium px-4" onClick={() => setIsCreateOpen(true)}>Thêm mới</Button>
              <Button type="primary" icon={<FileExcelOutlined />} className="!bg-green-600 !border-green-600 !text-white h-10 font-medium px-4 hover:!bg-green-700" onClick={handleExportExcel}>Xuất Excel</Button>
              <Button danger className="border-red-500 text-red-500 h-10 font-medium px-4" disabled={selectedRowKeys.length === 0} onClick={() => { setIsDeleteMultiple(true); setIsDeleteOpen(true); }}>Xóa</Button>
            </Space>
          </div>
          <ResizableTableStyles />
          <Spin spinning={loading}>
            <div className="overflow-x-auto border-t border-gray-200">
              <table style={{ minWidth: khoiLopTableTotalWidth }} className={`w-full text-sm text-slate-700 border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}>
                {khoiLopColGroup}
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-gray-200 text-[#334155] font-semibold">
                    <th className="relative py-3 px-3 text-center">
                      <input type="checkbox" className="cursor-pointer" checked={isAllSelected} onChange={toggleSelectAll} />
                      <ColResizeHandle onMouseDown={startKhoiLopColResize(0)} />
                    </th>
                    <th className="relative py-3 px-3 text-center">STT<ColResizeHandle onMouseDown={startKhoiLopColResize(1)} /></th>
                    <th className="relative py-3 px-3 text-left">Mã<ColResizeHandle onMouseDown={startKhoiLopColResize(2)} /></th>
                    <th className="relative py-3 px-3 text-left">Tên<ColResizeHandle onMouseDown={startKhoiLopColResize(3)} /></th>
                    <th className="relative py-3 px-3 text-left">Ngày tạo<ColResizeHandle onMouseDown={startKhoiLopColResize(4)} /></th>
                    <th className="relative py-3 px-3 text-center">Trạng thái<ColResizeHandle onMouseDown={startKhoiLopColResize(5)} /></th>
                    <th className="relative py-3 px-3 text-center">Thao tác<ColResizeHandle onMouseDown={startKhoiLopColResize(6)} /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center"><Empty description="Không có dữ liệu khối lớp" /></td></tr>
                  ) : paginatedData.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-[#f1f5f9] transition-colors">
                      <td className="py-3 px-3 text-center">
                        <input type="checkbox" className="cursor-pointer" checked={selectedRowKeys.includes(r.id)} onChange={() => toggleSelectRow(r.id)} />
                      </td>
                      <td className="py-3 px-3 text-center">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="py-3 px-3"><TruncatedText text={r.code} /></td>
                      <td className="py-3 px-3"><TruncatedText text={r.name} /></td>
                      <td className="py-3 px-3"><TruncatedText text={r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : ''} /></td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-3 py-1 rounded border text-sm font-medium ${r.is_active ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-rose-400 text-rose-500 bg-rose-50'}`}>{r.is_active ? 'Hoạt động' : 'Không hoạt động'}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Space size="small">
                          <Button type="text" onClick={() => { setSelectedRecord(r); setIsDetailOpen(true); }} icon={<Eye size={16} className="text-blue-600" />} className="bg-blue-50 hover:bg-blue-100 p-2 rounded-md" />
                          <Button type="text" onClick={() => { setSelectedRecord(r); setIsUpdateOpen(true); }} icon={<Edit size={16} className="text-blue-600" />} className="bg-blue-50 hover:bg-blue-100 p-2 rounded-md" />
                          <Button type="text" onClick={() => { setSelectedRecord(r); setIsDeleteMultiple(false); setIsDeleteOpen(true); }} icon={<Trash2 size={16} className="text-red-500" />} className="bg-red-50 hover:bg-red-100 p-2 rounded-md" />
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
      </div>
      <CreateModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSave={async (v) => { try { await gradeLevelApi.create({ code: v.code!, name: v.name!, is_active: v.is_active ?? true, note: v.note ?? '' }); toast.success('Thêm thành công!'); fetchData(); return true; } catch (error: any) { toast.error(error.message || 'Lỗi!'); return false; } }} />
      <UpdateModal open={isUpdateOpen} onClose={() => setIsUpdateOpen(false)} record={selectedRecord} onSave={async (v) => { if (!selectedRecord) return false; try { await gradeLevelApi.update(selectedRecord.id, { code: v.code, name: v.name, is_active: v.is_active, note: v.note }); toast.success('Cập nhật thành công!'); fetchData(); return true; } catch (error: any) { toast.error(error.message || 'Lỗi!'); return false; } }} />
      <DetailModal open={isDetailOpen} onClose={() => setIsDetailOpen(false)} record={selectedRecord} />
      <DeleteModal open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} itemName={selectedRecord?.name} isMultiple={isDeleteMultiple} multipleCount={selectedRowKeys.length} onConfirm={async () => {
        if (isDeleteMultiple) {
          const keys = selectedRowKeys.map(String);
          const results = await Promise.allSettled(keys.map((k) => gradeLevelApi.delete(k)));
          const succeeded = keys.filter((_, i) => results[i].status === 'fulfilled');
          const failed = keys.map((k, i) => ({ k, r: results[i] })).filter(({ r }) => r.status === 'rejected') as { k: string; r: PromiseRejectedResult }[];
          if (failed.length === 0) { toast.success(`Đã xóa ${succeeded.length} khối lớp!`); }
          else if (succeeded.length === 0) { toast.error(`Không thể xóa ${failed.length} mục: ${failed.map(({ r }) => (r.reason as Error)?.message || 'Lỗi không xác định').join('; ')}`); }
          else { toast.warning(`Đã xóa ${succeeded.length}/${keys.length} mục. ${failed.length} mục không thể xóa: ${failed.map(({ r }) => (r.reason as Error)?.message || 'Lỗi không xác định').join('; ')}`); }
          setSelectedRowKeys((prev) => prev.filter((k) => !succeeded.includes(String(k))));
        } else if (selectedRecord) {
          try { await gradeLevelApi.delete(selectedRecord.id); toast.success('Đã xóa!'); }
          catch (e: any) { toast.error(e.message || 'Lỗi!'); }
        }
        fetchData();
      }} />
    </ConfigProvider>
  );
}
