import React, { useState, useMemo } from 'react';
import { Tree, Select, Input, Button, Table, Tag, Space, message, Modal, Radio, Form, Spin, Divider, Tooltip, notification, DatePicker, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import CreateQuestionModal from './manual-create';
import DeleteConfirmModal from './delete';
import SendReviewConfirmModal from './send-review';
import ThamDinhCauHoiTab from '../tham-dinh-cau-hoi';
import QuestionHistoryModal from '../history';
import {
  SearchOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  FilterOutlined,
  BookOutlined,
  AppstoreOutlined,
  LoadingOutlined,
  SendOutlined,
  MoreOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { Question, QuestionType, CognitiveLevel, QuestionStatus, TopicNode } from '../../../../types';
import { SUBJECTS, GRADES, TOPICS_TREE } from '../../../../data';

interface QuestionBankModuleProps {
  questions: Question[];
  onAddQuestion: (q: Question) => void;
  onUpdateQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onOpenReview: (q: Question) => void;
}

export default function QuestionBankModule({
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onOpenReview
}: QuestionBankModuleProps) {
  // Tabs State
  const [activeTab, setActiveTab] = useState<'bank' | 'review'>('bank');

  // Filters state
  const [selectedSubject, setSelectedSubject] = useState<string>('Toán học');
  const [selectedGrade, setSelectedGrade] = useState<string>('Khối 12');
  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(null);
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
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestedQuestion, setAiSuggestedQuestion] = useState<Question | null>(null);
  const [aiSelectedLevel, setAiSelectedLevel] = useState<CognitiveLevel>('nhan_biet');

  // File import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importedFile, setImportedFile] = useState<string | null>(null);

  // History modal state
  const [historyQuestion, setHistoryQuestion] = useState<Question | null>(null);

  // Subjects dropdown
  const subjectDropdownOptions = useMemo(() => SUBJECTS, []);
  // Grades dropdown
  const gradeDropdownOptions = useMemo(() => GRADES, []);

  // Left column Topic Tree calculations dynamically filtered by current Subject selection
  const topicTreeData = useMemo(() => {
    return TOPICS_TREE[selectedSubject] || [];
  }, [selectedSubject]);

  // Handle tree node selection
  const handleSelectTopicNode = (selectedKeys: any[], info: any) => {
    if (selectedKeys.length > 0) {
      setSelectedTopicKey(selectedKeys[0]);
    } else {
      setSelectedTopicKey(null);
    }
  };

  // Perform filtering of questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // 1. Filter by subject
      if (q.subject !== selectedSubject) return false;
      // 2. Filter by grade (if not "Tất cả")
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
      if (appliedFilters.keyword) {
        const textToSearch = `${q.code} ${q.text} ${q.creator}`.toLowerCase();
        if (!textToSearch.includes(appliedFilters.keyword.toLowerCase())) return false;
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
  }, [questions, selectedSubject, selectedGrade, selectedTopicKey, appliedFilters, topicTreeData]);

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



  // AI Simulated Stream generator
  const triggerAIQuestionGeneration = () => {
    setAiGenerating(true);
    setAiSuggestedQuestion(null);

    // Simulate generation loop
    setTimeout(() => {
      let aiText = '';
      let aiOptions: string[] = [];
      let aiAnswer = '';

      if (selectedSubject === 'Toán học') {
        aiText = `[Sinh tự động bởi AI] Tìm tiệm cận đứng và tiệm cận ngang của đồ thị hàm số phân thức y = (3x + 1) / (x - 2).`;
        aiOptions = ['A. x = 2; y = 3', 'B. x = -2; y = -3', 'C. x = 3; y = 2', 'D. Không có tiệm cận'];
        aiAnswer = 'A. x = 2; y = 3';
      } else if (selectedSubject === 'Tiếng Anh') {
        aiText = `[AI Question] Identify the incorrect underlined word: "Even though she had visited Paris twice, but she still wanted to go there again next summer."`;
        aiOptions = ['A. Even though', 'B. twice', 'C. but', 'D. next summer'];
        aiAnswer = 'C. but';
      } else {
        aiText = `[AI Generated] Đâu là giải pháp căn bản để bảo vệ sự đa dạng sinh học và nguồn tài nguyên thiên nhiên quốc gia?`;
        aiOptions = ['A. Tăng cường lực lượng kiểm lâm', 'B. Quy hoạch các khu bảo tồn thiên nhiên quốc gia và tuyên truyền nâng cao ý thức', 'C. Cấm hoàn toàn mọi hoạt động khai thác', 'D. Nhập khẩu tài nguyên thay thế'];
        aiAnswer = 'B. Quy hoạch các khu bảo tồn thiên nhiên quốc gia và tuyên truyền nâng cao ý thức';
      }

      const generated: Question = {
        id: `q-ai-${Date.now()}`,
        code: `AI-${selectedSubject.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        text: aiText,
        type: 'single',
        level: aiSelectedLevel,
        status: 'pending', // Directly sent to pending approval
        subject: selectedSubject,
        grade: selectedGrade || 'Khối 12',
        topicId: selectedTopicKey || topicTreeData[0]?.children?.[0]?.key || 'math-sub1.1',
        topicName: topicTreeData[0]?.title || 'Chủ đề đề xuất',
        subTopicName: topicTreeData[0]?.children?.[0]?.title || 'Tiểu mục đề xuất',
        options: aiOptions,
        correctAnswer: aiAnswer,
        creator: 'SmartTest AI Generator',
        createdAt: new Date().toISOString()
      };

      setAiSuggestedQuestion(generated);
      setAiGenerating(false);
      message.success('AI hoàn tất đề xuất câu hỏi chất lượng cao!');
    }, 2000);
  };

  const acceptAISuggestedQuestion = () => {
    if (aiSuggestedQuestion) {
      onAddQuestion(aiSuggestedQuestion);
      message.success('Đã lưu câu hỏi sinh bởi AI vào hồ sơ chờ thẩm định.');
      setIsAIOpen(false);
      setAiSuggestedQuestion(null);
    }
  };

  const handleImportMockFiles = () => {
    message.loading('Đang phân tích cấu trúc dữ liệu tệp tin nhập vào...');
    setTimeout(() => {
      // Add two questions
      const importQ1: Question = {
        id: `q-imp-1-${Date.now()}`,
        code: `IMP-${selectedSubject.substring(0, 3).toUpperCase()}-101`,
        text: `[Imported] Câu hỏi trắc nghiệm tích hợp số 1 môn ${selectedSubject} bám sát cấu trúc ôn tập năm nay.`,
        type: 'single',
        level: 'nhan_biet',
        status: 'pending',
        subject: selectedSubject,
        grade: selectedGrade || 'Khối 12',
        topicId: selectedTopicKey || topicTreeData[0]?.children?.[0]?.key || 'math-sub1.1',
        topicName: 'Danh mục nhập khẩu',
        correctAnswer: 'Phương án A',
        options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
        creator: 'Nhập tệp Word/Excel',
        createdAt: new Date().toISOString()
      };

      const importQ2: Question = {
        id: `q-imp-2-${Date.now()}`,
        code: `IMP-${selectedSubject.substring(0, 3).toUpperCase()}-102`,
        text: `[Imported] Tìm mệnh đề kiểm tra kiến thức kỹ năng liên môn nâng cao thực hành thực tế.`,
        type: 'short',
        level: 'van_dung_cao',
        status: 'approved',
        subject: selectedSubject,
        grade: selectedGrade || 'Khối 12',
        topicId: selectedTopicKey || topicTreeData[0]?.children?.[0]?.key || 'math-sub1.1',
        topicName: 'Danh mục nhập khẩu',
        correctAnswer: 'Kết quả tính toán sau khảo sát thực nghiệm',
        creator: 'Nhập tệp Word/Excel',
        createdAt: new Date().toISOString()
      };

      onAddQuestion(importQ1);
      onAddQuestion(importQ2);
      setIsImportOpen(false);
      message.success('Nhập tệp tin hoàn tất! Đã thêm thành công 02 câu hỏi mới vào ngân hàng.');
    }, 1500);
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteQuestion) {
      onDeleteQuestion(pendingDeleteQuestion.id);
      message.success(`Đã xóa câu hỏi ${pendingDeleteQuestion.code} khỏi ngân hàng.`);
      setPendingDeleteQuestion(null);
    } else if (selectedRowKeys.length > 0) {
      selectedRowKeys.forEach((key) => {
        onDeleteQuestion(key as string);
      });
      message.success(`Đã xóa ${selectedRowKeys.length} câu hỏi khỏi ngân hàng.`);
      setSelectedRowKeys([]);
    }
    setIsDeleteOpen(false);
  };

  const handleSendReviewConfirm = () => {
    if (pendingSendReviewQuestion) {
      const updated = { ...pendingSendReviewQuestion, status: 'pending' as QuestionStatus };
      onUpdateQuestion(updated);
      message.success(`Đã gửi câu hỏi ${pendingSendReviewQuestion.code} đi thẩm định!`);
      setPendingSendReviewQuestion(null);
    } else if (selectedRowKeys.length > 0) {
      selectedRowKeys.forEach((key) => {
        const quest = questions.find((q) => q.id === key);
        if (quest && quest.status === 'draft') {
          onUpdateQuestion({ ...quest, status: 'pending' as QuestionStatus });
        }
      });
      message.success(`Đã gửi ${selectedRowKeys.length} câu hỏi đi thẩm định!`);
      setSelectedRowKeys([]);
    }
    setIsSendReviewOpen(false);
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
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span className="text-slate-800 font-medium text-xs hover:text-[#002147] transition-all cursor-pointer">
            {text}
          </span>
        </Tooltip>
      )
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
      render: (status: QuestionStatus, record: Question) => {
        const isAI = record.creator.includes('AI') || record.creator.includes('SmartTest');
        if (isAI) return null;

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
          case 'draft':
          default:
            return (
              <span className="inline-block px-2.5 py-0.5 rounded border border-rose-300 bg-rose-50 text-rose-700 font-bold text-[10px]">
                Từ chối
              </span>
            );
        }
      }
    },
    {
      title: 'Trạng thái của câu AI tạo',
      width: 140,
      render: (_: any, record: Question) => {
        const isAI = record.creator.includes('AI') || record.creator.includes('SmartTest');
        if (!isAI) return null;

        if (record.status === 'approved') {
          return (
            <span className="inline-block px-2.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-700 font-bold text-[10px]">
              Đã thẩm định
            </span>
          );
        }

        return (
          <Button
            size="small"
            className="rounded border border-slate-300 text-slate-800 bg-white font-bold text-[10px] hover:bg-slate-50 h-6 px-3 flex items-center justify-center cursor-pointer"
            onClick={() => {
              setIsAIOpen(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            Tạo mới
          </Button>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: Question) => {
        const canEdit = record.status === 'draft';

        const menuItems: MenuProps['items'] = [];

        if (canEdit) {
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
            {canEdit && (
              <Tooltip title="Chỉnh sửa">
                <Button
                  type="text"
                  icon={<EditOutlined className="text-blue-600 text-xs" />}
                  className="flex items-center justify-center w-7 h-7 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                  onClick={() => {
                    message.info(`Xem thông tin câu hỏi ${record.code}. Tính năng chỉnh sửa đang được phát triển.`);
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
          className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${
            activeTab === 'bank'
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
          className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${
            activeTab === 'review'
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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch animate-in fade-in duration-300" id="question-bank-container">

      {/* 20% Left Column Sidebar Filters Card */}
      <div
        id="question-bank-left-sidebar"
        className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white shadow-xs p-4 h-[calc(100vh-140px)] sticky top-24 overflow-y-auto flex flex-col"
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
              Chưa có chủ đề định nghĩa cho môn học này
            </div>
          )}
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
      <div className="lg:col-span-4 flex flex-col space-y-4" id="question-bank-right-content">

        {/* Tìm kiếm thông tin Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-300">
          <div 
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`flex items-center justify-between text-slate-800 font-extrabold text-xs uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors select-none ${
              isFilterExpanded ? 'pb-3 mb-4 border-b border-slate-100' : 'pb-0 mb-0'
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
                      { value: 'nhan_biet', label: 'Nhận biết' },
                      { value: 'thong_hieu', label: 'Thông hiểu' },
                      { value: 'van_dung', label: 'Vận dụng' },
                      { value: 'van_dung_cao', label: 'Vận dụng cao' }
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
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              className: "pr-4 pb-4 pt-4 text-xs font-medium",
              style: { justifyContent: 'flex-end', margin: '16px 0 0 calc(100% - 400px)' }
            }}
            className="border-none text-xs rounded-2xl"
          />
        </div>
      </div>

      {/* MODAL: ADD NEW QUESTION - ALL TYPES */}
      <CreateQuestionModal
        open={activeModalType !== null}
        initialType={activeModalType || 'single'}
        onClose={() => setActiveModalType(null)}
        onSave={onAddQuestion}
        onSendReview={onAddQuestion}
        subject={selectedSubject}
        grade={selectedGrade}
        selectedTopicKey={selectedTopicKey}
        topicTreeData={topicTreeData}
      />

      {/* MODAL 2: INTERACTIVE AI SMART GENERATOR */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
            <ThunderboltOutlined className="text-indigo-600 font-extrabold animate-pulse" />
            <span className="font-extrabold uppercase text-slate-800 text-[14px]">Sinh câu hỏi tự động bằng AI (SmartTest Engine)</span>
          </div>
        }
        open={isAIOpen}
        onCancel={() => {
          setIsAIOpen(false);
          setAiSuggestedQuestion(null);
        }}
        footer={null}
        width={600}
        centered
      >
        <div className="space-y-4 pt-3">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-4 rounded-2xl">
            <span className="text-xs text-indigo-900 font-extrabold uppercase tracking-wider block mb-2">Thông số sinh câu hỏi</span>
            <div className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <span className="text-slate-400 font-medium block">Môn học đồng hành:</span>
                <strong className="text-slate-800 block text-[13px]">{selectedSubject}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Khối lớp kiểm soát:</span>
                <strong className="text-slate-800 block text-[13px]">{selectedGrade}</strong>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Mức độ tư duy yêu cầu</label>
              <Radio.Group
                id="ai-level-radio-group"
                value={aiSelectedLevel}
                onChange={(e) => setAiSelectedLevel(e.target.value)}
                className="flex flex-wrap gap-2 pt-1"
                size="small"
              >
                <Radio.Button value="nhan_biet" className="text-xs font-bold">Nhận biết</Radio.Button>
                <Radio.Button value="thong_hieu" className="text-xs font-bold">Thông hiểu</Radio.Button>
                <Radio.Button value="van_dung" className="text-xs font-bold">Vận dụng</Radio.Button>
                <Radio.Button value="van_dung_cao" className="text-xs font-bold text-rose-600">Vận dụng cao</Radio.Button>
              </Radio.Group>
            </div>
          </div>

          <Button
            type="primary"
            id="btn-ai-submit-generation"
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-extrabold py-2 shadow-xs border-transparent hover:opacity-90 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            icon={<ThunderboltOutlined />}
            onClick={triggerAIQuestionGeneration}
            disabled={aiGenerating}
          >
            {aiGenerating ? 'AI Đang phân tích và xử lý...' : 'Bắt đầu sinh câu hỏi tự động'}
          </Button>

          {aiGenerating && (
            <div className="text-center py-10 space-y-3" id="ai-generating-loader-container">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#4f46e5' }} spin />} />
              <p className="text-xs text-indigo-900 font-bold animate-pulse">SmartTest AI đang cấu trúc câu hỏi bám sát ma trận năng lực chuyên môn...</p>
            </div>
          )}

          {aiSuggestedQuestion && (
            <div className="border border-slate-200 bg-white rounded-2xl p-4 shadow-sm space-y-4 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between border-b border-dashed pb-2">
                <Tag color="purple" className="font-extrabold uppercase font-mono text-[10px]">{aiSuggestedQuestion.code}</Tag>
                <span className="text-[11px] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold text-indigo-700">Được sinh bởi AI</span>
              </div>

              <div className="text-[13px] text-slate-800 font-bold leading-relaxed">
                {aiSuggestedQuestion.text}
              </div>

              {aiSuggestedQuestion.options && (
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
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t mt-4 border-slate-100">
                <Button
                  className="rounded-lg text-xs font-bold bg-slate-50 text-slate-500 border-slate-200"
                  onClick={() => setAiSuggestedQuestion(null)}
                >
                  Bỏ đi, sinh đề khác
                </Button>
                <Button
                  type="primary"
                  className="rounded-lg text-xs font-extrabold bg-[#002147] border-transparent text-white hover:bg-slate-900"
                  icon={<CheckCircleOutlined />}
                  onClick={acceptAISuggestedQuestion}
                >
                  Duyệt và Thêm vào NHCH
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

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

        </div>
      ) : (
        <ThamDinhCauHoiTab
          questions={questions}
          onUpdateQuestion={onUpdateQuestion}
          onOpenReview={onOpenReview}
        />
      )}
    </div>
  );
}
