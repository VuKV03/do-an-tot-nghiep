import React, { useState, useMemo } from 'react';
import {
  Modal,
  Input,
  Select,
  DatePicker,
  Button,
  Table,
  Tooltip,
  message,
  ConfigProvider
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, ExportOutlined } from '@ant-design/icons';
import { Question } from '../../../types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type HistoryActionType =
  | 'them'        // Thêm mới câu hỏi
  | 'sua'         // Sửa thông tin
  | 'phan_tich'   // Phân tích, đánh giá
  | 'tham_dinh'   // Thẩm định
  | 'phan_bien';  // Phản biện

export interface HistoryRecord {
  id: string;
  stt: number;
  performer: string;   // Người thực hiện (mã + tên)
  performedAt: string; // ISO datetime string
  action: HistoryActionType;
  description: string; // Nội dung thực hiện
}

interface QuestionHistoryModalProps {
  /** Câu hỏi đang xem lịch sử. null = modal ẩn */
  question: Question | null;
  /** Mode để phân biệt context (tuỳ chọn, dùng để lọc hoặc hiển thị title) */
  mode?: 'ngan-hang' | 'tham-dinh';
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Mock data generator
// ─────────────────────────────────────────────

function generateMockHistory(question: Question): HistoryRecord[] {
  const base: Omit<HistoryRecord, 'id' | 'stt'>[] = [
    {
      performer: '4005 - Nguyễn Văn A',
      performedAt: '2025-05-10T08:00:00',
      action: 'them',
      description: `Thêm mới câu hỏi '${question.text.slice(0, 40)}...'`
    },
    {
      performer: '4005 - Nguyễn Văn A',
      performedAt: '2025-05-12T09:30:00',
      action: 'sua',
      description: 'Sửa thông tin "ghi chú..."'
    },
    {
      performer: '4005 - Nguyễn Văn A',
      performedAt: '2025-05-14T10:15:00',
      action: 'phan_tich',
      description: `Sửa thông tin câu hỏi '${question.text.slice(0, 30)}...'`
    },
    {
      performer: '4005 - Nguyễn Văn A',
      performedAt: '2025-05-16T14:00:00',
      action: 'tham_dinh',
      description: `Từ chối thẩm định câu hỏi '${question.text.slice(0, 30)}...'`
    },
    {
      performer: '4005 - Nguyễn Văn A',
      performedAt: '2025-05-18T15:45:00',
      action: 'phan_bien',
      description: `Đồng ý thẩm định câu hỏi '${question.text.slice(0, 30)}...'`
    }
  ];

  return base.map((item, idx) => ({
    id: `history-${question.id}-${idx}`,
    stt: idx + 1,
    ...item
  }));
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: 'all',       label: 'Tất cả' },
  { value: 'them',      label: 'Thêm' },
  { value: 'sua',       label: 'Sửa' },
  { value: 'phan_tich', label: 'Phân tích, đánh giá' },
  { value: 'tham_dinh', label: 'Thẩm định' },
  { value: 'phan_bien', label: 'Phản biện' }
];

function getActionLabel(action: HistoryActionType): string {
  return ACTION_OPTIONS.find((o) => o.value === action)?.label ?? action;
}

function formatDateTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  } catch {
    return isoStr;
  }
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function QuestionHistoryModal({
  question,
  mode = 'ngan-hang',
  onClose
}: QuestionHistoryModalProps) {
  // ── Filter state ──────────────────────────
  const [searchText, setSearchText] = useState('');
  const [filterAction, setFilterAction] = useState<HistoryActionType | 'all'>('all');
  const [filterDates, setFilterDates] = useState<any>(null);

  // Applied filter (triggered by "Tìm kiếm" button)
  const [appliedFilters, setAppliedFilters] = useState({
    searchText: '',
    action: 'all' as HistoryActionType | 'all',
    dates: null as any
  });

  // ── Derived data ──────────────────────────
  const allRecords = useMemo<HistoryRecord[]>(() => {
    if (!question) return [];
    return generateMockHistory(question);
  }, [question]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      // 1. Text search on description or performer
      if (appliedFilters.searchText) {
        const haystack = `${r.description} ${r.performer}`.toLowerCase();
        if (!haystack.includes(appliedFilters.searchText.toLowerCase())) return false;
      }
      // 2. Action filter
      if (appliedFilters.action !== 'all' && r.action !== appliedFilters.action) return false;
      // 3. Date range
      if (appliedFilters.dates && appliedFilters.dates[0] && appliedFilters.dates[1]) {
        const start = appliedFilters.dates[0].startOf('day').toDate() as Date;
        const end = appliedFilters.dates[1].endOf('day').toDate() as Date;
        const d = new Date(r.performedAt);
        if (d < start || d > end) return false;
      }
      return true;
    });
  }, [allRecords, appliedFilters]);

  // ── Handlers ─────────────────────────────
  const handleSearch = () => {
    setAppliedFilters({ searchText, action: filterAction, dates: filterDates });
  };

  const handleReset = () => {
    setSearchText('');
    setFilterAction('all');
    setFilterDates(null);
    setAppliedFilters({ searchText: '', action: 'all', dates: null });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleExportExcel = () => {
    message.success('Xuất Excel thành công! (tính năng đang phát triển)');
  };

  // ── Table columns ─────────────────────────
  const columns: ColumnsType<HistoryRecord> = [
    {
      title: 'STT',
      dataIndex: 'stt',
      key: 'stt',
      width: 56,
      align: 'center',
      render: (stt: number) => (
        <span className="font-mono text-slate-500 text-xs">{stt}</span>
      )
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'performer',
      key: 'performer',
      width: 180,
      render: (performer: string) => (
        <span className="text-slate-700 font-semibold text-xs">{performer}</span>
      )
    },
    {
      title: 'Thời gian thực hiện',
      dataIndex: 'performedAt',
      key: 'performedAt',
      width: 160,
      render: (dt: string) => (
        <span className="text-slate-600 text-xs font-mono">{formatDateTime(dt)}</span>
      )
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 160,
      render: (action: HistoryActionType) => (
        <span className="text-slate-700 text-xs font-semibold">{getActionLabel(action)}</span>
      )
    },
    {
      title: 'Nội dung thực hiện',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => (
        <Tooltip title={desc}>
          <span className="text-slate-700 text-xs">{desc}</span>
        </Tooltip>
      )
    },
    {
      title: 'Thao tác',
      key: 'action-col',
      align: 'center',
      width: 80,
      render: (_: any, record: HistoryRecord) => (
        <Tooltip title="Xem chi tiết">
          <Button
            type="text"
            icon={<EyeOutlined className="text-blue-600" />}
            className="flex items-center justify-center w-7 h-7 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 mx-auto"
            onClick={() =>
              message.info(`Xem chi tiết lịch sử #${record.stt} (tính năng đang phát triển)`)
            }
            style={{ cursor: 'pointer' }}
          />
        </Tooltip>
      )
    }
  ];

  // ─────────────────────────────────────────
  const modalTitle =
    mode === 'tham-dinh'
      ? 'Lịch sử thẩm định câu hỏi'
      : 'Lịch sử chỉnh sửa, thẩm định câu hỏi';

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: '#1a4f9c', borderRadius: 6 },
        components: {
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#334155',
            rowHoverBg: '#f1f5f9'
          }
        }
      }}
    >
      <Modal
        open={!!question}
        onCancel={handleClose}
        footer={null}
        width={1020}
        title={
          <span className="text-[#002147] font-black text-sm tracking-tight">
            {modalTitle}
          </span>
        }
        destroyOnHidden
        styles={{ body: { padding: '20px 24px 8px' } }}
      >
        {/* ── Search section ───────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4 shadow-xs">
          <div className="text-[#1a4f9c] font-extrabold text-xs uppercase tracking-wide mb-3">
            Tìm kiếm thông tin
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Nội dung thực hiện */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Nội dung thực hiện
              </label>
              <Input
                placeholder="Nhập"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                className="rounded border-slate-300 text-xs"
              />
            </div>

            {/* Ngày thực hiện */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Ngày thực hiện
              </label>
              <DatePicker.RangePicker
                placeholder={['Bắt đầu', 'Kết thúc']}
                value={filterDates}
                onChange={(dates) => setFilterDates(dates)}
                className="w-full rounded border-slate-300 text-xs"
              />
            </div>

            {/* Loại thao tác */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Loại thao tác
              </label>
              <Select
                value={filterAction}
                onChange={setFilterAction}
                options={ACTION_OPTIONS}
                className="w-full text-xs"
              />
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <Button
              type="primary"
              onClick={handleSearch}
              className="bg-[#1a4f9c] border-transparent text-white font-extrabold text-xs px-8 h-9 rounded hover:bg-blue-800 cursor-pointer"
              style={{ cursor: 'pointer' }}
            >
              Tìm kiếm
            </Button>
          </div>
        </div>

        {/* ── Results section ──────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h2 className="text-[#002147] font-black text-xs uppercase tracking-tight my-0">
              Kết quả đánh giá
            </h2>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExportExcel}
              className="border-slate-300 text-slate-700 text-xs font-bold h-8 px-3 rounded hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
              style={{ cursor: 'pointer' }}
            >
              Xuất Excel
            </Button>
          </div>

          <Table<HistoryRecord>
            dataSource={filteredRecords}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '12'],
              showTotal: (total, range) =>
                `${range[0]} - ${range[1]} / ${total} bản ghi`,
              className: 'pt-3 text-xs',
              style: { justifyContent: 'flex-end' }
            }}
            rowClassName={(_, idx) =>
              idx % 2 === 1 ? 'bg-slate-50/60' : ''
            }
            className="border-none text-xs"
            locale={{ emptyText: 'Không có dữ liệu lịch sử' }}
          />
        </div>

        {/* ── Footer ───────────────────────────── */}
        <div className="flex justify-center pt-4 pb-1">
          <Button
            onClick={handleClose}
            className="border-slate-300 text-slate-700 font-bold text-xs h-9 px-10 rounded hover:bg-slate-50 cursor-pointer"
            style={{ cursor: 'pointer' }}
          >
            Đóng
          </Button>
        </div>
      </Modal>
    </ConfigProvider>
  );
}
