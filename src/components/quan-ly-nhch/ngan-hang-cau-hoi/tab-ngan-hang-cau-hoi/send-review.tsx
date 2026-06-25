import React from 'react';
import { Modal, Button } from 'antd';

export interface SendReviewConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recordName?: string; // e.g. "Amy..."
  selectedCount?: number; // e.g. 3
}

export default function SendReviewConfirmModal({
  open,
  onClose,
  onConfirm,
  recordName,
  selectedCount,
}: SendReviewConfirmModalProps) {
  const isMultiple = selectedCount && selectedCount > 1;

  return (
    <Modal
      title={
        <span className="text-slate-800 font-bold text-[15px] tracking-wide">
          Xác nhận Gửi
        </span>
      }
      open={open}
      onCancel={onClose}
      centered
      width={400}
      styles={{
        header: {
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '12px',
          marginBottom: '0',
        },
        body: {
          padding: '24px',
        },
        footer: {
          borderTop: '1px solid #e2e8f0',
          paddingTop: '12px',
          marginTop: '0',
        },
      }}
      footer={
        <div className="flex justify-center gap-3">
          <Button
            onClick={onClose}
            className="rounded border border-blue-600 text-blue-600 font-bold text-xs px-6 h-8 flex items-center justify-center hover:bg-blue-50 transition-colors"
            style={{ cursor: 'pointer' }}
          >
            Đóng
          </Button>
          <Button
            type="primary"
            onClick={onConfirm}
            className="rounded bg-[#1d4ed8] border-transparent text-white font-bold text-xs px-6 h-8 flex items-center justify-center hover:bg-blue-800 transition-colors"
            style={{ cursor: 'pointer' }}
          >
            Xác nhận
          </Button>
        </div>
      }
    >
      <div className="text-slate-700 text-xs font-medium leading-relaxed">
        {isMultiple ? (
          <span>
            Bạn có chắc chắn muốn gửi thẩm định/ phản biên {selectedCount} bản ghi câu hỏi ?
          </span>
        ) : (
          <span>
            Bạn có chắc chắn muốn gửi thẩm định/ phản biện bản ghi có tên “{recordName || 'Amy...'}”?
          </span>
        )}
      </div>
    </Modal>
  );
}
