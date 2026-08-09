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
import { apiGetMatrixHistory, MatrixHistoryAPI } from './mockData';

// ─────────────────────────────────────────────
// Types — cùng khuôn với QuestionHistoryModal (ngan-hang-cau-hoi/history.tsx), nhưng nguồn dữ liệu
// thật là bảng matrix_histories (backend/exam_service/models.py::MatrixHistory), có sẵn cột
// `comment` tách riêng khỏi `note` nên không dính lỗi trùng nội dung giữa 2 cột như bên câu hỏi.
// ─────────────────────────────────────────────

export type MatrixHistoryActionType = 'Thêm mới' | 'Sửa' | 'Gửi thẩm định' | 'Đồng ý' | 'Từ chối';

export interface MatrixHistoryRecord {
  id: string;
  stt: number;
  performer: string;
  performedAt: string;
  action: MatrixHistoryActionType;
  description: string; // note — nội dung thực hiện
  comment: string;      // comment — nhận xét thẩm định thật (chỉ có ở Đồng ý/Từ chối)
}

interface MatrixHistoryModalProps {
  /** Ma trận đang xem lịch sử. null = modal ẩn */
  matrix: { id: string; name: string; code: string } | null;
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

function getActionLabel(action: MatrixHistoryActionType): string {
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

export default function MatrixHistoryModal({ matrix, onClose }: MatrixHistoryModalProps) {
  // ── Filter state ──────────────────────────
  const [searchText, setSearchText] = useState('');
  const [filterAction, setFilterAction] = useState<MatrixHistoryActionType | 'all'>('all');
  const [filterDates, setFilterDates] = useState<any>(null);

  const [appliedFilters, setAppliedFilters] = useState({
    searchText: '',
    action: 'all' as MatrixHistoryActionType | 'all',
    dates: null as any
  });

  // ── Fetch lịch sử thật từ backend (bảng matrix_histories) ─────────────
  const [allRecords, setAllRecords] = useState<MatrixHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const matrixId = matrix?.id;

  useEffect(() => {
    if (!matrixId) {
      setAllRecords([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiGetMatrixHistory(matrixId)
      .then((res) => {
        if (cancelled) return;
        const rows = res.data || [];
        setAllRecords(
          rows.map((r: MatrixHistoryAPI, idx: number) => ({
            id: r.id,
            stt: idx + 1,
            performer: r.actor || 'Hội đồng Chuyên môn',
            performedAt: r.timestamp,
            action: (r.action as MatrixHistoryActionType) || 'Sửa',
            description: r.note || '',
            comment: r.comment || '',
          })),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Không thể tải lịch sử ma trận đề:', err);
        toast.error('Không thể tải lịch sử ma trận đề.');
        setAllRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matrixId]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      const kwSearchText = appliedFilters.searchText.trim();
      if (kwSearchText) {
        const haystack = `${r.description} ${r.performer}`.toLowerCase();
        if (!haystack.includes(kwSearchText.toLowerCase())) return false;
      }
      if (appliedFilters.action !== 'all' && r.action !== appliedFilters.action) return false;
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
  const columns: ColumnsType<MatrixHistoryRecord> = [
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
      render: (action: MatrixHistoryActionType) => (
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
      title: 'Nội dung thẩm định/Từ chối',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
      // `comment` là cột RIÊNG ở matrix_histories (khác question_histories dùng chung 1 cột `note`
      // cho cả 2 ý nghĩa) — chỉ 2 hành động Đồng ý/Từ chối mới có giá trị, không cần suy luận thêm.
      render: (comment: string, record: MatrixHistoryRecord) => {
        const isReview = record.action === 'Đồng ý' || record.action === 'Từ chối';
        if (!isReview) return <span className="text-slate-300 text-xs">—</span>;
        return (
          <Tooltip title={comment}>
            <span className="text-slate-700 text-xs">{comment || '—'}</span>
          </Tooltip>
        );
      }
    }
  ];

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
        open={!!matrix}
        onCancel={handleClose}
        footer={null}
        width={1020}
        title={
          <span className="text-[#002147] font-black text-sm tracking-tight">
            Lịch sử chỉnh sửa, thẩm định ma trận đề
            {matrix ? <span className="text-slate-400 font-medium"> — {matrix.code}</span> : null}
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

          <Table<MatrixHistoryRecord>
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
