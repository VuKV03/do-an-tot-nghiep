import React, { useState, useMemo } from 'react';
import {
  Tree,
  Select,
  Input,
  Button,
  Table,
  Tooltip,
  Modal,
  Radio,
  ConfigProvider,
  DatePicker,
  Divider
} from 'antd';
import { toast } from '../../../../utils/toast';
import type { ColumnsType } from 'antd/es/table';
import {
  FilterOutlined,
  SearchOutlined,
  HistoryOutlined,
  FileTextOutlined,
  EditOutlined
} from '@ant-design/icons';
import { Question, QuestionType, CognitiveLevel, QuestionStatus, TopicNode } from '../../../../types';
import { SUBJECTS, GRADES, TOPICS_TREE } from '../../../../data';
import { RichTextView, stripHtmlToText, renderQuestionPreview } from '../../../../utils/htmlContent';
import QuestionHistoryModal from '../history';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ThamDinhCauHoiProps {
  questions: Question[];
  onUpdateQuestion: (q: Question) => void;
  onOpenReview: (q: Question) => void;
  apiSubjects?: { value: string; label: string }[];
  apiGrades?: { value: string; label: string }[];
  cognitiveLevelOptions?: { value: CognitiveLevel; label: string }[];
  questionTypeOptions?: { value: QuestionType; label: string }[];
  allTopicsRaw?: any[];
  topicsLoading?: boolean;
  onApproveQuestion?: (id: string, comment: string) => void;
  onRejectQuestion?: (id: string, comment: string) => void;
  onBulkReviewQuestions?: (ids: string[], verdict: 'approve' | 'reject', comment: string) => void;
  onEditQuestion?: (q: Question) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getQuestionTypeLabel(type: QuestionType): string {
  switch (type) {
    case 'single':     return 'TN';
    case 'multiple':   return 'TLN';
    case 'true_false': return 'DS';
    case 'short':      return 'TL';
    default:           return 'TN';
  }
}

function getCognitiveLevelLabel(level: CognitiveLevel): string {
  switch (level) {
    case 'nhan_biet':    return 'NB';
    case 'thong_hieu':   return 'TH';
    case 'van_dung':     return 'VD';
    case 'van_dung_cao': return 'VDC';
    default:             return 'NB';
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'dd/mm/yyyy';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'dd/mm/yyyy';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return 'dd/mm/yyyy';
  }
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-block px-2.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-700 font-bold text-[10px] whitespace-nowrap">
          Đã thẩm định
        </span>
      );
    case 'pending':
      return (
        <span className="inline-block px-2.5 py-0.5 rounded border border-blue-300 bg-blue-50 text-blue-700 font-bold text-[10px] whitespace-nowrap">
          Chờ thẩm định
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-block px-2.5 py-0.5 rounded border border-rose-300 bg-rose-50 text-rose-600 font-bold text-[10px] whitespace-nowrap">
          Từ chối
        </span>
      );
    case 'draft':
    default:
      return (
        <span className="inline-block px-2.5 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-700 font-bold text-[10px] whitespace-nowrap">
          Tạo mới
        </span>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Review Detail Modal (inline)
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewDetailModalProps {
  question: Question | null;
  onClose: () => void;
  onApprove: (q: Question, comment: string) => void;
  onReject: (q: Question, comment: string) => void;
}

function ReviewDetailModal({ question, onClose, onApprove, onReject }: ReviewDetailModalProps) {
  const [verdict, setVerdict]     = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!verdict) { toast.warning('Vui lòng chọn kết quả thẩm định!'); return; }
    if (!question) return;
    setSubmitting(true);
    setTimeout(() => {
      if (verdict === 'approve') onApprove(question, comment);
      else onReject(question, comment);
      setVerdict(null);
      setComment('');
      setSubmitting(false);
      onClose();
    }, 600);
  };

  const handleCancel = () => { setVerdict(null); setComment(''); onClose(); };

  if (!question) return null;

  return (
    <Modal
      open={!!question}
      onCancel={handleCancel}
      footer={null}
      width={720}
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined className="text-blue-600" />
          <span className="text-[#002147] font-black text-sm tracking-tight">
            Thẩm định / Phản biện — {question.code}
          </span>
        </div>
      }
      destroyOnHidden
      styles={{ body: { padding: '20px 24px 8px' } }}
    >
      {/* Question info */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="font-bold text-slate-500">Mã câu hỏi:</span> <span className="font-mono font-bold text-slate-800">{question.code}</span></div>
          <div><span className="font-bold text-slate-500">Loại:</span> <span className="font-semibold text-slate-700">{getQuestionTypeLabel(question.type)}</span></div>
          <div><span className="font-bold text-slate-500">Môn học:</span> <span className="text-slate-700">{question.subject}</span></div>
          <div><span className="font-bold text-slate-500">Khối lớp:</span> <span className="text-slate-700">{question.grade}</span></div>
          <div><span className="font-bold text-slate-500">Cấp độ:</span> <span className="text-slate-700">{getCognitiveLevelLabel(question.level)}</span></div>
          <div><span className="font-bold text-slate-500">Chủ đề:</span> <span className="text-slate-700">{question.topicName || '—'}</span></div>
          <div><span className="font-bold text-slate-500">Người soạn:</span> <span className="text-slate-700">{question.creator}</span></div>
          <div><span className="font-bold text-slate-500">Ngày tạo:</span> <span className="text-slate-700">{formatDate(question.createdAt)}</span></div>
        </div>
        <Divider className="my-2" />
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nội dung câu hỏi</div>
          <RichTextView html={question.text} className="text-sm text-slate-800 font-medium leading-relaxed" />
        </div>
        {question.options && question.options.length > 0 && (
          <div className="space-y-1.5 mt-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Các phương án</div>
            {question.options.map((opt, i) => (
              <div
                key={i}
                className={`text-xs px-3 py-1.5 rounded border font-medium ${
                  opt === question.correctAnswer
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <RichTextView html={opt} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verdict */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4 space-y-3">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Kết quả thẩm định</div>
        <Radio.Group value={verdict} onChange={(e) => setVerdict(e.target.value)} className="flex gap-4">
          <Radio value="approve">
            <span className="text-emerald-700 font-bold text-xs">✅ Đồng ý / Thông qua</span>
          </Radio>
          <Radio value="reject">
            <span className="text-rose-600 font-bold text-xs">❌ Từ chối</span>
          </Radio>
        </Radio.Group>
        <div>
          <div className="text-[11px] font-bold text-slate-500 mb-1">Nhận xét / Ghi chú (tuỳ chọn)</div>
          <Input.TextArea
            rows={3}
            placeholder="Nhập nhận xét thẩm định..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="text-xs rounded border-slate-300"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2 pb-1">
        <Button onClick={handleCancel} className="text-xs font-bold border-slate-300 h-9 px-6 rounded cursor-pointer" style={{ cursor: 'pointer' }}>
          Huỷ
        </Button>
        <Button
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          className="bg-[#1a4f9c] text-white font-bold text-xs h-9 px-8 rounded cursor-pointer"
          style={{ cursor: 'pointer' }}
        >
          Xác nhận thẩm định
        </Button>
      </div>
    </Modal>
  );
}

interface BulkReviewModalProps {
  visible: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (verdict: 'approve' | 'reject', comment: string) => void;
}

function BulkReviewModal({ visible, count, onClose, onConfirm }: BulkReviewModalProps) {
  const [verdict, setVerdict]     = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!verdict) { toast.warning('Vui lòng chọn kết quả thẩm định!'); return; }
    setSubmitting(true);
    setTimeout(() => {
      onConfirm(verdict, comment);
      setVerdict(null);
      setComment('');
      setSubmitting(false);
      onClose();
    }, 600);
  };

  const handleCancel = () => { setVerdict(null); setComment(''); onClose(); };

  return (
    <Modal
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={540}
      title={
        <span className="text-[#002147] font-black text-sm tracking-tight">
          Thẩm định nhiều câu hỏi
        </span>
      }
      destroyOnHidden
      styles={{ body: { padding: '20px 24px 8px' } }}
    >
      <div className="text-[#1a4f9c] font-bold text-sm mb-4">
        Thẩm định nhanh {count} câu hỏi
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4 space-y-4">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
            KẾT QUẢ THẨM ĐỊNH
          </div>
          <Radio.Group value={verdict} onChange={(e) => setVerdict(e.target.value)} className="flex gap-4">
            <Radio value="approve">
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-4 h-4 bg-emerald-500 text-white rounded text-[10px] font-black leading-none">✓</span>
                Đồng ý / Thông qua
              </span>
            </Radio>
            <Radio value="reject">
              <span className="text-rose-600 font-bold text-xs flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-4 h-4 bg-rose-500 text-white rounded text-[10px] font-black leading-none">✗</span>
                Từ chối
              </span>
            </Radio>
          </Radio.Group>
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-500 mb-1">Nhận xét / Ghi chú (tuỳ chọn)</div>
          <Input.TextArea
            rows={3}
            placeholder="Nhập nhận xét thẩm định..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="text-xs rounded border-slate-300"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 pb-1">
        <Button onClick={handleCancel} className="text-xs font-bold border-slate-300 h-9 px-6 rounded cursor-pointer" style={{ cursor: 'pointer' }}>
          Huỷ
        </Button>
        <Button
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          className="bg-[#1a4f9c] text-white font-bold text-xs h-9 px-8 rounded cursor-pointer"
          style={{ cursor: 'pointer' }}
        >
          Xác nhận thẩm định
        </Button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ThamDinhCauHoiTab({
  questions,
  onUpdateQuestion,
  onOpenReview,
  apiSubjects = [],
  apiGrades = [],
  cognitiveLevelOptions = [],
  questionTypeOptions = [],
  allTopicsRaw = [],
  topicsLoading = false,
  onApproveQuestion,
  onRejectQuestion,
  onBulkReviewQuestions,
  onEditQuestion,
}: ThamDinhCauHoiProps) {

  // ── Sidebar state ──────────────────────────────
  const [selectedSubject, setSelectedSubject]     = useState<string>('');
  const [selectedGrade, setSelectedGrade]         = useState<string>('');
  const [selectedTopicKey, setSelectedTopicKey]   = useState<string | null>(null);
  const [topicSearch, setTopicSearch]             = useState('');

  // ── Filter inputs ──────────────────────────────
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterGrades, setFilterGrades]   = useState<string[]>([]);
  const [filterType, setFilterType]       = useState<QuestionType | 'all'>('all');
  const [filterLevel, setFilterLevel]     = useState<CognitiveLevel | 'all'>('all');
  const [filterStatus, setFilterStatus]   = useState<QuestionStatus | 'all'>('pending');
  const [filterDates, setFilterDates]     = useState<any>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Applied after "Tìm kiếm" button
  const [applied, setApplied] = useState({
    keyword: '',
    grades:  [] as string[],
    type:    'all' as QuestionType | 'all',
    level:   'all' as CognitiveLevel | 'all',
    status:  'pending' as QuestionStatus | 'all',
    dates:   null as any
  });

  // ── Row selection & Modals ─────────────────────
  const [selectedRowKeys, setSelectedRowKeys]   = useState<React.Key[]>([]);
  const [reviewQuestion, setReviewQuestion]     = useState<Question | null>(null);
  const [historyQuestion, setHistoryQuestion]   = useState<Question | null>(null);
  const [isBulkReviewOpen, setIsBulkReviewOpen] = useState(false);

  // ── Derived: topic tree ────────────────────────
  const subjectDropdownOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả' },
      ...(apiSubjects.length > 0 ? apiSubjects : SUBJECTS)
    ],
    [apiSubjects]
  );
  const gradeDropdownOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả' },
      ...(apiGrades.length > 0 ? apiGrades : GRADES)
    ],
    [apiGrades]
  );

  const topicTreeData = useMemo(() => {
    if (allTopicsRaw.length === 0) return [];
    
    // Filter topics matching selected subject (and optionally grade)
    const filtered = allTopicsRaw.filter((t: any) => {
      const matchSubject = !selectedSubject || t.subject_name === selectedSubject;
      const matchGrade = !selectedGrade || t.grade_name === selectedGrade;
      return matchSubject && matchGrade;
    });

    // Only show approved topics (status === 2)
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
        if (n.children && n.children.length === 0) {
          delete n.children;
        } else if (n.children) {
          clean(n.children);
        }
      });
    };
    clean(roots);

    if (!topicSearch.trim()) return roots;
    const kw = topicSearch.trim().toLowerCase();
    
    const filterTree = (nodes: any[]): any[] => {
      return nodes.reduce((acc, node) => {
        const match = node.title.toLowerCase().includes(kw);
        let children = [];
        if (node.children) {
          children = filterTree(node.children);
        }
        if (match || children.length > 0) {
          acc.push({ ...node, children: children.length > 0 ? children : undefined });
        }
        return acc;
      }, []);
    };

    return filterTree(roots);
  }, [allTopicsRaw, selectedSubject, selectedGrade, topicSearch]);


  // ── Derived: filtered questions ────────────────
  const filteredQuestions = useMemo(() => {
    // Only show pending, approved, and rejected in review tab
    const relevantQuestions = questions.filter(q => q.status === 'pending' || q.status === 'approved' || q.status === 'rejected');

    return relevantQuestions.filter((q) => {
      if (selectedSubject && q.subject !== selectedSubject) return false;
      if (selectedGrade && q.grade !== selectedGrade) return false;
      if (selectedTopicKey) {
        const isChild = topicTreeData.some((t) =>
          t.children?.some((c) => c.key === q.topicId)
        );
        if (q.topicId !== selectedTopicKey && !isChild) return false;
      }
      const kw = applied.keyword.trim();
      if (kw) {
        const hay = `${q.code} ${stripHtmlToText(q.text)} ${q.creator}`.toLowerCase();
        if (!hay.includes(kw.toLowerCase())) return false;
      }
      if (applied.grades.length > 0 && !applied.grades.includes(q.grade)) return false;
      if (applied.type   !== 'all' && q.type   !== applied.type)   return false;
      if (applied.level  !== 'all' && q.level  !== applied.level)  return false;
      if (applied.status !== 'all' && q.status !== applied.status) return false;
      if (applied.dates && applied.dates[0] && applied.dates[1]) {
        const start = applied.dates[0].startOf('day').toDate() as Date;
        const end   = applied.dates[1].endOf('day').toDate() as Date;
        const d     = new Date(q.createdAt);
        if (d < start || d > end) return false;
      }
      return true;
    });
  }, [questions, selectedSubject, selectedGrade, selectedTopicKey, topicTreeData, applied]);

  // ── Handlers ──────────────────────────────────
  const handleSearch = () => {
    setApplied({ keyword: filterKeyword, grades: filterGrades, type: filterType, level: filterLevel, status: filterStatus, dates: filterDates });
  };

  const handleReset = () => {
    setFilterKeyword(''); setFilterGrades([]); setFilterType('all');
    setFilterLevel('all'); setFilterStatus('pending'); setFilterDates(null);
    setApplied({ keyword: '', grades: [], type: 'all', level: 'all', status: 'pending', dates: null });
  };

  const handleBulkReview = () => {
    if (selectedRowKeys.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một câu hỏi để thẩm định!');
      return;
    }
    setIsBulkReviewOpen(true);
  };

  const handleApprove = (q: Question, _comment: string) => {
    onUpdateQuestion({ ...q, status: 'approved' as QuestionStatus });
    toast.success(`✅ Đã thông qua câu hỏi ${q.code}!`);
  };

  const handleReject = (q: Question, _comment: string) => {
    onUpdateQuestion({ ...q, status: 'draft' as QuestionStatus });
    toast.error(`❌ Đã từ chối câu hỏi ${q.code}.`);
  };

  // ── Table columns ──────────────────────────────
  const columns: ColumnsType<Question> = [
    {
      title: 'STT',
      width: 50,
      align: 'center',
      render: (_: any, __: Question, idx: number) => (
        <span className="font-mono text-slate-500 text-xs">{idx + 1}</span>
      )
    },
    {
      title: 'Mã câu hỏi',
      dataIndex: 'code',
      width: 100,
      render: (code: string) => (
        <span className="font-semibold text-slate-700 text-xs font-mono">{code}</span>
      )
    },
    {
      title: 'Nội dung câu hỏi',
      dataIndex: 'text',
      width: 350,
      render: (text: string) => {
        return (
          <Tooltip title={renderQuestionPreview(text)}>
            <div
              className="text-slate-700 font-normal text-xs hover:text-[#002147] cursor-pointer transition-colors"
              style={{
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: '320px',
              }}
            >
              {renderQuestionPreview(text)}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Loại câu hỏi',
      dataIndex: 'type',
      width: 90,
      align: 'center',
      render: (type: QuestionType) => (
        <span className="text-xs text-slate-600 font-semibold">{getQuestionTypeLabel(type)}</span>
      )
    },
    {
      title: 'Cấp độ tư duy',
      dataIndex: 'level',
      width: 100,
      align: 'center',
      render: (level: CognitiveLevel) => (
        <span className="text-xs text-slate-600 font-semibold">{getCognitiveLevelLabel(level)}</span>
      )
    },
    {
      title: 'Người biên soạn',
      dataIndex: 'creator',
      width: 130,
      ellipsis: true,
      render: (creator: string) => (
        <span className="text-slate-600 text-xs">{creator}</span>
      )
    },
    {
      title: 'Thành phần năng lực',
      dataIndex: 'nangLuc',
      width: 140,
      ellipsis: true,
      render: (nangLuc: string) => (
        <span className="text-slate-500 text-xs">{nangLuc || '.............................'}</span>
      )
    },
    {
      title: 'Thuộc chủ đề',
      dataIndex: 'topicName',
      width: 120,
      ellipsis: true,
      render: (topicName: string) => (
        <span className="text-slate-600 text-xs">{topicName || '—'}</span>
      )
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 95,
      render: (createdAt: string) => (
        <span className="text-slate-500 text-xs">{formatDate(createdAt)}</span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (status: QuestionStatus) => <StatusBadge status={status} />
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_: any, record: Question) => {
        const canEditQuestion = record.status === 'draft' || record.status === 'pending';
        return (
          <div className="flex items-center justify-center gap-1.5">
            <Tooltip title="Thẩm định chi tiết">
              <Button
                type="text"
                icon={<FileTextOutlined className="text-blue-600 text-xs" />}
                className="flex items-center justify-center w-7 h-7 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                onClick={() => setReviewQuestion(record)}
                style={{ cursor: 'pointer' }}
              />
            </Tooltip>
            {canEditQuestion && onEditQuestion && (
              <Tooltip title="Chỉnh sửa">
                <Button
                  type="text"
                  icon={<EditOutlined className="text-blue-600 text-xs" />}
                  className="flex items-center justify-center w-7 h-7 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                  onClick={() => onEditQuestion(record)}
                  style={{ cursor: 'pointer' }}
                />
              </Tooltip>
            )}
            <Tooltip title="Lịch sử thẩm định">
              <Button
                type="text"
                icon={<HistoryOutlined className="text-slate-500 text-xs" />}
                className="flex items-center justify-center w-7 h-7 hover:bg-slate-100 rounded border border-slate-200"
                onClick={() => setHistoryQuestion(record)}
                style={{ cursor: 'pointer' }}
              />
            </Tooltip>
          </div>
        );
      }
    }
  ];

  // ─────────────────────────────────────────────
  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: '#1a4f9c', borderRadius: 6 },
        components: {
          Table: { headerBg: '#f8fafc', headerColor: '#334155', rowHoverBg: '#f1f5f9' }
        }
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch lg:max-h-[calc(100vh-170px)] animate-in fade-in duration-300">

        {/* ══ LEFT SIDEBAR ══ — vị trí cố định, không di chuyển theo scroll */}
        <div
          id="tham-dinh-left-sidebar"
          className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white shadow-xs p-4 lg:max-h-[calc(100vh-170px)] overflow-y-auto flex flex-col"
        >
          {/* Subject + Grade */}
          <div className="space-y-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wide">
              <FilterOutlined className="text-blue-900" />
              <span>Phân loại kiểm tra</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Môn học <span className="text-red-500">*</span>
              </label>
              <Select
                id="tham-dinh-select-subject"
                value={selectedSubject}
                onChange={(val) => { setSelectedSubject(val); setSelectedTopicKey(null); }}
                options={subjectDropdownOptions}
                className="w-full text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Khối lớp học
              </label>
              <Select
                id="tham-dinh-select-grade"
                value={selectedGrade}
                onChange={setSelectedGrade}
                options={gradeDropdownOptions}
                className="w-full text-xs font-bold"
              />
            </div>
          </div>

          {/* Topic tree */}
          <div className="flex-1 mt-4 overflow-y-auto pr-1 flex flex-col gap-3">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Chọn chủ đề
            </label>
            <Input
              prefix={<SearchOutlined className="text-slate-400 text-xs" />}
              placeholder="Tìm kiếm chủ đề"
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              className="rounded border-slate-250 text-xs"
              size="small"
            />

            {topicTreeData.length > 0 ? (
              <Tree
                showLine={{ showLeafIcon: false }}
                blockNode
                defaultExpandAll
                onSelect={(keys) => setSelectedTopicKey(keys.length > 0 ? String(keys[0]) : null)}
                treeData={topicTreeData}
                selectedKeys={selectedTopicKey ? [selectedTopicKey] : []}
                className="text-xs font-medium text-slate-700 bg-transparent"
              />
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">
                Chưa có chủ đề cho môn học này
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Button
              className="w-full text-[11px] font-extrabold bg-slate-50 border-slate-200 text-slate-600 rounded-lg py-1 hover:bg-slate-100 cursor-pointer"
              onClick={() => { setSelectedTopicKey(null); setTopicSearch(''); handleReset(); }}
              style={{ cursor: 'pointer' }}
            >
              Làm sạch bộ lọc
            </Button>
          </div>
        </div>

        {/* ══ RIGHT CONTENT ══ */}
        <div className="lg:col-span-4 flex flex-col space-y-4 lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto lg:pr-1" id="tham-dinh-right-content">

          {/* ── Search card ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-300">
            <div
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`flex items-center justify-between text-slate-800 font-extrabold text-xs uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors select-none ${
                isFilterExpanded ? 'pb-3 mb-4 border-b border-slate-100' : ''
              }`}
            >
              <span>Tìm kiếm thông tin</span>
              <span className="text-[12px] font-bold text-slate-500 ml-1">
                {isFilterExpanded ? '^' : 'v'}
              </span>
            </div>

            {isFilterExpanded && (
              <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Tên câu hỏi</label>
                    <Input
                      placeholder="Nhập"
                      value={filterKeyword}
                      onChange={(e) => setFilterKeyword(e.target.value)}
                      onPressEnter={handleSearch}
                      className="rounded border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Khối lớp</label>
                    <Select
                      mode="multiple"
                      maxTagCount="responsive"
                      value={filterGrades}
                      onChange={setFilterGrades}
                      options={GRADES}
                      placeholder="Tất cả"
                      className="w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Loại câu hỏi</label>
                    <Select
                      value={filterType}
                      onChange={setFilterType}
                      className="w-full text-xs"
                      options={[{ value: 'all', label: 'Tất cả' }, ...questionTypeOptions]}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Cấp độ tư duy</label>
                    <Select
                      value={filterLevel}
                      onChange={setFilterLevel}
                      className="w-full text-xs"
                      options={[
                        { value: 'all', label: 'Tất cả' },
                        ...cognitiveLevelOptions
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Trạng thái</label>
                    <Select
                      value={filterStatus}
                      onChange={setFilterStatus}
                      className="w-full text-xs"
                      options={[
                        { value: 'all',      label: 'Tất cả' },
                        { value: 'pending',  label: 'Chờ thẩm định' },
                        { value: 'approved', label: 'Đã thẩm định' },
                        { value: 'rejected', label: 'Từ chối' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày gửi tạo</label>
                    <DatePicker.RangePicker
                      placeholder={['Bắt đầu', 'Kết thúc']}
                      value={filterDates}
                      onChange={(dates) => setFilterDates(dates)}
                      className="w-full rounded border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-center mt-5">
                  <Button
                    type="primary"
                    onClick={handleSearch}
                    className="bg-[#1a4f9c] border-transparent text-white font-extrabold text-xs px-8 h-9 rounded hover:bg-blue-800 cursor-pointer flex items-center justify-center"
                    style={{ cursor: 'pointer' }}
                  >
                    Tìm kiếm
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Results card ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-[#002147] font-black text-sm uppercase tracking-tight my-0">
                  Kết quả tìm kiếm
                </h2>
                {selectedRowKeys.length > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                    Đã chọn <span className="font-bold">{selectedRowKeys.length}</span> câu hỏi
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="primary"
                  onClick={handleBulkReview}
                  className="bg-[#1a4f9c] border-transparent text-white font-extrabold text-xs px-5 h-8 rounded hover:bg-blue-800 cursor-pointer flex items-center justify-center"
                  style={{ cursor: 'pointer' }}
                >
                  Thẩm định
                </Button>
              </div>
            </div>

            <Table<Question>
              id="tham-dinh-main-table"
              dataSource={filteredQuestions}
              columns={columns}
              rowKey="id"
              size="small"
              rowSelection={{
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys)
              }}
              rowClassName={(_, idx) => (idx % 2 === 1 ? 'bg-slate-50/50' : '')}
              pagination={{
                total: filteredQuestions.length,
                showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
                showSizeChanger: true,
                defaultPageSize: 10,
                pageSizeOptions: ['10', '20', '50', '100'],
                locale: { items_per_page: '/ trang' },
                className: 'mt-6',
              }}
              scroll={{ x: 'max-content' }}
              className="border-none text-xs rounded-2xl"
              locale={{ emptyText: 'Không có câu hỏi nào cần thẩm định' }}
            />
          </div>
        </div>
      </div>

      {/* ── Review detail modal ── */}
      <ReviewDetailModal
        question={reviewQuestion}
        onClose={() => setReviewQuestion(null)}
        onApprove={(q, c) => {
          if (onApproveQuestion) {
            onApproveQuestion(q.id, c);
          } else {
            onUpdateQuestion({ ...q, status: 'approved' });
          }
        }}
        onReject={(q, c) => {
          if (onRejectQuestion) {
            onRejectQuestion(q.id, c);
          } else {
            onUpdateQuestion({ ...q, status: 'draft' });
          }
        }}
      />

      {/* ── Bulk review modal ── */}
      <BulkReviewModal
        visible={isBulkReviewOpen}
        count={selectedRowKeys.length}
        onClose={() => setIsBulkReviewOpen(false)}
        onConfirm={(verdict, comment) => {
          if (onBulkReviewQuestions) {
            onBulkReviewQuestions(
              selectedRowKeys.map((k) => String(k)),
              verdict,
              comment
            );
          } else {
            // fallback local update
            selectedRowKeys.forEach((key) => {
              const q = questions.find((item) => item.id === key);
              if (q) {
                onUpdateQuestion({
                  ...q,
                  status: (verdict === 'approve' ? 'approved' : 'rejected') as QuestionStatus
                });
              }
            });
            toast.success(`Đã thẩm định ${selectedRowKeys.length} câu hỏi!`);
          }
          setSelectedRowKeys([]);
        }}
      />

      {/* ── History modal ── */}
      <QuestionHistoryModal
        question={historyQuestion}
        mode="tham-dinh"
        onClose={() => setHistoryQuestion(null)}
      />
    </ConfigProvider>
  );
}
