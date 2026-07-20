import React, { useState } from 'react';
import { Modal, Button } from 'antd';

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

export default function ReviewModal({ open, onClose, record, onApprove, onReject }: ReviewModalProps) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    if (!onApprove) return;
    setSubmitting('approve');
    try {
      await onApprove(comment);
      setComment('');
      onClose();
    } finally {
      setSubmitting(null);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setSubmitting('reject');
    try {
      await onReject(comment);
      setComment('');
      onClose();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Modal
      title={
        <div className="text-gray-800 text-lg font-bold pb-2 border-b border-gray-100">
          Thẩm định thông tin chủ đề
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      className="custom-review-modal"
    >
      <div className="flex flex-col gap-6 py-4">
        {/* Section: Thông tin chủ đề */}
        <div>
          <h3 className="text-[#1e3a8a] font-semibold text-base mb-4">
            Thông tin chủ đề
          </h3>
          
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-gray-500 text-sm mb-1">Tên chủ đề</div>
              <div className="text-gray-800 font-medium text-base">
                {record?.Ten || 'Tên chủ đề 01'}
              </div>
            </div>

            {/* Ghi chú / Yêu cầu cần đạt */}
            <div>
              <div className="text-gray-500 text-sm mb-1">Ghi chú/Yêu cầu cần đạt</div>
              <div className="text-gray-800 text-sm whitespace-pre-wrap">
                {record?.GhiChu || <span className="text-gray-400 italic">—</span>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-gray-500 text-sm mb-1">Người tạo</div>
                <div className="text-gray-800 font-medium">
                  {record?.NguoiTao || 'Nguyễn Văn An'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-1">Người duyệt lần cuối</div>
                <div className="text-gray-800 font-medium">
                  {record?.NguoiDuyetCuoi || 'Chưa có thông tin'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-1">Ngày duyệt lần cuối</div>
                <div className="text-gray-800 font-medium">
                  {record?.NgayDuyetCuoi || 'Chưa có thông tin'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Nhận xét */}
        <div>
          <h3 className="text-gray-700 font-semibold text-sm mb-2">
            Nhận xét
          </h3>

          <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhập"
              className="w-full min-h-[160px] p-4 text-gray-800 border-none outline-none focus:ring-0 resize-y text-sm leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Footer Actions (Centered) */}
        <div className="flex justify-center gap-4 mt-4">
          <Button
            className="border-blue-700 text-blue-700 hover:bg-blue-50 px-8 h-10 font-semibold"
            onClick={onClose}
            disabled={submitting !== null}
          >
            Đóng
          </Button>
          <Button
            danger
            className="bg-[#d91b29] hover:bg-[#b01420] border-none text-white px-6 h-10 font-semibold"
            onClick={handleReject}
            loading={submitting === 'reject'}
            disabled={submitting === 'approve'}
          >
            Chưa đạt yêu cầu
          </Button>
          <Button
            type="primary"
            className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none px-8 h-10 font-semibold"
            onClick={handleApprove}
            loading={submitting === 'approve'}
            disabled={submitting === 'reject'}
          >
            Đạt yêu cầu
          </Button>
        </div>
      </div>
    </Modal>
  );
}
