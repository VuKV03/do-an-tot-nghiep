import React, { useState } from 'react';
import { Modal, Button, Radio, Input } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  record: {
    Id: string;
    Ma: string;
    Ten: string;
    MonHoc: string;
    KhoiLop: string;
    NgayTao: string;
    TrangThai: string;
    NguoiTao?: string;
    NguoiDuyetCuoi?: string;
    NgayDuyetCuoi?: string;
    GhiChu?: string | null;
  } | null;
  onApprove?: (comment: string) => void | Promise<void>;
  onReject?: (comment: string) => void | Promise<void>;
}

// Khớp UI chuẩn dùng chung cho mọi modal thẩm định trong dự án (icon FileTextOutlined xanh + tiêu
// đề, khung thông tin xám nhạt, Radio.Group Đồng ý/Từ chối, ô nhận xét, footer Hủy/Xác nhận) — xem
// tham-dinh-cau-hoi/index.tsx::ReviewDetailModal, MatrixConfigModule.tsx, ExamManagementModule.tsx.
// Trước đây màn này dùng 2 nút "Đạt yêu cầu"/"Chưa đạt yêu cầu" bấm là quyết định luôn, khác hẳn quy
// ước "chọn rồi mới xác nhận" ở các module còn lại.
export default function ReviewModal({ open, onClose, record, onApprove, onReject }: ReviewModalProps) {
  const [verdict, setVerdict] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCancel = () => {
    setVerdict('approve');
    setComment('');
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (verdict === 'approve') await onApprove?.(comment);
      else await onReject?.(comment);
      setVerdict('approve');
      setComment('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      width={640}
      centered
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined className="text-blue-600" />
          <span className="text-[#002147] font-black text-sm tracking-tight">
            Thẩm định / Phản biện — {record?.Ma}
          </span>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={handleCancel} className="rounded font-semibold text-xs">Hủy</Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded hover:bg-[#243590] cursor-pointer"
        >
          Xác nhận thẩm định
        </Button>,
      ]}
      destroyOnHidden
    >
      <div className="space-y-4 py-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-600">
          <div className="col-span-2"><span className="font-bold text-slate-500">Tên chủ đề:</span> <span className="font-semibold text-slate-800">{record?.Ten}</span></div>
          <div><span className="font-bold text-slate-500">Môn học:</span> {record?.MonHoc}</div>
          <div><span className="font-bold text-slate-500">Khối lớp:</span> {record?.KhoiLop}</div>
          <div><span className="font-bold text-slate-500">Người tạo:</span> {record?.NguoiTao || 'Chưa có thông tin'}</div>
          <div><span className="font-bold text-slate-500">Người duyệt lần cuối:</span> {record?.NguoiDuyetCuoi || 'Chưa có thông tin'}</div>
          {record?.GhiChu && (
            <div className="col-span-2"><span className="font-bold text-slate-500">Ghi chú:</span> <span className="whitespace-pre-wrap">{record.GhiChu}</span></div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Kết quả thẩm định</div>
          <Radio.Group value={verdict} onChange={e => setVerdict(e.target.value)} className="flex gap-4">
            <Radio value="approve">
              <span className="text-emerald-700 font-bold text-xs">Đồng ý / Thông qua</span>
            </Radio>
            <Radio value="reject">
              <span className="text-rose-600 font-bold text-xs">Từ chối</span>
            </Radio>
          </Radio.Group>
        </div>

        <div>
          <div className="text-[11px] font-bold text-slate-500 mb-1">Nhận xét / Ghi chú (tuỳ chọn)</div>
          <Input.TextArea
            rows={3}
            placeholder="Nhập nhận xét thẩm định..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="text-xs rounded border-slate-300"
          />
        </div>
      </div>
    </Modal>
  );
}
