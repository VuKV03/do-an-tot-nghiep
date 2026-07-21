import React from 'react';
import { Modal, Button, Row, Col, Divider, Tag } from 'antd';
import { EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Question, QuestionType, CognitiveLevel } from '../../../../types';
import { RichTextView } from '../../../../utils/htmlContent';

export interface QuestionDetailModalProps {
  open: boolean;
  onClose: () => void;
  question: Question | null;
}

export default function QuestionDetailModal({
  open,
  onClose,
  question,
}: QuestionDetailModalProps) {
  if (!question) return null;

  // Formatting helpers
  const getQuestionTypeLabelShort = (type: QuestionType) => {
    switch (type) {
      case 'single': return 'TN';
      case 'multiple': return 'TLN';
      case 'true_false': return 'DS';
      case 'short': return 'TL';
      default: return 'TN';
    }
  };

  const getQuestionTypeLabelLong = (type: QuestionType) => {
    switch (type) {
      case 'single': return 'Trắc nghiệm đơn';
      case 'multiple': return 'Trắc nghiệm nhiều lựa chọn';
      case 'true_false': return 'Trắc nghiệm Đúng / Sai';
      case 'short': return 'Tự luận ngắn';
      default: return 'Trắc nghiệm đơn';
    }
  };

  const getCognitiveLevelLabelShort = (level: CognitiveLevel) => {
    switch (level) {
      case 'nhan_biet': return 'NB';
      case 'thong_hieu': return 'TH';
      case 'van_dung': return 'VD';
      case 'van_dung_cao': return 'VDC';
      default: return 'NB';
    }
  };

  const getCognitiveLevelLabelLong = (level: CognitiveLevel) => {
    switch (level) {
      case 'nhan_biet': return 'Nhận biết';
      case 'thong_hieu': return 'Thông hiểu';
      case 'van_dung': return 'Vận dụng';
      case 'van_dung_cao': return 'Vận dụng cao';
      default: return 'Nhận biết';
    }
  };

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '13/06/2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '13/06/2026';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '13/06/2026';
    }
  };

  // Check if an option matches the correct answer
  const isCorrectOption = (opt: string, correctAnswer: any): boolean => {
    if (!correctAnswer) return false;
    
    const optStr = String(opt).trim();
    
    if (Array.isArray(correctAnswer)) {
      return correctAnswer.some(ans => isCorrectOption(opt, ans));
    }
    
    const ansStr = String(correctAnswer).trim();
    if (optStr === ansStr) return true;
    
    // Check if correct answer is "A" and option starts with "A." or "A)"
    if (optStr.startsWith(ansStr + '.') || optStr.startsWith(ansStr + ')')) return true;
    
    // Check if option starts with answer
    if (ansStr.startsWith(optStr)) return true;
    
    // Clean prefixes like "A. ", "B. " and compare
    const cleanOpt = optStr.replace(/^[A-Z]\.\s*/i, '').trim();
    const cleanAns = ansStr.replace(/^[A-Z]\.\s*/i, '').trim();
    if (cleanOpt && cleanAns && cleanOpt === cleanAns) return true;
    
    return false;
  };

  // Render question options / statements depending on type
  const renderOptions = () => {
    const { type, options, correctAnswer, statements } = question;

    if (type === 'single' || type === 'multiple') {
      if (!options || options.length === 0) {
        return <div className="text-slate-400 text-xs italic">Chưa xác định các phương án lựa chọn</div>;
      }
      return (
        <div className="space-y-3">
          {options.map((opt, idx) => {
            const isCorrect = isCorrectOption(opt, correctAnswer);
            return (
              <div
                key={idx}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  isCorrect
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50/50'
                }`}
              >
                <RichTextView html={opt} />
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'true_false') {
      if (statements && statements.length > 0) {
        return (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold text-slate-600 w-16 text-center">STT</th>
                  <th className="py-3 px-4 font-bold text-slate-600">Mệnh đề / Nội dung</th>
                  <th className="py-3 px-4 font-bold text-slate-600 w-32 text-center">Đáp án đúng</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((st, idx) => (
                  <tr key={st.id || idx} className="border-b border-slate-100 hover:bg-slate-50/40">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono font-medium">{idx + 1}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{st.content}</td>
                    <td className="py-3 px-4 text-center">
                      <Tag color={st.isCorrect ? 'emerald' : 'rose'} className="font-bold border px-3 py-0.5 rounded">
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
      
      // Fallback display if statements not defined but correctAnswer exists
      return (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-slate-500 font-bold block mb-1">Đáp án Đúng / Sai:</span>
          <span className="text-slate-800 font-semibold text-sm">{String(correctAnswer)}</span>
        </div>
      );
    }

    if (type === 'short') {
      return (
        <div className="p-4 bg-emerald-50/60 border border-emerald-300 rounded-xl flex items-start gap-2.5 shadow-xs">
          <CheckCircleOutlined className="text-emerald-600 text-lg mt-0.5" />
          <div>
            <span className="text-emerald-800/80 text-xs font-bold uppercase tracking-wider block mb-1">Đáp án trả lời ngắn</span>
            <span className="text-emerald-950 font-bold text-sm leading-relaxed">{String(correctAnswer || 'Chưa định nghĩa')}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <EyeOutlined className="text-[#002147] text-lg" />
          <span className="font-extrabold uppercase text-slate-800 text-[15px] tracking-wide">
            Chi tiết câu hỏi
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      centered
      width={780}
      styles={{
        header: {
          paddingBottom: '0px',
          marginBottom: '0px',
        },
        body: {
          padding: '20px 24px',
        },
      }}
      footer={
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button
            onClick={onClose}
            className="rounded border border-blue-600 text-blue-600 font-bold text-xs px-6 h-8 flex items-center justify-center hover:bg-blue-50 transition-all cursor-pointer"
            style={{ cursor: 'pointer' }}
          >
            Đóng
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Metadata section */}
        <div className="bg-[#f8fafc] border border-slate-100 p-4 rounded-xl">
          <Row gutter={[24, 12]}>
            <Col xs={24} sm={12}>
              <div className="space-y-2 text-xs">
                <div className="flex">
                  <span className="text-slate-500 font-bold w-24 flex-shrink-0">Mã câu hỏi:</span>
                  <span className="text-slate-800 font-semibold">{question.code}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-24 flex-shrink-0">Môn học:</span>
                  <span className="text-slate-800 font-semibold">{question.subject}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-24 flex-shrink-0">Cấp độ:</span>
                  <span className="text-slate-800 font-semibold">
                    {getCognitiveLevelLabelShort(question.level)} ({getCognitiveLevelLabelLong(question.level)})
                  </span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-24 flex-shrink-0">Người soạn:</span>
                  <span className="text-slate-800 font-semibold">{question.creator}</span>
                </div>
              </div>
            </Col>
            
            <Col xs={24} sm={12}>
              <div className="space-y-2 text-xs">
                <div className="flex">
                  <span className="text-slate-500 font-bold w-20 flex-shrink-0">Loại:</span>
                  <span className="text-slate-800 font-semibold">
                    {getQuestionTypeLabelShort(question.type)} ({getQuestionTypeLabelLong(question.type)})
                  </span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-20 flex-shrink-0">Khối lớp:</span>
                  <span className="text-slate-800 font-semibold">{question.grade}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-20 flex-shrink-0">Chủ đề:</span>
                  <span className="text-slate-800 font-semibold">{question.topicName || '.........................'}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 font-bold w-20 flex-shrink-0">Ngày tạo:</span>
                  <span className="text-slate-800 font-semibold">{formatDateString(question.createdAt)}</span>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        <Divider className="my-1 border-slate-100" />

        {/* Question Text */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">
            Nội dung câu hỏi
          </span>
          <RichTextView html={question.text} className="text-slate-800 font-bold text-sm leading-relaxed" />
        </div>

        {/* Options / Answers */}
        <div className="space-y-3 pt-2">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">
            {question.type === 'short' ? 'Đáp án' : 'Các phương án'}
          </span>
          {renderOptions()}
        </div>
      </div>
    </Modal>
  );
}
