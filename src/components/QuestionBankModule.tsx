import React, { useState, useMemo } from 'react';
import { Tree, Select, Input, Button, Table, Tag, Space, message, Modal, Radio, Form, Spin, Divider, Tooltip } from 'antd';
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
  LoadingOutlined
} from '@ant-design/icons';
import { Question, QuestionType, CognitiveLevel, QuestionStatus, TopicNode } from '../types';
import { SUBJECTS, GRADES, TOPICS_TREE } from '../data';

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
  // Filters state
  const [selectedSubject, setSelectedSubject] = useState<string>('Toán học');
  const [selectedGrade, setSelectedGrade] = useState<string>('Khối 12');
  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(null);

  // Search filter query inputs
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<QuestionType | 'all'>('all');
  const [filterLevel, setFilterLevel] = useState<CognitiveLevel | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | 'all'>('all');

  // Triggered filters matching "Tìm kiếm" button
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '',
    type: 'all',
    level: 'all',
    status: 'all'
  });

  // Modal / Form state for Add New
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [selectedAddType, setSelectedAddType] = useState<QuestionType>('single');

  // AI Generation State
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestedQuestion, setAiSuggestedQuestion] = useState<Question | null>(null);
  const [aiSelectedLevel, setAiSelectedLevel] = useState<CognitiveLevel>('nhan_biet');

  // File import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importedFile, setImportedFile] = useState<string | null>(null);

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

      return true;
    });
  }, [questions, selectedSubject, selectedGrade, selectedTopicKey, appliedFilters, topicTreeData]);

  const handleSearchAction = () => {
    setAppliedFilters({
      keyword: searchKeyword,
      type: filterType,
      level: filterLevel,
      status: filterStatus
    });
    message.success('Đã áp dụng bộ lọc câu hỏi!');
  };

  const handleResetFilters = () => {
    setSearchKeyword('');
    setFilterType('all');
    setFilterLevel('all');
    setFilterStatus('all');
    setAppliedFilters({
      keyword: '',
      type: 'all',
      level: 'all',
      status: 'all'
    });
    setSelectedTopicKey(null);
    message.info('Đã làm mới bộ lọc.');
  };

  // Status mapping
  const getStatusBadge = (status: QuestionStatus) => {
    switch (status) {
      case 'approved':
        return <Tag color="success" className="font-semibold rounded-full px-2">Đã thẩm định</Tag>;
      case 'pending':
        return <Tag color="warning" className="font-semibold rounded-full px-2">Chờ thẩm định</Tag>;
      default:
        return <Tag color="default" className="font-semibold rounded-full px-2">Lưu nháp</Tag>;
    }
  };

  // Level mapping
  const getLevelLabel = (level: CognitiveLevel) => {
    switch (level) {
      case 'nhan_biet':
        return <span className="text-blue-900 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px]">Nhận biết</span>;
      case 'thong_hieu':
        return <span className="text-emerald-950 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">Thông hiểu</span>;
      case 'van_dung':
        return <span className="text-purple-950 font-bold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-[11px]">Vận dụng</span>;
      default:
        return <span className="text-rose-950 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">Vận dụng cao</span>;
    }
  };

  // Add question action
  const handleAddNewQuestionSubmit = () => {
    addForm.validateFields().then((values) => {
      const topicNameStr = topicTreeData[0]?.title || 'Chủ đề mặc định';
      const subTopicNameStr = topicTreeData[0]?.children?.[0]?.title || 'Tiểu mục mặc định';

      const createdQuest: Question = {
        id: `q-custom-${Date.now()}`,
        code: values.code || `Q-${selectedSubject.substring(0,3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
        text: values.text,
        type: selectedAddType,
        level: values.level,
        status: 'draft',
        subject: selectedSubject,
        grade: selectedGrade || 'Khối 12',
        topicId: selectedTopicKey || topicTreeData[0]?.children?.[0]?.key || 'math-sub1.1',
        topicName: topicNameStr,
        subTopicName: subTopicNameStr,
        options: selectedAddType === 'single' || selectedAddType === 'multiple' 
          ? [values.optA, values.optB, values.optC, values.optD].filter(Boolean)
          : undefined,
        correctAnswer: values.correctAnswer,
        creator: 'Hội đồng Chuyên môn (Tự tạo)',
        createdAt: new Date().toISOString()
      };

      onAddQuestion(createdQuest);
      message.success('Đã lưu thành công câu hỏi vào Ngân hàng! (Trạng thái: Lưu nháp)');
      setIsAddOpen(false);
      addForm.resetFields();
    });
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
        code: `AI-${selectedSubject.substring(0,3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
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
        code: `IMP-${selectedSubject.substring(0,3).toUpperCase()}-101`,
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
        code: `IMP-${selectedSubject.substring(0,3).toUpperCase()}-102`,
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

  const tableColumns = [
    {
      title: 'STT',
      width: 50,
      render: (text: any, record: any, index: number) => <span className="font-mono text-slate-500 text-xs">{index + 1}</span>
    },
    {
      title: 'Mã câu hỏi',
      dataIndex: 'code',
      width: 120,
      render: (code: string) => <strong className="font-mono text-[#002147] text-xs uppercase bg-slate-100 px-1.5 py-0.5 rounded">{code}</strong>
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
      title: 'Loại hình',
      dataIndex: 'type',
      width: 130,
      render: (type: string) => {
        switch (type) {
          case 'single': return <span className="text-xs text-slate-600 font-bold">Lựa chọn đơn (TN)</span>;
          case 'multiple': return <span className="text-xs text-slate-600 font-bold">Lựa chọn nhiều</span>;
          case 'true_false': return <span className="text-xs text-slate-600 font-bold">Đúng/Sai</span>;
          default: return <span className="text-xs text-slate-600 font-bold">Tự luận ngắn</span>;
        }
      }
    },
    {
      title: 'Mức độ',
      dataIndex: 'level',
      width: 120,
      render: (level: CognitiveLevel) => getLevelLabel(level)
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (status: QuestionStatus) => getStatusBadge(status)
    },
    {
      title: 'Người tạo',
      dataIndex: 'creator',
      width: 140,
      ellipsis: true,
      render: (creator: string) => <span className="text-slate-500 font-medium text-xs">{creator}</span>
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 130,
      align: 'center' as const,
      render: (_: any, record: Question) => (
        <Space size="middle" id={`actions-group-${record.id}`}>
          <Tooltip title="Chỉnh sửa câu hỏi">
            <Button 
              type="text" 
              icon={<EditOutlined className="text-slate-500 hover:text-blue-950 text-xs" />} 
              size="small"
              onClick={() => {
                message.info(`Xem thông tin câu hỏi ${record.code}. Bạn có thể thay đổi dữ liệu.`);
                setIsAddOpen(true);
                addForm.setFieldsValue({
                  code: record.code,
                  text: record.text,
                  level: record.level,
                  correctAnswer: record.correctAnswer,
                  optA: record.options?.[0] || '',
                  optB: record.options?.[1] || '',
                  optC: record.options?.[2] || '',
                  optD: record.options?.[3] || '',
                });
                setSelectedAddType(record.type);
              }}
            />
          </Tooltip>
          <Tooltip title="Thẩm định chất lượng">
            <Button 
              type="primary"
              size="small"
              id={`btn-review-${record.id}`}
              className="bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100 font-bold text-[10px] uppercase shadow-none hover:text-sky-900 cursor-pointer"
              onClick={() => onOpenReview(record)}
            >
              Thẩm định
            </Button>
          </Tooltip>
          <Tooltip title="Xóa dữ liệu">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined className="text-xs" />} 
              size="small"
              onClick={() => {
                Modal.confirm({
                  title: 'Xác nhận xóa câu hỏi',
                  content: `Hành động này sẽ xóa câu hỏi ${record.code} ra khỏi ngân hàng. Bạn có chắc chắn muốn tiếp tục?`,
                  okText: 'Xóa ngay',
                  okType: 'danger',
                  cancelText: 'Hủy bỏ',
                  onOk() {
                    onDeleteQuestion(record.id);
                    message.success('Đã xóa câu hỏi khỏi ngân hàng.');
                  }
                });
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch" id="question-bank-container">
      
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
              id="topics-interactive-tree"
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
        
        {/* Search & Actions Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-slate-900 font-black text-base uppercase tracking-tight flex items-center gap-2">
                <BookOutlined className="text-blue-900" />
                NGÂN HÀNG CÂU HỎI
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Hiển thị <strong className="text-slate-800">{filteredQuestions.length} / {questions.filter(q => q.subject === selectedSubject).length}</strong> câu hỏi thuộc môn <strong className="text-slate-800">{selectedSubject}</strong>, {selectedGrade}
              </p>
            </div>

            {/* Action button group */}
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Button 
                type="primary"
                id="btn-search-trigger"
                icon={<SearchOutlined />}
                className="bg-blue-600 text-white rounded-xl text-xs font-extrabold px-3 py-1.5 shadow-none hover:bg-blue-700 cursor-pointer"
                onClick={handleSearchAction}
              >
                Tìm kiếm
              </Button>
              <Button 
                type="primary"
                id="btn-add-new-question"
                icon={<PlusOutlined />}
                className="bg-[#002147] border-transparent text-white rounded-xl text-xs font-extrabold px-3 py-1.5 shadow-none hover:bg-slate-900 cursor-pointer"
                onClick={() => setIsAddOpen(true)}
              >
                Thêm mới
              </Button>
              <Button 
                type="primary"
                id="btn-ai-generate-question"
                icon={<ThunderboltOutlined className="animate-bounce" />}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 border-none text-white rounded-xl text-xs font-extrabold px-3 py-1.5 shadow-xs hover:opacity-90 active:scale-95 cursor-pointer"
                onClick={() => setIsAIOpen(true)}
              >
                Thêm mới bằng AI
              </Button>
              <Button 
                icon={<UploadOutlined />}
                className="bg-emerald-700 text-white border-transparent rounded-xl text-xs font-extrabold px-3 py-1.5 hover:bg-emerald-800 cursor-pointer"
                onClick={() => setIsImportOpen(true)}
              >
                Import từ file
              </Button>
            </div>
          </div>

          {/* Inline filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tìm kiếm từ khóa / mã đề</label>
              <Input
                id="search-input-text"
                placeholder="Nhập nội dung, mã, tác giả..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="rounded-xl border-slate-200 text-xs"
                onPressEnter={handleSearchAction}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Loại hình câu hỏi</label>
              <Select
                id="select-type-filter"
                value={filterType}
                onChange={setFilterType}
                className="w-full text-xs font-bold"
                options={[
                  { value: 'all', label: 'Tất cả loại hình' },
                  { value: 'single', label: 'Trắc nghiệm đơn' },
                  { value: 'multiple', label: 'Trắc nghiệm nhiều lựa chọn' },
                  { value: 'true_false', label: 'Trắc nghiệm Đúng / Sai' },
                  { value: 'short', label: 'Tự luận viết ngắn' }
                ]}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mức độ tư duy</label>
              <Select
                id="select-level-filter"
                value={filterLevel}
                onChange={setFilterLevel}
                className="w-full text-xs font-bold"
                options={[
                  { value: 'all', label: 'Tất cả cấp độ' },
                  { value: 'nhan_biet', label: 'Nhận biết' },
                  { value: 'thong_hieu', label: 'Thông hiểu' },
                  { value: 'van_dung', label: 'Vận dụng' },
                  { value: 'van_dung_cao', label: 'Vận dụng cao' }
                ]}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Trạng thái duyệt</label>
              <Select
                id="select-status-filter"
                value={filterStatus}
                onChange={setFilterStatus}
                className="w-full text-xs font-bold"
                options={[
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'approved', label: 'Đã thẩm định' },
                  { value: 'pending', label: 'Chờ thẩm định' },
                  { value: 'draft', label: 'Lưu nháp' }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Big Table Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-0 flex-1 overflow-hidden">
          <Table
            id="question-bank-main-table"
            dataSource={filteredQuestions}
            columns={tableColumns}
            rowKey="id"
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

      {/* MODAL 1: ADD NEW QUESTION QUICK FORM */}
      <Modal
        title={
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <PlusOutlined className="text-[#002147]" />
            <span className="font-extrabold uppercase text-slate-800 text-[14px]">Thêm mới câu hỏi thủ công</span>
          </div>
        }
        open={isAddOpen}
        forceRender
        onCancel={() => {
          setIsAddOpen(false);
          addForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setIsAddOpen(false)} className="rounded-lg text-xs font-bold">Hủy bỏ</Button>,
          <Button key="submit" type="primary" onClick={handleAddNewQuestionSubmit} className="rounded-lg bg-[#002147] border-transparent text-white font-bold text-xs hover:bg-[#093557]">
            Lưu nháp câu hỏi
          </Button>
        ]}
        width={650}
        centered
      >
        <Form form={addForm} layout="vertical" className="space-y-4 pt-3">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label={<span className="text-xs font-bold text-slate-750">Mã câu hỏi (Tùy chọn)</span>} name="code">
              <Input placeholder="Hệ thống tự sinh nếu để trống" className="rounded-lg text-xs" />
            </Form.Item>

            <Form.Item label={<span className="text-xs font-bold text-slate-750">Mức độ tư duy</span>} name="level" rules={[{ required: true }]} initialValue="nhan_biet">
              <Select className="w-full text-xs font-bold" options={[
                { value: 'nhan_biet', label: 'Nhận biết' },
                { value: 'thong_hieu', label: 'Thông hiểu' },
                { value: 'van_dung', label: 'Vận dụng' },
                { value: 'van_dung_cao', label: 'Vận dụng cao' }
              ]} />
            </Form.Item>
          </div>

          <Form.Item label={<span className="text-xs font-bold text-slate-750 font-sans">Kiểu câu hỏi</span>} rules={[{ required: true }]}>
            <Radio.Group 
              id="form-radio-question-type"
              value={selectedAddType} 
              onChange={(e) => setSelectedAddType(e.target.value)} 
              className="flex gap-4"
            >
              <Radio value="single">Một đáp án đúng</Radio>
              <Radio value="multiple">Nhiều lựa chọn</Radio>
              <Radio value="short">Tự luận viết ngắn</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label={<span className="text-xs font-bold text-slate-750">Nội dung câu hỏi</span>} name="text" rules={[{ required: true, message: 'Vui lòng điền nội dung!' }]}>
            <Input.TextArea placeholder="Nhập đầy đủ nội dung hoặc đề bài..." rows={3} className="rounded-lg text-xs" />
          </Form.Item>

          {(selectedAddType === 'single' || selectedAddType === 'multiple') && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <span className="text-xs font-black text-slate-700 block uppercase tracking-wider mb-1">Danh sách phương án lựa chọn</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Form.Item label="Phương án A" name="optA" rules={[{ required: true }]} className="mb-0">
                  <Input placeholder="Nhập lựa chọn A" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Phương án B" name="optB" rules={[{ required: true }]} className="mb-0">
                  <Input placeholder="Nhập lựa chọn B" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Phương án C" name="optC" rules={[{ required: true }]} className="mb-0">
                  <Input placeholder="Nhập lựa chọn C" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Phương án D" name="optD" rules={[{ required: true }]} className="mb-0">
                  <Input placeholder="Nhập lựa chọn D" className="rounded-lg" />
                </Form.Item>
              </div>
            </div>
          )}

          <Form.Item label={<span className="text-xs font-bold text-slate-750">Đáp án chính xác</span>} name="correctAnswer" rules={[{ required: true }]}>
            <Input placeholder={selectedAddType === 'short' ? 'Nhập nội dung từ khóa tự luận...' : 'Nhập phương án đúng (Ví dụ: A)'} className="rounded-lg text-xs" />
          </Form.Item>
        </Form>
      </Modal>

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
                      className={`p-2 rounded-lg border font-medium ${
                        opt === aiSuggestedQuestion.correctAnswer 
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

    </div>
  );
}
