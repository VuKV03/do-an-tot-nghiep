import React, { useState, useEffect, useMemo } from 'react';
import {
  Input,
  Select,
  Button,
  message,
  Modal,
  Spin,
  Tag,
  Tooltip,
  Space,
  Empty,
  DatePicker,
  Avatar,
  Checkbox,
  Timeline,
  Dropdown,
  Progress,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SearchOutlined,
  SlidersOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  ShareAltOutlined,
  SyncOutlined,
  FileExcelOutlined,
  DownOutlined,
  UpOutlined,
  UserOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RetweetOutlined
} from '@ant-design/icons';
import { SUBJECTS, GRADES, SYSTEM_USERS } from '../../../data';
import { Question } from '../../../types';
import { bankQuestionApi } from '../../../services/danhMucApi';
import { buildExamDocxBlob, triggerBlobDownload } from '../../../utils/examWordExport';
import ModalDeRiengLe from './ModalDeRiengLe';
import ModalTaoDeTuDong from './ModalTaoDeTuDong';
import ModalSinhDeHoanVi from './ModalSinhDeHoanVi';
import ExamContentDisplay from './ExamContentDisplay';

const { RangePicker } = DatePicker;

interface ExamManagementModuleProps {
  onNavigateTab?: (key: string) => void;
}

export default function ExamManagementModule({ onNavigateTab }: ExamManagementModuleProps) {
  // Tabs: 'exam_variants' | 'exam_roots' | 'exam_packages'
  const [activeTab, setActiveTab] = useState<'exam_roots' | 'exam_review'>('exam_roots');

  // Core Data States
  const [exams, setExams] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters for Exams
  const [examSearch, setExamSearch] = useState('');
  const [examSubject, setExamSubject] = useState('all');
  const [examGrade, setExamGrade] = useState('all');
  const [examMatrix, setExamMatrix] = useState('all');
  const [examCreator, setExamCreator] = useState('all');
  const [examStatus, setExamStatus] = useState('all');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Filters for Packages (Tab 3)
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgSubject, setPkgSubject] = useState('all');
  const [pkgPeriod, setPkgPeriod] = useState('all');

  // Batch action selection
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [selectedPkgIds, setSelectedPkgIds] = useState<string[]>([]);

  // Modal Triggers
  const [isDeRiengLeOpen, setIsDeRiengLeOpen] = useState(false);
  const [isTuDongMoiOpen, setIsTuDongMoiOpen] = useState(false);
  const [isSinhHoanViOpen, setIsSinhHoanViOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<any | null>(null);

  // Secondary interactive modals state
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Xem chi tiết đề thi
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewQuestions, setViewQuestions] = useState<Question[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  // Form states for secondary modals
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  // Fetch Exams & Packages
  const fetchData = async () => {
    setLoading(true);
    try {
      const resExams = await fetch('/api/exams');
      const dataExams = await resExams.json();
      if (dataExams.success) {
        setExams(dataExams.data || []);
      }

      const resPkgs = await fetch('/api/exams/packages');
      const dataPkgs = await resPkgs.json();
      if (dataPkgs.success) {
        setPackages(dataPkgs.data || []);
      }
    } catch {
      message.error('Lỗi cổng kết nối khi tải danh sách.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter computations
  const filteredExamVariants = useMemo(() => {
    const kw = examSearch.trim().toLowerCase();
    return exams.filter(e => {
      // loai=4: variants / ai-generated
      const isVariant = e.source === 'ai';
      const matchesSearch = e.name.toLowerCase().includes(kw) || e.code.toLowerCase().includes(kw);
      const matchesSubject = examSubject === 'all' || e.subject === examSubject;
      const matchesGrade = examGrade === 'all' || e.grade === examGrade;
      const matchesStatus = examStatus === 'all' || e.status === examStatus;
      return isVariant && matchesSearch && matchesSubject && matchesGrade && matchesStatus;
    });
  }, [exams, examSearch, examSubject, examGrade, examStatus]);

  const filteredExamRoots = useMemo(() => {
    const kw = examSearch.trim().toLowerCase();
    return exams.filter(e => {
      const isRoot = e.source !== 'ai';
      const matchesSearch = (e.name || '').toLowerCase().includes(kw) || (e.code || '').toLowerCase().includes(kw);
      const matchesSubject = examSubject === 'all' || e.subject === examSubject;
      const matchesStatus = examStatus === 'all' || e.status === examStatus;
      return isRoot && matchesSearch && matchesSubject && matchesStatus;
    });
  }, [exams, examSearch, examSubject, examStatus]);

  const filteredExamReview = useMemo(() => {
    return exams.filter(e => e.status === 'pending' || e.status === '2');
  }, [exams]);

  // Batch delete handlers
  const handleBatchDeleteExams = () => {
    if (selectedExamIds.length === 0) return;
    Modal.confirm({
      title: `Xác nhận xóa ${selectedExamIds.length} đề thi đã chọn?`,
      content: 'Hành động này sẽ gỡ bỏ vĩnh viễn các đề thi được chọn.',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          for (const id of selectedExamIds) {
            await fetch(`/api/exams/${id}`, { method: 'DELETE' });
          }
          message.success('Đã xóa thành công các đề thi được chọn.');
          setSelectedExamIds([]);
          fetchData();
        } catch {
          message.error('Có lỗi xảy ra khi xóa hàng loạt.');
        }
      }
    });
  };

  const handleSingleDeleteExam = (id: string, name: string) => {
    Modal.confirm({
      title: `Xác nhận xóa đề thi: "${name}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) {
            message.success(json.message);
            fetchData();
          }
        } catch {
          message.error('Không thể xóa đề thi.');
        }
      }
    });
  };

  const handleTogglePkgStatus = async (pkg: any) => {
    const nextStatus = pkg.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/exams/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await res.json();
      if (json.success) {
        message.info(`Đã chuyển đổi trạng thái gói đề sang: ${nextStatus === 'active' ? 'HOẠT ĐỘNG' : 'TẠM KHÓA'}`);
        fetchData();
      }
    } catch {
      message.error('Không thể cập nhật trạng thái gói.');
    }
  };

  const handleDeletePackage = (id: string, name: string) => {
    Modal.confirm({
      title: `Xác nhận giải tán gói đề: "${name}"?`,
      okText: 'Giải tán',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          const res = await fetch(`/api/exams/packages/${id}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) {
            message.success(json.message);
            fetchData();
          }
        } catch {
          message.error('Không thể xóa gói đề.');
        }
      }
    });
  };

  // Lấy câu hỏi thật của 1 đề thi từ Ngân hàng câu hỏi (đã lọc theo examId), dùng chung cho
  // "Xem đề thi" và "Xuất file" — exam.questions từ GET /api/exams trả sai tên field
  // (content/correct_answer thay vì text/correctAnswer) nên KHÔNG dùng trực tiếp ở đây.
  const fetchExamQuestions = async (examId: string): Promise<Question[]> => {
    try {
      const res = await bankQuestionApi.list();
      if (!res.success || !res.data) return [];
      return res.data
        .filter(q => q.examId === examId)
        .map((q): Question => ({
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
        }));
    } catch {
      return [];
    }
  };

  // Xem chi tiết đề thi
  const handleOpenView = async (exam: any) => {
    setSelectedExam(exam);
    setIsViewOpen(true);
    setViewLoading(true);
    setViewQuestions(await fetchExamQuestions(exam.id));
    setViewLoading(false);
  };

  // Word export trigger — file .docx thật (OOXML, thư viện `docx`), không còn là RTF đổi đuôi
  // như trước (mở được trên Word desktop nhờ tự nhận diện nội dung, nhưng không phải file Word
  // chuẩn nên có thể lỗi/cảnh báo trên Word Online, LibreOffice, Google Docs...).
  const handleExportWord = async (exam: any) => {
    message.loading({ content: `Đang biên dịch & xuất tài liệu cho đề ${exam.code}...`, key: 'word' });
    const questions = await fetchExamQuestions(exam.id);
    const blob = await buildExamDocxBlob('ĐỀ THI TRẮC NGHIỆM', exam.subject, exam.grade, questions);
    triggerBlobDownload(blob, `${exam.code}_DeThi_${exam.subject.replace(/\s+/g, '')}`, 'docx');
    message.success({ content: `Xuất thành công file Word đề thi ${exam.code}!`, key: 'word', duration: 3 });
  };

  const handleExportExcel = () => {
    message.loading({ content: 'Đang kết xuất danh sách báo cáo Excel...', key: 'excel' });
    setTimeout(() => {
      message.success({ content: 'Xuất báo cáo Excel thành công!', key: 'excel', duration: 3 });
    }, 1000);
  };

  // Gửi thẩm định: đề thi đã ở trạng thái "Chờ thẩm định" ngay khi tạo, nên chỉ cần
  // chuyển sang tab "Thẩm định/phản biện đề" để hội đồng xử lý tiếp.
  const handleSendReview = () => {
    setSelectedExamIds([]);
    setActiveTab('exam_review');
  };

  // Duyệt / Từ chối đề thi ở tab thẩm định
  const handleReviewDecision = async (exam: any, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        message.success(status === 'approved' ? `Đã duyệt đề thi "${exam.name}".` : `Đã từ chối đề thi "${exam.name}".`);
        fetchData();
      } else {
        message.error(json.error || 'Lỗi khi cập nhật kết quả thẩm định.');
      }
    } catch {
      message.error('Lỗi kết nối khi cập nhật kết quả thẩm định.');
    }
  };

  const handleOpenPermissions = (exam: any) => {
    setSelectedExam(exam);
    // Mock existing permissions
    setPermissions({
      read: ['u-1', 'u-2'],
      edit: ['u-2'],
      approve: ['u-3']
    });
    setIsPermissionOpen(true);
  };

  const handleSavePermissions = () => {
    message.success('Cập nhật phân quyền truy cập đề thi thành công.');
    setIsPermissionOpen(false);
  };

  const handleOpenHistory = (exam: any) => {
    setSelectedExam(exam);
    setHistoryLogs([
      { date: '2026-06-24 08:30', user: 'Lê Hoàng Hải', action: 'Chỉnh sửa hoán vị câu hỏi 3' },
      { date: '2026-06-22 14:15', user: 'Nguyễn Tiến Dũng', action: 'Sinh đề tự động từ Ma trận đặc tả' },
      { date: '2026-06-22 10:00', user: 'Hệ thống AI', action: 'Khởi tạo đề thi gốc ban đầu' }
    ]);
    setIsHistoryOpen(true);
  };

  const handleOpenSync = (exam: any) => {
    setSelectedExam(exam);
    setSyncProgress(0);
    setIsSyncOpen(true);
  };

  const handleStartSync = () => {
    setSyncProgress(10);
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          message.success(`Đồng bộ dữ liệu đề ${selectedExam.code} sang hệ thống thi trực tuyến thành công.`);
          setTimeout(() => setIsSyncOpen(false), 500);
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  // Status tag formatters
  const getStatusTag = (status: string) => {
    switch (status) {
      case '1':
      case 'draft':
        return <Tag color="default" className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">Lưu nháp</Tag>;
      case '2':
      case 'pending':
        return <Tag color="warning" className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">Chờ thẩm định</Tag>;
      case '3':
      case 'approved':
      case 'active':
        return <Tag color="success" className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">Đã thẩm định</Tag>;
      case '4':
      case 'rejected':
      case 'closed':
        return <Tag color="error" className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">Từ chối</Tag>;
      default:
        return <Tag className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">{status}</Tag>;
    }
  };

  // Chỉ cho sửa đề khi chưa "Đã thẩm định" (Nháp / Chờ thẩm định / Từ chối) — đề đã thẩm định coi như chốt.
  const canEditExam = (status: string) => !['3', 'approved', 'active'].includes(status);

  // Dropdown actions generator
  const getActionMenuItems = (exam: any) => [
    {
      key: 'review',
      label: 'Gửi thẩm định/phản biên',
      icon: <SafetyCertificateOutlined />,
      onClick: () => handleSendReview()
    },
    {
      key: 'permission',
      label: 'Phân quyền quản lý',
      icon: <SlidersOutlined />,
      onClick: () => handleOpenPermissions(exam)
    },
    {
      key: 'history',
      label: 'Lịch sử chỉnh sửa',
      icon: <HistoryOutlined />,
      onClick: () => handleOpenHistory(exam)
    },
    {
      key: 'docx',
      label: 'Tải đề thi (.docx)',
      icon: <DownloadOutlined />,
      onClick: () => handleExportWord(exam)
    },
    {
      key: 'sync',
      label: 'Đồng bộ hệ thống thi',
      icon: <ShareAltOutlined />,
      onClick: () => handleOpenSync(exam)
    },
    {
      type: 'divider' as const
    },
    {
      key: 'delete',
      label: <span className="text-red-500 font-semibold">Xóa đề thi</span>,
      icon: <DeleteOutlined className="text-red-500" />,
      onClick: () => handleSingleDeleteExam(exam.id, exam.name)
    }
  ];

  return (
    <div className="pt-3 px-6 pb-6 flex flex-col gap-4 bg-white min-h-[calc(100vh-200px)]" id="exam-management-layout-facade">
      {/* Tab Headers */}
      <div className="flex gap-1 border-b border-gray-300 relative select-none">
        <button
          onClick={() => { setActiveTab('exam_roots'); setSelectedExamIds([]); }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'exam_roots'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
            }`}
          style={{
            borderBottomColor: activeTab === 'exam_roots' ? '#eff6ff' : undefined
          }}
        >
          Đề gốc
        </button>
        <button
          onClick={() => { setActiveTab('exam_review'); setSelectedExamIds([]); }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'exam_review'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
            }`}
          style={{
            borderBottomColor: activeTab === 'exam_review' ? '#eff6ff' : undefined
          }}
        >
          Thẩm định/phản biện đề
        </button>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div
            className="flex items-center gap-2 cursor-pointer mb-4 w-fit group"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          >
            <h3 className="text-[#1a3c8b] font-bold text-sm italic m-0">Tìm kiếm thông tin</h3>
            <div className="text-[#1a3c8b] opacity-70 group-hover:opacity-100 transition-opacity">
              {isFiltersExpanded ? <UpOutlined className="text-[10px]" /> : <DownOutlined className="text-[10px]" />}
            </div>
          </div>

          {isFiltersExpanded && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-3 gap-x-4 gap-y-3 text-xs mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mã/tên đề</label>
                  <Input
                    placeholder="Nhập"
                    className="rounded border-slate-300 text-xs"
                    value={examSearch}
                    onChange={e => setExamSearch(e.target.value)}
                    allowClear
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Môn thi</label>
                  <Select
                    value={examSubject}
                    onChange={setExamSubject}
                    className="w-full text-xs"
                    options={[{ value: 'all', label: 'Tất cả' }, ...SUBJECTS]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ma trận đề thi</label>
                  <Select
                    value={examMatrix}
                    onChange={setExamMatrix}
                    className="w-full text-xs"
                    options={[{ value: 'all', label: 'Tất cả' }, { value: 'ma-tran-01', label: 'Ma trận đề 01' }, { value: 'ma-tran-02', label: 'Ma trận đề 02' }]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Người tạo</label>
                  <Select
                    value={examCreator}
                    onChange={setExamCreator}
                    className="w-full text-xs"
                    options={[{ value: 'all', label: 'Tất cả' }, ...SYSTEM_USERS.map(u => ({ value: u.id, label: u.fullName }))]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ngày tạo</label>
                  <RangePicker size="small" className="w-full" placeholder={['Bắt đầu', 'Kết thúc']} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Trạng thái</label>
                  {activeTab === 'exam_review' ? (
                    // Tab thẩm định chỉ hiển thị đề đang chờ thẩm định — khoá cứng, không cho đổi.
                    <Select
                      value="pending"
                      disabled
                      className="w-full text-xs"
                      options={[{ value: 'pending', label: 'Chờ thẩm định' }]}
                    />
                  ) : (
                    <Select
                      value={examStatus}
                      onChange={setExamStatus}
                      className="w-full text-xs"
                      options={[
                        { value: 'all', label: 'Tất cả' },
                        { value: 'draft', label: 'Nháp (vừa tạo mới)' },
                        { value: 'approved', label: 'Đã thẩm định' },
                        { value: 'pending', label: 'Chờ thẩm định' },
                        { value: 'rejected', label: 'Từ chối' }
                      ]}
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-center">
                <Button
                  type="primary"
                  className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded px-8 hover:bg-[#243590] cursor-pointer"
                  onClick={() => {}}
                >
                  Tìm kiếm
                </Button>
              </div>
            </div>
          )}
        </div>

      {/* Main Results Board */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {/* Table Operations Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-[#1a3c8b] font-bold text-sm italic m-0">
            Kết quả tìm kiếm
          </h3>
          
          <Space size={8}>
            {activeTab === 'exam_roots' && (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => { setSelectedExam(null); setIsDeRiengLeOpen(true); }}
                  className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded hover:bg-[#243590] cursor-pointer"
                >
                  Thêm mới thủ công
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsTuDongMoiOpen(true)}
                  className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded hover:bg-[#243590] cursor-pointer"
                >
                  Thêm mới tự động
                </Button>
                <Button
                  icon={<SafetyCertificateOutlined />}
                  disabled={selectedExamIds.length === 0}
                  onClick={handleSendReview}
                  className="border-slate-300 text-slate-700 font-semibold text-xs rounded cursor-pointer"
                >
                  Gửi thẩm định
                </Button>
                <Button
                  danger
                  onClick={handleBatchDeleteExams}
                  disabled={selectedExamIds.length === 0}
                  className="font-semibold text-xs rounded cursor-pointer"
                >
                  Xóa
                </Button>
              </>
            )}
            {activeTab === 'exam_review' && (
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportExcel}
                className="border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold text-xs rounded cursor-pointer"
              >
                Xuất Excel
              </Button>
            )}
          </Space>
        </div>

        {/* Custom styled HTML Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center">
              <Spin indicator={<SyncOutlined className="text-2xl" spin />} />
              <p className="text-xs text-slate-400 font-bold mt-2">Đang tải tài liệu...</p>
            </div>
          ) : (activeTab === 'exam_roots' ? filteredExamRoots : filteredExamReview).length === 0 ? (
            <Empty description="Không có đề thi nào." className="py-12" />
          ) : (
            <table className="w-full text-xs font-medium text-slate-700 border-collapse table-auto">
              <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      className="cursor-pointer accent-[#2c3e9e]"
                      checked={filteredExamRoots.length > 0 && filteredExamRoots.every(e => selectedExamIds.includes(e.id))}
                      onChange={() => {
                        const allSelected = filteredExamRoots.every(e => selectedExamIds.includes(e.id));
                        if (allSelected) setSelectedExamIds(prev => prev.filter(id => !filteredExamRoots.map(e => e.id).includes(id)));
                        else setSelectedExamIds(prev => Array.from(new Set([...prev, ...filteredExamRoots.map(e => e.id)])));
                      }}
                    />
                  </th>
                  <th className="py-3 px-3 text-center w-12 font-semibold">STT</th>
                  <th className="py-3 px-3 text-left font-semibold">Mã đề</th>
                  <th className="py-3 px-3 text-left font-semibold">Tên đề thi</th>
                  <th className="py-3 px-3 text-center font-semibold">Môn thi</th>
                  <th className="py-3 px-3 text-center font-semibold">Ma trận đề</th>
                  <th className="py-3 px-3 text-center font-semibold">Tổng điểm</th>
                  <th className="py-3 px-3 text-center font-semibold">Số câu hỏi</th>
                  <th className="py-3 px-3 text-center font-semibold">Thời gian làm bài (phút)</th>
                  <th className="py-3 px-3 text-center font-semibold">Ngày tạo</th>
                  <th className="py-3 px-3 text-center font-semibold">Trạng thái</th>
                  <th className="py-3 px-3 text-center font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeTab === 'exam_roots' ? filteredExamRoots : filteredExamReview).map((row, idx) => (
                    <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${selectedExamIds.includes(row.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="py-2.5 px-3 text-center">
                        <input type="checkbox" className="cursor-pointer accent-[#2c3e9e]"
                          checked={selectedExamIds.includes(row.id)}
                          onChange={() => setSelectedExamIds(prev => prev.includes(row.id) ? prev.filter(id => id !== row.id) : [...prev, row.id])} />
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400 font-bold text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 border rounded text-[10px]">{row.code}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 text-[11px] max-w-[160px] truncate">{row.name}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{row.description || ''}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Tag color="blue" className="rounded-md font-bold text-[9px] m-0 border-transparent">{row.subject}</Tag>
                      </td>
                      <td className="py-2.5 px-3 text-center text-[11px] text-slate-500">{row.matrixName || 'Ma trận đề 01'}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-[11px]">{row.totalScore || '10.00'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border text-[11px]">{row.totalQuestions || 0}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-[11px]">{row.duration || 90}</td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-slate-500">{row.createdAt ? row.createdAt.slice(0, 10) : '20/10/2006'}</td>
                      <td className="py-2.5 px-3 text-center">{getStatusTag(row.status)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Space size={2}>
                          {activeTab === 'exam_review' && (
                            <>
                              <Popconfirm
                                title={`Duyệt đề thi "${row.name}"?`}
                                okText="Duyệt" cancelText="Hủy"
                                onConfirm={() => handleReviewDecision(row, 'approved')}
                              >
                                <Tooltip title="Duyệt (Đã thẩm định)">
                                  <Button size="small" type="text" icon={<CheckCircleOutlined className="text-green-600" />} className="cursor-pointer" />
                                </Tooltip>
                              </Popconfirm>
                              <Popconfirm
                                title={`Từ chối đề thi "${row.name}"?`}
                                okText="Từ chối" cancelText="Hủy" okButtonProps={{ danger: true }}
                                onConfirm={() => handleReviewDecision(row, 'rejected')}
                              >
                                <Tooltip title="Từ chối">
                                  <Button size="small" type="text" danger icon={<CloseCircleOutlined />} className="cursor-pointer" />
                                </Tooltip>
                              </Popconfirm>
                            </>
                          )}
                          <Tooltip title="Xem đề thi">
                            <Button size="small" type="text" icon={<EyeOutlined className="text-[#2c3e9e]" />}
                              onClick={() => handleOpenView(row)} className="cursor-pointer" />
                          </Tooltip>
                          {canEditExam(row.status) && (
                            <Tooltip title="Chỉnh sửa">
                              <Button size="small" type="text" icon={<EditOutlined className="text-[#2c3e9e]" />}
                                onClick={() => { setSelectedExam(row); setIsDeRiengLeOpen(true); }} className="cursor-pointer" />
                            </Tooltip>
                          )}
                          <Tooltip title="Sinh đề hoán vị">
                            <Button size="small" type="text" icon={<RetweetOutlined className="text-[#2c3e9e]" />}
                              onClick={() => { setSelectedExam(row); setIsSinhHoanViOpen(true); }} className="cursor-pointer" />
                          </Tooltip>
                          <Dropdown menu={{ items: getActionMenuItems(row) }} trigger={['click']} placement="bottomRight">
                            <Button size="small" type="text" icon={<MoreOutlined className="text-[#2c3e9e]" />} className="cursor-pointer" />
                          </Dropdown>
                        </Space>
                      </td>
                    </tr>
                  ))}


              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* SECONDARY ACTION MODALS                                    */}
      {/* ========================================================== */}

      {/* Modal: Xem chi tiết đề thi */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="font-extrabold uppercase text-[12px] text-slate-800">Xem đề thi</span>
            {selectedExam && <Tag color="blue" className="rounded-md font-mono m-0">{selectedExam.code}</Tag>}
          </div>
        }
        open={isViewOpen}
        onCancel={() => { setIsViewOpen(false); setViewQuestions([]); }}
        footer={[
          <Button key="close" onClick={() => { setIsViewOpen(false); setViewQuestions([]); }} className="rounded font-semibold text-xs">Đóng</Button>
        ]}
        centered
        width={720}
      >
        {selectedExam && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-xs flex flex-wrap gap-x-6 gap-y-1">
            <span><strong>Tên đề:</strong> {selectedExam.name}</span>
            <span><strong>Môn:</strong> {selectedExam.subject}</span>
            <span><strong>Khối:</strong> {selectedExam.grade}</span>
            <span><strong>Thời gian:</strong> {selectedExam.duration || 90} phút</span>
            <span><strong>Số câu:</strong> {viewQuestions.length}</span>
          </div>
        )}
        {viewLoading ? (
          <div className="py-12 text-center"><Spin /></div>
        ) : (
          <ExamContentDisplay questions={viewQuestions} allowEdit={false} />
        )}
      </Modal>

      {/* Modal B: Phân quyền quản lý */}
      <Modal
        title={
          <span className="font-extrabold uppercase text-[12px] text-slate-800">
            Phân quyền quản lý truy cập đề thi
          </span>
        }
        open={isPermissionOpen}
        onCancel={() => setIsPermissionOpen(false)}
        onOk={handleSavePermissions}
        okText="Lưu quyền hạn"
        cancelText="Hủy"
        centered
        width={500}
      >
        <div className="space-y-4 pt-3 text-xs">
          <div className="bg-slate-50 p-3 border rounded-2xl flex justify-between items-center mb-4">
            <span className="font-semibold">Đề thi: <strong className="text-slate-800">{selectedExam?.name}</strong></span>
            <Tag color="blue" className="rounded-md font-mono">{selectedExam?.code}</Tag>
          </div>

          <div className="space-y-3">
            {SYSTEM_USERS.map(u => (
              <div key={u.id} className="flex justify-between items-center border-b pb-2 border-dashed">
                <Space size={8}>
                  <Avatar size="small" style={{ backgroundColor: '#0f172a' }} icon={<UserOutlined />} />
                  <div>
                    <div className="font-bold text-slate-850">{u.fullName}</div>
                    <div className="text-[10px] text-slate-400">@{u.username}</div>
                  </div>
                </Space>

                <Space size={12}>
                  <Checkbox
                    checked={permissions.read?.includes(u.id)}
                    onChange={e => {
                      const updated = e.target.checked
                        ? [...(permissions.read || []), u.id]
                        : (permissions.read || []).filter(id => id !== u.id);
                      setPermissions({ ...permissions, read: updated });
                    }}
                  >
                    Xem
                  </Checkbox>
                  <Checkbox
                    checked={permissions.edit?.includes(u.id)}
                    onChange={e => {
                      const updated = e.target.checked
                        ? [...(permissions.edit || []), u.id]
                        : (permissions.edit || []).filter(id => id !== u.id);
                      setPermissions({ ...permissions, edit: updated });
                    }}
                  >
                    Sửa
                  </Checkbox>
                  <Checkbox
                    checked={permissions.approve?.includes(u.id)}
                    onChange={e => {
                      const updated = e.target.checked
                        ? [...(permissions.approve || []), u.id]
                        : (permissions.approve || []).filter(id => id !== u.id);
                      setPermissions({ ...permissions, approve: updated });
                    }}
                  >
                    Duyệt
                  </Checkbox>
                </Space>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal C: Lịch sử chỉnh sửa */}
      <Modal
        title={
          <span className="font-extrabold uppercase text-[12px] text-slate-800">
            Lịch sử thẩm định & Nhật ký chỉnh sửa đề thi
          </span>
        }
        open={isHistoryOpen}
        onCancel={() => setIsHistoryOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsHistoryOpen(false)} className="rounded-xl font-bold text-xs bg-[#0f172a] border-transparent text-white">
            Đóng lịch sử
          </Button>
        ]}
        centered
        width={500}
      >
        <div className="pt-4 max-h-96 overflow-y-auto pr-1">
          <Timeline
            className="text-xs font-semibold"
            items={historyLogs.map((log, idx) => ({
              color: idx === 0 ? 'green' : 'gray',
              children: (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold">{log.date}</div>
                  <div className="text-slate-800">{log.action}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Bởi nhân sự: {log.user}</div>
                </div>
              )
            }))}
          />
        </div>
      </Modal>

      {/* Modal D: Đồng bộ / Chuyển dữ liệu */}
      <Modal
        title={
          <span className="font-extrabold uppercase text-[12px] text-slate-800">
            Đồng bộ hóa dữ liệu đề thi sang phân hệ Online Testing
          </span>
        }
        open={isSyncOpen}
        onCancel={() => setIsSyncOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsSyncOpen(false)} className="rounded-xl font-bold text-xs">
            Hủy
          </Button>,
          <Button
            key="sync"
            type="primary"
            icon={<SyncOutlined />}
            onClick={handleStartSync}
            disabled={syncProgress > 0 && syncProgress < 100}
            className="bg-[#0f172a] border-transparent text-white rounded-xl font-bold text-xs"
          >
            {syncProgress === 100 ? 'Đồng bộ lại' : 'Bắt đầu đồng bộ'}
          </Button>
        ]}
        centered
        width={450}
      >
        <div className="space-y-4 pt-3 text-xs text-center">
          <div className="bg-slate-50 border p-3.5 rounded-2xl text-left">
            <span>Tiêu đề đề thi: <strong>{selectedExam?.name}</strong></span>
            <div className="mt-1">Mã cấu trúc: <strong>{selectedExam?.code}</strong></div>
          </div>

          <p className="text-slate-500 font-medium text-[11px]">
            Hệ thống sẽ mã hóa cấu trúc đề thi dạng JSON và đóng gói gửi đến cổng API Gateway của phân hệ thi trực tuyến LMS.
          </p>

          {syncProgress > 0 && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <Progress percent={syncProgress} strokeColor="#0f172a" showInfo={true} size="small" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {syncProgress < 100 ? 'Đang đẩy dữ liệu qua cổng Gateway...' : 'Hoàn tất đẩy dữ liệu!'}
              </span>
            </div>
          )}
        </div>
      </Modal>

      <ModalDeRiengLe
        open={isDeRiengLeOpen}
        exam={selectedExam}
        onCancel={() => {
          setIsDeRiengLeOpen(false);
          setSelectedExam(null);
        }}
        onSuccess={() => {
          setIsDeRiengLeOpen(false);
          setSelectedExam(null);
          fetchData();
        }}
        typeAdd={selectedExam === null}
      />

      <ModalTaoDeTuDong
        open={isTuDongMoiOpen}
        onCancel={() => setIsTuDongMoiOpen(false)}
        onSuccess={() => {
          setIsTuDongMoiOpen(false);
          fetchData();
        }}
      />

      <ModalSinhDeHoanVi
        open={isSinhHoanViOpen}
        exam={selectedExam}
        onCancel={() => { setIsSinhHoanViOpen(false); setSelectedExam(null); }}
        onSuccess={() => {
          setIsSinhHoanViOpen(false);
          setSelectedExam(null);
          fetchData();
        }}
      />
    </div>
  );
}
