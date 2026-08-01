import React, { useState, useMemo } from 'react';
import { Table, Input, Select, DatePicker, Button, Tooltip, ConfigProvider } from 'antd';
import { toast } from '../../../../utils/toast';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { Question, QuestionType, CognitiveLevel, QuestionStatus } from '../../../../types';
import { SUBJECTS, GRADES } from '../../../../data';

interface QuestionReviewModuleProps {
  questions: Question[];
  onOpenReview: (q: Question) => void;
}

export default function QuestionReviewModule({
  questions,
  onOpenReview
}: QuestionReviewModuleProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

  // Filters State
  const [searchText, setSearchText] = useState('');
  const [searchSubject, setSearchSubject] = useState<string>('Tất cả');
  const [searchGrade, setSearchGrade] = useState<string>('Tất cả');
  const [searchLevel, setSearchLevel] = useState<CognitiveLevel | 'all'>('all');
  const [searchType, setSearchType] = useState<QuestionType | 'all'>('all');
  const [searchStatus, setSearchStatus] = useState<QuestionStatus | 'all'>('pending'); // Default to pending review
  const [filterDates, setFilterDates] = useState<any>(null);

  const getQuestionTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'single': return 'Trắc nghiệm đơn';
      case 'multiple': return 'Trắc nghiệm nhiều lựa chọn';
      case 'true_false': return 'Đúng / Sai';
      case 'short': return 'Tự luận ngắn';
      default: return 'Trắc nghiệm đơn';
    }
  };

  const getCognitiveLevelLabel = (level: CognitiveLevel) => {
    switch (level) {
      case 'nhan_biet': return 'Nhận biết';
      case 'thong_hieu': return 'Thông hiểu';
      case 'van_dung': return 'Vận dụng';
      case 'van_dung_cao': return 'Vận dụng cao';
      default: return 'Nhận biết';
    }
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSearchSubject('Tất cả');
    setSearchGrade('Tất cả');
    setSearchLevel('all');
    setSearchType('all');
    setSearchStatus('pending');
    setFilterDates(null);
    toast.info('Đã làm mới bộ lọc.');
  };

  // Perform filtering
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // 1. Text Search (code or content)
      if (searchText) {
        const textToSearch = `${q.code} ${q.text}`.toLowerCase();
        if (!textToSearch.includes(searchText.toLowerCase())) return false;
      }
      // 2. Subject filter
      if (searchSubject !== 'Tất cả' && q.subject !== searchSubject) return false;
      // 3. Grade filter
      if (searchGrade !== 'Tất cả' && q.grade !== searchGrade) return false;
      // 4. Level filter
      if (searchLevel !== 'all' && q.level !== searchLevel) return false;
      // 5. Type filter
      if (searchType !== 'all' && q.type !== searchType) return false;
      // 6. Status filter
      if (searchStatus !== 'all' && q.status !== searchStatus) return false;
      // 7. Date Range filter
      if (filterDates && filterDates[0] && filterDates[1]) {
        const startDate = filterDates[0].startOf('day').toDate();
        const endDate = filterDates[1].endOf('day').toDate();
        const qDate = new Date(q.createdAt);
        if (qDate < startDate || qDate > endDate) return false;
      }
      return true;
    });
  }, [questions, searchText, searchSubject, searchGrade, searchLevel, searchType, searchStatus, filterDates]);

  const columns: ColumnsType<Question> = [
    {
      title: 'Mã câu hỏi',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => (
        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono text-xs font-bold">
          {code}
        </span>
      )
    },
    {
      title: 'Nội dung câu hỏi',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      render: (text: string) => (
        <span className="text-slate-800 font-medium text-xs truncate block max-w-lg">
          {text}
        </span>
      )
    },
    {
      title: 'Loại câu hỏi',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: QuestionType) => (
        <span className="text-slate-600 text-xs font-semibold">
          {getQuestionTypeLabel(type)}
        </span>
      )
    },
    {
      title: 'Môn học',
      dataIndex: 'subject',
      key: 'subject',
      width: 110,
      render: (subject: string) => (
        <span className="text-slate-600 text-xs">
          {subject}
        </span>
      )
    },
    {
      title: 'Khối lớp',
      dataIndex: 'grade',
      key: 'grade',
      width: 100,
      render: (grade: string) => (
        <span className="text-slate-600 text-xs">
          {grade}
        </span>
      )
    },
    {
      title: 'Cấp độ',
      dataIndex: 'level',
      key: 'level',
      width: 120,
      render: (level: CognitiveLevel) => (
        <span className="text-slate-600 text-xs">
          {getCognitiveLevelLabel(level)}
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: QuestionStatus) => {
        switch (status) {
          case 'approved':
            return (
              <span className="px-2.5 py-0.5 rounded border border-emerald-400 text-emerald-600 bg-emerald-50 text-[11px] font-bold">
                Đã thẩm định
              </span>
            );
          case 'pending':
            return (
              <span className="px-2.5 py-0.5 rounded border border-blue-400 text-blue-600 bg-blue-50 text-[11px] font-bold">
                Chờ thẩm định
              </span>
            );
          case 'draft':
          default:
            return (
              <span className="px-2.5 py-0.5 rounded border border-slate-300 text-slate-600 bg-slate-50 text-[11px] font-bold">
                Tạo mới
              </span>
            );
        }
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      width: 100,
      render: (_, record) => (
        <Tooltip title="Thẩm định chi tiết">
          <Button
            type="text"
            icon={<FileText size={16} className="text-blue-600" />}
            className="bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md mx-auto cursor-pointer"
            onClick={() => onOpenReview(record)}
            style={{ cursor: 'pointer' }}
          />
        </Tooltip>
      )
    }
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 6,
        },
        components: {
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#334155',
            rowHoverBg: '#f1f5f9',
          },
        },
      }}
    >
      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
        
        {/* Search Information Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-300">
          <div
            className={`flex items-center justify-between text-slate-800 font-extrabold text-xs uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors select-none ${
              isSearchExpanded ? 'pb-3 mb-4 border-b border-slate-100' : 'pb-0 mb-0'
            }`}
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          >
            <div className="flex items-center gap-1">
              <span>Tìm kiếm thông tin</span>
              <span className="text-[12px] font-bold text-slate-500 ml-1">
                {isSearchExpanded ? '^' : 'v'}
              </span>
            </div>
          </div>

          {isSearchExpanded && (
            <div className="animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ID/Content Search */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">ID, Nội dung câu hỏi</label>
                  <Input
                    placeholder="Nhập"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="rounded border-slate-350 text-xs"
                  />
                </div>

                {/* Môn học */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Môn học</label>
                  <Select
                    value={searchSubject}
                    onChange={setSearchSubject}
                    className="w-full text-xs font-medium"
                    options={[
                      { value: 'Tất cả', label: 'Tất cả' },
                      ...SUBJECTS.map((s) => ({ value: s.value, label: s.label }))
                    ]}
                  />
                </div>

                {/* Khối lớp */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Khối lớp</label>
                  <Select
                    value={searchGrade}
                    onChange={setSearchGrade}
                    className="w-full text-xs font-medium"
                    options={[
                      { value: 'Tất cả', label: 'Tất cả' },
                      ...GRADES.map((g) => ({ value: g.value, label: g.label }))
                    ]}
                  />
                </div>

                {/* Loại câu hỏi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Loại câu hỏi</label>
                  <Select
                    value={searchType}
                    onChange={setSearchType}
                    className="w-full text-xs font-medium"
                    options={[
                      { value: 'all', label: 'Tất cả' },
                      { value: 'single', label: 'Trắc nghiệm đơn' },
                      { value: 'multiple', label: 'Trắc nghiệm nhiều lựa chọn' },
                      { value: 'true_false', label: 'Trắc nghiệm Đúng / Sai' },
                      { value: 'short', label: 'Tự luận ngắn' }
                    ]}
                  />
                </div>

                {/* Cấp độ tư duy */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Cấp độ tư duy</label>
                  <Select
                    value={searchLevel}
                    onChange={setSearchLevel}
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

                {/* Trạng thái thẩm định */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Trạng thái thẩm định</label>
                  <Select
                    value={searchStatus}
                    onChange={setSearchStatus}
                    className="w-full text-xs font-medium"
                    options={[
                      { value: 'all', label: 'Tất cả' },
                      { value: 'pending', label: 'Chờ thẩm định' },
                      { value: 'approved', label: 'Đã thẩm định' },
                      { value: 'draft', label: 'Tạo mới' }
                    ]}
                  />
                </div>

                {/* Ngày tạo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày tạo</label>
                  <DatePicker.RangePicker
                    placeholder={['Bắt đầu', 'Kết thúc']}
                    value={filterDates}
                    onChange={(dates) => setFilterDates(dates)}
                    className="w-full rounded border-slate-350 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <Button
                  onClick={handleResetFilters}
                  className="rounded border-slate-300 text-xs font-bold h-9 px-6 flex items-center justify-center cursor-pointer"
                >
                  Làm sạch bộ lọc
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Results Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h2 className="text-[#002147] font-black text-sm uppercase tracking-tight my-0">
              Danh sách câu hỏi thẩm định
            </h2>
          </div>

          <Table
            dataSource={filteredQuestions}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              className: "pr-4 pb-4 pt-4 text-xs font-medium",
              style: { justifyContent: 'flex-end' }
            }}
            className="border-none text-xs rounded-2xl"
          />
        </div>
      </div>
    </ConfigProvider>
  );
}
