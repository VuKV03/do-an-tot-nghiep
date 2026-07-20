import React, { useState } from 'react';
import { Modal, Button, ConfigProvider } from 'antd';

export interface GuiThamDinhChuDeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  isMultiple?: boolean;
  multipleCount?: number;
}

export default function GuiThamDinhChuDeModal({
  open,
  onClose,
  onConfirm,
  itemName,
  isMultiple,
  multipleCount,
}: GuiThamDinhChuDeModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 6,
        },
      }}
    >
      <Modal
        title={
          <div className="text-[17px] font-semibold text-slate-800 pb-3 border-b border-gray-200">
            {isMultiple ? 'Gửi thẩm định nhiều chủ đề' : 'Gửi thẩm định chủ đề'}
          </div>
        }
        open={open}
        onCancel={onClose}
        footer={null}
        width={isMultiple ? 500 : 550}
        closeIcon={<span className="text-gray-500 text-lg font-bold">✕</span>}
        centered
        styles={{
          header: { marginBottom: 0, paddingBottom: 0 },
          body: { paddingTop: '16px' },
        }}
      >
        <div className="mb-6">
          {isMultiple ? (
            <div className="text-[15px] font-medium text-[#1e3a8a] py-4">
              Gửi thẩm định các chủ đề được chọn ({multipleCount} bản ghi)
            </div>
          ) : (
            <div className="py-2">
              <div className="text-[#1e3a8a] font-semibold text-[15px] mb-4">
                Thông tin chủ đề
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-gray-600 text-[14px]">Tên chủ đề</div>
                <div className="text-gray-800 text-[15px]">{itemName}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 border-t border-gray-200 pt-5">
          <Button
            onClick={onClose}
            disabled={submitting}
            className="border-[#1d4ed8] text-[#1d4ed8] px-8 h-10 font-medium hover:bg-blue-50 text-[15px]"
          >
            Đóng
          </Button>
          <Button
            type="primary"
            onClick={handleConfirm}
            loading={submitting}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none px-8 h-10 font-medium text-[15px]"
          >
            {isMultiple ? 'Gửi' : 'Gửi'}
          </Button>
        </div>
      </Modal>
    </ConfigProvider>
  );
}
