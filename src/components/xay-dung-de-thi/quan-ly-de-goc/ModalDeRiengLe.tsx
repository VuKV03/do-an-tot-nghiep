import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Select, Input, Popconfirm, Tooltip, Empty } from 'antd';
import { toast } from '../../../utils/toast';
import { SwapOutlined, DeleteOutlined, SaveOutlined, PlusOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { Question } from '../../../types';
import { RichTextView } from '../../../utils/htmlContent';
import { SUBJECTS as INITIAL_SUBJECTS } from '../../../data';
import { subjectCategoryApi, bankQuestionApi } from '../../../services/danhMucApi';
import ModalChonCauHoi from './ModalChonCauHoi';

interface ModalDeRiengLeProps {
  open: boolean;
  exam: any;
  onCancel: () => void;
  onSuccess: () => void;
  typeEditGoc?: number;
  typeAdd?: boolean;
}

/** Cấu trúc 1 Phần trong đề thi */
interface ExamPart {
  id: string;
  questionType: string;
  questions: Question[];
  collapsed: boolean;
}

/** Phần mặc định theo cấu trúc đề thi THPT Quốc gia (không còn "label" tĩnh — xem getPartLabel,
 * số câu "từ ... đến ..." phải lấy đúng số câu thực tế đã chọn, không fix cứng 24/4). */
const DEFAULT_PARTS: Omit<ExamPart, 'questions' | 'collapsed'>[] = [
  { id: 'phan-1', questionType: 'single' },
  { id: 'phan-2', questionType: 'true_false' },
  { id: 'phan-3', questionType: 'short' },
];

const PART_ROMAN: Record<string, string> = { 'phan-1': 'I', 'phan-2': 'II', 'phan-3': 'III' };

// Mô tả cách làm bài theo từng loại câu hỏi — khớp đúng nội dung ExamPortal.tsx đang hiển thị cho
// thí sinh lúc thi thật, để đề xem trước ở đây và đề thi thật hiển thị nhất quán.
const PART_DESC: Record<string, string> = {
  single: 'Mỗi câu hỏi thí sinh chỉ chọn một phương án.',
  true_false: 'Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.',
  short: 'Thí sinh trả lời bằng cách nhập đáp án vào ô trống.',
};

/** Tiêu đề 1 Phần, tính động theo SỐ CÂU THẬT đã chọn — số thứ tự câu tính liên tục qua các phần
 * theo đúng thứ tự Phần I → II → III (không lặp lại "câu 1" ở mỗi phần), khớp cách đánh số thật của
 * đề thi (xem getQuestionGlobalIndex ở ExamPortal.tsx). */
const getPartLabel = (parts: ExamPart[], partId: string): string => {
  const part = parts.find(p => p.id === partId);
  if (!part) return '';
  const roman = PART_ROMAN[partId] || '';
  if (part.questions.length === 0) {
    return `Phần ${roman}: Chưa có câu hỏi nào.`;
  }
  let startIdx = 0;
  for (const p of parts) {
    if (p.id === partId) break;
    startIdx += p.questions.length;
  }
  const from = startIdx + 1;
  const to = startIdx + part.questions.length;
  const desc = PART_DESC[part.questionType] || '';
  return `Phần ${roman}: Thí sinh trả lời từ câu ${from} đến câu ${to}. ${desc}`;
};

const getTypeLabel = (t: string) => {
  switch (t) {
    case 'single': return 'Trắc nghiệm';
    case 'true_false': return 'Đúng/Sai';
    case 'short': return 'Trả lời ngắn';
    default: return t;
  }
};

export default function ModalDeRiengLe({
  open, exam, onCancel, onSuccess, typeAdd = false,
}: ModalDeRiengLeProps) {
  const [selectedSubject, setSelectedSubject] = useState('Toán học');
  const [examTitle, setExamTitle] = useState('');
  const [parts, setParts] = useState<ExamPart[]>([]);
  const [loading, setLoading] = useState(false);

  // Sub-modal: Chọn câu hỏi
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Sub-modal: Thay thế câu hỏi (single-select)
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ partId: string; questionIdx: number; question: Question } | null>(null);

  // Sidebar: phần đang chọn
  const [activePart, setActivePart] = useState<string | null>(null);

  // Dynamic Subjects
  const [subjects, setSubjects] = useState<{ value: string, label: string }[]>(INITIAL_SUBJECTS);

  // Question Pool from API
  const [questionPool, setQuestionPool] = useState<Question[]>([]);

  // Load questions pool from API when open changes
  useEffect(() => {
    if (!open) return;

    const loadQuestionPool = async () => {
      try {
        const res = await bankQuestionApi.list();
        if (res.success && res.data) {
          setQuestionPool(res.data.map((q): Question => ({
            id: q.id,
            code: q.code,
            text: q.text,
            type: q.type,
            level: q.level,
            status: q.status,
            subject: q.subject,
            grade: q.grade,
            topicId: q.topicId || '',
            topicName: q.topicName || 'Chưa phân loại',
            subTopicName: q.subTopicName || '',
            options: q.options,
            correctAnswer: q.correctAnswer,
            creator: q.creator,
            createdAt: q.createdAt,
          })));
        }
      } catch (err) {
        console.error('Failed to load question pool:', err);
      }
    };

    loadQuestionPool();
  }, [open]);

  // Khởi tạo khi mở modal
  useEffect(() => {
    if (!open) return;

    const fetchSubjects = async () => {
      try {
        const res = await subjectCategoryApi.list();
        if (res.success && res.data) {
          setSubjects(res.data.map((item: any) => ({ value: item.name, label: item.name })));
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      }
    };
    fetchSubjects();

    if (typeAdd || !exam) {
      // Tạo mới
      setParts(DEFAULT_PARTS.map(p => ({ ...p, questions: [], collapsed: false })));
      setExamTitle('');
      setSelectedSubject('Toán học');
      setActivePart(null);
    } else {
      // Chỉnh sửa: phân phối câu hỏi vào các phần
      setExamTitle(exam.name || '');
      setSelectedSubject(exam.subject || 'Toán học');
      const existingQuestions: Question[] = exam.questions || [];
      setParts(DEFAULT_PARTS.map(p => ({
        ...p,
        questions: existingQuestions.filter((q: any) => {
          if (p.questionType === 'single') return q.type === 'single' || q.type === 'multiple';
          return q.type === p.questionType;
        }),
        collapsed: false,
      })));
      setActivePart(null);
    }
  }, [open, exam, typeAdd]);

  // Tổng câu hỏi
  const totalQuestions = useMemo(() => parts.reduce((sum, p) => sum + p.questions.length, 0), [parts]);

  // IDs đã có trong đề
  const existingIds = useMemo(() => parts.flatMap(p => p.questions.map(q => q.id)), [parts]);

  // Toggle collapse phần
  const togglePartCollapse = (partId: string) => {
    setParts(prev => prev.map(p => p.id === partId ? { ...p, collapsed: !p.collapsed } : p));
  };

  // Xử lý khi chọn câu hỏi từ NHCH (multi-select)
  const handleQuestionsSelected = (selected: Question[]) => {
    setParts(prev => {
      const updated = [...prev];
      selected.forEach(q => {
        // Tìm phần phù hợp theo loại câu hỏi
        let targetPart = updated.find(p => p.questionType === q.type);
        if (!targetPart) targetPart = updated.find(p => p.questionType === 'single');
        if (targetPart && !targetPart.questions.some(eq => eq.id === q.id)) {
          targetPart.questions = [...targetPart.questions, q];
        }
      });
      return updated;
    });
    setIsPickerOpen(false);
    toast.success(`Đã thêm ${selected.length} câu hỏi vào đề thi.`);
  };

  // Xoá 1 câu hỏi
  const handleDeleteQuestion = (partId: string, qIdx: number) => {
    setParts(prev => prev.map(p =>
      p.id === partId ? { ...p, questions: p.questions.filter((_, i) => i !== qIdx) } : p
    ));
    toast.success('Đã xóa câu hỏi khỏi đề.');
  };

  // Mở modal thay thế
  const handleOpenSwap = (partId: string, qIdx: number, question: Question) => {
    setSwapTarget({ partId, questionIdx: qIdx, question });
    setIsSwapOpen(true);
  };

  // Xử lý thay thế câu hỏi
  const handleSwapSelected = (selected: Question[]) => {
    if (!swapTarget || selected.length === 0) return;
    const newQ = selected[0];
    setParts(prev => prev.map(p =>
      p.id === swapTarget.partId
        ? { ...p, questions: p.questions.map((q, i) => i === swapTarget.questionIdx ? newQ : q) }
        : p
    ));
    setIsSwapOpen(false);
    setSwapTarget(null);
    toast.success('Đã thay thế câu hỏi thành công.');
  };

  // Lưu đề thi
  const handleSave = async () => {
    if (!examTitle.trim()) {
      toast.error('Vui lòng nhập tên đề thi!');
      return;
    }
    if (totalQuestions === 0) {
      toast.error('Đề thi phải có ít nhất 1 câu hỏi!');
      return;
    }

    setLoading(true);
    try {
      const allQuestions = parts.flatMap(p => p.questions);
      const payload = {
        name: examTitle,
        subject: selectedSubject,
        grade: 'Khối 12',
        duration: 90,
        source: 'manual',
        // Câu hỏi chọn từ Ngân hàng câu hỏi đã tồn tại sẵn — chỉ cần gắn exam_id, không tạo lại.
        questionIds: allQuestions.map(q => q.id),
      };

      const url = typeAdd || !exam ? 'http://localhost:8001/exams/' : `http://localhost:8001/exams/${exam.id}`;
      const method = typeAdd || !exam ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (json.success) {
        toast.success(typeAdd ? 'Đã tạo đề thi thủ công thành công!' : 'Đã lưu thay đổi đề thi.');
        onSuccess();
      } else {
        toast.error(json.message || json.error || 'Lỗi khi lưu đề.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ khi lưu đề.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="border-b pb-2 flex items-center gap-1.5">
          <span className="font-bold text-sm text-[#1a3c8b]">
            {typeAdd ? 'Thêm mới đề thi riêng lẻ' : `Chỉnh sửa đề thi: ${exam?.name || ''}`}
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} className="rounded font-semibold text-xs">Đóng</Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}
          className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]">
          Lưu
        </Button>,
      ]}
      centered
      width="95vw"
      styles={{ body: { padding: 0, height: 'calc(95vh - 110px)', overflow: 'hidden' } }}
      destroyOnHidden
    >
      <div className="flex" style={{ height: '100%' }}>
        {/* ======= SIDEBAR TRÁI ======= */}
        <div className="shrink-0 border-r border-slate-200 bg-white p-4 flex flex-col" style={{ width: 230 }}>
          {/* Môn học */}
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Môn học</label>
            <Select
              value={selectedSubject}
              onChange={v => { setSelectedSubject(v); setParts(DEFAULT_PARTS.map(p => ({ ...p, questions: [], collapsed: false }))); }}
              className="w-full text-xs"
              disabled={!typeAdd}
              options={subjects}
            />
          </div>

          {/* Nút chọn câu hỏi */}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsPickerOpen(true)}
            className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs mb-3 w-full hover:bg-[#243590]">
            Chọn câu hỏi
          </Button>

          {/* Danh sách câu hỏi theo phần */}
          <div className="text-[11px] font-bold text-slate-700 mb-2">Danh sách câu hỏi</div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {parts.map(part => (
              <div key={part.id}>
                {/* Part header */}
                <div
                  className={`flex items-start gap-1.5 p-2 rounded cursor-pointer transition-colors text-[10px] font-bold leading-tight
                    ${activePart === part.id ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/60'}`}
                  onClick={() => { setActivePart(part.id); togglePartCollapse(part.id); }}
                >
                  <span className="flex-1 line-clamp-3">{getPartLabel(parts, part.id)}</span>
                  <span className="shrink-0 mt-0.5">
                    {part.collapsed ? <DownOutlined className="text-[8px]" /> : <UpOutlined className="text-[8px]" />}
                  </span>
                </div>
                {/* Sub-items (câu hỏi) */}
                {!part.collapsed && part.questions.length > 0 && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {part.questions.map((_, qIdx) => (
                      <div key={qIdx}
                        className="text-[10px] text-slate-500 font-medium py-0.5 px-2 rounded hover:bg-slate-100 cursor-default">
                        Câu {qIdx + 1}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tổng kết */}
          <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-bold">
            Tổng số: <span className="text-slate-800">{totalQuestions} câu hỏi</span>
          </div>
        </div>

        {/* ======= NỘI DUNG PHẢI ======= */}
        <div className="flex-1 min-w-0 overflow-y-auto p-5">
          {/* Tab header */}
          <div className="mb-4">
            <span className="inline-block bg-[#2c3e9e] text-white text-[11px] font-bold px-4 py-1.5 rounded-t">
              Đề gốc
            </span>
            <div className="border-b-2 border-[#2c3e9e]" />
          </div>

          {/* Tên đề */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Tên đề <span className="text-red-500">*</span>
            </label>
            <Input
              value={examTitle}
              onChange={e => setExamTitle(e.target.value)}
              placeholder="Nhập"
              className="text-xs border-slate-300 rounded"
            />
          </div>

          {/* Preview câu hỏi theo phần */}
          <div className="space-y-6">
            {parts.map(part => (
              <div key={part.id}>
                {/* Phần header */}
                <div className="text-xs font-bold text-slate-700 mb-3 leading-relaxed">
                  {getPartLabel(parts, part.id)}
                </div>

                {part.questions.length === 0 ? (
                  <div className="text-[11px] text-slate-400 italic ml-4 mb-2">
                    Chưa có câu hỏi. Nhấn "Chọn câu hỏi" để thêm.
                  </div>
                ) : (
                  <div className="space-y-3 ml-1">
                    {part.questions.map((q, qIdx) => (
                      <div key={q.id || qIdx} className="group">
                        <div className="text-[11px] font-bold text-slate-600 mb-1">Câu {qIdx + 1}:</div>
                        <div className="flex items-start gap-2">
                          {/* Nội dung câu hỏi */}
                          <div className="flex-1 bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700 font-medium leading-relaxed">
                            <RichTextView html={q.text} />
                            {/* Đáp án nếu trắc nghiệm */}
                            {Array.isArray(q.options) && q.options.length > 0 && (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px]">
                                {q.options.map((opt: string, oIdx: number) => (
                                  <div key={oIdx} className="flex gap-1">
                                    <strong className="shrink-0">{String.fromCharCode(65 + oIdx)}.</strong>
                                    <RichTextView html={opt.replace(/^[A-D]\.\s*/, '')} className="inline" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action icons */}
                          <div className="flex flex-col gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Tooltip title="Đảo câu hỏi tương đương">
                              <Button size="small" type="text"
                                icon={<SwapOutlined className="text-[#2c3e9e]" />}
                                onClick={() => handleOpenSwap(part.id, qIdx, q)}
                                className="cursor-pointer"
                              />
                            </Tooltip>
                            <Popconfirm
                              title="Xóa câu hỏi này khỏi đề?"
                              onConfirm={() => handleDeleteQuestion(part.id, qIdx)}
                              okText="Xóa" cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                            >
                              <Tooltip title="Xóa câu hỏi">
                                <Button size="small" type="text" danger
                                  icon={<DeleteOutlined />}
                                  className="cursor-pointer"
                                />
                              </Tooltip>
                            </Popconfirm>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {totalQuestions === 0 && (
              <Empty description="Chưa có câu hỏi nào trong đề thi" className="py-8" />
            )}
          </div>
        </div>
      </div>

      {/* ======= SUB-MODALS ======= */}

      {/* UC46.3: Chọn câu hỏi từ NHCH (multi-select) */}
      <ModalChonCauHoi
        open={isPickerOpen}
        subject={selectedSubject}
        onCancel={() => setIsPickerOpen(false)}
        onSelect={handleQuestionsSelected}
        mode="multi"
        excludeIds={existingIds}
        questionPool={questionPool}
      />

      {/* ======= SUB-MODALS ======= */}

      {/* UC46.4: Thay thế câu hỏi tương đương (single-select) */}
      {swapTarget && (
        <ModalChonCauHoi
          open={isSwapOpen}
          subject={selectedSubject}
          onCancel={() => { setIsSwapOpen(false); setSwapTarget(null); }}
          onSelect={handleSwapSelected}
          mode="single"
          excludeIds={existingIds}
          filterType={swapTarget.question.type}
          filterLevel={swapTarget.question.level}
          title="Chọn câu hỏi thay thế"
          questionPool={questionPool}
        />
      )}
    </Modal>
  );
}
