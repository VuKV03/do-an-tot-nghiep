import React from 'react';
import { Modal, Button } from 'antd';

interface ModalChiTietCauHoiProps {
  open: boolean;
  question: any;
  onClose: () => void;
}

const getLevelLabel = (level: string) => {
  switch (level) {
    case 'nhan_biet': return 'Nhận biết';
    case 'thong_hieu': return 'Thông hiểu';
    case 'van_dung': return 'Vận dụng';
    case 'van_dung_cao': return 'Vận dụng cao';
    default: return level || '—';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'single': return 'TN';
    case 'true_false': return 'Đúng Sai';
    case 'short': return 'Trả lời ngắn';
    case 'multiple': return 'Nhiều lựa chọn';
    default: return type || '—';
  }
};

export default function ModalChiTietCauHoi({ open, question, onClose }: ModalChiTietCauHoiProps) {
  if (!question) return null;

  const rows = [
    { label: 'Mã câu hỏi', value: question.code || question.id },
    { label: 'Nội dung câu hỏi', value: question.text },
    { label: 'Loại câu hỏi', value: getTypeLabel(question.type) },
    { label: 'Mức độ câu hỏi', value: getLevelLabel(question.level) },
    { label: 'Thành phần năng lực', value: question.competency || '—' },
    { label: 'Thuộc chủ đề', value: question.topicName || question.subTopicName || '—' },
  ];

  return (
    <Modal
      title={<span className="font-bold text-sm text-[#1a3c8b]">Xem chi tiết câu hỏi</span>}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}
          className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs">
          Đóng
        </Button>
      ]}
      centered
      width={520}
    >
      <div className="pt-3">
        <div className="text-sm font-bold text-slate-800 mb-3">Thông tin chi tiết</div>
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx}>
              <div className="text-[11px] text-slate-400 font-medium mb-0.5">{row.label}</div>
              <div className="text-xs text-slate-800 font-semibold bg-slate-50 border border-slate-200 rounded px-3 py-2">
                {row.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
