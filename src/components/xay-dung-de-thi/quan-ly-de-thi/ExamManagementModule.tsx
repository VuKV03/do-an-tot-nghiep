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
  ThunderboltOutlined,
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
  MoreOutlined
} from '@ant-design/icons';
import { SUBJECTS, GRADES, SYSTEM_USERS } from '../../../data';
import ModalTuDongSinhDe from './ModalTuDongSinhDe';
import ModalDeRiengLe from './ModalDeRiengLe';
import ModalAddGoiDeThiNew from './ModalAddGoiDeThiNew';

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
  const [isTuDongOpen, setIsTuDongOpen] = useState(false);
  const [isDeRiengLeOpen, setIsDeRiengLeOpen] = useState(false);
  const [isAddGoiDeOpen, setIsAddGoiDeOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<any | null>(null);

  // Secondary interactive modals state
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Form states for secondary modals
  const [reviewForm, setReviewForm] = useState({ reviewerId: '', notes: '' });
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
    return exams.filter(e => {
      // loai=4: variants / ai-generated
      const isVariant = e.source === 'ai';
      const matchesSearch = e.name.toLowerCase().includes(examSearch.toLowerCase()) || e.code.toLowerCase().includes(examSearch.toLowerCase());
      const matchesSubject = examSubject === 'all' || e.subject === examSubject;
      const matchesGrade = examGrade === 'all' || e.grade === examGrade;
      const matchesStatus = examStatus === 'all' || e.status === examStatus;
      return isVariant && matchesSearch && matchesSubject && matchesGrade && matchesStatus;
    });
  }, [exams, examSearch, examSubject, examGrade, examStatus]);

  const filteredExamRoots = useMemo(() => {
    return exams.filter(e => {
      const isRoot = e.source !== 'ai';
      const matchesSearch = (e.name || '').toLowerCase().includes(examSearch.toLowerCase()) || (e.code || '').toLowerCase().includes(examSearch.toLowerCase());
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

  // Word export trigger
  const handleExportWord = (exam: any) => {
    message.loading({ content: `Đang biên dịch & xuất tài liệu .docx cho đề ${exam.code}...`, key: 'word' });
    setTimeout(() => {
      // Mock docx download via standard file download trigger
      const element = document.createElement("a");
      const file = new Blob([`ĐỀ THI TRẮC NGHIỆM CHẤT LƯỢNG CAO\nMôn: ${exam.subject}\nKhối: ${exam.grade}\n\n${exam.questions.map((q: any, i: number) => `Câu ${i+1}: ${q.text}\nĐáp án: ${q.correctAnswer}\n`).join('\n')}`], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${exam.code}_DeThi_${exam.subject.replace(/\s+/g, '')}.docx`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      message.success({ content: `Xuất thành công file Word đề thi ${exam.code}!`, key: 'word', duration: 3 });
    }, 1200);
  };

  const handleExportExcel = () => {
    message.loading({ content: 'Đang kết xuất danh sách báo cáo Excel...', key: 'excel' });
    setTimeout(() => {
      message.success({ content: 'Xuất báo cáo Excel thành công!', key: 'excel', duration: 3 });
    }, 1000);
  };

  // Open secondary workflows
  const handleOpenReview = (exam: any) => {
    setSelectedExam(exam);
    setReviewForm({ reviewerId: '', notes: '' });
    setIsReviewOpen(true);
  };

  const handleSendReview = () => {
    if (!reviewForm.reviewerId) {
      message.error('Vui lòng chọn nhân sự thẩm định!');
      return;
    }
    message.success(`Đã chuyển tiếp đề thi ${selectedExam.code} đến giám định viên thẩm định.`);
    setIsReviewOpen(false);
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

  // Dropdown actions generator
  const getActionMenuItems = (exam: any) => [
    {
      key: 'review',
      label: 'Gửi thẩm định/phản biên',
      icon: <SafetyCertificateOutlined />,
      onClick: () => handleOpenReview(exam)
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
                  <Select
                    value={examStatus}
                    onChange={setExamStatus}
                    className="w-full text-xs"
                    options={[
                      { value: 'all', label: 'Chờ thẩm định' },
                      { value: 'draft', label: 'Tạo mới' },
                      { value: 'pending', label: 'Chờ thẩm định' },
                      { value: 'approved', label: 'Đã thẩm định' },
                      { value: 'rejected', label: 'Từ chối' }
                    ]}
                  />
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
                  onClick={() => setIsTuDongOpen(true)}
                  className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded hover:bg-[#243590] cursor-pointer"
                >
                  Thêm mới theo ma trận
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => { setSelectedExam(null); setIsDeRiengLeOpen(true); }}
                  className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded hover:bg-[#243590] cursor-pointer"
                >
                  Thêm mới thủ công
                </Button>
                <Button
                  icon={<SafetyCertificateOutlined />}
                  disabled={selectedExamIds.length === 0}
                  onClick={() => selectedExamIds.length > 0 && handleOpenReview(filteredExamRoots.find(e => e.id === selectedExamIds[0])!)}
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
                  <th className="py-3 px-3 text-center font-semibold">Trạng thái do AI tạo</th>
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
                        {row.source === 'ai'
                          ? <span className="inline-block bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded font-bold text-[9px]">AI</span>
                          : <span className="inline-block bg-slate-50 text-slate-400 border px-2 py-0.5 rounded font-bold text-[9px]">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Space size={2}>
                          <Tooltip title="Chỉnh sửa">
                            <Button size="small" type="text" icon={<EditOutlined className="text-[#2c3e9e]" />}
                              onClick={() => { setSelectedExam(row); setIsDeRiengLeOpen(true); }} className="cursor-pointer" />
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

      {/* Modal A: Gửi thẩm định */}
      <Modal
        title={
          <span className="font-extrabold uppercase text-[12px] text-slate-800">
            Ủy thác Hội đồng thẩm định / phản biện đề thi
          </span>
        }
        open={isReviewOpen}
        onCancel={() => setIsReviewOpen(false)}
        onOk={handleSendReview}
        okText="Bàn giao thẩm định"
        cancelText="Đóng"
        centered
        width={450}
      >
        <div className="space-y-4 pt-3 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-500 uppercase text-[10px]">Chỉ định Giám định viên</label>
            <Select
              className="w-full text-xs font-semibold"
              placeholder="Chọn giám định viên phản biện..."
              value={reviewForm.reviewerId}
              onChange={val => setReviewForm({ ...reviewForm, reviewerId: val })}
              options={SYSTEM_USERS.filter(u => u.role === 'reviewer' || u.role === 'admin').map(u => ({
                value: u.id,
                label: `${u.fullName} (${u.role === 'admin' ? 'Quản trị viên' : 'Chuyên gia giám định'})`
              }))}
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-500 uppercase text-[10px]">Ghi chú yêu cầu thẩm định</label>
            <textarea
              rows={3}
              className="w-full border rounded-xl p-2.5 font-semibold text-xs text-slate-700"
              placeholder="Nhập ghi chú định hướng, thời hạn hoàn thành..."
              value={reviewForm.notes}
              onChange={e => setReviewForm({ ...reviewForm, notes: e.target.value })}
            />
          </div>
        </div>
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

      {/* Modals 1, 2, 3 */}
      <ModalTuDongSinhDe
        open={isTuDongOpen}
        onCancel={() => setIsTuDongOpen(false)}
        onSuccess={() => {
          setIsTuDongOpen(false);
          fetchData();
        }}
      />

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

      <ModalAddGoiDeThiNew
        open={isAddGoiDeOpen}
        onCancel={() => setIsAddGoiDeOpen(false)}
        onSuccess={() => {
          setIsAddGoiDeOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}
