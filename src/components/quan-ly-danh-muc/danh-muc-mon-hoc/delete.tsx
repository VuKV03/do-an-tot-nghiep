import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { HelpCircle } from 'lucide-react';

export interface DeleteSubjectCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  isMultiple?: boolean;
  multipleCount?: number;
}

export default function DeleteSubjectCategoryModal({
  open, onClose, onConfirm, itemName, isMultiple, multipleCount,
}: DeleteSubjectCategoryModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={<div className="text-[20px] font-semibold text-slate-800 pb-3 border-b border-gray-200">Xác nhận xóa</div>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      closeIcon={<span className="text-gray-500 text-xl font-bold">✕</span>}
      centered
      styles={{ header: { marginBottom: 0, paddingBottom: 0 }, body: { paddingTop: '24px' } }}
    >
      <div className="flex items-start gap-4 mb-8 px-2">
        <HelpCircle size={40} className="text-gray-500 shrink-0" strokeWidth={1.5} />
        <div className="text-[17px] text-slate-800 pt-1">
          {isMultiple
            ? `Bạn có chắc chắn xóa ${multipleCount || 0} bản ghi đã chọn?`
            : `Bạn có chắc chắn xóa môn học "${itemName || ''}"?`}
        </div>
      </div>
      <div className="flex justify-center gap-4 border-t border-gray-200 pt-5">
        <Button onClick={onClose} disabled={submitting} className="border-gray-400 text-gray-600 px-10 h-10 font-semibold text-[15px] hover:border-gray-500 hover:text-gray-700">Hủy</Button>
        <Button danger type="primary" onClick={handleConfirm} loading={submitting} className="bg-[#da251d] hover:bg-[#b91e17] border-none px-10 h-10 font-semibold text-[15px]">Xóa</Button>
      </div>
    </Modal>
  );
}
