import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Modal, Form, Select, Input, Button, Checkbox } from 'antd';
import { toast } from '../../../../utils/toast';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  Question,
  QuestionType,
  CognitiveLevel,
  TopicNode,
  TrueFalseStatement,
} from '../../../../types';
import { questionApi, subjectCategoryApi, gradeLevelApi, competencyComponentApi, cognitiveLevelApi } from '../../../../services/danhMucApi.ts';
import RichTextEditor from '../../../RichTextEditor';
import { RichTextGroupProvider, RichTextGroupToolbar, RichTextGroupCell } from '../../../RichTextEditorGroup';
import { buildCognitiveLevelOptions } from '../../../../utils/cognitiveLevel';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnswerRow {
  id: number;
  content: string;
  isCorrect: boolean;
}

interface SubQuestionRow {
  id: number;
  text: string;
  type: 'single' | 'multiple' | 'true_false' | 'short';
  link?: string;
}

export interface CreateQuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (q: Question) => void;
  onSendReview: (q: Question) => void;
  /** Loại câu hỏi khởi tạo ban đầu khi mở modal */
  initialType: QuestionType;
  /** Môn học hiện tại */
  subject: string;
  /** Khối lớp hiện tại */
  grade: string;
  /** Key node đang được chọn ở sidebar (topic hoặc subtopic) */
  selectedTopicKey: string | null;
  /** Toàn bộ cây chủ đề của môn học */
  topicTreeData: TopicNode[];
  /** Tên người dùng thật đang đăng nhập, dùng làm "Người soạn" */
  creatorName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Tìm parent topic key của một subtopic key trong cây */
function findParentTopicKey(tree: TopicNode[], subKey: string): string | null {
  for (const node of tree) {
    if (node.children?.some((c) => c.key === subKey)) return node.key as string;
  }
  return null;
}

/** Kiểm tra một key có phải là subtopic (leaf) không */
function isSubTopicKey(tree: TopicNode[], key: string): boolean {
  return tree.some((node) => node.children?.some((c) => c.key === key));
}

const DEFAULT_ANSWERS: AnswerRow[] = [
  { id: 1, content: '', isCorrect: true },
  { id: 2, content: '', isCorrect: false },
  { id: 3, content: '', isCorrect: false },
  { id: 4, content: '', isCorrect: false },
];

const SIDEBAR_ITEMS: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'single', label: 'Phương án trắc nghiệm', icon: '▤' },
  { value: 'true_false', label: 'Đúng sai', icon: '✓✗' },
  { value: 'short', label: 'Điền số trả lời ngắn', icon: '✏' },
  { value: 'multiple', label: 'Câu hỏi nhóm', icon: '⊞' },
];

const LEVEL_OPTIONS = [
  { value: 'nhan_biet', label: 'Biết' },
  { value: 'thong_hieu', label: 'Hiểu' },
  { value: 'van_dung', label: 'Vận dụng' },
  { value: 'van_dung_cao', label: 'Vận dụng cao' },
];

const getSubQuestionTypeLabel = (type: string) => {
  switch (type) {
    case 'single':
      return 'Một lựa chọn';
    case 'multiple':
      return 'Đa lựa chọn';
    case 'true_false':
      return 'Đúng sai';
    case 'short':
      return 'Trả lời ngắn';
    default:
      return 'Một lựa chọn';
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateQuestionModal({
  open,
  onClose,
  onSave,
  onSendReview,
  initialType,
  subject,
  grade,
  selectedTopicKey,
  topicTreeData,
  creatorName,
}: CreateQuestionModalProps) {
  const [form] = Form.useForm();
  const [subQuestionForm] = Form.useForm();

  const [competencyOptions, setCompetencyOptions] = useState<{ value: string; label: string }[]>([]);
  const [cognitiveLevelOptions, setCognitiveLevelOptions] = useState<{ value: string; label: string }[]>(LEVEL_OPTIONS);

  useEffect(() => {
    async function loadDynamicOptions() {
      try {
        const subRes = await subjectCategoryApi.list();
        const foundSub = subRes.data.find((s) => s.name === subject);
        const subjectId = foundSub ? foundSub.id : undefined;

        const gradeRes = await gradeLevelApi.list();
        const foundGrade = gradeRes.data.find((g) => g.name === grade);
        const gradeId = foundGrade ? foundGrade.id : undefined;

        const compRes = await competencyComponentApi.list(subjectId ? { subject_id: subjectId } : undefined);
        setCompetencyOptions(
          compRes.data.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name })),
        );

        const cogRes = await cognitiveLevelApi.list({ subject_id: subjectId, grade_id: gradeId });
        setCognitiveLevelOptions(buildCognitiveLevelOptions(cogRes.data));
      } catch (err) {
        console.error('Failed to load dynamic options', err);
      }
    }
    if (open) {
      loadDynamicOptions();
    }
  }, [subject, grade, open]);

  // State quản lý loại câu hỏi hiện tại
  const [questionType, setQuestionType] = useState<QuestionType>('single');

  // State câu hỏi trắc nghiệm (single)
  const [answers, setAnswers] = useState<AnswerRow[]>(
    DEFAULT_ANSWERS.map((a) => ({ ...a })),
  );

  // State câu hỏi Đúng/Sai (true_false)
  const [statements, setStatements] = useState<
    Omit<TrueFalseStatement, 'id'>[]
  >([]);

  // State danh sách câu hỏi con trong Câu hỏi nhóm (multiple)
  const [subQuestions, setSubQuestions] = useState<SubQuestionRow[]>([
    { id: 1, text: 'Câu hỏi 01', type: 'single', link: '1' },
    { id: 2, text: 'Câu hỏi 02', type: 'single', link: '2' },
    { id: 3, text: 'Câu hỏi 03', type: 'multiple' },
  ]);

  // State điều khiển Modal thêm/sửa câu hỏi con
  const [subQuestionModalOpen, setSubQuestionModalOpen] = useState(false);
  const [editingSubQuestionId, setEditingSubQuestionId] = useState<
    number | null
  >(null);
  const [subFormTopicKey, setSubFormTopicKey] = useState<string | null>(null);
  const [subQuestionType, setSubQuestionType] = useState<
    'single' | 'multiple' | 'true_false' | 'short'
  >('single');
  const [subAnswers, setSubAnswers] = useState<AnswerRow[]>(
    DEFAULT_ANSWERS.map((a) => ({ ...a })),
  );

  /** Key của chủ đề đang được chọn trong form (để lọc tiểu mục) */
  const [formTopicKey, setFormTopicKey] = useState<string | null>(null);

  // State theo dõi nút submit đang xử lý (Lưu / Gửi thẩm định) để hiện loading và khoá nút còn lại
  const [submitting, setSubmitting] = useState<'draft' | 'pending' | null>(null);

  // Sinh năng lực dropdown động theo môn học cho Đúng/Sai
  const nangLucOptions = useMemo(() => {
    const suffix = subject ? ` ${subject.toLowerCase()}` : '';
    return [
      { value: `Nhận biết${suffix}`, label: `Nhận biết${suffix}` },
      { value: `Thông hiểu${suffix}`, label: `Thông hiểu${suffix}` },
      { value: `Vận dụng${suffix}`, label: `Vận dụng${suffix}` },
      { value: `Vận dụng cao${suffix}`, label: `Vận dụng cao${suffix}` },
    ];
  }, [subject]);

  // Đồng bộ loại câu hỏi khởi tạo từ parent
  useEffect(() => {
    if (open) {
      setQuestionType(initialType);
    }
  }, [open, initialType]);

  // ── Khởi tạo dữ liệu form và các state tương ứng khi mở modal ──────────────────────
  useEffect(() => {
    if (!open) return;

    // Reset form và set answers về mặc định
    form.resetFields();
    setAnswers(DEFAULT_ANSWERS.map((a) => ({ ...a })));
    setSubQuestions([
      { id: 1, text: 'Câu hỏi 01', type: 'single', link: '1' },
      { id: 2, text: 'Câu hỏi 02', type: 'single', link: '2' },
      { id: 3, text: 'Câu hỏi 03', type: 'multiple' },
    ]);

    let defaultTopicKey: string | null = null;
    let defaultSubTopicKey: string | null = null;

    if (selectedTopicKey) {
      if (isSubTopicKey(topicTreeData, selectedTopicKey)) {
        // Đang chọn tiểu mục → tìm parent
        defaultSubTopicKey = selectedTopicKey;
        defaultTopicKey = findParentTopicKey(topicTreeData, selectedTopicKey);
      } else {
        // Đang chọn chủ đề cha
        defaultTopicKey = selectedTopicKey;
        // Chọn tiểu mục đầu tiên nếu có
        const parentNode = topicTreeData.find(
          (t) => t.key === selectedTopicKey,
        );
        defaultSubTopicKey = (parentNode?.children?.[0]?.key as string) ?? null;
      }
    } else {
      // Không có gì được chọn → lấy node đầu tiên
      defaultTopicKey = (topicTreeData[0]?.key as string) ?? null;
      defaultSubTopicKey =
        (topicTreeData[0]?.children?.[0]?.key as string) ?? null;
    }

    setFormTopicKey(defaultTopicKey);
    form.setFieldsValue({
      chuDe: defaultTopicKey ?? undefined,
      tieuMuc: defaultSubTopicKey ?? undefined,
      daoCauHoi: undefined,
      text: '',
      correctAnswer: '',
      groupType: 'lien_ket',
    });

    // Khởi tạo 4 ý câu hỏi Đúng/Sai — topicId/level/nangLuc giờ lấy chung từ "Phần 1" (Thành phần
    // năng lực/Cấp độ tư duy/Chủ đề/Tiểu mục) lúc lưu (buildQuestion), không còn khác nhau theo ý.
    const initialStatements = Array.from({ length: 4 }).map(() => ({
      topicId: defaultTopicKey || '',
      topicName: '',
      level: 'nhan_biet' as CognitiveLevel,
      nangLuc: undefined,
      content: '',
      isCorrect: false,
    }));
    setStatements(initialStatements);
  }, [open, selectedTopicKey, topicTreeData, subject, form]);

  // ── Answers helpers ────────────────────────────────────────────────────────
  const resetAnswers = useCallback(() => {
    setAnswers(DEFAULT_ANSWERS.map((a) => ({ ...a })));
  }, []);

  const updateContent = (id: number, content: string) =>
    setAnswers((prev) =>
      prev.map((a) => (a.id === id ? { ...a, content } : a)),
    );

  const toggleCorrect = (id: number) => {
    // Luôn là single correct ở phương án trắc nghiệm
    setAnswers((prev) => prev.map((a) => ({ ...a, isCorrect: a.id === id })));
  };

  const addRow = () => {
    const newId =
      answers.length > 0 ? Math.max(...answers.map((a) => a.id)) + 1 : 1;
    setAnswers((prev) => [
      ...prev,
      { id: newId, content: '', isCorrect: false },
    ]);
  };

  const removeRow = (id: number) => {
    if (answers.length <= 2) return;
    setAnswers((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Statements helpers (cho Đúng / Sai) ───────────────────────────────────
  const updateStatementRow = (
    index: number,
    fields: Partial<Omit<TrueFalseStatement, 'id'>>,
  ) => {
    setStatements((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...fields } : item)),
    );
  };

  // Chủ đề/tiểu mục giờ dùng chung 1 field ở "Phần 1" (đã có rule required riêng) — chỉ còn cần
  // kiểm tra nội dung từng ý ở đây.
  const validateStatements = (): boolean => {
    for (let i = 0; i < statements.length; i++) {
      const st = statements[i];
      if (!st.content || !st.content.trim()) {
        toast.error(`Vui lòng nhập nội dung trả lời cho ý thứ ${i + 1}!`);
        return false;
      }
    }
    return true;
  };

  // ── Close / Reset ──────────────────────────────────────────────────────────
  const handleClose = () => {
    onClose();
    form.resetFields();
    resetAnswers();
    setQuestionType('single');
    setFormTopicKey(null);
    setStatements([]);
    setSubQuestions([]);
  };

  // ── Build Question object ──────────────────────────────────────────────────
  const buildQuestion = (
    values: any,
    status: 'draft' | 'pending',
  ): Question => {
    if (questionType === 'true_false') {
      // Chủ đề/tiểu mục/cấp độ/năng lực giờ dùng CHUNG 1 bộ cho cả 4 ý (nhập ở "Phần 1" phía trên,
      // y như Trắc nghiệm 1 lựa chọn) — không còn khác nhau theo từng ý như thiết kế cũ.
      const parentNode = topicTreeData.find((t) => t.key === values.chuDe);
      const subNode = parentNode?.children?.find((c) => c.key === values.tieuMuc);
      const sharedTopicId = values.tieuMuc || values.chuDe || '';
      const sharedTopicName = (subNode?.title as string) || (parentNode?.title as string) || '';
      const sharedLevel = (values.level || 'nhan_biet') as CognitiveLevel;
      const sharedNangLuc = values.nangLuc || undefined;

      const formattedStatements: TrueFalseStatement[] = statements.map((st, idx) => ({
        id: idx + 1,
        topicId: sharedTopicId,
        topicName: sharedTopicName,
        level: sharedLevel,
        nangLuc: sharedNangLuc,
        content: st.content,
        isCorrect: st.isCorrect,
      }));

      const correctAnswerStr = formattedStatements
        .map((st) => `${st.id}. ${st.isCorrect ? 'Đúng' : 'Sai'}`)
        .join(', ');

      const optionsList = formattedStatements.map((st) => st.content);

      return {
        id: `q-custom-${Date.now()}`,
        code: `Q-${subject.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
        text: values.text,
        type: 'true_false',
        level: sharedLevel,
        nangLucId: sharedNangLuc,
        status,
        subject,
        grade,
        topicId: sharedTopicId,
        topicName: sharedTopicName,
        subTopicName: (subNode?.title as string) || '',
        options: optionsList,
        correctAnswer: correctAnswerStr,
        statements: formattedStatements,
        creator: creatorName || 'Hội đồng Chuyên môn',
        createdAt: new Date().toISOString(),
      };
    } else {
      const parentNode = topicTreeData.find((t) => t.key === values.chuDe);
      const subNode = parentNode?.children?.find(
        (c) => c.key === values.tieuMuc,
      );

      const qObj: Question = {
        id: `q-custom-${Date.now()}`,
        code: `Q-${subject.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
        text: values.text,
        type: questionType,
        level: (values.level || 'nhan_biet') as CognitiveLevel,
        nangLucId: values.nangLuc || undefined,
        status,
        subject,
        grade,
        topicId: values.tieuMuc || values.chuDe || '',
        topicName: (parentNode?.title as string) || '',
        subTopicName: (subNode?.title as string) || '',
        creator: creatorName || 'Hội đồng Chuyên môn',
        createdAt: new Date().toISOString(),
      };

      if (questionType === 'single') {
        qObj.options = answers.map((a) => a.content).filter(Boolean);
        qObj.correctAnswer = answers
          .filter((a) => a.isCorrect)
          .map((a) => a.content)
          .join(', ');
      } else if (questionType === 'short') {
        qObj.correctAnswer = values.correctAnswer || '';
      } else if (questionType === 'multiple') {
        // Cấu hình riêng cho Câu hỏi nhóm
        (qObj as any).groupType = values.groupType; // 'lien_ket' | 'doc_lap' | 'ket_hop'
        (qObj as any).subQuestions = subQuestions;
      }

      return qObj;
    }
  };

  const handleSave = () => {
    void persistQuestion('draft');
  };

  const handleSendReview = () => {
    void persistQuestion('pending');
  };

  const persistQuestion = async (status: 'draft' | 'pending') => {
    setSubmitting(status);
    try {
      const values = await form.validateFields();
      if (questionType === 'true_false' && !validateStatements()) {
        return;
      }

      const q = buildQuestion(values, status);
      const { id: _localId, ...payload } = q;
      const apiPayload = {
        ...payload,
        competencyComponentId: q.nangLucId,
      };
      const response = await questionApi.create(apiPayload as any);
      const savedQuestion = { ...q, id: response.data.id || q.id };

      if (status === 'draft') {
        onSave(savedQuestion);
        toast.success('Đã lưu thành công câu hỏi! (Trạng thái: Lưu nháp)');
      } else {
        onSendReview(savedQuestion);
        toast.success('Đã gửi câu hỏi đi thẩm định!');
      }
      handleClose();
    } catch (error: any) {
      if (error?.errorFields) return;
      toast.error(error?.message || 'Lỗi khi lưu câu hỏi!');
    } finally {
      setSubmitting(null);
    }
  };

  // Subtopic options theo chủ đề đang chọn trong form (cho các loại không phải Đúng/Sai)
  const subTopicOptions =
    topicTreeData
      .find((t) => t.key === formTopicKey)
      ?.children?.map((c) => ({
        value: c.key as string,
        label: c.title as string,
      })) ?? [];

  return (
    <Modal
      title={null}
      open={open}
      forceRender
      onCancel={handleClose}
      footer={null}
      width='98vw'
      style={{ maxWidth: 1400, top: 24 }}
      centered={false}
      styles={{ body: { padding: 0 } }}
    >
      {/* ── Header ── */}
      <div className='flex items-center gap-2 px-5 py-3 border-b border-slate-200 bg-white'>
        <PlusOutlined className='text-[#002147] text-xl' />
        <span className='font-extrabold uppercase text-slate-800 text-[18px] tracking-wide'>
          Thêm mới câu hỏi thủ công
        </span>
      </div>

      {/* ── Body ── */}
      <div
        className='flex'
        style={{
          maxHeight: 'calc(100vh - 220px)',
        }}
      >
        {/* LEFT SIDEBAR - Cố định bên trái */}
        <div className='w-56 flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col py-2 overflow-y-auto'>
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setQuestionType(item.value);
                if (item.value !== 'true_false') {
                  resetAnswers();
                }
              }}
              className={`flex items-center gap-3 px-5 py-3 text-left transition-all border-l-4 ${
                questionType === item.value
                  ? 'bg-white border-l-blue-600 text-blue-700 font-extrabold shadow-sm'
                  : 'border-l-transparent text-slate-600 hover:bg-white hover:text-slate-900 font-bold'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <span className='text-xl leading-none opacity-80'>
                {item.icon}
              </span>
              <span className='text-[15px] leading-tight'>{item.label}</span>
            </button>
          ))}
        </div>

        {/* RIGHT FORM - Đẩy form ra xa sidebar bằng inline style padding */}
        <div
          className='flex-1 overflow-y-auto bg-white'
          style={{ padding: '12px 24px 12px 48px' }}
        >
          <Form form={form} layout='vertical'>
            {/* ── Phần 1: Phân loại câu hỏi — dùng chung cho MỌI loại (kể cả Đúng/Sai: 4 ý dùng chung
                 đúng 1 bộ Thành phần năng lực/Cấp độ tư duy/Chủ đề/Tiểu mục, không lặp lại theo từng ý nữa) ── */}
            {(
              <div className='mb-1.5 animate-in fade-in duration-200'>
                <div className='text-[17px] font-bold text-blue-700 mb-1.5'>
                  Thông tin câu hỏi
                </div>

                {/* Nếu là Câu hỏi nhóm */}
                {questionType === 'multiple' ? (
                  <div className='grid grid-cols-2 gap-3 mb-1'>
                    <Form.Item
                      label={
                        <span className='text-[15px] font-bold text-slate-700'>
                          Loại câu hỏi nhóm{' '}
                          <span className='text-red-500'>*</span>
                        </span>
                      }
                      name='groupType'
                      rules={[
                        {
                          required: true,
                          message: 'Vui lòng chọn loại câu hỏi nhóm!',
                        },
                      ]}
                      className='mb-0'
                      initialValue='lien_ket'
                      style={{ marginBottom: '4px' }}
                    >
                      <Select
                        size='large'
                        className='w-full text-base font-medium'
                        placeholder='Chọn loại câu hỏi nhóm'
                        options={[
                          { value: 'lien_ket', label: 'Liên kết trước sau' },
                          { value: 'doc_lap', label: 'Câu độc lập' },
                          { value: 'ket_hop', label: 'Kết hợp' },
                        ]}
                      />
                    </Form.Item>
                  </div>
                ) : (
                  /* Nếu là các loại TN Đơn, Điền khuyết */
                  <div className='grid grid-cols-2 gap-3 mb-1'>
                    <Form.Item
                      label={
                        <span className='text-[15px] font-bold text-slate-700'>
                          Thành phần năng lực{' '}
                          <span className='text-red-500'>*</span>
                        </span>
                      }
                      name='nangLuc'
                      rules={[{ required: true, message: 'Vui lòng chọn!' }]}
                      className='mb-0'
                      style={{ marginBottom: '4px' }}
                    >
                      <Select
                        size='large'
                        className='w-full text-base font-medium'
                        placeholder='Chọn'
                        options={competencyOptions}
                      />
                    </Form.Item>

                    <Form.Item
                      label={
                        <span className='text-[15px] font-bold text-slate-700'>
                          Cấp độ tư duy <span className='text-red-500'>*</span>
                        </span>
                      }
                      name='level'
                      rules={[{ required: true, message: 'Vui lòng chọn!' }]}
                      className='mb-0'
                      style={{ marginBottom: '4px' }}
                    >
                      <Select
                        size='large'
                        className='w-full text-base font-medium'
                        placeholder='Chọn'
                        options={cognitiveLevelOptions}
                      />
                    </Form.Item>
                  </div>
                )}

                {/* Dòng 2: Chủ đề · Tiểu mục (dùng chung cho các loại có phân loại chung, giảm margins dọc xuống tối đa) */}
                <div className='grid grid-cols-2 gap-3 mt-1 mb-1'>
                  <Form.Item
                    label={
                      <span className='text-[15px] font-bold text-slate-700'>
                        Chủ đề <span className='text-red-500'>*</span>
                      </span>
                    }
                    name='chuDe'
                    rules={[
                      { required: true, message: 'Vui lòng chọn chủ đề!' },
                    ]}
                    className='mb-0'
                    style={{ marginBottom: '4px' }}
                  >
                    <Select
                      size='large'
                      className='w-full text-base font-medium'
                      placeholder='-- Chọn chủ đề --'
                      options={topicTreeData.map((t) => ({
                        value: t.key as string,
                        label: t.title as string,
                      }))}
                      onChange={(val: string) => {
                        setFormTopicKey(val);
                        form.setFieldValue('tieuMuc', undefined);
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span className='text-[15px] font-bold text-slate-700'>
                        Tiểu mục chủ đề <span className='text-red-500'>*</span>
                      </span>
                    }
                    name='tieuMuc'
                    rules={[
                      { required: true, message: 'Vui lòng chọn tiểu mục!' },
                    ]}
                    className='mb-0'
                    style={{ marginBottom: '4px' }}
                  >
                    <Select
                      size='large'
                      className='w-full text-base font-medium'
                      placeholder='-- Chọn tiểu mục --'
                      options={subTopicOptions}
                      disabled={subTopicOptions.length === 0}
                    />
                  </Form.Item>
                </div>
              </div>
            )}

            {/* ── Phần 2: Đề bài / Nội dung chính (Dùng chung cho tất cả, giảm rows từ 6 xuống 4, mb-1.5) ── */}
            <div className='mb-1.5'>
              <Form.Item
                label={
                  <span className='text-[15px] font-bold text-slate-700'>
                    Nội dung câu hỏi <span className='text-red-500'>*</span>
                  </span>
                }
                name='text'
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng nhập nội dung câu hỏi!',
                  },
                ]}
                className='mb-0'
                style={{ marginBottom: '6px' }}
              >
                <RichTextEditor placeholder='Nhập nội dung câu hỏi...' minHeight={100} />
              </Form.Item>
            </div>

            {/* ── Phần 3: Đáp án / Nội dung trả lời (Từng loại khác nhau) ── */}

            {/* 3.1. Phương án trắc nghiệm */}
            {questionType === 'single' && (
              <div className='mt-2 animate-in fade-in duration-200'>
                <div className='text-[17px] font-bold text-blue-700 mb-1.5'>
                  Thông tin câu trả lời
                </div>

                <RichTextGroupProvider>
                  <div className='border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm'>
                    <RichTextGroupToolbar />
                    <div className='flex items-center justify-between px-3 py-1.5 bg-slate-50 border-y border-slate-200 text-[12px] font-bold text-slate-500 uppercase tracking-wide'>
                      <span>
                        Nội dung trả lời{' '}
                        <span className='text-red-500 normal-case'>*</span>
                      </span>
                      <span className='pr-8'>Đáp án đúng</span>
                    </div>
                    <div className='divide-y divide-slate-100'>
                      {answers.map((ans, idx) => (
                        <div
                          key={ans.id}
                          className='flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50/70 transition-colors group'
                        >
                          <div className='w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-[13px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5'>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <RichTextGroupCell
                              value={ans.content}
                              onChange={(html) => updateContent(ans.id, html)}
                              placeholder={`Lựa chọn trả lời ${idx + 1}`}
                              minHeight={36}
                            />
                          </div>
                          <div className='flex items-center gap-2 flex-shrink-0 pt-1.5 w-16 justify-end'>
                            <Checkbox
                              checked={ans.isCorrect}
                              onChange={() => toggleCorrect(ans.id)}
                              style={{ transform: 'scale(1.15)' }}
                            />
                            <button
                              type='button'
                              onClick={() => removeRow(ans.id)}
                              disabled={answers.length <= 2}
                              className={`text-xl leading-none w-5 flex-shrink-0 transition-all ${
                                answers.length > 2
                                  ? 'opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600'
                                  : 'opacity-0 pointer-events-none'
                              }`}
                              style={{ cursor: answers.length > 2 ? 'pointer' : 'default' }}
                              title='Xóa dòng'
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </RichTextGroupProvider>

                <div className='mt-2'>
                  <button
                    type='button'
                    onClick={addRow}
                    className='text-[15px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors'
                    style={{ cursor: 'pointer' }}
                  >
                    <PlusOutlined className='text-xs' /> Thêm lựa chọn
                  </button>
                </div>
              </div>
            )}

            {/* 3.2. Điền số trả lời ngắn */}
            {questionType === 'short' && (
              <div className='mt-2 animate-in fade-in duration-200'>
                <div className='text-[17px] font-bold text-blue-700 mb-1.5'>
                  Đáp án tự luận
                </div>
                <Form.Item
                  label={
                    <span className='text-[15px] font-bold text-slate-700'>
                      Đáp án{' '}
                      <span className='text-red-500'>*</span>
                    </span>
                  }
                  name='correctAnswer'
                  rules={[{ required: true, message: 'Vui lòng nhập đáp án!' }]}
                  style={{ marginBottom: '8px' }}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder='Nhập nội dung đáp án hoặc từ khóa để chấm điểm tự luận...'
                    className='rounded-lg text-base font-medium'
                    style={{ fontSize: '15px' }}
                  />
                </Form.Item>
              </div>
            )}

            {/* 3.3. Đúng / Sai — y như bảng đáp án Trắc nghiệm 1 lựa chọn ở trên (badge số thứ tự +
                 ô nhập + checkbox), chỉ khác là checkbox không loại trừ lẫn nhau (được chọn nhiều ý
                 đúng cùng lúc) thay vì bắt buộc đúng 1 đáp án như trắc nghiệm đơn. Thành phần năng
                 lực/Cấp độ tư duy/Chủ đề/Tiểu mục giờ dùng chung 1 bộ ở "Phần 1" phía trên, không còn
                 lặp lại riêng cho từng ý (4 ý luôn thuộc cùng 1 chủ đề/tiểu mục/cấp độ/năng lực). */}
            {questionType === 'true_false' && (
              <div className='mt-2 animate-in fade-in duration-200'>
                <div className='text-[17px] font-bold text-blue-700 mb-1.5'>
                  Thông tin câu trả lời Đúng / Sai
                </div>

                <div className='border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm'>
                  <div className='flex items-center justify-between px-3 py-1.5 bg-slate-50 border-y border-slate-200 text-[12px] font-bold text-slate-500 uppercase tracking-wide'>
                    <span>
                      Nội dung trả lời{' '}
                      <span className='text-red-500 normal-case'>*</span>
                    </span>
                    <span className='pr-8'>Đáp án đúng</span>
                  </div>
                  <div className='divide-y divide-slate-100'>
                    {statements.map((st, idx) => (
                      <div
                        key={idx}
                        className='flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50/70 transition-colors'
                      >
                        <div className='w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-[13px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5'>
                          {idx + 1}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <Input
                            size='large'
                            value={st.content}
                            onChange={(e) =>
                              updateStatementRow(idx, {
                                content: e.target.value,
                              })
                            }
                            placeholder={`Ý trả lời thứ ${idx + 1}`}
                            className='text-base rounded-lg h-9 font-medium'
                          />
                        </div>
                        <div className='flex items-center gap-2 flex-shrink-0 pt-1.5 w-16 justify-end'>
                          <Checkbox
                            checked={st.isCorrect}
                            onChange={(e) =>
                              updateStatementRow(idx, {
                                isCorrect: e.target.checked,
                              })
                            }
                            style={{ transform: 'scale(1.15)' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3.4. Câu hỏi nhóm */}
            {questionType === 'multiple' && (
              <div className='mt-2 animate-in fade-in duration-200'>
                <div className='flex items-center justify-between mb-1.5'>
                  <div className='text-[17px] font-bold text-blue-700'>
                    Thông tin câu trả lời
                  </div>
                  <Button
                    type='primary'
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingSubQuestionId(null);
                      subQuestionForm.resetFields();
                      setSubQuestionModalOpen(true);
                    }}
                    className='bg-blue-600 border-transparent text-white rounded-lg hover:bg-blue-700 flex items-center justify-center h-9 w-9'
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                <table className='w-full border-collapse text-base'>
                  <thead>
                    <tr className='border-b border-slate-200 bg-slate-50/50'>
                      <th className='text-left py-2 px-3 text-slate-600 font-bold w-16 text-[15px]'>
                        STT
                      </th>
                      <th className='text-left py-2 px-3 text-slate-600 font-bold text-[15px]'>
                        Nội dung câu hỏi
                      </th>
                      <th className='text-left py-2 px-3 text-slate-600 font-bold w-44 text-[15px]'>
                        Loại câu hỏi
                      </th>
                      <th className='text-left py-2 px-3 text-slate-600 font-bold w-32 text-[15px]'>
                        Liên kết
                      </th>
                      <th className='text-center py-2 px-3 text-slate-600 font-bold w-28 text-[15px]'>
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subQuestions.map((sub, idx) => (
                      <tr
                        key={sub.id}
                        className='border-b border-slate-100 hover:bg-slate-50'
                      >
                        <td className='py-2.5 px-3 text-slate-500 font-mono align-middle text-[15px]'>
                          {idx + 1}
                        </td>
                        <td className='py-2.5 px-3 text-slate-800 font-semibold align-middle text-[15px]'>
                          {sub.text}
                        </td>
                        <td className='py-2.5 px-3 text-slate-600 align-middle text-[15px]'>
                          {getSubQuestionTypeLabel(sub.type)}
                        </td>
                        <td className='py-2.5 px-3 text-slate-600 align-middle text-[15px]'>
                          {sub.link || '-'}
                        </td>
                        <td className='py-2.5 px-3 text-center align-middle'>
                          <div className='flex items-center justify-center gap-2'>
                            <Button
                              type='text'
                              icon={
                                <EditOutlined className='text-blue-600 text-lg' />
                              }
                              className='flex items-center justify-center hover:bg-blue-50 w-9 h-9 rounded border-slate-200 border'
                              onClick={() => {
                                setEditingSubQuestionId(sub.id);
                                subQuestionForm.setFieldsValue({
                                  text: sub.text,
                                  type: sub.type,
                                  link: sub.link,
                                });
                                setSubQuestionModalOpen(true);
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            <Button
                              type='text'
                              danger
                              icon={
                                <DeleteOutlined className='text-red-500 text-lg' />
                              }
                              className='flex items-center justify-center hover:bg-red-50 w-9 h-9 rounded border-red-200 border'
                              onClick={() => {
                                setSubQuestions((prev) =>
                                  prev.filter((item) => item.id !== sub.id),
                                );
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Form>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className='flex items-center justify-center gap-3 px-6 py-3 border-t border-slate-200 bg-white'>
        <Button
          onClick={handleClose}
          disabled={submitting !== null}
          className='rounded-lg text-base font-bold px-6 h-9'
        >
          Đóng
        </Button>
        <Button
          type='primary'
          className='rounded-lg text-base font-bold px-6 bg-blue-600 border-blue-600 h-9'
          loading={submitting === 'draft'}
          disabled={submitting !== null && submitting !== 'draft'}
          onClick={handleSave}
        >
          Lưu
        </Button>
        <Button
          type='primary'
          className='rounded-lg text-base font-bold px-6 bg-[#002147] border-[#002147] hover:bg-slate-800 h-9'
          loading={submitting === 'pending'}
          disabled={submitting !== null && submitting !== 'pending'}
          onClick={handleSendReview}
        >
          Gửi thẩm định
        </Button>
      </div>

      {/* ── Modal con thêm/sửa Câu hỏi con (Dành cho Câu hỏi nhóm) ── */}
      <Modal
        title={null}
        open={subQuestionModalOpen}
        onCancel={() => setSubQuestionModalOpen(false)}
        footer={null}
        centered
        width={1140}
        styles={{ body: { padding: 0 } }}
      >
        {/* Header modal con */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-slate-200'>
          <span className='text-[17px] font-extrabold text-slate-800'>
            {editingSubQuestionId
              ? 'Chỉnh sửa câu hỏi thành phần'
              : 'Thêm mới câu hỏi thành phần'}
          </span>
        </div>

        <div
          className='px-6 py-4 overflow-y-auto'
          style={{ maxHeight: 'calc(100vh - 175px)' }}
        >
          <Form
            form={subQuestionForm}
            layout='vertical'
            onValuesChange={(changed) => {
              if (changed.type) setSubQuestionType(changed.type);
              if (changed.chuDecon) {
                setSubFormTopicKey(changed.chuDecon);
                subQuestionForm.setFieldValue('tieuMuccon', undefined);
              }
            }}
          >
            {/* ── Thông tin câu hỏi thành phần ── */}
            <div className='text-[15px] font-bold text-blue-700 mb-3'>
              Thông tin câu hỏi thành phần
            </div>

            {/* Hàng 1: Loại câu hỏi | Chủ đề | Tiểu mục chủ đề */}
            <div className='grid grid-cols-3 gap-3 mb-1'>
              <Form.Item
                name='type'
                label={
                  <span className='text-[14px] font-semibold text-slate-700'>
                    Loại câu hỏi <span className='text-red-500'>*</span>
                  </span>
                }
                rules={[
                  { required: true, message: 'Vui lòng chọn loại câu hỏi!' },
                ]}
                initialValue='single'
                style={{ marginBottom: '8px' }}
              >
                <Select
                  size='large'
                  className='w-full text-base font-medium'
                  options={[
                    { value: 'single', label: 'Câu kéo thả' },
                    { value: 'multiple', label: 'Đa lựa chọn' },
                    { value: 'true_false', label: 'Đúng sai' },
                    { value: 'short', label: 'Trả lời ngắn' },
                  ]}
                  onChange={(val) => setSubQuestionType(val)}
                />
              </Form.Item>

              <Form.Item
                name='chuDecon'
                label={
                  <span className='text-[14px] font-semibold text-slate-700'>
                    Chủ đề
                  </span>
                }
                style={{ marginBottom: '8px' }}
              >
                <Select
                  size='large'
                  className='w-full text-base font-medium'
                  placeholder='Rời rạc'
                  options={topicTreeData.map((t) => ({
                    value: t.key as string,
                    label: t.title as string,
                  }))}
                  onChange={(val: string) => {
                    setSubFormTopicKey(val);
                    subQuestionForm.setFieldValue('tieuMuccon', undefined);
                  }}
                />
              </Form.Item>

              <Form.Item
                name='tieuMuccon'
                label={
                  <span className='text-[14px] font-semibold text-slate-700'>
                    Tiểu mục chủ đề
                  </span>
                }
                style={{ marginBottom: '8px' }}
              >
                <Select
                  size='large'
                  className='w-full text-base font-medium'
                  placeholder='Biến ngẫu nhiên rời rạc'
                  options={
                    topicTreeData
                      .find((t) => t.key === subFormTopicKey)
                      ?.children?.map((c) => ({
                        value: c.key as string,
                        label: c.title as string,
                      })) ?? []
                  }
                  disabled={!subFormTopicKey}
                />
              </Form.Item>
            </div>

            {/* Hàng 2: Cấp độ tư duy | Thứ tự liên kết | Thành phần năng lực */}
            <div className='grid grid-cols-3 gap-3 mb-3'>
              <Form.Item
                name='level'
                label={
                  <span className='text-[14px] font-semibold text-slate-700'>
                    Cấp độ tư duy <span className='text-red-500'>*</span>
                  </span>
                }
                rules={[{ required: true, message: 'Vui lòng chọn cấp độ!' }]}
                initialValue='thong_hieu'
                style={{ marginBottom: '8px' }}
              >
                <Select
                  size='large'
                  className='w-full text-base font-medium'
                  options={[
                    { value: 'nhan_biet', label: 'Biết' },
                    { value: 'thong_hieu', label: 'Hiểu' },
                    { value: 'van_dung', label: 'Vận dụng' },
                    { value: 'van_dung_cao', label: 'Vận dụng cao' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name='link'
                label={
                  <span className='text-[14px] font-semibold text-slate-700'>
                    Thứ tự liên kết nhóm câu hỏi{' '}
                    <span className='text-red-500'>*</span>
                  </span>
                }
                rules={[{ required: true, message: 'Vui lòng nhập thứ tự!' }]}
                initialValue='1'
                style={{ marginBottom: '8px' }}
              >
                <Input size='large' className='w-full text-base font-medium' />
              </Form.Item>

              <Form.Item
                name='nangLuc'
                label={
                  <span className='text-[14px] font-semibold text-slate-700'>
                    Thành phần năng lực <span className='text-red-500'>*</span>
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng chọn thành phần năng lực!',
                  },
                ]}
                initialValue='Nhận thức Toán'
                style={{ marginBottom: '8px' }}
              >
                <Select
                  size='large'
                  className='w-full text-base font-medium'
                  options={nangLucOptions}
                />
              </Form.Item>
            </div>

            {/* Nội dung câu hỏi */}
            <Form.Item
              name='text'
              label={
                <span className='text-[14px] font-semibold text-slate-700'>
                  Nội dung câu hỏi <span className='text-red-500'>*</span>
                </span>
              }
              rules={[
                { required: true, message: 'Vui lòng nhập nội dung câu hỏi!' },
              ]}
              style={{ marginBottom: '16px' }}
            >
              <div className='border border-slate-300 rounded-lg overflow-hidden'>
                {/* Toolbar giả lập */}
                <div className='flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-slate-200 bg-slate-50'>
                  {['H1', 'H2'].map((t) => (
                    <button
                      key={t}
                      type='button'
                      className='px-1.5 py-0.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors'
                      style={{ cursor: 'pointer' }}
                    >
                      {t}
                    </button>
                  ))}
                  <span className='w-px h-4 bg-slate-300 mx-1' />
                  {[
                    { t: 'B', cls: 'font-black' },
                    { t: 'I', cls: 'italic' },
                    { t: 'U', cls: 'underline' },
                  ].map(({ t, cls }) => (
                    <button
                      key={t}
                      type='button'
                      className={`px-1.5 py-0.5 text-[13px] font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors ${cls}`}
                      style={{ cursor: 'pointer' }}
                    >
                      {t}
                    </button>
                  ))}
                  <span className='w-px h-4 bg-slate-300 mx-1' />
                  {['🔗', '🖼', 'Σ'].map((t, i) => (
                    <button
                      key={i}
                      type='button'
                      className='px-1 py-0.5 text-[13px] text-slate-500 hover:bg-slate-200 rounded transition-colors'
                      style={{ cursor: 'pointer' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <Form.Item name='text' noStyle>
                  <Input.TextArea
                    placeholder='Nhập'
                    rows={4}
                    className='border-0 rounded-none text-base resize-none'
                    style={{ boxShadow: 'none', fontSize: '15px' }}
                  />
                </Form.Item>
              </div>
            </Form.Item>

            {/* ── Thông tin câu trả lời ── */}
            <div className='text-[15px] font-bold text-blue-700 mb-2'>
              Thông tin câu trả lời
            </div>

            <table className='w-full border-collapse text-base'>
              <thead>
                <tr className='border-b border-slate-200'>
                  <th className='text-left py-2 px-3 text-slate-600 font-bold w-12 text-[14px]'>
                    STT
                  </th>
                  <th className='text-left py-2 px-3 text-slate-600 font-bold text-[14px]'>
                    Nội dung trả lời <span className='text-red-500'>*</span>
                  </th>
                  <th className='text-center py-2 px-3 text-slate-600 font-bold w-28 text-[14px]'>
                    Đáp án đúng
                  </th>
                </tr>
              </thead>
              <tbody>
                {subAnswers.map((ans, idx) => (
                  <tr
                    key={ans.id}
                    className='border-b border-slate-100 hover:bg-slate-50'
                  >
                    <td className='py-2.5 px-3 text-slate-400 font-mono align-middle text-[14px]'>
                      {idx + 1}
                    </td>
                    <td className='py-2.5 px-3 align-middle'>
                      <Input
                        size='large'
                        value={ans.content}
                        onChange={(e) =>
                          setSubAnswers((prev) =>
                            prev.map((a) =>
                              a.id === ans.id
                                ? { ...a, content: e.target.value }
                                : a,
                            ),
                          )
                        }
                        placeholder={`Lựa chọn trả lời ${String(idx + 1).padStart(2, '0')}`}
                        className='text-base rounded-lg font-medium'
                      />
                    </td>
                    <td className='py-2.5 px-3 text-center align-middle'>
                      <Checkbox
                        checked={ans.isCorrect}
                        onChange={() =>
                          setSubAnswers((prev) =>
                            subQuestionType === 'single'
                              ? prev.map((a) => ({
                                  ...a,
                                  isCorrect: a.id === ans.id,
                                }))
                              : prev.map((a) =>
                                  a.id === ans.id
                                    ? { ...a, isCorrect: !a.isCorrect }
                                    : a,
                                ),
                          )
                        }
                        style={{ transform: 'scale(1.1)' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className='mt-2'>
              <button
                type='button'
                onClick={() => {
                  const newId =
                    subAnswers.length > 0
                      ? Math.max(...subAnswers.map((a) => a.id)) + 1
                      : 1;
                  setSubAnswers((prev) => [
                    ...prev,
                    { id: newId, content: '', isCorrect: false },
                  ]);
                }}
                className='text-[14px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors'
                style={{ cursor: 'pointer' }}
              >
                <PlusOutlined className='text-xs' /> Thêm lựa chọn
              </button>
            </div>
          </Form>
        </div>

        {/* Footer modal con */}
        <div className='flex items-center justify-center gap-3 px-6 py-4 border-t border-slate-200'>
          <Button
            onClick={() => setSubQuestionModalOpen(false)}
            className='rounded-lg text-base font-bold px-6 h-9'
          >
            Đóng
          </Button>
          <Button
            type='primary'
            className='rounded-lg text-base font-bold px-6 bg-blue-600 border-blue-600 h-9'
            onClick={() => {
              subQuestionForm.validateFields().then((values) => {
                if (editingSubQuestionId) {
                  setSubQuestions((prev) =>
                    prev.map((item) =>
                      item.id === editingSubQuestionId
                        ? {
                            ...item,
                            text: values.text,
                            type: values.type,
                            link: values.link,
                          }
                        : item,
                    ),
                  );
                  toast.success('Cập nhật câu hỏi con thành công!');
                } else {
                  const newId =
                    subQuestions.length > 0
                      ? Math.max(...subQuestions.map((s) => s.id)) + 1
                      : 1;
                  setSubQuestions((prev) => [
                    ...prev,
                    {
                      id: newId,
                      text: values.text,
                      type: values.type,
                      link: values.link,
                    },
                  ]);
                  toast.success('Thêm câu hỏi con thành công!');
                }
                setSubQuestionModalOpen(false);
                setSubAnswers(DEFAULT_ANSWERS.map((a) => ({ ...a })));
              });
            }}
          >
            {editingSubQuestionId ? 'Cập nhật' : 'Thêm'}
          </Button>
        </div>
      </Modal>
    </Modal>
  );
}
