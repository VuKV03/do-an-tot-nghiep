import React from 'react';
import { Modal, Button } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

interface ExportAnswerChoiceModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (includeAnswers: boolean) => void;
  /** Mô tả ngắn nội dung sắp xuất (vd "đề gốc", "4 đề hoán vị", "gói đề DE-001") — hiện trong câu hỏi
   * cho rõ đang chọn kiểu xuất cho cái gì, đặc biệt hữu ích ở màn có nhiều nút "Tải xuống" khác nhau. */
  targetLabel?: string;
}

/** Chọn kiểu file .docx xuất ra: có kèm đáp án (bản giáo viên đối chiếu) hay không (bản phát cho thí
 * sinh) — dùng chung cho mọi nút "Tải đề thi (.docx)"/"Tải xuống" trong ExamManagementModule.tsx,
 * ModalSinhDeHoanVi.tsx, PackageManagementModule.tsx, tránh lặp lại UI ở từng nơi. */
export default function ExportAnswerChoiceModal({ open, onCancel, onConfirm, targetLabel }: ExportAnswerChoiceModalProps) {
  return (
    <Modal
      title={<span className="font-bold text-sm text-[#1a3c8b]">Xuất đề thi (.docx)</span>}
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      width={420}
      destroyOnHidden
    >
      <div className="text-xs text-slate-500 mb-4">
        Chọn kiểu file xuất{targetLabel ? ` cho ${targetLabel}` : ''}:
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => onConfirm(true)}
          className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590] justify-start h-9"
        >
          Có đáp án — dùng để đối chiếu, chấm bài
        </Button>
        <Button
          icon={<EyeInvisibleOutlined />}
          onClick={() => onConfirm(false)}
          className="rounded font-semibold text-xs justify-start h-9"
        >
          Không đáp án — dùng để phát cho thí sinh
        </Button>
      </div>
    </Modal>
  );
}
