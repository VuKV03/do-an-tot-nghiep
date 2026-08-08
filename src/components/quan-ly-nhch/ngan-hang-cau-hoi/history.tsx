import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Input,
  Select,
  DatePicker,
  Button,
  Table,
  Tooltip,
  ConfigProvider
} from 'antd';
import { toast } from '../../../utils/toast';
import type { ColumnsType } from 'antd/es/table';
import { ExportOutlined } from '@ant-design/icons';
import { Question } from '../../../types';
import { bankQuestionApi } from '../../../services/danhMucApi';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

// Đúng 5 giá trị `action` thật được ghi vào bảng question_histories (xem
// backend/exam_service/routes/{questions,bank_questions}.py) — khác hẳn bộ enum cũ
// ('them'/'sua'/'phan_tich'/'tham_dinh'/'phan_bien') vốn chỉ tồn tại trong dữ liệu giả lập,
// không khớp với bất kỳ giá trị thật nào backend từng ghi.
export type HistoryActionType = 'Thêm mới' | 'Sửa' | 'Gửi thẩm định' | 'Đồng ý' | 'Từ chối';

export interface HistoryRecord {
  id: string;
  stt: number;
  performer: string;   // Người thực hiện
  performedAt: string; // ISO datetime string
  action: HistoryActionType;
  description: string; // Nội dung thực hiện (note)
}

interface QuestionHistoryModalProps {
  /** Câu hỏi đang xem lịch sử. null = modal ẩn */
  question: Question | null;
  /** Mode để phân biệt context (tuỳ chọn, dùng để lọc hoặc hiển thị title) */
  mode?: 'ngan-hang' | 'tham-dinh';
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Thêm mới', label: 'Thêm mới' },
  { value: 'Sửa', label: 'Sửa' },
  { value: 'Gửi thẩm định', label: 'Gửi thẩm định' },
  { value: 'Đồng ý', label: 'Đồng ý (thẩm định)' },
  { value: 'Từ chối', label: 'Từ chối (thẩm định)' }
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

  // ── Fetch lịch sử thật từ backend (bảng question_histories) ─────────────
  const [allRecords, setAllRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const questionId = question?.id;

  useEffect(() => {
    if (!questionId) {
      setAllRecords([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    bankQuestionApi
      .getHistory(questionId)
      .then((res) => {
        if (cancelled) return;
        const rows = res.data || [];
        setAllRecords(
          rows.map((r, idx) => ({
            id: r.id,
            stt: idx + 1,
            performer: r.actor || 'Hội đồng Chuyên môn',
            performedAt: r.timestamp,
            action: (r.action as HistoryActionType) || 'Sửa',
            description: r.note || '',
          })),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Không thể tải lịch sử câu hỏi:', err);
        toast.error('Không thể tải lịch sử câu hỏi.');
        setAllRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      // 1. Text search on description or performer
      const kwSearchText = appliedFilters.searchText.trim();
      if (kwSearchText) {
        const haystack = `${r.description} ${r.performer}`.toLowerCase();
        if (!haystack.includes(kwSearchText.toLowerCase())) return false;
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
    toast.success('Xuất Excel thành công! (tính năng đang phát triển)');
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
      // Với 2 hành động Đồng ý/Từ chối, backend chỉ có DUY NHẤT 1 cột `note` — được map vào CẢ 2
      // cột hiển thị (cột này + "Nội dung thẩm định/Từ chối" bên dưới), nên nếu hiện thẳng `desc`
      // ở đây sẽ trùng y hệt nội dung nhận xét thẩm định. Đổi sang nhãn mô tả HÀNH ĐỘNG (không phải
      // nội dung nhận xét) để 2 cột không lặp lại nhau — nhận biết "hàng loạt" qua cụm từ mặc định
      // backend tự chèn khi thẩm định nhiều câu không kèm ghi chú riêng (xem bulk_review_bank_questions
      // ở bank_questions.py: `note=body.comment or f"{action_label} thẩm định hàng loạt"`). Nếu người
      // thẩm định có nhập ghi chú riêng khi duyệt hàng loạt thì không còn dấu hiệu để nhận biết —
      // khi đó rơi về nhãn đơn lẻ, vẫn không còn trùng nội dung với cột thẩm định.
      render: (desc: string, record: HistoryRecord) => {
        const isReview = record.action === 'Đồng ý' || record.action === 'Từ chối';
        if (isReview) {
          const isBulk = /hàng loạt/i.test(desc || '');
          const label = record.action === 'Đồng ý'
            ? (isBulk ? 'Thẩm định hàng loạt' : 'Thẩm định câu hỏi')
            : (isBulk ? 'Từ chối hàng loạt' : 'Từ chối câu hỏi');
          return <span className="text-slate-700 text-xs">{label}</span>;
        }
        return (
          <Tooltip title={desc}>
            <span className="text-slate-700 text-xs">{desc}</span>
          </Tooltip>
        );
      }
    },
    {
      title: 'Nội dung thẩm định/Từ chối',
      key: 'reviewComment',
      ellipsis: true,
      // Chỉ 2 hành động Đồng ý/Từ chối mới có "Nhận xét/Ghi chú" thật của người thẩm định (nhập ở
      // popup xác nhận thẩm định — xem tham-dinh-cau-hoi/index.tsx) — backend lưu chung vào cột
      // `note` cho 2 hành động này (body.comment or default label, xem bank_questions.py::approve/
      // reject), không có cột riêng như bên lịch sử chủ đề (topics có cột `comment` tách biệt).
      render: (_: any, record: HistoryRecord) => {
        const isReview = record.action === 'Đồng ý' || record.action === 'Từ chối';
        if (!isReview) return <span className="text-slate-300 text-xs">—</span>;
        return (
          <Tooltip title={record.description}>
            <span className="text-slate-700 text-xs">{record.description || '—'}</span>
          </Tooltip>
        );
      }
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
            loading={loading}
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
