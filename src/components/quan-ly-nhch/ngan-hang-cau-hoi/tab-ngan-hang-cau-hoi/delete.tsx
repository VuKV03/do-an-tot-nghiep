import React from 'react';
import { Modal, Button } from 'antd';

export interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recordCode?: string; // e.g. "Amy..."
  selectedCount?: number; // e.g. 3
}

export default function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  recordCode,
  selectedCount,
}: DeleteConfirmModalProps) {
  const isMultiple = selectedCount && selectedCount > 1;

  return (
    <Modal
      title={
        <span className="text-slate-800 font-bold text-[15px] tracking-wide">
          Xác nhận Xóa
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
            danger
            onClick={onConfirm}
            className="rounded bg-[#d90429] border-transparent text-white font-bold text-xs px-6 h-8 flex items-center justify-center hover:bg-red-700 transition-colors"
            style={{ cursor: 'pointer' }}
          >
            Xóa
          </Button>
        </div>
      }
    >
      <div className="text-slate-700 text-xs font-medium leading-relaxed">
        {isMultiple ? (
          <span>Bạn có chắc chắn muốn xóa {selectedCount} bản ghi câu hỏi?</span>
        ) : (
          <span>
            Bạn có chắc chắn muốn xóa bản ghi có mã “{recordCode || 'Amy...'}”?
          </span>
        )}
      </div>
    </Modal>
  );
}
