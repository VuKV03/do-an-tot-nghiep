import React from 'react';
import { Card, Tag, Button, Space, Tooltip, Radio } from 'antd';
import { SwapOutlined, SearchOutlined, FileTextOutlined, EditOutlined } from '@ant-design/icons';
import { Question } from '../../../types';
import { RichTextView } from '../../../utils/htmlContent';

interface ExamContentDisplayProps {
  questions: any[];
  onReplaceQuestion?: (index: number, question: any) => void;
  onFindSimilar?: (index: number, question: any) => void;
  onEditQuestion?: (index: number, question: any) => void;
  allowEdit?: boolean;
  /** Chỉ số câu đang được "Sinh lại" (không giới hạn số lượt) — dùng để hiện loading và khoá tạm các nút khác. */
  regeneratingIndex?: number | null;
}

export default function ExamContentDisplay({
  questions = [],
  onReplaceQuestion,
  onFindSimilar,
  onEditQuestion,
  allowEdit = false,
  regeneratingIndex = null,
}: ExamContentDisplayProps) {
  const getLevelTag = (level: string) => {
    switch (level) {
      case 'nhan_biet':
      case 'easy':
        return <Tag color="blue" className="rounded-md font-bold text-[10px] uppercase border-transparent">Nhận biết</Tag>;
      case 'thong_hieu':
      case 'medium':
        return <Tag color="cyan" className="rounded-md font-bold text-[10px] uppercase border-transparent">Thông hiểu</Tag>;
      case 'van_dung':
      case 'hard':
        return <Tag color="orange" className="rounded-md font-bold text-[10px] uppercase border-transparent">Vận dụng</Tag>;
      case 'van_dung_cao':
        return <Tag color="red" className="rounded-md font-bold text-[10px] uppercase border-transparent">Vận dụng cao</Tag>;
      default:
        return <Tag color="default" className="rounded-md font-bold text-[10px] uppercase border-transparent">{level}</Tag>;
    }
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2" id="exam-questions-content-display">
      {questions.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-slate-50 border border-dashed rounded-lg">
          <FileTextOutlined className="text-3xl mb-2 text-slate-350" />
          <p className="text-xs">Không có câu hỏi nào trong đề thi này.</p>
        </div>
      ) : (
        questions.map((q, idx) => {
          const isRegenerating = regeneratingIndex === idx;
          const isBusyWithAnother = regeneratingIndex !== null && regeneratingIndex !== idx;

          // Check if group question GRP (has sub-questions) or regular question
          const isGroup = q.type === 'GRP' || q.isGroup || Array.isArray(q.subQuestions);

          return (
            <Card
              key={q.id || idx}
              size="small"
              className="border-slate-200 hover:border-slate-300 transition-all rounded-lg shadow-xxs hover:shadow-xs"
              title={
                <div className="flex justify-between items-center w-full py-1">
                  <span className="font-semibold text-slate-800 text-xs uppercase tracking-wide">
                    Câu {idx + 1} {isGroup && <Tag color="purple" className="rounded ml-1 text-[9px] uppercase border-transparent">CÂU HỎI NHÓM</Tag>}
                  </span>
                  <Space size={8}>
                    {getLevelTag(q.level)}
                  </Space>
                </div>
              }
              extra={
                allowEdit && !isGroup && (
                  <Space size={6}>
                    {onEditQuestion && (
                      <Tooltip title="Sửa nội dung câu hỏi này">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => onEditQuestion(idx, q)}
                          className="text-[10px] font-semibold rounded border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100"
                        >
                          Sửa
                        </Button>
                      </Tooltip>
                    )}
                    {onReplaceQuestion && (
                      <Tooltip title="Sinh lại câu này">
                        <Button
                          size="small"
                          icon={<SwapOutlined />}
                          loading={isRegenerating}
                          disabled={isBusyWithAnother}
                          onClick={() => onReplaceQuestion(idx, q)}
                          className="text-[10px] font-semibold rounded border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                        >
                          Sinh lại
                        </Button>
                      </Tooltip>
                    )}
                    {onFindSimilar && (
                      <Tooltip title="Xem danh sách câu hỏi tương đương từ ngân hàng">
                        <Button
                          size="small"
                          icon={<SearchOutlined />}
                          onClick={() => onFindSimilar(idx, q)}
                          className="text-[10px] font-semibold rounded border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100"
                        >
                          Tìm tương đồng
                        </Button>
                      </Tooltip>
                    )}
                  </Space>
                )
              }
            >
              <div className="space-y-3 text-xs text-slate-700">
                {/* Main Question Text */}
                <RichTextView html={q.text} className="font-semibold text-slate-850" />

                {/* Sub Questions for GRP type */}
                {isGroup && Array.isArray(q.subQuestions) && (
                  <div className="pl-4 border-l-2 border-slate-100 space-y-4 mt-2">
                    {q.subQuestions.map((subQ: any, subIdx: number) => (
                      <div key={subQ.id || subIdx} className="space-y-2">
                        <div className="font-medium text-slate-800">
                          {idx + 1}.{subIdx + 1}: {subQ.text}
                        </div>
                        {Array.isArray(subQ.options) && subQ.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 pl-2 text-slate-500">
                            {subQ.options.map((opt: string, optIdx: number) => {
                              const label = String.fromCharCode(65 + optIdx);
                              const isCorrect = subQ.correctAnswer === label;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-1.5 rounded border ${isCorrect
                                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800 font-semibold'
                                    : 'border-transparent'
                                    }`}
                                >
                                  {label}. {opt}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Đáp án đúng: <span className="text-emerald-600 font-bold">{subQ.correctAnswer}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Options for single question */}
                {!isGroup && Array.isArray(q.options) && q.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pl-2 text-slate-500 font-medium">
                    {q.options.map((opt: string, optIdx: number) => {
                      const label = String.fromCharCode(65 + optIdx);
                      // correctAnswer thường lưu nguyên văn nội dung đáp án đúng (xem manual-create.tsx),
                      // không phải chữ cái A/B/C/D — vẫn so thêm với `label` để tương thích dữ liệu cũ nếu có.
                      const isCorrect = q.correctAnswer === opt || q.correctAnswer === label;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2 rounded border transition-all ${isCorrect
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold shadow-xxs'
                            : 'bg-slate-50/40 border-slate-100 hover:border-slate-200 text-slate-600'
                            }`}
                        >
                          {label}. {opt}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer details */}
                {!isGroup && (
                  <div className="pt-2 border-t border-dashed border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Hình thức: Trắc nghiệm khách quan</span>
                    <span>
                      Đáp án chính xác:{' '}
                      <Tag color="emerald" className="font-bold border-transparent m-0 py-0.5 px-1.5 rounded text-[10px]">
                        {q.correctAnswer}
                      </Tag>
                    </span>
                  </div>
                )}

              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
