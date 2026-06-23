import React from 'react';
import { Modal, Button, ConfigProvider } from 'antd';

export interface DeleteChuDeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  isMultiple?: boolean;
  multipleCount?: number;
}

export default function DeleteChuDeModal({
  open,
  onClose,
  onConfirm,
  itemName,
  isMultiple,
  multipleCount,
}: DeleteChuDeModalProps) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#e11d48',
          borderRadius: 6,
        },
      }}
    >
      <Modal
        title={
          <div className="text-[17px] font-semibold text-slate-800 pb-3 border-b border-gray-200">
            Xác nhận Xóa
          </div>
        }
        open={open}
        onCancel={onClose}
        footer={null}
        width={450}
        closeIcon={<span className="text-gray-500 text-lg font-bold">✕</span>}
        centered
        styles={{
          header: { marginBottom: 0, paddingBottom: 0 },
          body: { paddingTop: '20px' },
        }}
      >
        <div className="text-[15px] text-gray-700 mb-8">
          {isMultiple ? (
            <span>Bạn có chắc chắn muốn xóa {multipleCount} bản ghi chủ đề?</span>
          ) : (
            <span>
              Bạn có chắc chắn muốn xóa bản ghi có tên “{itemName}”?
            </span>
          )}
        </div>

        <div className="flex justify-center gap-4 border-t border-gray-200 pt-5 mt-2">
          <Button
            onClick={onClose}
            className="border-[#1d4ed8] text-[#1d4ed8] px-8 h-10 font-medium hover:bg-blue-50 text-[15px]"
          >
            Đóng
          </Button>
          <Button
            danger
            type="primary"
            onClick={onConfirm}
            className="bg-[#e11d48] hover:bg-[#be123c] border-none px-8 h-10 font-medium text-[15px]"
          >
            Xóa
          </Button>
        </div>
      </Modal>
    </ConfigProvider>
  );
}
