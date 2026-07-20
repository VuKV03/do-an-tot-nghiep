import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Select, Button, Tag, Spin, message, Tooltip, Input, Checkbox, Radio } from 'antd';
import { ThunderboltOutlined, CheckCircleOutlined, LoadingOutlined, EditOutlined } from '@ant-design/icons';
import { Question, QuestionType, CognitiveLevel, TopicNode, TrueFalseStatement } from '../../../../types';
import {
  questionApi,
  subjectCategoryApi,
  competencyComponentApi,
  questionTypeApi,
  type QuestionTypeAPI,
} from '../../../../services/danhMucApi.ts';
import RichTextEditor from '../../../RichTextEditor';
import { RichTextView } from '../../../../utils/htmlContent';

export interface AIGenerateQuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (q: Question) => void;
  /** Môn học mặc định lấy theo ngữ cảnh đang xem ở tab Ngân hàng câu hỏi */
  defaultSubject?: string;
  /** Khối lớp mặc định lấy theo ngữ cảnh đang xem ở tab Ngân hàng câu hỏi */
  defaultGrade?: string;
  /** Danh sách môn học (name/label) để đổ vào dropdown Môn */
  subjectOptions: { value: string; label: string }[];
  /** Danh sách khối lớp (name/label) để đổ vào dropdown Lớp */
  gradeOptions: { value: string; label: string }[];
  /** Toàn bộ chủ đề thô lấy từ API (chưa lọc theo môn/lớp) */
  allTopicsRaw: any[];
}

/** Loại hình câu hỏi mà AI service hiện sinh được (khớp backend/ai_service/routes/generate.py) */
const AI_SUPPORTED_TYPES: QuestionType[] = ['single', 'true_false', 'short'];

/** Map một bản ghi thật trong danh mục "Loại hình câu hỏi" (question_types) về QuestionType nội bộ */
function resolveInternalQuestionType(item: QuestionTypeAPI): QuestionType {
  const code = (item.code || '').toUpperCase().trim();
  const name = (item.name || '').toLowerCase();

  if (['SINGLE', 'TN'].includes(code) || name.includes('một đáp án') || name.includes('mot dap an')) {
    return 'single';
  }
  if (['MULTI', 'MULTIPLE', 'CHN'].includes(code) || name.includes('nhiều đáp án') || name.includes('nhom') || name.includes('nhóm')) {
    return 'multiple';
  }
  if (['TRUEFALSE'].includes(code) || (name.includes('đúng') && name.includes('sai'))) {
    return 'true_false';
  }
  if (['SHORT', 'ESSAY', 'TLN'].includes(code) || name.includes('ngắn') || name.includes('ngan') || name.includes('tự luận') || name.includes('tu luan')) {
    return 'short';
  }
  return 'single';
}

const LEVEL_OPTIONS: { value: CognitiveLevel; label: string }[] = [
  { value: 'nhan_biet', label: 'Nhận biết' },
  { value: 'thong_hieu', label: 'Thông hiểu' },
  { value: 'van_dung', label: 'Vận dụng' },
  { value: 'van_dung_cao', label: 'Vận dụng cao' },
];

/** Tỉ lệ độ khó gửi cho AI service theo cấp độ tư duy người dùng chọn */
const LEVEL_TO_PERCENT: Record<CognitiveLevel, { easyPercent: number; mediumPercent: number; hardPercent: number }> = {
  nhan_biet: { easyPercent: 100, mediumPercent: 0, hardPercent: 0 },
  thong_hieu: { easyPercent: 0, mediumPercent: 100, hardPercent: 0 },
  van_dung: { easyPercent: 0, mediumPercent: 0, hardPercent: 100 },
  van_dung_cao: { easyPercent: 0, mediumPercent: 0, hardPercent: 100 },
};

/** Xây cây chủ đề (chỉ chủ đề đã duyệt) lọc theo môn học + khối lớp đang chọn trong modal */
function buildTopicTree(allTopicsRaw: any[], subjectName: string, gradeName: string): TopicNode[] {
  const filtered = allTopicsRaw.filter((t: any) => {
    const matchSubject = !subjectName || t.subject_name === subjectName;
    const matchGrade = !gradeName || t.grade_name === gradeName;
    return matchSubject && matchGrade;
  });
  const approved = filtered.filter((t: any) => t.status === 2);

  const map: { [id: string]: any } = {};
  const roots: any[] = [];
  approved.forEach((t: any) => {
    map[t.id] = { key: t.id, title: t.name, children: [] };
  });
  approved.forEach((t: any) => {
    const node = map[t.id];
    if (t.parent_id && map[t.parent_id]) {
      map[t.parent_id].children.push(node);
    } else {
      roots.push(node);
    }
  });
  const clean = (nodes: any[]) => {
    nodes.forEach((n) => {
      if (n.children && n.children.length === 0) delete n.children;
      else if (n.children) clean(n.children);
    });
  };
  clean(roots);
  return roots;
}

export default function AIGenerateQuestionModal({
  open,
  onClose,
  onSave,
  defaultSubject,
  defaultGrade,
  subjectOptions,
  gradeOptions,
  allTopicsRaw,
}: AIGenerateQuestionModalProps) {
  const [form] = Form.useForm();

  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(null);

  const [competencyOptions, setCompetencyOptions] = useState<{ value: string; label: string }[]>([]);
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeAPI[]>([]);

  const [aiGenerating, setAiGenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [aiSuggestedQuestion, setAiSuggestedQuestion] = useState<Question | null>(null);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

  const topicTreeData = useMemo(
    () => buildTopicTree(allTopicsRaw, selectedSubject, selectedGrade),
    [allTopicsRaw, selectedSubject, selectedGrade],
  );

  const subTopicOptions = useMemo(() => {
    const parent = topicTreeData.find((t) => t.key === selectedTopicKey);
    return parent?.children?.map((c) => ({ value: c.key as string, label: c.title as string })) ?? [];
  }, [topicTreeData, selectedTopicKey]);

  /** Options thật cho "Loại hình câu hỏi", lấy từ danh mục question_types — chỉ khoá loại chưa hỗ trợ AI */
  const questionTypeOptions = useMemo(
    () =>
      questionTypes.map((qt) => {
        const internal = resolveInternalQuestionType(qt);
        const disabled = !AI_SUPPORTED_TYPES.includes(internal);
        return {
          value: qt.id,
          disabled,
          label: disabled ? (
            <Tooltip title="Câu hỏi nhóm có nhiều câu hỏi con lồng nhau, hệ thống chưa hỗ trợ lưu cấu trúc này qua AI">
              {qt.name} (chưa hỗ trợ AI)
            </Tooltip>
          ) : (
            qt.name
          ),
        };
      }),
    [questionTypes],
  );

  // Reset form và tải lại "Thành phần năng lực" mỗi khi mở modal hoặc đổi môn học
  useEffect(() => {
    if (!open) return;
    const subj = defaultSubject || '';
    const grd = defaultGrade || '';
    setSelectedSubject(subj);
    setSelectedGrade(grd);
    setSelectedTopicKey(null);
    setAiSuggestedQuestion(null);
    form.resetFields();
    form.setFieldsValue({
      subject: subj || undefined,
      grade: grd || undefined,
      level: 'nhan_biet',
    });
  }, [open, defaultSubject, defaultGrade, form]);

  // Tải danh mục "Loại hình câu hỏi" thật từ /question-types/ mỗi khi mở modal
  useEffect(() => {
    if (!open) return;
    async function loadQuestionTypes() {
      try {
        const res = await questionTypeApi.list();
        setQuestionTypes(res.data);
        const defaultType = res.data.find((qt) => resolveInternalQuestionType(qt) === 'single');
        if (defaultType) {
          form.setFieldsValue({ type: defaultType.id });
        }
      } catch (err) {
        console.error('Không thể tải danh mục loại hình câu hỏi', err);
        setQuestionTypes([]);
      }
    }
    loadQuestionTypes();
  }, [open, form]);

  useEffect(() => {
    async function loadCompetencyOptions() {
      try {
        const subRes = await subjectCategoryApi.list();
        const foundSub = subRes.data.find((s) => s.name === selectedSubject);
        const compRes = await competencyComponentApi.list(
          foundSub ? { subject_id: foundSub.id } : undefined,
        );
        setCompetencyOptions(
          compRes.data.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name })),
        );
      } catch (err) {
        console.error('Không thể tải danh sách thành phần năng lực', err);
        setCompetencyOptions([]);
      }
    }
    if (open && selectedSubject) {
      loadCompetencyOptions();
    } else {
      setCompetencyOptions([]);
    }
  }, [open, selectedSubject]);

  const handleClose = () => {
    onClose();
    form.resetFields();
    setAiSuggestedQuestion(null);
    setIsEditingPreview(false);
    setSelectedTopicKey(null);
  };

  const startEditingPreview = () => {
    if (!aiSuggestedQuestion) return;
    if (aiSuggestedQuestion.type === 'single') {
      const idx = (aiSuggestedQuestion.options || []).findIndex((o) => o === aiSuggestedQuestion.correctAnswer);
      setCorrectOptionIndex(idx >= 0 ? idx : 0);
    }
    setIsEditingPreview(true);
  };

  const updateSuggestedText = (text: string) =>
    setAiSuggestedQuestion((prev) => (prev ? { ...prev, text } : prev));

  const updateSuggestedOption = (idx: number, value: string) =>
    setAiSuggestedQuestion((prev) => {
      if (!prev) return prev;
      const options = (prev.options || []).map((o, i) => (i === idx ? value : o));
      const correctAnswer = idx === correctOptionIndex ? value : prev.correctAnswer;
      return { ...prev, options, correctAnswer };
    });

  const setSuggestedCorrectOption = (idx: number) => {
    setCorrectOptionIndex(idx);
    setAiSuggestedQuestion((prev) => (prev ? { ...prev, correctAnswer: prev.options?.[idx] || '' } : prev));
  };

  const updateSuggestedStatementContent = (idx: number, content: string) =>
    setAiSuggestedQuestion((prev) => {
      if (!prev || !prev.statements) return prev;
      const statements = prev.statements.map((st, i) => (i === idx ? { ...st, content } : st));
      return {
        ...prev,
        statements,
        options: statements.map((s) => s.content),
        correctAnswer: statements.map((s) => `${s.id}. ${s.isCorrect ? 'Đúng' : 'Sai'}`).join(', '),
      };
    });

  const toggleSuggestedStatementCorrect = (idx: number, isCorrect: boolean) =>
    setAiSuggestedQuestion((prev) => {
      if (!prev || !prev.statements) return prev;
      const statements = prev.statements.map((st, i) => (i === idx ? { ...st, isCorrect } : st));
      return {
        ...prev,
        statements,
        correctAnswer: statements.map((s) => `${s.id}. ${s.isCorrect ? 'Đúng' : 'Sai'}`).join(', '),
      };
    });

  const updateSuggestedShortAnswer = (value: string) =>
    setAiSuggestedQuestion((prev) => (prev ? { ...prev, correctAnswer: value } : prev));

  const triggerAIQuestionGeneration = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const parentNode = topicTreeData.find((t) => t.key === values.chuDe);
    const subNode = parentNode?.children?.find((c) => c.key === values.tieuMuc);
    const topicLabel = (parentNode?.title as string) || '';
    const subTopicLabel = (subNode?.title as string) || '';

    setAiGenerating(true);
    setAiSuggestedQuestion(null);
    setIsEditingPreview(false);

    try {
      const selectedTypeRecord = questionTypes.find((qt) => qt.id === values.type);
      const questionType: QuestionType = selectedTypeRecord
        ? resolveInternalQuestionType(selectedTypeRecord)
        : 'single';

      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: values.subject,
          grade: values.grade,
          topic: subTopicLabel ? `${topicLabel} - ${subTopicLabel}` : topicLabel,
          count: 1,
          type: questionType,
          ...LEVEL_TO_PERCENT[values.level as CognitiveLevel],
        }),
      });
      const data = await res.json();

      if (!data.success || !data.questions?.length) {
        throw new Error(data.error || data.detail || 'AI không trả về câu hỏi nào.');
      }

      const aiQ = data.questions[0];
      const code = `AI-${String(values.subject).substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const base: Question = {
        id: `q-ai-${Date.now()}`,
        code,
        text: aiQ.text,
        type: questionType,
        level: values.level,
        status: 'pending',
        subject: values.subject,
        grade: values.grade,
        topicId: values.tieuMuc || values.chuDe || '',
        topicName: topicLabel,
        subTopicName: subTopicLabel,
        nangLucId: values.nangLuc,
        creator: 'SmartTest AI Generator',
        createdAt: new Date().toISOString(),
      };

      let generated: Question;

      if (questionType === 'true_false') {
        // Đúng/Sai theo cấu trúc Phần II: 4 ý nhận định, mỗi ý đúng/sai độc lập
        const rawStatements: { content: string; isCorrect: boolean }[] = aiQ.statements || [];
        const formattedStatements: TrueFalseStatement[] = rawStatements.map((st, idx) => ({
          id: idx + 1,
          topicId: values.tieuMuc || values.chuDe || '',
          topicName: subTopicLabel || topicLabel,
          level: values.level,
          nangLuc: values.nangLuc,
          content: st.content,
          isCorrect: st.isCorrect,
        }));
        generated = {
          ...base,
          options: formattedStatements.map((st) => st.content),
          correctAnswer: formattedStatements.map((st) => `${st.id}. ${st.isCorrect ? 'Đúng' : 'Sai'}`).join(', '),
          statements: formattedStatements,
        };
      } else if (questionType === 'short') {
        // Trả lời ngắn theo cấu trúc Phần III: chỉ có đáp số/từ khóa, không có phương án
        generated = {
          ...base,
          correctAnswer: aiQ.correctAnswer || '',
        };
      } else {
        // Trắc nghiệm 1 đáp án theo cấu trúc Phần I
        const letterIdx = ['A', 'B', 'C', 'D'].indexOf(String(aiQ.correctAnswer || '').toUpperCase().trim());
        const correctText = letterIdx >= 0 ? aiQ.options?.[letterIdx] : aiQ.correctAnswer;
        generated = {
          ...base,
          options: aiQ.options || [],
          correctAnswer: correctText || aiQ.correctAnswer || '',
        };
      }

      setAiSuggestedQuestion(generated);
      message.success('AI hoàn tất đề xuất câu hỏi chất lượng cao!');
    } catch (err: any) {
      message.error(err?.message || 'Lỗi kết nối AI Gateway. Vui lòng kiểm tra dịch vụ AI đã khởi động.');
    } finally {
      setAiGenerating(false);
    }
  };

  const acceptAISuggestedQuestion = async () => {
    if (!aiSuggestedQuestion) return;
    setAccepting(true);
    try {
      const { id: _localId, ...payload } = aiSuggestedQuestion;
      const apiPayload = { ...payload, competencyComponentId: aiSuggestedQuestion.nangLucId };
      const response = await questionApi.create(apiPayload as any);
      const savedQuestion = { ...aiSuggestedQuestion, id: response.data.id || aiSuggestedQuestion.id };
      onSave(savedQuestion);
      message.success('Đã lưu câu hỏi sinh bởi AI vào hồ sơ chờ thẩm định.');
      handleClose();
    } catch (err: any) {
      message.error(err?.message || 'Lỗi khi lưu câu hỏi sinh bởi AI!');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
          <ThunderboltOutlined className="text-indigo-600 font-extrabold animate-pulse" />
          <span className="font-extrabold uppercase text-slate-800 text-[14px]">Sinh câu hỏi tự động bằng AI (SmartTest Engine)</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={680}
      centered
    >
      <div className="space-y-4 pt-3">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-4 rounded-2xl">
          <span className="text-xs text-indigo-900 font-extrabold uppercase tracking-wider block mb-2">Thông số phân loại câu hỏi</span>

          <Form form={form} layout="vertical" className="grid grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              label={<span className="text-[12px] font-bold text-slate-600">Môn học <span className="text-red-500">*</span></span>}
              name="subject"
              rules={[{ required: true, message: 'Vui lòng chọn môn học!' }]}
              style={{ marginBottom: 8 }}
            >
              <Select
                size="middle"
                placeholder="-- Chọn môn học --"
                options={subjectOptions.filter((o) => o.value)}
                onChange={(val) => {
                  setSelectedSubject(val);
                  form.setFieldsValue({ chuDe: undefined, tieuMuc: undefined, nangLuc: undefined });
                  setSelectedTopicKey(null);
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-[12px] font-bold text-slate-600">Khối lớp <span className="text-red-500">*</span></span>}
              name="grade"
              rules={[{ required: true, message: 'Vui lòng chọn khối lớp!' }]}
              style={{ marginBottom: 8 }}
            >
              <Select
                size="middle"
                placeholder="-- Chọn khối lớp --"
                options={gradeOptions.filter((o) => o.value)}
                onChange={(val) => {
                  setSelectedGrade(val);
                  form.setFieldsValue({ chuDe: undefined, tieuMuc: undefined });
                  setSelectedTopicKey(null);
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-[12px] font-bold text-slate-600">Chủ đề <span className="text-red-500">*</span></span>}
              name="chuDe"
              rules={[{ required: true, message: 'Vui lòng chọn chủ đề!' }]}
              style={{ marginBottom: 8 }}
            >
              <Select
                size="middle"
                placeholder="-- Chọn chủ đề --"
                options={topicTreeData.map((t) => ({ value: t.key as string, label: t.title as string }))}
                disabled={!selectedSubject}
                onChange={(val) => {
                  setSelectedTopicKey(val);
                  form.setFieldValue('tieuMuc', undefined);
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-[12px] font-bold text-slate-600">Tiểu mục chủ đề <span className="text-red-500">*</span></span>}
              name="tieuMuc"
              rules={[{ required: true, message: 'Vui lòng chọn tiểu mục!' }]}
              style={{ marginBottom: 8 }}
            >
              <Select
                size="middle"
                placeholder="-- Chọn tiểu mục --"
                options={subTopicOptions}
                disabled={subTopicOptions.length === 0}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-[12px] font-bold text-slate-600">Thành phần năng lực <span className="text-red-500">*</span></span>}
              name="nangLuc"
              rules={[{ required: true, message: 'Vui lòng chọn thành phần năng lực!' }]}
              style={{ marginBottom: 8 }}
            >
              <Select
                size="middle"
                placeholder="-- Chọn thành phần năng lực --"
                options={competencyOptions}
                disabled={!selectedSubject}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-[12px] font-bold text-slate-600">Cấp độ tư duy <span className="text-red-500">*</span></span>}
              name="level"
              rules={[{ required: true, message: 'Vui lòng chọn cấp độ tư duy!' }]}
              style={{ marginBottom: 8 }}
            >
              <Select size="middle" options={LEVEL_OPTIONS} />
            </Form.Item>

            <Form.Item
              label={<span className="text-[12px] font-bold text-slate-600">Loại hình câu hỏi <span className="text-red-500">*</span></span>}
              name="type"
              rules={[{ required: true, message: 'Vui lòng chọn loại hình câu hỏi!' }]}
              style={{ marginBottom: 4 }}
              className="col-span-2"
            >
              <Select size="middle" placeholder="-- Chọn loại hình câu hỏi --" options={questionTypeOptions} />
            </Form.Item>
          </Form>
        </div>

        <Button
          type="primary"
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-extrabold py-2 shadow-xs border-transparent hover:opacity-90 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          icon={<ThunderboltOutlined />}
          onClick={triggerAIQuestionGeneration}
          disabled={aiGenerating}
          loading={aiGenerating}
        >
          {aiGenerating ? 'AI Đang phân tích và xử lý...' : 'Bắt đầu sinh câu hỏi tự động'}
        </Button>

        {aiGenerating && (
          <div className="text-center py-10 space-y-3">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#4f46e5' }} spin />} />
            <p className="text-xs text-indigo-900 font-bold animate-pulse">SmartTest AI đang kết nối Google Gemini để sinh câu hỏi bám sát phân loại đã chọn...</p>
          </div>
        )}

        {aiSuggestedQuestion && (
          <div className="border border-slate-200 bg-white rounded-2xl p-4 shadow-sm space-y-4 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-dashed pb-2">
              <Tag color="purple" className="font-extrabold uppercase font-mono text-[10px]">{aiSuggestedQuestion.code}</Tag>
              <span className="text-[11px] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold text-indigo-700">Được sinh bởi AI</span>
            </div>

            {isEditingPreview ? (
              <RichTextEditor
                value={aiSuggestedQuestion.text}
                onChange={updateSuggestedText}
                minHeight={70}
                className="text-[13px]"
              />
            ) : (
              <RichTextView html={aiSuggestedQuestion.text} className="text-[13px] text-slate-800 font-bold leading-relaxed" />
            )}

            {aiSuggestedQuestion.type === 'single' && aiSuggestedQuestion.options && (
              isEditingPreview ? (
                <Radio.Group
                  className="w-full space-y-2 flex flex-col"
                  value={correctOptionIndex}
                  onChange={(e) => setSuggestedCorrectOption(e.target.value)}
                >
                  {aiSuggestedQuestion.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Radio value={idx} />
                      <Input
                        size="small"
                        value={opt}
                        onChange={(e) => updateSuggestedOption(idx, e.target.value)}
                        className="flex-1 text-xs"
                      />
                    </div>
                  ))}
                </Radio.Group>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {aiSuggestedQuestion.options.map((opt, id) => (
                    <div
                      key={id}
                      className={`p-2 rounded-lg border font-medium ${opt === aiSuggestedQuestion.correctAnswer
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : 'bg-slate-50 border-slate-200'
                        }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )
            )}

            {aiSuggestedQuestion.type === 'true_false' && aiSuggestedQuestion.statements && (
              isEditingPreview ? (
                <div className="space-y-1.5 text-xs">
                  {aiSuggestedQuestion.statements.map((st, idx) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <span className="font-bold w-5">{String.fromCharCode(97 + idx)})</span>
                      <Input
                        size="small"
                        value={st.content}
                        onChange={(e) => updateSuggestedStatementContent(idx, e.target.value)}
                        className="flex-1 text-xs"
                      />
                      <Checkbox
                        checked={st.isCorrect}
                        onChange={(e) => toggleSuggestedStatementCorrect(idx, e.target.checked)}
                      >
                        Đúng
                      </Checkbox>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {aiSuggestedQuestion.statements.map((st, idx) => (
                    <div
                      key={st.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border font-medium ${st.isCorrect
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                        }`}
                    >
                      <span className="font-bold">{String.fromCharCode(97 + idx)})</span>
                      <span className="flex-1">{st.content}</span>
                      <Tag color={st.isCorrect ? 'success' : 'error'} className="text-[10px] m-0">
                        {st.isCorrect ? 'Đúng' : 'Sai'}
                      </Tag>
                    </div>
                  ))}
                </div>
              )
            )}

            {aiSuggestedQuestion.type === 'short' && (
              isEditingPreview ? (
                <Input.TextArea
                  rows={2}
                  value={String(aiSuggestedQuestion.correctAnswer || '')}
                  onChange={(e) => updateSuggestedShortAnswer(e.target.value)}
                  className="text-xs font-medium"
                />
              ) : (
                <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold">
                  Đáp án: {aiSuggestedQuestion.correctAnswer}
                </div>
              )
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t mt-4 border-slate-100">
              <Button
                className="rounded-lg text-xs font-bold bg-slate-50 text-slate-500 border-slate-200"
                disabled={accepting}
                onClick={() => {
                  setAiSuggestedQuestion(null);
                  setIsEditingPreview(false);
                }}
              >
                Bỏ đi, sinh đề khác
              </Button>
              {isEditingPreview ? (
                <Button
                  className="rounded-lg text-xs font-bold border-indigo-300 text-indigo-700"
                  disabled={accepting}
                  onClick={() => setIsEditingPreview(false)}
                >
                  Xong, xem lại
                </Button>
              ) : (
                <Button
                  className="rounded-lg text-xs font-bold border-indigo-300 text-indigo-700"
                  icon={<EditOutlined />}
                  disabled={accepting}
                  onClick={startEditingPreview}
                >
                  Chỉnh sửa
                </Button>
              )}
              <Button
                type="primary"
                className="rounded-lg text-xs font-extrabold bg-[#002147] border-transparent text-white hover:bg-slate-900"
                icon={<CheckCircleOutlined />}
                loading={accepting}
                onClick={acceptAISuggestedQuestion}
              >
                Duyệt và Thêm vào NHCH
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
