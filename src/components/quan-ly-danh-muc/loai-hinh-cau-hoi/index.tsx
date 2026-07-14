import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, DatePicker, Button, Space, ConfigProvider, Empty, Spin, message } from 'antd';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2 } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { questionTypeApi, type QuestionTypeAPI } from '../../../services/danhMucApi.ts';
import { formatDateTime } from '../../../utils/formatDate';

const { RangePicker } = DatePicker;

/** Type khớp hoàn toàn với DB / API fields */
export interface QuestionTypeType {
  id: string;
  code: string;
  name: string;
  note?: string;
  created_at: string;
  updated_at?: string | null;
}

// ─── Inline modals ──────────────────────────────────────────────────
function CreateModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (v: Partial<QuestionTypeType>) => Promise<boolean> }) {
  const [form, setForm] = React.useState<Partial<QuestionTypeType>>({});
  const handleSave = async () => {
    if (form.code && form.name) {
      const success = await onSave(form);
      if (success) {
        setForm({});
        onClose();
      }
    }
  };
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[560px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-4">Thêm mới loại hình câu hỏi</div>
        <div className="flex flex-col gap-4">
          <div><label className="text-gray-700 font-medium text-[15px] block mb-1">Mã loại hình <span className="text-red-500">*</span></label><Input className="h-[42px]" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
          <div><label className="text-gray-700 font-medium text-[15px] block mb-1">Tên loại hình <span className="text-red-500">*</span></label><Input className="h-[42px]" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="text-gray-700 font-medium text-[15px] block mb-1">Ghi chú</label><Input.TextArea rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
        </div>
        <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-gray-200">
          <Button onClick={() => { setForm({}); onClose(); }} className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold">Đóng</Button>
          <Button type="primary" className="bg-[#1d4ed8] px-10 h-10 font-semibold" onClick={handleSave}>Lưu</Button>
        </div>
      </div>
    </div>
  ) : null;
}

function UpdateModal({ open, onClose, record, onSave }: { open: boolean; onClose: () => void; record: QuestionTypeType | null; onSave: (v: Partial<QuestionTypeType>) => Promise<boolean> }) {
  const [form, setForm] = React.useState<Partial<QuestionTypeType>>({});
  useEffect(() => { if (open && record) setForm({ code: record.code, name: record.name, note: record.note || '' }); }, [open, record]);
  const handleSave = async () => {
    const success = await onSave(form);
    if (success) {
      onClose();
    }
  };
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[560px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-4">Cập nhật loại hình câu hỏi</div>
        <div className="flex flex-col gap-4">
          <div><label className="text-gray-700 font-medium text-[15px] block mb-1">Mã loại hình <span className="text-red-500">*</span></label><Input className="h-[42px]" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
          <div><label className="text-gray-700 font-medium text-[15px] block mb-1">Tên loại hình <span className="text-red-500">*</span></label><Input className="h-[42px]" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="text-gray-700 font-medium text-[15px] block mb-1">Ghi chú</label><Input.TextArea rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
        </div>
        <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-gray-200">
          <Button onClick={onClose} className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold">Đóng</Button>
          <Button type="primary" className="bg-[#1d4ed8] px-10 h-10 font-semibold" onClick={handleSave}>Lưu</Button>
        </div>
      </div>
    </div>
  ) : null;
}

function DetailModal({ open, onClose, record }: { open: boolean; onClose: () => void; record: QuestionTypeType | null }) {
  return open && record ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[560px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-4">Chi tiết loại hình câu hỏi</div>
        <div className="flex flex-col gap-4">
          {([['id','id'],['code','Mã loại hình'],['name','Tên loại hình'],['note','Ghi chú'],['created_at','Ngày tạo'],['updated_at','Ngày cập nhật']] as [keyof QuestionTypeType, string][]).map(([key, label]) => {
            const isDate = key === 'created_at' || key === 'updated_at';
            const value = isDate ? formatDateTime(record[key] as string | null) : String(record[key] ?? '');
            return (
              <div key={key}><label className="text-gray-600 text-sm font-medium block mb-1">{label}</label><Input disabled value={value} className="h-[38px] bg-gray-50 text-gray-800" /></div>
            );
          })}
        </div>
        <div className="flex justify-center mt-6 pt-4 border-t border-gray-200">
          <Button onClick={onClose} className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold">Đóng</Button>
        </div>
      </div>
    </div>
  ) : null;
}

function DeleteModal({ open, onClose, onConfirm, itemName, isMultiple, multipleCount }: { open: boolean; onClose: () => void; onConfirm: () => void; itemName?: string; isMultiple?: boolean; multipleCount?: number }) {
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[460px] p-6">
        <div className="text-xl font-semibold text-slate-800 pb-3 border-b border-gray-200 mb-6">Xác nhận xóa</div>
        <p className="text-[17px] text-slate-700 mb-8">{isMultiple ? `Xóa ${multipleCount || 0} bản ghi đã chọn?` : `Xóa loại hình câu hỏi "${itemName || ''}"?`}</p>
        <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
          <Button onClick={onClose} className="border-gray-400 text-gray-600 px-10 h-10 font-semibold">Hủy</Button>
          <Button danger type="primary" onClick={() => { onConfirm(); onClose(); }} className="px-10 h-10 font-semibold">Xóa</Button>
        </div>
      </div>
    </div>
  ) : null;
}

// ─── Main Component ────────────────────────────────────────────────
export default function DanhMucLoaiHinhCauHoi() {
  const [data, setData] = useState<QuestionTypeType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteMultiple, setIsDeleteMultiple] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<QuestionTypeType | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchDates, setSearchDates] = useState<any>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await questionTypeApi.list(); setData(res.data as QuestionTypeType[]); }
    catch { messageApi.error('Không thể tải dữ liệu!'); }
    finally { setLoading(false); }
  }, [messageApi]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredData = React.useMemo(() => {
    return data.filter(item => {
      const kw = searchKeyword.trim().toLowerCase();
      const matchKeyword = !kw || (item.code?.toLowerCase().includes(kw) || item.name?.toLowerCase().includes(kw));
      let matchDate = true;
      if (searchDates && searchDates[0] && searchDates[1] && item.created_at) {
        const itemDate = new Date(item.created_at).getTime();
        const start = searchDates[0].startOf('day').valueOf();
        const end = searchDates[1].endOf('day').valueOf();
        matchDate = itemDate >= start && itemDate <= end;
      }
      return matchKeyword && matchDate;
    });
  }, [data, searchKeyword, searchDates]);

  const columns: ColumnsType<QuestionTypeType> = [
    { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => i + 1 },
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
    { title: 'Ngày tạo', dataIndex: 'created_at', key: 'created_at', render: (v) => v ? new Date(v).toLocaleString('vi-VN') : '' },
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div className="flex flex-col gap-1.5"><label className="text-gray-600 text-sm font-medium">Mã / Tên</label><Input placeholder="Nhập mã hoặc tên" className="h-10 w-full" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} allowClear /></div>
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
                  Đã chọn <span className="font-bold">{selectedRowKeys.length}</span> loại hình câu hỏi
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
            <Table rowSelection={{ selectedRowKeys, onChange: (k) => setSelectedRowKeys(k) }} columns={columns} dataSource={filteredData} rowKey="id" locale={{ emptyText: <Empty description="Không có dữ liệu loại hình câu hỏi" /> }} pagination={{ total: filteredData.length, showTotal: (t, r) => `${r[0]} - ${r[1]} / ${t} bản ghi`, showSizeChanger: true, defaultPageSize: 10, pageSizeOptions: ['10', '20', '50', '100'], locale: { items_per_page: '/ trang' }, className: 'mt-6' }} className="border-t border-gray-200" />
          </Spin>
        </div>
      </div>
      <CreateModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSave={async (v) => { try { await questionTypeApi.create({ code: v.code!, name: v.name!, note: v.note ?? '' }); messageApi.success('Thêm thành công!'); fetchData(); return true; } catch (error: any) { messageApi.error(error.message || 'Lỗi!'); return false; } }} />
      <UpdateModal open={isUpdateOpen} onClose={() => setIsUpdateOpen(false)} record={selectedRecord} onSave={async (v) => { if (!selectedRecord) return false; try { await questionTypeApi.update(selectedRecord.id, { code: v.code, name: v.name, note: v.note }); messageApi.success('Cập nhật thành công!'); fetchData(); return true; } catch (error: any) { messageApi.error(error.message || 'Lỗi!'); return false; } }} />
      <DetailModal open={isDetailOpen} onClose={() => setIsDetailOpen(false)} record={selectedRecord} />
      <DeleteModal open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} itemName={selectedRecord?.name} isMultiple={isDeleteMultiple} multipleCount={selectedRowKeys.length} onConfirm={async () => {
        if (isDeleteMultiple) {
          const keys = selectedRowKeys.map(String);
          const results = await Promise.allSettled(keys.map((k) => questionTypeApi.delete(k)));
          const succeeded = keys.filter((_, i) => results[i].status === 'fulfilled');
          const failed = keys.map((k, i) => ({ k, r: results[i] })).filter(({ r }) => r.status === 'rejected') as { k: string; r: PromiseRejectedResult }[];
          if (failed.length === 0) { messageApi.success(`Đã xóa ${succeeded.length} loại hình câu hỏi!`); }
          else if (succeeded.length === 0) { messageApi.error(`Không thể xóa ${failed.length} mục: ${failed.map(({ r }) => (r.reason as Error)?.message || 'Lỗi không xác định').join('; ')}`); }
          else { messageApi.warning(`Đã xóa ${succeeded.length}/${keys.length} mục. ${failed.length} mục không thể xóa: ${failed.map(({ r }) => (r.reason as Error)?.message || 'Lỗi không xác định').join('; ')}`); }
          setSelectedRowKeys((prev) => prev.filter((k) => !succeeded.includes(String(k))));
        } else if (selectedRecord) {
          try { await questionTypeApi.delete(selectedRecord.id); messageApi.success('Đã xóa!'); }
          catch (e: any) { messageApi.error(e.message || 'Lỗi!'); }
        }
        fetchData();
      }} />
    </ConfigProvider>
  );
}
