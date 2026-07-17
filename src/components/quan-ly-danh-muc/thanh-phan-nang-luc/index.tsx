import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, ConfigProvider, Empty, Spin, message } from 'antd';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2 } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { competencyComponentApi, subjectCategoryApi, type CompetencyComponentAPI, type SubjectCategoryAPI } from '../../../services/danhMucApi.ts';

const { RangePicker } = DatePicker;

/** Type khớp hoàn toàn với DB / API fields */
export interface CompetencyComponentType {
  id: string;
  code: string;
  name: string;
  subject_id: string | null;
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

function CreateModal({ open, onClose, onSave, subjectOptions }: {
  open: boolean; onClose: () => void;
  onSave: (v: Partial<CompetencyComponentType>) => Promise<boolean>;
  subjectOptions: SubjectCategoryAPI[];
}) {
  const [form, setForm] = React.useState<Partial<CompetencyComponentType>>({ is_active: true });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  useEffect(() => { if (open) { setForm({ is_active: true }); setErrors({}); } }, [open]);
  const handleSave = async () => {
    const nextErrors = validateCodeName(form, 'thành phần năng lực');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const success = await onSave(form);
    if (success) {
      setForm({ is_active: true });
      onClose();
    }
  };
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[580px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-4">Thêm mới thành phần năng lực</div>
        <div className="flex flex-col gap-4">
          <div><label className="text-gray-700 font-medium text-[15px] block mb-1">Môn học</label>
            <Select className="h-10 w-full" value={form.subject_id ?? undefined} onChange={v => setForm(f => ({ ...f, subject_id: v }))} options={subjectOptions.map(m => ({ value: m.id, label: `${m.code} — ${m.name}` }))} placeholder="Chọn môn học" allowClear />
          </div>
          <div>
            <label className="text-gray-700 font-medium text-[15px] block mb-1">Mã <span className="text-red-500">*</span></label>
            <Input status={errors.code ? 'error' : undefined} className="h-[42px]" value={form.code} onChange={e => { setForm(f => ({ ...f, code: e.target.value })); setErrors(er => ({ ...er, code: undefined })); }} />
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
          <Button onClick={() => { setForm({ is_active: true }); setErrors({}); onClose(); }} className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold">Đóng</Button>
          <Button type="primary" className="bg-[#1d4ed8] px-10 h-10 font-semibold" onClick={handleSave}>Lưu</Button>
        </div>
      </div>
    </div>
  ) : null;
}

function UpdateModal({ open, onClose, record, onSave, subjectOptions }: {
  open: boolean; onClose: () => void; record: CompetencyComponentType | null;
  onSave: (v: Partial<CompetencyComponentType>) => Promise<boolean>;
  subjectOptions: SubjectCategoryAPI[];
}) {
  const [form, setForm] = React.useState<Partial<CompetencyComponentType>>({});
  const [errors, setErrors] = React.useState<FieldErrors>({});
  useEffect(() => { if (open && record) { setForm({ code: record.code, name: record.name, subject_id: record.subject_id, is_active: record.is_active, note: record.note || '' }); setErrors({}); } }, [open, record]);
  const handleSave = async () => {
    const nextErrors = validateCodeName(form, 'thành phần năng lực');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const success = await onSave(form);
    if (success) {
      onClose();
    }
  };
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[580px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-4">Cập nhật thành phần năng lực</div>
        <div className="flex flex-col gap-4">
          <div><label className="text-gray-700 font-medium text-[15px] block mb-1">Môn học</label>
            <Select className="h-10 w-full" value={form.subject_id ?? undefined} onChange={v => setForm(f => ({ ...f, subject_id: v }))} options={subjectOptions.map(m => ({ value: m.id, label: `${m.code} — ${m.name}` }))} placeholder="Chọn môn học" allowClear />
          </div>
          <div>
            <label className="text-gray-700 font-medium text-[15px] block mb-1">Mã <span className="text-red-500">*</span></label>
            <Input status={errors.code ? 'error' : undefined} className="h-[42px]" value={form.code} onChange={e => { setForm(f => ({ ...f, code: e.target.value })); setErrors(er => ({ ...er, code: undefined })); }} />
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
          <Button onClick={onClose} className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold">Đóng</Button>
          <Button type="primary" className="bg-[#1d4ed8] px-10 h-10 font-semibold" onClick={handleSave}>Lưu</Button>
        </div>
      </div>
    </div>
  ) : null;
}

function DetailModal({ open, onClose, record, subjectOptions }: { open: boolean; onClose: () => void; record: CompetencyComponentType | null; subjectOptions: SubjectCategoryAPI[] }) {
  const subjectName = record?.subject_id ? (subjectOptions.find(m => m.id === record.subject_id)?.name ?? record.subject_id) : '—';
  return open && record ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[580px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-4">Chi tiết thành phần năng lực</div>
        <div className="flex flex-col gap-3">
          <div><label className="text-gray-600 text-sm font-medium block mb-1">Môn học</label><Input disabled value={subjectName} className="h-[38px] bg-gray-50 text-gray-800" /></div>
          {([['code','Mã'],['name','Tên'],['note','Ghi chú']] as [keyof CompetencyComponentType, string][]).map(([key, label]) => {
            const value = String(record[key] ?? '');
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
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[460px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-6">Xác nhận xóa</div>
        <p className="text-[17px] text-slate-700 mb-8">{isMultiple ? `Xóa ${multipleCount || 0} bản ghi đã chọn?` : `Xóa thành phần năng lực "${itemName || ''}"?`}</p>
        <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
          <Button onClick={onClose} className="border-gray-400 text-gray-600 px-10 h-10 font-semibold">Hủy</Button>
          <Button danger type="primary" onClick={() => { onConfirm(); onClose(); }} className="px-10 h-10 font-semibold">Xóa</Button>
        </div>
      </div>
    </div>
  ) : null;
}

// ─── Main Component ────────────────────────────────────────────────
export default function DanhMucThanhPhanNangLuc() {
  const [data, setData] = useState<CompetencyComponentType[]>([]);
  const [subjects, setSubjects] = useState<SubjectCategoryAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteMultiple, setIsDeleteMultiple] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CompetencyComponentType | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchSubject, setSearchSubject] = useState<string>('all');
  const [searchActive, setSearchActive] = useState('all');
  const [messageApi, contextHolder] = message.useMessage();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, subRes] = await Promise.all([competencyComponentApi.list(), subjectCategoryApi.list()]);
      setData(res.data as CompetencyComponentType[]);
      setSubjects(subRes.data);
    } catch { messageApi.error('Không thể tải dữ liệu!'); }
    finally { setLoading(false); }
  }, [messageApi]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getSubjectName = (sid: string | null) => subjects.find(m => m.id === sid)?.name ?? sid ?? '—';

  const filteredData = React.useMemo(() => {
    return data.filter(item => {
      const kw = searchKeyword.trim().toLowerCase();
      const matchKeyword = !kw || (item.code?.toLowerCase().includes(kw) || item.name?.toLowerCase().includes(kw));
      const matchActive = searchActive === 'all' || 
        (searchActive === 'true' && item.is_active === true) || 
        (searchActive === 'false' && item.is_active === false);
      const matchSubject = searchSubject === 'all' || item.subject_id === searchSubject;
      return matchKeyword && matchActive && matchSubject;
    });
  }, [data, searchKeyword, searchActive, searchSubject]);

  const columns: ColumnsType<CompetencyComponentType> = [
    { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => i + 1 },
    { title: 'Môn học', dataIndex: 'subject_id', key: 'subject_id', render: (v) => getSubjectName(v) },
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    { title: 'Ngày tạo', dataIndex: 'created_at', key: 'created_at', render: (v) => v ? new Date(v).toLocaleString('vi-VN') : '' },
    {
      title: 'Trạng thái', dataIndex: 'is_active', key: 'is_active',
      render: (v: boolean) => <span className={`px-3 py-1 rounded border text-sm font-medium ${v ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-rose-400 text-rose-500 bg-rose-50'}`}>{v ? 'Hoạt động' : 'Không hoạt động'}</span>,
    },
    {
      title: 'Thao tác', key: 'action', align: 'center',
      render: (_, r) => (
        <Space size="small">
          <Button type="text" onClick={() => { setSelectedRecord(r); setIsDetailOpen(true); }} icon={<Eye size={16} className="text-blue-600" />} className="bg-blue-50 hover:bg-blue-100 p-2 rounded-md" />
          <Button type="text" onClick={() => { setSelectedRecord(r); setIsUpdateOpen(true); }} icon={<Edit size={16} className="text-blue-600" />} className="bg-blue-50 hover:bg-blue-100 p-2 rounded-md" />
          <Button type="text" onClick={() => { setSelectedRecord(r); setIsDeleteMultiple(false); setIsDeleteOpen(true); }} icon={<Trash2 size={16} className="text-red-500" />} className="bg-red-50 hover:bg-red-100 p-2 rounded-md" />
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1d4ed8', borderRadius: 6 }, components: { Table: { headerBg: '#f8fafc', headerColor: '#334155', rowHoverBg: '#f1f5f9' } } }}>
      {contextHolder}
      <div className="p-6 flex flex-col gap-8 bg-white min-h-[calc(100vh-200px)]">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-8">
          <div className="flex items-center gap-2 cursor-pointer text-[#1e3a8a] font-semibold text-lg select-none w-fit" onClick={() => setIsSearchExpanded(!isSearchExpanded)}>
            <span>Tìm kiếm thông tin</span>{isSearchExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {isSearchExpanded && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                <div className="flex flex-col gap-1.5"><label className="text-gray-600 text-sm font-medium">Mã / Tên</label><Input placeholder="Nhập mã hoặc tên" className="h-10 w-full" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} allowClear /></div>
                <div className="flex flex-col gap-1.5"><label className="text-gray-600 text-sm font-medium">Môn học</label><Select className="h-10 w-full" options={[{ value: 'all', label: 'Tất cả' }, ...subjects.map(m => ({ value: m.id, label: m.name }))]} value={searchSubject} onChange={setSearchSubject} /></div>
                <div className="flex flex-col gap-1.5"><label className="text-gray-600 text-sm font-medium">Trạng thái</label><Select value={searchActive} onChange={setSearchActive} className="h-10 w-full" options={[{ value: 'all', label: 'Tất cả' }, { value: 'true', label: 'Hoạt động' }, { value: 'false', label: 'Không hoạt động' }]} /></div>
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
                  Đã chọn <span className="font-bold">{selectedRowKeys.length}</span> thành phần năng lực
                </span>
              )}
            </div>
            <Space>
              <Button type="primary" className="bg-[#1d4ed8] border-none h-10 font-medium px-4" onClick={() => setIsCreateOpen(true)}>Thêm mới</Button>
              <Button className="border-[#1d4ed8] text-[#1d4ed8] h-10 font-medium px-4 hover:bg-blue-50">Xuất Excel</Button>
              <Button danger className="border-red-500 text-red-500 h-10 font-medium px-4" disabled={selectedRowKeys.length === 0} onClick={() => { setIsDeleteMultiple(true); setIsDeleteOpen(true); }}>Xóa</Button>
            </Space>
          </div>
          <Spin spinning={loading}>
            <Table rowSelection={{ selectedRowKeys, onChange: (k) => setSelectedRowKeys(k) }} columns={columns} dataSource={filteredData} rowKey="id" locale={{ emptyText: <Empty description="Không có dữ liệu thành phần năng lực" /> }} pagination={{ total: filteredData.length, showTotal: (t, r) => `${r[0]} - ${r[1]} / ${t} bản ghi`, showSizeChanger: true, defaultPageSize: 10, pageSizeOptions: ['10', '20', '50', '100'], locale: { items_per_page: '/ trang' }, className: 'mt-6' }} className="border-t border-gray-200" />
          </Spin>
        </div>
      </div>
      <CreateModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} subjectOptions={subjects.filter(s => s.is_active)} onSave={async (v) => { try { await competencyComponentApi.create({ code: v.code!, name: v.name!, subject_id: v.subject_id ?? null, is_active: v.is_active ?? true, note: v.note ?? '' }); messageApi.success('Thêm thành công!'); fetchData(); return true; } catch (error: any) { messageApi.error(error.message || 'Lỗi!'); return false; } }} />
      <UpdateModal open={isUpdateOpen} onClose={() => setIsUpdateOpen(false)} record={selectedRecord} subjectOptions={subjects} onSave={async (v) => { if (!selectedRecord) return false; try { await competencyComponentApi.update(selectedRecord.id, { code: v.code, name: v.name, subject_id: v.subject_id, is_active: v.is_active, note: v.note }); messageApi.success('Cập nhật thành công!'); fetchData(); return true; } catch (error: any) { messageApi.error(error.message || 'Lỗi!'); return false; } }} />
      <DetailModal open={isDetailOpen} onClose={() => setIsDetailOpen(false)} record={selectedRecord} subjectOptions={subjects} />
      <DeleteModal open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} itemName={selectedRecord?.name} isMultiple={isDeleteMultiple} multipleCount={selectedRowKeys.length} onConfirm={async () => {
        if (isDeleteMultiple) {
          const keys = selectedRowKeys.map(String);
          const results = await Promise.allSettled(keys.map((k) => competencyComponentApi.delete(k)));
          const succeeded = keys.filter((_, i) => results[i].status === 'fulfilled');
          const failed = keys.map((k, i) => ({ k, r: results[i] })).filter(({ r }) => r.status === 'rejected') as { k: string; r: PromiseRejectedResult }[];
          if (failed.length === 0) { messageApi.success(`Đã xóa ${succeeded.length} thành phần năng lực!`); }
          else if (succeeded.length === 0) { messageApi.error(`Không thể xóa ${failed.length} mục: ${failed.map(({ r }) => (r.reason as Error)?.message || 'Lỗi không xác định').join('; ')}`); }
          else { messageApi.warning(`Đã xóa ${succeeded.length}/${keys.length} mục. ${failed.length} mục không thể xóa: ${failed.map(({ r }) => (r.reason as Error)?.message || 'Lỗi không xác định').join('; ')}`); }
          setSelectedRowKeys((prev) => prev.filter((k) => !succeeded.includes(String(k))));
        } else if (selectedRecord) {
          try { await competencyComponentApi.delete(selectedRecord.id); messageApi.success('Đã xóa!'); }
          catch (e: any) { messageApi.error(e.message || 'Lỗi!'); }
        }
        fetchData();
      }} />
    </ConfigProvider>
  );
}
