import React, { useState } from 'react';
import { Modal, Button } from 'antd';

interface ReviewMultipleModalProps {
  open: boolean;
  onClose: () => void;
  count: number;
  onApprove?: (comment: string) => void | Promise<void>;
  onReject?: (comment: string) => void | Promise<void>;
}

export default function ReviewMultipleModal({ open, onClose, count, onApprove, onReject }: ReviewMultipleModalProps) {
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
        <div className="text-gray-800 text-base font-bold pb-2 border-b border-gray-100">
          Thẩm định nhiều chủ đề
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="text-blue-700 font-semibold text-sm">
          Thẩm định nhanh {count} chủ đề
        </div>

        <div>
          <h3 className="text-gray-700 font-semibold text-sm mb-2">
            Nhận xét
          </h3>

          <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhập"
              className="w-full min-h-[120px] p-3 text-gray-800 border-none outline-none focus:ring-0 resize-y text-sm leading-relaxed font-sans"
            />
          </div>
        </div>

        <div className="flex justify-center gap-3 mt-2">
          <Button
            className="border-blue-700 text-blue-700 hover:bg-blue-50 px-6 h-10 font-semibold"
            onClick={onClose}
            disabled={submitting !== null}
          >
            Đóng
          </Button>
          <Button
            danger
            className="bg-[#d91b29] hover:bg-[#b01420] border-none text-white px-4 h-10 font-semibold"
            onClick={handleReject}
            loading={submitting === 'reject'}
            disabled={submitting === 'approve'}
          >
            Chưa đạt yêu cầu
          </Button>
          <Button
            type="primary"
            className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none px-6 h-10 font-semibold"
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
