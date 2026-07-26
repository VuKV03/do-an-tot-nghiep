import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Tree, Select, Input, Button, Table, Space, message, Modal, Form, Spin, Divider, Tooltip, notification, DatePicker, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import CreateQuestionModal from './manual-create';
import AIGenerateQuestionModal from './ai-generate';
import UpdateQuestionModal from './update';
import DeleteConfirmModal from './delete';
import SendReviewConfirmModal from './send-review';
import QuestionDetailModal from './detail';
import ThamDinhCauHoiTab from '../tham-dinh-cau-hoi';
import QuestionHistoryModal from '../history';
import ReviewModal from '../../../ReviewModal';
import {
  SearchOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  FilterOutlined,
  BookOutlined,
  AppstoreOutlined,
  SendOutlined,
  MoreOutlined,
  HistoryOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Question, QuestionType, CognitiveLevel, QuestionStatus, TopicNode, SystemUser } from '../../../../types';
import { stripHtmlToText } from '../../../../utils/htmlContent';
import { buildCognitiveLevelOptions } from '../../../../utils/cognitiveLevel';
import { SUBJECTS, GRADES } from '../../../../data';
import { topicsApi, subjectCategoryApi, gradeLevelApi, bankQuestionApi, cognitiveLevelApi } from '../../../../services/danhMucApi.ts';

interface QuestionBankModuleProps {
  onAddQuestion?: (q: Question) => void;
  onUpdateQuestion?: (q: Question) => void;
  onDeleteQuestion?: (id: string) => void;
  onOpenReview?: (q: Question) => void;
  initialTab?: 'bank' | 'review';
  currentUser?: SystemUser | null;
}

export default function QuestionBankModule({
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onOpenReview,
  initialTab,
  currentUser
}: QuestionBankModuleProps) {
  const creatorName = currentUser?.fullName || currentUser?.username || 'Hội đồng Chuyên môn';
  // Tabs State
  const [activeTab, setActiveTab] = useState<'bank' | 'review'>(initialTab || 'bank');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Filters state
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(null);

  // API data for subject/grade dropdowns and topic tree
  const [apiSubjects, setApiSubjects] = useState<{ value: string; label: string }[]>([]);
  const [apiGrades, setApiGrades] = useState<{ value: string; label: string }[]>([]);
  const [allTopicsRaw, setAllTopicsRaw] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // Cấp độ tư duy — lấy đúng danh mục thật từ API, không hard-code để tránh lệch với danh mục quản trị
  const [cognitiveLevelFilterOptions, setCognitiveLevelFilterOptions] = useState<{ value: CognitiveLevel; label: string }[]>([]);

  useEffect(() => {
    cognitiveLevelApi.list().then((res) => {
      setCognitiveLevelFilterOptions(buildCognitiveLevelOptions(res.data));
    }).catch((err) => console.error('Failed to load cognitive levels', err));
  }, []);

  // Questions from API
  const [dbQuestions, setDbQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Search filter query inputs
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<QuestionType | 'all'>('all');
  const [filterLevel, setFilterLevel] = useState<CognitiveLevel | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | 'all'>('all');
  const [filterCreator, setFilterCreator] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<any>(null);

  // Triggered filters matching "Tìm kiếm" button
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '',
    type: 'all',
    level: 'all',
    status: 'all',
    creator: 'all',
    dateRange: null as any
  });

  // Modal / Form state for Add New
  const [activeModalType, setActiveModalType] = useState<QuestionType | null>(null);

  // Row selection & Bulk Action states
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSendReviewOpen, setIsSendReviewOpen] = useState(false);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<Question | null>(null);
  const [pendingSendReviewQuestion, setPendingSendReviewQuestion] = useState<Question | null>(null);

  // AI Generation State
  const [isAIOpen, setIsAIOpen] = useState(false);

  // File import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importedFile, setImportedFile] = useState<string | null>(null);

  // History modal state
  const [historyQuestion, setHistoryQuestion] = useState<Question | null>(null);

  // Detail modal state
  const [detailQuestion, setDetailQuestion] = useState<Question | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Update modal state
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [updateQuestion, setUpdateQuestion] = useState<Question | null>(null);

  // Fetch subjects, grades, and topics from API
  const fetchFiltersAndTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const [subRes, grRes, topRes] = await Promise.all([
        subjectCategoryApi.list(),
        gradeLevelApi.list(),
        topicsApi.list(),
      ]);
      const subjectOptions = subRes.data.map((s: any) => ({ value: s.name, label: s.name }));
      const gradeOptions = grRes.data.map((g: any) => ({ value: g.name, label: g.name }));
      setApiSubjects(subjectOptions);
      setApiGrades(gradeOptions);
      setAllTopicsRaw(topRes.data);
    } catch (e) {
      console.error('Không thể tải dữ liệu môn học / chủ đề:', e);
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  // Fetch questions from bank API
  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const res = await bankQuestionApi.list();
      if (res.success && res.data) {
        // Map API response to Question type
        const mapped: Question[] = res.data.map((q) => ({
          id: q.id,
          code: q.code,
          text: q.text,
          type: q.type as any,
          level: q.level as any,
          status: q.status as any,
          subject: q.subject,
          grade: q.grade,
          topicId: q.topicId || '',
          topicName: q.topicName || '',
          subTopicName: q.subTopicName || '',
          nangLucId: q.nangLucId,
          nangLuc: q.nangLuc || '',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          creator: q.creator || '',
          createdAt: q.createdAt || new Date().toISOString(),
          feedback: q.feedback || '',
        }));
        setDbQuestions(mapped);
      }
    } catch (e) {
      console.error('Không thể tải câu hỏi từ ngân hàng:', e);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiltersAndTopics();
    fetchQuestions();
  }, [fetchFiltersAndTopics, fetchQuestions]);


  // Subjects dropdown: prefer API data, fallback to static
  const subjectDropdownOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả' },
      ...(apiSubjects.length > 0 ? apiSubjects : SUBJECTS)
    ],
    [apiSubjects]
  );
  // Grades dropdown: prefer API data, fallback to static
  const gradeDropdownOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả' },
      ...(apiGrades.length > 0 ? apiGrades : GRADES)
    ],
    [apiGrades]
  );

  const selectedTopicObj = useMemo(() => {
    if (!selectedTopicKey) return null;
    return allTopicsRaw.find((t: any) => t.id === selectedTopicKey);
  }, [selectedTopicKey, allTopicsRaw]);

  const actualSubject = useMemo(() => {
    if (selectedSubject) return selectedSubject;
    return selectedTopicObj?.subject_name || '';
  }, [selectedSubject, selectedTopicObj]);

  const actualGrade = useMemo(() => {
    if (selectedGrade) return selectedGrade;
    return selectedTopicObj?.grade_name || '';
  }, [selectedGrade, selectedTopicObj]);

  // Build topic tree from API data filtered by selected subject & grade
  const topicTreeData = useMemo(() => {
    // Filter topics matching selected subject (and optionally grade)
    const filtered = allTopicsRaw.filter((t: any) => {
      const matchSubject = !selectedSubject || t.subject_name === selectedSubject;
      const matchGrade = !selectedGrade || t.grade_name === selectedGrade;
      return matchSubject && matchGrade;
    });

    // Only show approved topics (status === 2) in the tree
    const approved = filtered.filter((t: any) => t.status === 2);

    // Build tree structure
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

    // Remove empty children arrays
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

    return roots;
  }, [allTopicsRaw, selectedSubject, selectedGrade]);

  // Handle tree node selection
  const handleSelectTopicNode = (selectedKeys: any[], info: any) => {
    if (selectedKeys.length > 0) {
      setSelectedTopicKey(selectedKeys[0]);
    } else {
      setSelectedTopicKey(null);
    }
  };

  // Perform filtering of questions (using DB-fetched data)
  const filteredQuestions = useMemo(() => {
    return dbQuestions.filter((q) => {
      // 1. Filter by subject (skip if no subject selected yet)
      if (selectedSubject && q.subject !== selectedSubject) return false;
      // 2. Filter by grade (if not empty)
      if (selectedGrade && q.grade !== selectedGrade) return false;
      // 3. Filter by selected topic (tree node) if any is selected
      if (selectedTopicKey) {
        // Match either the subTopicId or look at parents if hierarchy matches
        const hasTopicMatch = q.topicId === selectedTopicKey || q.id === selectedTopicKey;
        const topicNode = topicTreeData.find(t => t.key === selectedTopicKey);
        // If they selected a parent topic, match all questions listed in that parent topic
        const isChildMatch = topicNode?.children?.some(c => c.key === q.topicId);
        if (!hasTopicMatch && !isChildMatch) return false;
      }

      // Match actions based on clicking the "Tìm kiếm" button (appliedFilters state)
      // 4. Keyword search
      const kwKeyword = appliedFilters.keyword.trim();
      if (kwKeyword) {
        const textToSearch = `${q.code} ${stripHtmlToText(q.text)} ${q.creator}`.toLowerCase();
        if (!textToSearch.includes(kwKeyword.toLowerCase())) return false;
      }
      // 5. Question Type
      if (appliedFilters.type !== 'all' && q.type !== appliedFilters.type) return false;
      // 6. Cognitive Level
      if (appliedFilters.level !== 'all' && q.level !== appliedFilters.level) return false;
      // 7. Status badge
      if (appliedFilters.status !== 'all' && q.status !== appliedFilters.status) return false;
      // 8. Creator filter
      if (appliedFilters.creator !== 'all' && q.creator !== appliedFilters.creator) return false;
      // 9. Date Range filter
      if (appliedFilters.dateRange && appliedFilters.dateRange.length === 2) {
        const startDate = appliedFilters.dateRange[0].startOf('day').toDate();
        const endDate = appliedFilters.dateRange[1].endOf('day').toDate();
        const qDate = new Date(q.createdAt);
        if (qDate < startDate || qDate > endDate) return false;
      }

      return true;
    });
  }, [dbQuestions, selectedSubject, selectedGrade, selectedTopicKey, appliedFilters, topicTreeData]);

  const handleSearchAction = () => {
    setAppliedFilters({
      keyword: searchKeyword,
      type: filterType,
      level: filterLevel,
      status: filterStatus,
      creator: filterCreator,
      dateRange: filterDateRange
    });
    message.success('Đã áp dụng bộ lọc câu hỏi!');
  };

  const handleResetFilters = () => {
    setSearchKeyword('');
    setFilterType('all');
    setFilterLevel('all');
    setFilterStatus('all');
    setFilterCreator('all');
    setFilterDateRange(null);
    setAppliedFilters({
      keyword: '',
      type: 'all',
      level: 'all',
      status: 'all',
      creator: 'all',
      dateRange: null
    });
    setSelectedTopicKey(null);
    message.info('Đã làm mới bộ lọc.');
  };

  const getQuestionTypeLabelShort = (type: QuestionType) => {
    switch (type) {
      case 'single': return 'TN';
      case 'multiple': return 'TLN';
      case 'true_false': return 'DS';
      case 'short': return 'TL';
      default: return 'TN';
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

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '20/05/2025';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '20/05/2025';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '20/05/2025';
    }
  };



  const handleImportMockFiles = () => {
    message.loading('Đang phân tích cấu trúc dữ liệu tệp tin nhập vào...');
    const targetSubject = actualSubject || 'Toán học';
    const targetGrade = actualGrade || 'Khối 12';
    setTimeout(() => {
      // Add two questions
      const importQ1: Question = {
        id: `q-imp-1-${Date.now()}`,
        code: `IMP-${targetSubject.substring(0, 3).toUpperCase()}-101`,
        text: `[Imported] Câu hỏi trắc nghiệm tích hợp số 1 môn ${targetSubject} bám sát cấu trúc ôn tập năm nay.`,
        type: 'single',
        level: 'nhan_biet',
        status: 'pending',
        subject: targetSubject,
        grade: targetGrade,
        topicId: selectedTopicKey || topicTreeData[0]?.children?.[0]?.key || 'math-sub1.1',
        topicName: 'Danh mục nhập khẩu',
        correctAnswer: 'Phương án A',
        options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
        creator: 'Nhập tệp Word/Excel',
        createdAt: new Date().toISOString()
      };

      const importQ2: Question = {
        id: `q-imp-2-${Date.now()}`,
        code: `IMP-${targetSubject.substring(0, 3).toUpperCase()}-102`,
        text: `[Imported] Tìm mệnh đề kiểm tra kiến thức kỹ năng liên môn nâng cao thực hành thực tế.`,
        type: 'short',
        level: 'van_dung_cao',
        status: 'approved',
        subject: targetSubject,
        grade: targetGrade,
        topicId: selectedTopicKey || topicTreeData[0]?.children?.[0]?.key || 'math-sub1.1',
        topicName: 'Danh mục nhập khẩu',
        correctAnswer: 'Kết quả tính toán sau khảo sát thực nghiệm',
        creator: 'Nhập tệp Word/Excel',
        createdAt: new Date().toISOString()
      };

      onAddQuestion?.(importQ1);
      onAddQuestion?.(importQ2);
      setIsImportOpen(false);
      message.success('Nhập tệp tin hoàn tất! Đã thêm thành công 02 câu hỏi mới vào ngân hàng.');
    }, 1500);
  };

  const handleDeleteConfirm = async () => {
    if (pendingDeleteQuestion) {
      try {
        await bankQuestionApi.delete(pendingDeleteQuestion.id);
        onDeleteQuestion?.(pendingDeleteQuestion.id);
        message.success(`Đã xóa câu hỏi ${pendingDeleteQuestion.code} khỏi ngân hàng.`);
        fetchQuestions(); // refresh from API
        setPendingDeleteQuestion(null);
        setIsDeleteOpen(false);
      } catch (err: any) {
        message.error(err.message || 'Lỗi khi xóa câu hỏi');
      }
    } else if (selectedRowKeys.length > 0) {
      try {
        await Promise.all(selectedRowKeys.map((key) => bankQuestionApi.delete(key as string)));
        selectedRowKeys.forEach((key) => onDeleteQuestion?.(key as string));
        message.success(`Đã xóa ${selectedRowKeys.length} câu hỏi khỏi ngân hàng.`);
        fetchQuestions(); // refresh from API
        setSelectedRowKeys([]);
        setIsDeleteOpen(false);
      } catch (err: any) {
        message.error(err.message || 'Lỗi khi xóa câu hỏi');
      }
    } else {
      setIsDeleteOpen(false);
    }
  };

  const handleSendReviewConfirm = async () => {
    if (pendingSendReviewQuestion) {
      try {
        await bankQuestionApi.submit(pendingSendReviewQuestion.id);
        const updated = { ...pendingSendReviewQuestion, status: 'pending' as QuestionStatus };
        onUpdateQuestion?.(updated);
        message.success(`Đã gửi câu hỏi ${pendingSendReviewQuestion.code} đi thẩm định!`);
        fetchQuestions();
      } catch (err: any) {
        message.error(err.message || 'Lỗi khi gửi thẩm định');
      }
      setPendingSendReviewQuestion(null);
    } else if (selectedRowKeys.length > 0) {
      try {
        for (const key of selectedRowKeys) {
          const quest = dbQuestions.find((q) => q.id === key);
          if (quest && (quest.status === 'draft' || quest.status === 'rejected')) {
            await bankQuestionApi.submit(quest.id);
            onUpdateQuestion?.({ ...quest, status: 'pending' as QuestionStatus });
          }
        }
        message.success(`Đã gửi ${selectedRowKeys.length} câu hỏi đi thẩm định!`);
        fetchQuestions();
      } catch (err: any) {
        message.error(err.message || 'Lỗi khi gửi thẩm định');
      }
      setSelectedRowKeys([]);
    }
    setIsSendReviewOpen(false);
  };

  // Review Modal State & Handlers
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedReviewQuestion, setSelectedReviewQuestion] = useState<Question | null>(null);

  const handleOpenReviewInternal = (q: Question) => {
    setSelectedReviewQuestion(q);
    setIsReviewOpen(true);
  };

  const handleApproveQuestion = async (id: string, feedback: string) => {
    try {
      await bankQuestionApi.approve(id, feedback);
      fetchQuestions();
    } catch (e: any) {
      message.error(e.message || 'Lỗi khi phê duyệt câu hỏi');
    }
  };

  const handleRejectQuestion = async (id: string, feedback: string) => {
    try {
      await bankQuestionApi.reject(id, feedback);
      fetchQuestions();
    } catch (e: any) {
      message.error(e.message || 'Lỗi khi từ chối câu hỏi');
    }
  };

  const handleBulkReviewQuestions = async (ids: string[], verdict: 'approve' | 'reject', comment: string) => {
    try {
      await bankQuestionApi.bulkReview(ids, verdict, comment);
      fetchQuestions();
    } catch (e: any) {
      message.error(e.message || 'Lỗi khi thẩm định câu hỏi');
    }
  };

  const tableColumns = [
    {
      title: 'STT',
      width: 50,
      render: (text: any, record: any, index: number) => <span className="font-mono text-slate-500 text-xs">{index + 1}</span>
    },
    {
      title: 'Mã câu hỏi',
      dataIndex: 'code',
      width: 100,
      render: (code: string) => <span className="font-semibold text-slate-700 text-xs">{code}</span>
    },
    {
      title: 'Nội dung câu hỏi',
      dataIndex: 'text',
      width: 350,
      render: (text: string) => {
        const plainText = stripHtmlToText(text);
        return (
          <Tooltip title={plainText}>
            <div
              className="text-slate-700 font-normal text-xs hover:text-[#002147] transition-all cursor-pointer"
              style={{
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: '320px',
              }}
            >
              {plainText}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Loại câu hỏi',
      dataIndex: 'type',
      width: 90,
      render: (type: QuestionType) => <span className="text-xs text-slate-600 font-medium">{getQuestionTypeLabelShort(type)}</span>
    },
    {
      title: 'Cấp độ tư duy',
      dataIndex: 'level',
      width: 90,
      render: (level: CognitiveLevel) => <span className="text-xs text-slate-600 font-medium">{getCognitiveLevelLabelShort(level)}</span>
    },
    {
      title: 'Người tạo',
      dataIndex: 'creator',
      width: 120,
      ellipsis: true,
      render: (creator: string) => <span className="text-slate-600 text-xs">{creator}</span>
    },
    {
      title: 'Thành phần năng lực',
      dataIndex: 'nangLuc',
      width: 130,
      ellipsis: true,
      render: (nangLuc: string) => <span className="text-slate-600 text-xs">{nangLuc || '.........................'}</span>
    },
    {
      title: 'Thuộc chủ đề',
      dataIndex: 'topicName',
      width: 120,
      ellipsis: true,
      render: (topicName: string) => <span className="text-slate-600 text-xs">{topicName || '.........................'}</span>
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 100,
      render: (createdAt: string) => <span className="text-slate-600 text-xs">{formatDateString(createdAt)}</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (status: QuestionStatus) => {
        switch (status) {
          case 'approved':
            return (
              <span className="inline-block px-2.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                Đã thẩm định
              </span>
            );
          case 'pending':
            return (
              <span className="inline-block px-2.5 py-0.5 rounded border border-blue-350 bg-blue-50 text-blue-700 font-bold text-[10px]">
                Chờ thẩm định
              </span>
            );
          case 'rejected':
            return (
              <span className="inline-block px-2.5 py-0.5 rounded border border-rose-300 bg-rose-50 text-rose-600 font-bold text-[10px]">
                Từ chối
              </span>
            );
          case 'draft':
          default:
            return (
              <span className="inline-block px-2.5 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-700 font-bold text-[10px]">
                Lưu nháp
              </span>
            );
        }
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: Question) => {
        const canSendReview = record.status === 'draft' || record.status === 'rejected';
        const canEditQuestion = record.status === 'draft' || record.status === 'pending';
        const showEye = record.status === 'pending' || record.status === 'approved' || record.status === 'rejected';

        const menuItems: MenuProps['items'] = [];

        if (canSendReview) {
          menuItems.push({
            key: 'send-review',
            label: <span className="text-xs font-semibold text-slate-700">Gửi thẩm định/phản biện</span>,
            icon: <SendOutlined className="text-slate-500 text-xs" style={{ transform: 'rotate(-45deg)' }} />,
            onClick: () => {
              setPendingSendReviewQuestion(record);
              setIsSendReviewOpen(true);
            }
          });
        }

        menuItems.push({
          key: 'history',
          label: <span className="text-xs font-semibold text-slate-700">Lịch sử chỉnh sửa, thẩm định</span>,
          icon: <HistoryOutlined className="text-slate-500 text-xs" />,
          onClick: () => {
            setHistoryQuestion(record);
          }
        });

        menuItems.push({
          key: 'delete',
          label: <span className="text-xs font-semibold text-red-655">Xóa câu hỏi</span>,
          icon: <DeleteOutlined className="text-red-500 text-xs" />,
          danger: true,
          onClick: () => {
            setPendingDeleteQuestion(record);
            setIsDeleteOpen(true);
          }
        });

        return (
          <div className="flex items-center justify-center gap-1.5">
            {showEye && (
              <Tooltip title="Xem chi tiết">
                <Button
                  type="text"
                  icon={<EyeOutlined className="text-blue-600 text-xs" />}
                  className="flex items-center justify-center w-7 h-7 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                  onClick={() => {
                    setDetailQuestion(record);
                    setIsDetailOpen(true);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </Tooltip>
            )}
            {canEditQuestion && (
              <Tooltip title="Chỉnh sửa">
                <Button
                  type="text"
                  icon={<EditOutlined className="text-blue-600 text-xs" />}
                  className="flex items-center justify-center w-7 h-7 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                  onClick={() => {
                    setUpdateQuestion(record);
                    setIsUpdateOpen(true);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </Tooltip>
            )}
            <Tooltip title="Xem thêm">
              <Dropdown menu={{ items: menuItems }} trigger={['hover']} placement="bottomRight">
                <Button
                  type="text"
                  icon={<MoreOutlined className="text-slate-500 text-xs" />}
                  className="flex items-center justify-center w-7 h-7 hover:bg-slate-100 rounded"
                  style={{ cursor: 'pointer' }}
                />
              </Dropdown>
            </Tooltip>
          </div>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Tab Headers */}
      <div className="flex gap-1 border-b border-gray-300 relative mb-2">
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'bank'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
            }`}
          style={{
            borderBottomColor: activeTab === 'bank' ? '#eff6ff' : undefined,
            cursor: 'pointer'
          }}
        >
          Ngân hàng câu hỏi
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'review'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
            }`}
          style={{
            borderBottomColor: activeTab === 'review' ? '#eff6ff' : undefined,
            cursor: 'pointer'
          }}
        >
          Thẩm định/phản biện câu hỏi
        </button>
      </div>

      {activeTab === 'bank' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch lg:max-h-[calc(100vh-170px)] animate-in fade-in duration-300" id="question-bank-container">

          {/* 20% Left Column Sidebar Filters Card — vị trí cố định, không di chuyển theo scroll */}
          <div
            id="question-bank-left-sidebar"
            className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white shadow-xs p-4 lg:max-h-[calc(100vh-170px)] overflow-y-auto flex flex-col"
          >
            <div className="space-y-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wide">
                <FilterOutlined className="text-blue-900" />
                <span>Phân loại kiểm tra</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Môn học</label>
                <Select
                  id="select-subject-filter"
                  value={selectedSubject}
                  onChange={(val) => {
                    setSelectedSubject(val);
                    setSelectedTopicKey(null); // reset topic key
                  }}
                  options={subjectDropdownOptions}
                  className="w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Khối lớp học</label>
                <Select
                  id="select-grade-filter"
                  value={selectedGrade}
                  onChange={setSelectedGrade}
                  options={gradeDropdownOptions}
                  className="w-full text-xs font-bold"
                />
              </div>
            </div>

            {/* Tree Menu Subjects/Topics */}
            <div className="flex-1 mt-4 overflow-y-auto pr-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cây chủ đề môn học</label>
              <Spin spinning={topicsLoading} size="small">
                {topicTreeData.length > 0 ? (
                  <Tree
                    showLine={{ showLeafIcon: false }}
                    blockNode
                    defaultExpandAll
                    onSelect={handleSelectTopicNode}
                    treeData={topicTreeData}
                    selectedKeys={selectedTopicKey ? [selectedTopicKey] : []}
                    className="text-xs font-medium text-slate-700 bg-transparent"
                  />
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    {topicsLoading ? 'Đang tải chủ đề...' : 'Chưa có chủ đề đã thẩm định cho môn học này'}
                  </div>
                )}
              </Spin>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <Button
                className="w-full text-[11px] font-extrabold bg-slate-50 border-slate-200 text-slate-600 rounded-lg py-1 hover:bg-slate-100 cursor-pointer"
                onClick={handleResetFilters}
              >
                Làm sạch bộ lọc
              </Button>
            </div>
          </div>

          {/* 80% Right Column Content Area */}
          <div className="lg:col-span-4 flex flex-col space-y-4 lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto lg:pr-1" id="question-bank-right-content">

            {/* Tìm kiếm thông tin Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-300">
              <div
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className={`flex items-center justify-between text-slate-800 font-extrabold text-xs uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors select-none ${isFilterExpanded ? 'pb-3 mb-4 border-b border-slate-100' : 'pb-0 mb-0'
                  }`}
              >
                <div className="flex items-center gap-1">
                  <span>Tìm kiếm thông tin</span>
                  <span className="text-[12px] font-bold text-slate-500 ml-1">
                    {isFilterExpanded ? '^' : 'v'}
                  </span>
                </div>
              </div>

              {isFilterExpanded && (
                <div className="animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">ID, Nội dung câu hỏi</label>
                      <Input
                        placeholder="Nhập"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="rounded border-slate-350 text-xs"
                        onPressEnter={handleSearchAction}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Khối lớp</label>
                      <Select
                        mode="multiple"
                        maxTagCount="responsive"
                        value={selectedGrade ? [selectedGrade] : []}
                        onChange={(val) => setSelectedGrade(val[val.length - 1] || '')}
                        className="w-full text-xs font-medium"
                        options={gradeDropdownOptions}
                        placeholder="Tất cả"
                        style={{ borderRadius: '4px' }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Loại câu hỏi</label>
                      <Select
                        value={filterType}
                        onChange={setFilterType}
                        className="w-full text-xs font-medium"
                        options={[
                          { value: 'all', label: 'Tất cả' },
                          { value: 'single', label: 'Trắc nghiệm đơn' },
                          { value: 'multiple', label: 'Trắc nghiệm nhiều lựa chọn' },
                          { value: 'true_false', label: 'Trắc nghiệm Đúng / Sai' },
                          { value: 'short', label: 'Tự luận viết ngắn' }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Cấp độ tư duy</label>
                      <Select
                        value={filterLevel}
                        onChange={setFilterLevel}
                        className="w-full text-xs font-medium"
                        options={[
                          { value: 'all', label: 'Tất cả' },
                          ...cognitiveLevelFilterOptions
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Trạng thái</label>
                      <Select
                        value={filterStatus}
                        onChange={setFilterStatus}
                        className="w-full text-xs font-medium"
                        options={[
                          { value: 'all', label: 'Tất cả' },
                          { value: 'approved', label: 'Đã thẩm định' },
                          { value: 'pending', label: 'Chờ thẩm định' },
                          { value: 'draft', label: 'Lưu nháp' }
                        ]}
                      />
                    </div>

                    <div className="hidden md:block"></div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Người tạo</label>
                      <Select
                        value={filterCreator}
                        onChange={setFilterCreator}
                        className="w-full text-xs font-medium"
                        options={[
                          { value: 'all', label: 'Tất cả' },
                          { value: 'Hội đồng Chuyên môn (Tự tạo)', label: 'Hội đồng Chuyên môn' },
                          { value: 'SmartTest AI Generator', label: 'SmartTest AI' },
                          { value: 'Nhập tệp Word/Excel', label: 'Nhập tệp Word/Excel' }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày tạo:</label>
                      <DatePicker.RangePicker
                        placeholder={['Bắt đầu', 'Kết thúc']}
                        value={filterDateRange}
                        onChange={(dates) => setFilterDateRange(dates)}
                        format="DD-MM-YYYY"
                        className="w-full rounded border-slate-350 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center mt-5">
                    <Button
                      type="primary"
                      onClick={handleSearchAction}
                      className="bg-[#1a4f9c] border-transparent text-white font-extrabold text-xs px-8 py-1.5 h-9 rounded hover:bg-blue-800 cursor-pointer flex items-center justify-center"
                      style={{ cursor: 'pointer' }}
                    >
                      Tìm kiếm
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Kết quả tìm kiếm Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[#002147] font-black text-sm uppercase tracking-tight">
                    Kết quả tìm kiếm
                  </h2>
                  {selectedRowKeys.length > 0 && (
                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                      Đã chọn <span className="font-bold">{selectedRowKeys.length}</span> câu hỏi
                    </span>
                  )}
                </div>

                {/* Action button group */}
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Button
                    type="default"
                    icon={<PlusOutlined />}
                    className="border border-blue-600 text-blue-600 bg-white rounded hover:border-blue-700 hover:text-blue-700 hover:bg-blue-50 font-bold text-xs px-4 h-8 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      if (!selectedTopicKey) {
                        notification.warning({
                          message: 'Thông báo',
                          description: 'Vui lòng chọn tiểu mục chủ đề trước khi thêm mới',
                          placement: 'topRight'
                        });
                        return;
                      }
                      setActiveModalType('single');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    Thêm mới
                  </Button>
                  <Button
                    type="default"
                    icon={<ThunderboltOutlined />}
                    className="border border-blue-600 text-blue-600 bg-white rounded hover:border-blue-700 hover:text-blue-700 hover:bg-blue-50 font-bold text-xs px-4 h-8 flex items-center justify-center cursor-pointer"
                    onClick={() => setIsAIOpen(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    Thêm bằng AI
                  </Button>
                  <Button
                    type="default"
                    icon={<SendOutlined />}
                    className="border border-blue-600 text-blue-600 bg-white rounded hover:border-blue-700 hover:text-blue-700 hover:bg-blue-50 font-bold text-xs px-4 h-8 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      if (selectedRowKeys.length === 0) {
                        message.warning('Vui lòng chọn các câu hỏi cần gửi thẩm định!');
                        return;
                      }
                      setPendingSendReviewQuestion(null);
                      setIsSendReviewOpen(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    Gửi thẩm định
                  </Button>
                  <Button
                    type="default"
                    danger
                    icon={<DeleteOutlined />}
                    className="border border-red-600 text-red-650 bg-white rounded hover:border-red-700 hover:text-red-700 hover:bg-red-50 font-bold text-xs px-4 h-8 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      if (selectedRowKeys.length === 0) {
                        message.warning('Vui lòng chọn các câu hỏi cần xóa!');
                        return;
                      }
                      setPendingDeleteQuestion(null);
                      setIsDeleteOpen(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    Xóa
                  </Button>
                </div>
              </div>



              <Table
                id="question-bank-main-table"
                dataSource={filteredQuestions}
                columns={tableColumns}
                rowKey="id"
                loading={questionsLoading}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }}
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
              />
            </div>
          </div>

          {/* MODAL: ADD NEW QUESTION - ALL TYPES */}
          <CreateQuestionModal
            open={activeModalType !== null}
            initialType={activeModalType || 'single'}
            onClose={() => setActiveModalType(null)}
            onSave={(q: Question) => {
              onAddQuestion?.(q);
              fetchQuestions(); // refresh from API
              setActiveModalType(null);
            }}
            onSendReview={(q: Question) => {
              onAddQuestion?.(q);
              fetchQuestions(); // refresh from API
              setActiveModalType(null);
            }}
            subject={actualSubject}
            grade={actualGrade}
            selectedTopicKey={selectedTopicKey}
            topicTreeData={topicTreeData}
            creatorName={creatorName}
          />

          {/* MODAL 2: INTERACTIVE AI SMART GENERATOR */}
          <AIGenerateQuestionModal
            open={isAIOpen}
            onClose={() => setIsAIOpen(false)}
            onSave={(q) => {
              onAddQuestion?.(q);
              fetchQuestions();
            }}
            defaultSubject={actualSubject}
            defaultGrade={actualGrade}
            subjectOptions={apiSubjects}
            gradeOptions={apiGrades}
            allTopicsRaw={allTopicsRaw}
          />

          {/* MODAL 3: IMPORT DATA FROM FILE */}
          <Modal
            title={
              <div className="flex items-center gap-1.5 pb-2 border-b border-emerald-100">
                <UploadOutlined className="text-emerald-700" />
                <span className="font-extrabold uppercase text-slate-800 text-[14px]">Import câu hỏi từ File bên ngoài</span>
              </div>
            }
            open={isImportOpen}
            onCancel={() => setIsImportOpen(false)}
            footer={null}
            width={500}
            centered
          >
            <div className="space-y-4 pt-3">
              <div className="bg-emerald-50/50 border border-emerald-250 p-4 rounded-xl text-xs text-emerald-950 font-medium leading-relaxed">
                💡 Tải xuống <strong>file mẫu excel</strong> hoặc <strong>word</strong> để định dạng đúng quy chuẩn phân loại của hệ thống trước khi tải lên.
                <div className="mt-2 text-[11px] text-blue-900 underline font-bold cursor-pointer hover:text-slate-900">
                  ⬇️ Tải file mẫu word (.docx) cấu trúc câu hỏi (.zip)
                </div>
              </div>

              <div
                className="border-2 border-dashed border-slate-300 rounded-2xl py-10 px-5 text-center bg-slate-50 hover:bg-white hover:border-emerald-600 transition-all cursor-pointer flex flex-col items-center justify-center space-y-2"
                onClick={handleImportMockFiles}
              >
                <UploadOutlined className="text-4xl text-slate-400" />
                <strong className="text-xs text-slate-800 block">Kích vào đây để tải file tài liệu chứa câu hỏi (.docx, .xlsx)</strong>
                <span className="text-[10px] text-slate-400 max-w-sm block">Hệ thống tự nhận biệt câu hỏi qua các từ khóa: Câu 1, Câu 2, A., B., C., D. và dấu sao chỉ đáp án đúng.</span>
              </div>
            </div>
          </Modal>

          {/* History Modal */}
          <QuestionHistoryModal
            question={historyQuestion}
            mode="ngan-hang"
            onClose={() => setHistoryQuestion(null)}
          />

          {/* Detail Modal */}
          <QuestionDetailModal
            open={isDetailOpen}
            question={detailQuestion}
            onClose={() => {
              setIsDetailOpen(false);
              setDetailQuestion(null);
            }}
          />

          {/* CUSTOM CONFIRMATION POPUPS */}
          <DeleteConfirmModal
            open={isDeleteOpen}
            onClose={() => {
              setIsDeleteOpen(false);
              setPendingDeleteQuestion(null);
            }}
            onConfirm={handleDeleteConfirm}
            recordCode={pendingDeleteQuestion?.code}
            selectedCount={selectedRowKeys.length}
          />

          <SendReviewConfirmModal
            open={isSendReviewOpen}
            onClose={() => {
              setIsSendReviewOpen(false);
              setPendingSendReviewQuestion(null);
            }}
            onConfirm={handleSendReviewConfirm}
            recordName={pendingSendReviewQuestion?.code}
            selectedCount={selectedRowKeys.length}
          />

          <ReviewModal
            visible={isReviewOpen}
            onClose={() => {
              setIsReviewOpen(false);
              setSelectedReviewQuestion(null);
            }}
            question={selectedReviewQuestion}
            onApprove={handleApproveQuestion}
            onReject={handleRejectQuestion}
          />

        </div>
      ) : (
        <ThamDinhCauHoiTab
          questions={dbQuestions}
          onUpdateQuestion={onUpdateQuestion}
          onOpenReview={handleOpenReviewInternal}
          apiSubjects={apiSubjects}
          apiGrades={apiGrades}
          cognitiveLevelOptions={cognitiveLevelFilterOptions}
          allTopicsRaw={allTopicsRaw}
          topicsLoading={topicsLoading}
          onApproveQuestion={handleApproveQuestion}
          onRejectQuestion={handleRejectQuestion}
          onBulkReviewQuestions={handleBulkReviewQuestions}
          onEditQuestion={(record) => {
            setUpdateQuestion(record);
            setIsUpdateOpen(true);
          }}
        />
      )}

      {/* Luôn mount modal Cập nhật bất kể đang ở tab nào — vì nút "Chỉnh sửa" có thể được bấm
          từ cả tab Ngân hàng câu hỏi và tab Thẩm định */}
      <UpdateQuestionModal
        open={isUpdateOpen}
        onClose={() => {
          setIsUpdateOpen(false);
          setUpdateQuestion(null);
        }}
        onSave={(q) => {
          if (onUpdateQuestion) onUpdateQuestion(q);
          fetchQuestions();
        }}
        onSendReview={(q) => {
          if (onUpdateQuestion) onUpdateQuestion(q);
          fetchQuestions();
        }}
        initialType="single"
        subject={actualSubject || updateQuestion?.subject || ''}
        grade={actualGrade || updateQuestion?.grade || ''}
        selectedTopicKey={selectedTopicKey}
        topicTreeData={topicTreeData}
        initialQuestion={updateQuestion || undefined}
        creatorName={creatorName}
      />
    </div>
  );
}
