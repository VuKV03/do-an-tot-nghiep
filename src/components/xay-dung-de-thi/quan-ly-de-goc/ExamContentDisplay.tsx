import React from 'react';
import { Card, Tag, Button, Space, Tooltip, Radio } from 'antd';
import { SwapOutlined, SearchOutlined, FileTextOutlined, EditOutlined } from '@ant-design/icons';
import { Question } from '../../../types';
import { RichTextView } from '../../../utils/htmlContent';
import { PART_META } from '../../../utils/examParts';

interface ExamContentDisplayProps {
  questions: any[];
  onReplaceQuestion?: (index: number, question: any) => void;
  onFindSimilar?: (index: number, question: any) => void;
  onEditQuestion?: (index: number, question: any) => void;
  allowEdit?: boolean;
  /** Chỉ số câu đang được "Sinh lại" (không giới hạn số lượt) — dùng để hiện loading và khoá tạm các nút khác. */
  regeneratingIndex?: number | null;
}

function ExamContentDisplay({
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

  // idx = vị trí THẬT trong mảng `questions` gốc (bắt buộc giữ nguyên để onEditQuestion/
  // onReplaceQuestion/regeneratingIndex trỏ đúng phần tử) — displayNumber = số thứ tự "Câu N" hiển
  // thị, đánh số lại từ 1 trong PHẠM VI của từng Phần, không dùng idx trực tiếp để hiển thị.
  const renderQuestionCard = (q: any, idx: number, displayNumber: number) => {
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
                    Câu {displayNumber} {isGroup && <Tag color="purple" className="rounded ml-1 text-[9px] uppercase border-transparent">CÂU HỎI NHÓM</Tag>}
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
                        <div className="font-medium text-slate-800 flex gap-1">
                          <span className="shrink-0">{displayNumber}.{subIdx + 1}:</span>
                          <RichTextView html={subQ.text} />
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
                                  <span className="shrink-0">{label}.</span> <RichTextView html={opt} className="inline" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex gap-1">
                          <span className="shrink-0">Đáp án đúng:</span>
                          <RichTextView html={String(subQ.correctAnswer ?? '')} className="text-emerald-600 font-bold inline" />
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
                          <span className="shrink-0">{label}.</span> <RichTextView html={opt} className="inline" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer details */}
                {!isGroup && (
                  <div className="pt-2 border-t border-dashed border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Hình thức: Trắc nghiệm khách quan</span>
                    <span className="flex items-center gap-1">
                      Đáp án chính xác:
                      <Tag color="emerald" className="font-bold border-transparent m-0 py-0.5 px-1.5 rounded text-[10px]">
                        <RichTextView html={String(q.correctAnswer ?? '')} className="inline" />
                      </Tag>
                    </span>
                  </div>
                )}

              </div>
            </Card>
    );
  };

  // Gom theo idx GỐC (giữ nguyên để callback trỏ đúng phần tử), nhóm theo Phần I/II/III; loại nào
  // không khớp 3 loại AI hỗ trợ (vd 'multiple' — câu hỏi nhóm) dồn vào 1 mục phụ ở cuối, không mất.
  const withIndex = questions.map((q, idx) => ({ q, idx }));
  const groups = PART_META.map(part => ({
    header: part.header,
    // "N" trong hướng dẫn gốc là placeholder — thay bằng đúng số câu THẬT của Phần này.
    instruction: part.instruction.replace('N', String(withIndex.filter(({ q }) => q.type === part.type).length)),
    items: withIndex.filter(({ q }) => q.type === part.type),
  })).filter(g => g.items.length > 0);
  const knownTypes = new Set(PART_META.map(p => p.type));
  const otherItems = withIndex.filter(({ q }) => !knownTypes.has(q.type));
  if (otherItems.length > 0) groups.push({ header: 'Câu hỏi khác', instruction: '', items: otherItems });

  return (
    <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2" id="exam-questions-content-display">
      {questions.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-slate-50 border border-dashed rounded-lg">
          <FileTextOutlined className="text-3xl mb-2 text-slate-350" />
          <p className="text-xs">Không có câu hỏi nào trong đề thi này.</p>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.header}>
            <div className="mb-2 pb-1 border-b border-slate-200">
              <div className="text-xs font-bold text-[#1a3c8b] uppercase tracking-wide">
                {group.header}
              </div>
              {group.instruction && (
                <div className="text-[11px] text-slate-500 italic mt-0.5">{group.instruction}</div>
              )}
            </div>
            <div className="space-y-4">
              {group.items.map(({ q, idx }, localIdx) => renderQuestionCard(q, idx, localIdx + 1))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Danh sách câu hỏi có thể khá dài (nhiều câu + công thức toán render qua KaTeX, tốn công render) —
// component cha thường có thêm state khác không liên quan (vd ô nhập "Tên đề thi" ở ModalTaoDeTuDong.tsx)
// khiến parent re-render liên tục khi gõ phím. Không memo thì MỖI phím gõ đều render lại TOÀN BỘ danh
// sách câu hỏi dù nội dung không đổi — đây chính là nguyên nhân gõ vào ô Tên đề thi/Mã đề bị lag/delay.
// So sánh CHỈ questions/regeneratingIndex/allowEdit (bỏ qua danh tính hàm callback, vốn bị tạo mới mỗi
// lần render dù logic bên trong không đổi) — an toàn vì bất cứ khi nào dữ liệu callback cần đọc thực sự
// đổi (câu hỏi, đang sinh lại câu nào,...) thì `questions`/`regeneratingIndex` cũng đổi theo, tự kích
// render lại với callback mới nhất.
export default React.memo(ExamContentDisplay, (prev, next) =>
  prev.questions === next.questions &&
  prev.regeneratingIndex === next.regeneratingIndex &&
  prev.allowEdit === next.allowEdit
);
