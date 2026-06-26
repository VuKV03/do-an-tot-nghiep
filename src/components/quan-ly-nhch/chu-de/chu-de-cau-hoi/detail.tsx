import React from 'react';
import { Modal, Button, ConfigProvider } from 'antd';
import type { ChuDeType } from './index';

export interface DetailChuDeModalProps {
  open: boolean;
  onClose: () => void;
  record?: ChuDeType | null;
  allData?: ChuDeType[];
}

export default function DetailChuDeModal({
  open,
  onClose,
  record,
  allData = [],
}: DetailChuDeModalProps) {
  const parentRecord = record?.ParentId
    ? allData.find((item) => item.Id === record.ParentId)
    : null;

  const capLabel = record?.ParentId ? 'Tiểu mục' : 'Chủ đề';

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
          <div className="text-[18px] font-semibold text-slate-800 pb-3 border-b border-gray-200">
            Thông tin chủ đề/tiểu mục
          </div>
        }
        open={open}
        onCancel={onClose}
        footer={null}
        width={750}
        closeIcon={<span className="text-gray-500 text-xl font-bold">✕</span>}
        centered
        styles={{
          header: { marginBottom: 0, paddingBottom: 0 },
          body: { paddingTop: '20px' },
        }}
      >
        {record ? (
          <div className="flex flex-col gap-5">
            {/* Section title */}
            <div className="text-[#1e3a8a] font-semibold text-[16px]">
              Thông tin chủ đề/tiểu mục
            </div>

            {/* Môn thi | Khối lớp */}
            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <p className="text-gray-500 text-[14px] mb-1">Môn thi</p>
                <p className="text-gray-800 text-[15px]">{record.MonThiName || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[14px] mb-1">Khối lớp</p>
                <p className="text-gray-800 text-[15px]">{record.KhoiLopName || '—'}</p>
              </div>
            </div>

            {/* Cấp | Chủ đề (cha) */}
            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <p className="text-gray-500 text-[14px] mb-1">Cấp</p>
                <p className="text-gray-800 text-[15px]">{capLabel}</p>
              </div>
              {record.ParentId && (
                <div>
                  <p className="text-gray-500 text-[14px] mb-1">Chủ đề</p>
                  <p className="text-gray-800 text-[15px]">
                    {parentRecord ? parentRecord.Ten : '—'}
                  </p>
                </div>
              )}
            </div>

            {/* Mã */}
            <div>
              <p className="text-gray-500 text-[14px] mb-1">Mã</p>
              <p className="text-gray-800 text-[15px]">{record.Ma || '—'}</p>
            </div>

            {/* Tên chủ đề/tiểu mục */}
            <div>
              <p className="text-gray-500 text-[14px] mb-1">Tên chủ đề/tiểu mục</p>
              <p className="text-gray-800 text-[15px]">{record.Ten || '—'}</p>
            </div>

            {/* Ghi chú / Yêu cầu cần đạt */}
            <div>
              <p className="text-gray-500 text-[14px] mb-1">Ghi chú/Yêu cầu cần đạt</p>
              <p className="text-gray-800 text-[15px] whitespace-pre-wrap">
                {record.GhiChu || '—'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-8">Không có dữ liệu</div>
        )}

        {/* Footer */}
        <div className="flex justify-center mt-8 pt-5 border-t border-gray-200">
          <Button
            onClick={onClose}
            className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold hover:bg-blue-50 text-[15px]"
          >
            Đóng
          </Button>
        </div>
      </Modal>
    </ConfigProvider>
  );
}
