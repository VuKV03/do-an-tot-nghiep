import React from 'react';
import { Modal, Button, Row, Col, Divider, Tag } from 'antd';
import { EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { RichTextView } from '../../../utils/htmlContent';

interface ModalChiTietCauHoiProps {
  open: boolean;
  question: any;
  onClose: () => void;
}

const getTypeLabelShort = (type: string) => {
  switch (type) {
    case 'single': return 'TN';
    case 'multiple': return 'TLN';
    case 'true_false': return 'DS';
    case 'short': return 'TLN';
    default: return type || '—';
  }
};

const getTypeLabelLong = (type: string) => {
  switch (type) {
    case 'single': return 'Trắc nghiệm đơn';
    case 'multiple': return 'Trắc nghiệm nhiều lựa chọn';
    case 'true_false': return 'Trắc nghiệm Đúng / Sai';
    case 'short': return 'Tự luận ngắn';
    default: return type || '—';
  }
};

const getLevelLabelShort = (level: string) => {
  switch (level) {
    case 'nhan_biet': return 'NB';
    case 'thong_hieu': return 'TH';
    case 'van_dung': return 'VD';
    case 'van_dung_cao': return 'VDC';
    default: return level || '—';
  }
};

const getLevelLabelLong = (level: string) => {
  switch (level) {
    case 'nhan_biet': return 'Nhận biết';
    case 'thong_hieu': return 'Thông hiểu';
    case 'van_dung': return 'Vận dụng';
    case 'van_dung_cao': return 'Vận dụng cao';
    default: return level || '—';
  }
};

const formatDateString = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
};

// Khớp đáp án đúng với 1 phương án — đáp án đúng có thể là chữ cái ("A"), mảng, hoặc trùng thẳng
// nội dung phương án (dữ liệu không đồng nhất giữa các luồng tạo câu hỏi — AI/thủ công/import).
const isCorrectOption = (opt: string, correctAnswer: any): boolean => {
  if (!correctAnswer) return false;
  const optStr = String(opt).trim();
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some((ans) => isCorrectOption(opt, ans));
  }
  const ansStr = String(correctAnswer).trim();
  if (optStr === ansStr) return true;
  if (optStr.startsWith(ansStr + '.') || optStr.startsWith(ansStr + ')')) return true;
  if (ansStr.startsWith(optStr)) return true;
  const cleanOpt = optStr.replace(/^[A-Z]\.\s*/i, '').trim();
  const cleanAns = ansStr.replace(/^[A-Z]\.\s*/i, '').trim();
  return !!cleanOpt && !!cleanAns && cleanOpt === cleanAns;
};

export default function ModalChiTietCauHoi({ open, question, onClose }: ModalChiTietCauHoiProps) {
  if (!question) return null;

  const renderAnswers = () => {
    const { type, options, correctAnswer, statements } = question;

    if (type === 'single' || type === 'multiple') {
      if (!options || options.length === 0) {
        return <div className="text-slate-400 text-xs italic">Chưa xác định các phương án lựa chọn</div>;
      }
      return (
        <div className="space-y-2">
          {options.map((opt: string, idx: number) => {
            const correct = isCorrectOption(opt, correctAnswer);
            return (
              <div
                key={idx}
                className={`flex gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
                  correct
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <strong className="shrink-0">{String.fromCharCode(65 + idx)}.</strong>
                <RichTextView html={opt.replace(/^[A-D]\.\s*/, '')} className="inline" />
                {correct && <CheckCircleOutlined className="text-emerald-600 ml-auto shrink-0" />}
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'true_false') {
      if (statements && statements.length > 0) {
        return (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2 px-3 font-bold text-slate-600 w-12 text-center">STT</th>
                  <th className="py-2 px-3 font-bold text-slate-600">Mệnh đề / Nội dung</th>
                  <th className="py-2 px-3 font-bold text-slate-600 w-24 text-center">Đáp án</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((st: any, idx: number) => (
                  <tr key={st.id ?? idx} className="border-b border-slate-100">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 text-slate-700 font-medium"><RichTextView html={st.content} className="inline" /></td>
                    <td className="py-2 px-3 text-center">
                      <Tag color={st.isCorrect ? 'success' : 'error'} className="font-bold border-transparent rounded-full m-0">
                        {st.isCorrect ? 'Đúng' : 'Sai'}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <span className="text-slate-500 font-bold block mb-1">Đáp án Đúng / Sai:</span>
          <span className="text-slate-800 font-semibold">{String(correctAnswer ?? '—')}</span>
        </div>
      );
    }

    if (type === 'short') {
      return (
        <div className="p-3 bg-emerald-50/60 border border-emerald-300 rounded-lg flex items-start gap-2">
          <CheckCircleOutlined className="text-emerald-600 mt-0.5" />
          <div>
            <span className="text-emerald-800/80 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Đáp án trả lời ngắn</span>
            <RichTextView html={String(correctAnswer ?? 'Chưa định nghĩa')} className="text-emerald-950 font-bold text-xs" />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <EyeOutlined className="text-[#1a3c8b]" />
          <span className="font-bold text-sm text-[#1a3c8b]">Xem chi tiết câu hỏi</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}
          className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs">
          Đóng
        </Button>
      ]}
      centered
      width={720}
    >
      <div className="pt-3 flex flex-col gap-3">
        {/* Metadata */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12}>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex">
                  <span className="text-slate-500 font-bold w-24 shrink-0">Mã câu hỏi:</span>
                  <span className="text-slate-800 font-semibold">{question.code || question.id}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-24 shrink-0">Môn học:</span>
                  <span className="text-slate-800 font-semibold">{question.subject || '—'}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-24 shrink-0">Khối lớp:</span>
                  <span className="text-slate-800 font-semibold">{question.grade || '—'}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-24 shrink-0">Chủ đề:</span>
                  <span className="text-slate-800 font-semibold">{question.topicName || question.subTopicName || '—'}</span>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex">
                  <span className="text-slate-500 font-bold w-28 shrink-0">Loại câu hỏi:</span>
                  <span className="text-slate-800 font-semibold">
                    {getTypeLabelShort(question.type)} ({getTypeLabelLong(question.type)})
                  </span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-28 shrink-0">Cấp độ tư duy:</span>
                  <span className="text-slate-800 font-semibold">
                    {getLevelLabelShort(question.level)} ({getLevelLabelLong(question.level)})
                  </span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-28 shrink-0">Thành phần năng lực:</span>
                  <span className="text-slate-800 font-semibold">{question.nangLuc || '—'}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-28 shrink-0">Người soạn:</span>
                  <span className="text-slate-800 font-semibold">{question.creator || '—'}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-28 shrink-0">Ngày tạo:</span>
                  <span className="text-slate-800 font-semibold">{formatDateString(question.createdAt)}</span>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        <Divider className="my-0 border-slate-100" />

        {/* Nội dung câu hỏi */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Nội dung câu hỏi</span>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <RichTextView html={question.text} className="text-slate-800 font-semibold text-xs leading-relaxed" />
          </div>
        </div>

        {/* Đáp án */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
            {question.type === 'short' ? 'Đáp án' : 'Các phương án'}
          </span>
          {renderAnswers()}
        </div>
      </div>
    </Modal>
  );
}
