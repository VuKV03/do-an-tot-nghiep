import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Input,
  Button,
  Select,
  Modal,
  Tag,
  Badge,
  Form,
  Space,
  Popconfirm,
  Empty,
  Card,
  Row,
  Col,
  Divider,
  Steps,
  Slider,
  InputNumber,
  Spin,
  Tooltip
} from 'antd';
import { toast } from '../utils/toast';
import {
  ProjectOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  SlidersOutlined,
  BulbOutlined,
  LoadingOutlined,
  GroupOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  PieChartOutlined,
  ShareAltOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { SUBJECTS, GRADES } from '../data';
import { RichTextView } from '../utils/htmlContent';

interface ExamPackageModuleProps {
  onNavigateTab: (key: string) => void;
}

interface MockQuestion {
  text: string;
  type: string;
  level: string;
  options?: string[];
  correctAnswer: string;
}

interface ExamPaper {
  id: string;
  code: string;
  name: string;
  subject: string;
  grade: string;
  status: "active" | "pending" | "draft" | "closed";
  attempts: number;
  totalQuestions: number;
  questions: MockQuestion[];
  avgScore: number;
  duration: number;
  createdAt: string;
  description?: string;
  source: "matrix" | "ai" | "manual";
}

interface ExamPackage {
  id: string;
  code: string;
  name: string;
  subject: string;
  grade: string;
  status: "active" | "inactive";
  examsCount: number;
  examIds: string[];
  downloadsCount: number;
  accessType: "free" | "standard" | "premium";
  createdAt: string;
  description?: string;
}

export default function ExamPackageModule({ onNavigateTab }: ExamPackageModuleProps) {
  // Tabs: 'exams' | 'packages'
  const [activeTab, setActiveTab] = useState<'exams' | 'packages'>('exams');

  // Core Data State
  const [exams, setExams] = useState<ExamPaper[]>([]);
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Search/Filters for Exams
  const [examSearch, setExamSearch] = useState('');
  const [examSubjectFilter, setExamSubjectFilter] = useState('all');
  const [examGradeFilter, setExamGradeFilter] = useState('all');
  const [examStatusFilter, setExamStatusFilter] = useState('all');

  // Search/Filters for Packages
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgSubjectFilter, setPkgSubjectFilter] = useState('all');

  // Modal Dialog states
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamPaper | null>(null);

  // Package Form Fields
  const [pkgForm] = Form.useForm();
  const [pkgModalMode, setPkgModalMode] = useState<'create' | 'edit'>('create');
  const [activePkgId, setActivePkgId] = useState<string | null>(null);

  // Wizard Step State
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardForm] = Form.useForm();

  // AI Loading and suggest states
  const [aiSuggestingInfo, setAiSuggestingInfo] = useState(false);
  const [aiGeneratingQuestions, setAiGeneratingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<MockQuestion[]>([]);
  const [aiLogLines, setAiLogLines] = useState<string[]>([]);

  // Fetch Exams from Server
  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const res = await fetch('/api/exams');
      const data = await res.json();
      if (data.success) {
        setExams(data.data);
      } else {
        toast.error('Lỗi khi tải danh sách đề thi.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Không kết nối được dịch vụ danh sách đề.');
    } finally {
      setLoadingExams(false);
    }
  };

  // Fetch Packages from Server
  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const res = await fetch('/api/exams/packages');
      const data = await res.json();
      if (data.success) {
        setPackages(data.data);
      } else {
        toast.error('Lỗi khi tải danh sách gói đề.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Không kết nối được dịch vụ gói đề.');
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchPackages();
  }, []);

  // Filter computations for Exams
  const filteredExams = useMemo(() => {
    const kw = examSearch.trim().toLowerCase();
    return exams.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(kw) ||
                            e.code.toLowerCase().includes(kw);
      const matchesSubject = examSubjectFilter === 'all' || e.subject === examSubjectFilter;
      const matchesGrade = examGradeFilter === 'all' || e.grade === examGradeFilter;
      const matchesStatus = examStatusFilter === 'all' || e.status === examStatusFilter;
      return matchesSearch && matchesSubject && matchesGrade && matchesStatus;
    });
  }, [exams, examSearch, examSubjectFilter, examGradeFilter, examStatusFilter]);

  // Filter computations for Packages
  const filteredPackages = useMemo(() => {
    const kw = pkgSearch.trim().toLowerCase();
    return packages.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(kw) ||
                            p.code.toLowerCase().includes(kw);
      const matchesSubject = pkgSubjectFilter === 'all' || p.subject === pkgSubjectFilter;
      return matchesSearch && matchesSubject;
    });
  }, [packages, pkgSearch, pkgSubjectFilter]);

  // Action: Toggle Exam status
  const handleToggleExamStatus = async (record: ExamPaper) => {
    const nextStatusMap: { [key: string]: ExamPaper["status"] } = {
      draft: "pending",
      pending: "active",
      active: "closed",
      closed: "active"
    };
    const nextStatus = nextStatusMap[record.status] || "active";
    
    try {
      const res = await fetch(`/api/exams/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setExams(prev => prev.map(item => item.id === record.id ? { ...item, status: nextStatus } : item));
        toast.success(`Đã cập nhật trạng thái đề thi sang: ${nextStatus.toUpperCase()}`);
      } else {
        toast.error(data.error || 'Cập nhật trạng thái thất bại');
      }
    } catch (err) {
      toast.error('Phát sinh lỗi truyền dữ liệu.');
    }
  };

  // Action: Download Mock Word/PDF
  const handleDownloadExam = (exam: ExamPaper) => {
    toast.loading({ content: `Đang kết xuất tệp Word/PDF chất lượng cao cho ${exam.code}...`, key: 'dl' });
    setTimeout(() => {
      toast.success({ content: `Đã kết xuất thành công đề thi thử: "${exam.name}" (Tải về định dạng .docx hoàn tất!)`, key: 'dl', duration: 3 });
      
      // Update download statistics/attempts locally to make it visual
      setExams(prev => prev.map(item => item.id === exam.id ? { ...item, attempts: item.attempts + 1 } : item));
    }, 1500);
  };

  // Action: Delete Exam
  const handleDeleteExam = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/exams/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setExams(prev => prev.filter(item => item.id !== id));
        toast.success(`Đã xóa hoàn thành đề thi: ${name}`);
      } else {
        toast.error(data.error || 'Xoá đề thi thất bại');
      }
    } catch (err) {
      toast.error('Phát sinh lỗi truyền tải khi xóa đề.');
    }
  };

  // Action: Toggle Package Status
  const handleTogglePkgStatus = async (pkg: ExamPackage) => {
    const nextStatus = pkg.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/exams/packages/${pkg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setPackages(prev => prev.map(item => item.id === pkg.id ? { ...item, status: nextStatus } : item));
        toast.info(`Thay đổi trạng thái gói đề: ${pkg.code} đã sang ${nextStatus === 'active' ? 'HOẠT ĐỘNG' : 'TẠM KHÓA'}`);
      } else {
        toast.error('Thay đổi trạng thái lỗi.');
      }
    } catch (err) {
      toast.error('Lỗi cổng kết nối.');
    }
  };

  // Action: Delete Package
  const handleDeletePackage = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/exams/packages/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setPackages(prev => prev.filter(item => item.id !== id));
        toast.success(`Đã giải tán thành công gói đề: ${name}`);
      } else {
        toast.error('Xóa gói đề thất bại.');
      }
    } catch (err) {
      toast.error('Lỗi đường dẫn khi xóa gói đề.');
    }
  };

  // Open Wizard
  const handleOpenWizard = () => {
    setWizardStep(0);
    setGeneratedQuestions([]);
    setAiLogLines([]);
    wizardForm.resetFields();
    wizardForm.setFieldsValue({
      subject: 'Toán học',
      grade: 'Khối 12',
      duration: 45,
      questionsCount: 5,
      topic: 'Tính đơn điệu và Tiệm cận đứng/ngang của Hàm số',
      easyPercent: 40,
      mediumPercent: 40,
      hardPercent: 20
    });
    setIsWizardOpen(true);
  };

  // AI Wizard: Suggest Info
  const handleAiSuggestInfo = async () => {
    const values = wizardForm.getFieldsValue();
    setAiSuggestingInfo(true);
    toast.loading({ content: 'Đang kết nối Gemini 3.5 Flash để dựng cấu hình học thuật bóng bẩy...', key: 'ai-info' });

    try {
      const res = await fetch('/api/suggest-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: values.subject,
          grade: values.grade,
          topic: values.topic
        })
      });
      const data = await res.json();
      if (data.success) {
        wizardForm.setFieldsValue({
          title: data.suggestedTitle,
          duration: data.suggestedDuration,
          description: data.suggestedDescription
        });
        toast.success({ content: 'Đã nhận cấu hình gợi ý từ Gemini AI lý tưởng!', key: 'ai-info', duration: 3 });
      } else {
        toast.error({ content: data.error || 'Gemini không đưa ra phản hồi phù hợp.', key: 'ai-info' });
      }
    } catch (err: any) {
      toast.error({ content: 'Lỗi API: ' + err.message, key: 'ai-info' });
    } finally {
      setAiSuggestingInfo(false);
    }
  };

  // AI Wizard: Start generating questions
  const handleAiGenerateQuestions = async () => {
    const values = wizardForm.getFieldsValue();
    if (!values.title) {
      toast.warning('Vui lòng điền tiêu đề đề thi hoặc bấm nút "AI tự gợi ý"!');
      return;
    }

    setAiGeneratingQuestions(true);
    setWizardStep(2); // Jump to Step 2 (generating)
    setGeneratedQuestions([]);
    
    // Add realistic server step logs for microservice simulation
    const addLogLine = (line: string, delay: number) => {
      setTimeout(() => {
        setAiLogLines(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);
      }, delay);
    };

    addLogLine("Đang khởi tạo pipeline kết nối Google Gemini...", 100);
    addLogLine("API Gateway chuyển hướng tiếp nhận đến AI Generation Service...", 500);
    addLogLine("Đang kiểm định bảo mật tài nguyên & Secrets KEY mã hóa...", 900);
    addLogLine("Đang nạp mô hình: models/gemini-3.5-flash High-Performance...", 1300);
    addLogLine(`Đang sinh ${values.questionsCount} câu hỏi môn ${values.subject} (${values.grade}) về đề tài "${values.topic}"...`, 1800);

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: values.subject,
          grade: values.grade,
          topic: values.topic,
          count: values.questionsCount,
          easyPercent: values.easyPercent,
          mediumPercent: values.mediumPercent,
          hardPercent: values.hardPercent
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.questions && data.questions.length > 0) {
        // Map backend's 'easy', 'medium', 'hard' into our levels representation
        const levelMap: { [key: string]: string } = {
          easy: "nhan_biet",
          medium: "thong_hieu",
          hard: "van_dung"
        };
        const mappedQuestions: MockQuestion[] = data.questions.map((q: any) => ({
          text: q.text,
          type: "single",
          level: levelMap[q.level] || 'thong_hieu',
          options: q.options || ['A', 'B', 'C', 'D'],
          correctAnswer: q.correctAnswer || 'A'
        }));

        setTimeout(() => {
          setAiLogLines(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✔ Đã nhận phản hồi thành công từ AI! Hoàn tất đóng gói ${mappedQuestions.length} câu hỏi.`]);
          setGeneratedQuestions(mappedQuestions);
          setWizardStep(3); // Go to Preview Step
        }, 2200);

      } else {
        setTimeout(() => {
          setAiLogLines(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Gemini phát sinh lỗi: ${data.error || 'Dữ liệu trả về bị rỗng.'}`]);
          setWizardStep(0); // bounce back
          toast.error(data.error || 'Không tạo được câu hỏi tự động. Vui lòng thử cấu hình khác.');
        }, 2200);
      }
    } catch (err: any) {
      setTimeout(() => {
        setAiLogLines(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Lỗi kết nối API Gateway: ${err.message}`]);
        setWizardStep(0);
        toast.error('Gặp sự cố khi gọi Gemini AI: ' + err.message);
      }, 2200);
    } finally {
      setTimeout(() => {
        setAiGeneratingQuestions(false);
      }, 2200);
    }
  };

  // AI Wizard: Save everything to DB
  const handleWizardSubmit = async () => {
    const values = wizardForm.getFieldsValue();
    const cleanQuestions = generatedQuestions.map(q => ({
      text: q.text,
      type: q.type,
      level: q.level,
      options: q.options,
      correctAnswer: q.correctAnswer
    }));

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.title,
          code: `DE-AI-${Date.now().toString().slice(-4).toUpperCase()}`,
          subject: values.subject,
          grade: values.grade,
          duration: values.duration,
          description: values.description,
          questions: cleanQuestions,
          source: 'ai'
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Đã cấu sinh đề thi và lưu vào Ngân Hàng Đề Thi Quốc Gia!');
        setIsWizardOpen(false);
        fetchExams();
      } else {
        toast.error(data.error || 'Lưu đề thi thất bại.');
      }
    } catch (err) {
      toast.error('Không lưu được dữ liệu đề thi mới.');
    }
  };

  // Package: Open Create
  const handleOpenPkgCreate = () => {
    setPkgModalMode('create');
    setActivePkgId(null);
    pkgForm.resetFields();
    pkgForm.setFieldsValue({
      subject: 'Toán học',
      grade: 'Khối 12',
      accessType: 'standard',
      examIds: []
    });
    setIsPkgModalOpen(true);
  };

  // Package: Open Edit
  const handleOpenPkgEdit = (record: ExamPackage) => {
    setPkgModalMode('edit');
    setActivePkgId(record.id);
    pkgForm.resetFields();
    pkgForm.setFieldsValue({
      name: record.name,
      code: record.code,
      subject: record.subject,
      grade: record.grade,
      accessType: record.accessType,
      description: record.description || '',
      examIds: record.examIds
    });
    setIsPkgModalOpen(true);
  };

  // Package: Submit Create/Edit
  const handlePkgFormSubmit = async () => {
    try {
      const values = await pkgForm.validateFields();
      const payload = {
        ...values,
        examsCount: values.examIds ? values.examIds.length : 0
      };

      if (pkgModalMode === 'create') {
        const res = await fetch('/api/exams/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Đã thêm mới gói đề kiểm tra thành công!');
          setIsPkgModalOpen(false);
          fetchPackages();
        } else {
          toast.error(data.error || 'Không thêm được gói đề');
        }
      } else {
        const res = await fetch(`/api/exams/packages/${activePkgId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Đã cập nhật dán nhãn gói phân nhóm thành công!');
          setIsPkgModalOpen(false);
          fetchPackages();
        } else {
          toast.error(data.error || 'Cập nhật thất bại');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Render stats cards
  const totalExamsCount = exams.length;
  const activeExamsCount = exams.filter(e => e.status === 'active').length;
  const pendingExamsCount = exams.filter(e => e.status === 'pending').length;
  const draftExamsCount = exams.filter(e => e.status === 'draft').length;

  const totalDownloads = useMemo(() => {
    const examAttempts = exams.reduce((sum, e) => sum + (e.attempts || 0), 0);
    const pkgDownloads = packages.reduce((sum, p) => sum + (p.downloadsCount || 0), 0);
    return examAttempts + pkgDownloads;
  }, [exams, packages]);

  return (
    <div className="space-y-6" id="exam-package-control-module">
      {/* Brand Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs select-none">
        <div className="space-y-1">
          <h2 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 my-0">
            <ProjectOutlined className="text-[#002147] animate-pulse" />
            HỆ THỐNG QUẢN LÝ ĐỀ THI & GÓI ĐỀ LÂM THỜI
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Khởi tạo gói tài liệu, phân nhóm đề mẫu, quản lý dán nhãn các mã kiểm tra và ứng dụng Gemini AI sinh đề thi đồng bộ.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-0.5">
          <Button
            type={activeTab === 'exams' ? 'primary' : 'text'}
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => setActiveTab('exams')}
            className={`text-xs font-black rounded-lg py-1 px-3.5 border-transparent ${
              activeTab === 'exams' ? 'bg-[#002147] text-white shadow-none' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Danh sách Đề thi ({exams.length})
          </Button>
          <Button
            type={activeTab === 'packages' ? 'primary' : 'text'}
            size="small"
            icon={<GroupOutlined />}
            onClick={() => setActiveTab('packages')}
            className={`text-xs font-black rounded-lg py-1 px-3.5 border-transparent ${
              activeTab === 'packages' ? 'bg-[#002147] text-white shadow-none' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Gói tuyển tập đề ({packages.length})
          </Button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-dashboard-grid">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xxs">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Tổng tuyển đề mẫu</span>
          <strong className="text-xl text-slate-800">{totalExamsCount} Đề thi thử</strong>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xxs">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Đề thi đã phát hành</span>
          <strong className="text-xl text-emerald-700">{activeExamsCount} Đề duyệt</strong>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xxs">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Gói đề tích lũy</span>
          <strong className="text-xl text-[#002147]">{packages.length} Tuyển tập</strong>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xxs">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Trữ lượng truy cập & Tải tệp</span>
          <strong className="text-xl text-amber-600">{totalDownloads} Lượt tải</strong>
        </div>
      </div>

      {/* ========================================================== */}
      {/* VIEW SECTION 1: EXAMS LIST                                 */}
      {/* ========================================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Filters area */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 flex-col md:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <Input
                  placeholder="Tra cứu tên đề thi hoặc mã định danh đề mẫu..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  className="rounded-xl border-slate-200 text-xs font-semibold py-1.5"
                  value={examSearch}
                  onChange={e => setExamSearch(e.target.value)}
                  allowClear
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Môn học:</span>
                <Select
                  value={examSubjectFilter}
                  onChange={setExamSubjectFilter}
                  className="w-32 text-xs font-semibold"
                  options={[{ value: 'all', label: 'Tất cả' }, ...SUBJECTS]}
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Khối:</span>
                <Select
                  value={examGradeFilter}
                  onChange={setExamGradeFilter}
                  className="w-32 text-xs font-semibold"
                  options={[{ value: 'all', label: 'Tất cả' }, ...GRADES]}
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Trạng thái:</span>
                <Select
                  value={examStatusFilter}
                  onChange={setExamStatusFilter}
                  className="w-32 text-xs font-semibold"
                  options={[
                    { value: 'all', label: 'Tất cả' },
                    { value: 'active', label: 'Duyệt / Active' },
                    { value: 'pending', label: 'Chờ duyệt' },
                    { value: 'draft', label: 'Bản nháp' },
                    { value: 'closed', label: 'Đã đóng' }
                  ]}
                />
              </div>
            </div>

            <Button
              type="primary"
              icon={<ThunderboltOutlined className="text-amber-400 animate-bounce" />}
              onClick={handleOpenWizard}
              className="bg-[#002147] border-transparent text-white font-black text-xs rounded-xl hover:opacity-90 active:scale-95 cursor-pointer shrink-0"
            >
              Sinh Đề Thi Gemini AI
            </Button>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <Table
              dataSource={filteredExams}
              rowKey="id"
              loading={loadingExams}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              className="custom-antd-table text-xs font-medium"
              columns={[
                {
                  title: 'Mã đề thi',
                  dataIndex: 'code',
                  key: 'code',
                  render: (code: string) => (
                    <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded text-[10px] border">
                      {code}
                    </span>
                  )
                },
                {
                  title: 'Tên mẫu đề thi đề xuất',
                  dataIndex: 'name',
                  key: 'name',
                  render: (name: string, record: ExamPaper) => (
                    <div className="flex flex-col">
                      <strong className="text-slate-800 text-[12px]">{name}</strong>
                      <span className="text-[10px] text-slate-400 max-w-md block truncate mt-0.5 font-medium">
                        {record.description || 'Chưa cung cấp mô tả chi tiết học vị.'}
                      </span>
                    </div>
                  )
                },
                {
                  title: 'Dán nhãn / Khối',
                  key: 'labels',
                  render: (_, record: ExamPaper) => (
                    <Space size={4}>
                      <Tag color="blue" className="rounded-md font-bold text-[9px] uppercase m-0 border-transparent">{record.subject}</Tag>
                      <Tag color="purple" className="rounded-md font-bold text-[9px] uppercase m-0 border-transparent">{record.grade}</Tag>
                    </Space>
                  )
                },
                {
                  title: 'Tổng số câu',
                  dataIndex: 'totalQuestions',
                  key: 'totalQuestions',
                  align: 'center',
                  render: (qCount: number) => (
                    <span className="font-mono font-bold bg-slate-50 px-2 py-0.5 rounded border text-slate-700">
                      {qCount} Câu
                    </span>
                  )
                },
                {
                  title: 'Thời lượng',
                  dataIndex: 'duration',
                  key: 'duration',
                  align: 'center',
                  render: (duration: number) => (
                    <span className="text-slate-700 font-bold flex items-center justify-center gap-1">
                      <ClockCircleOutlined className="text-slate-300" />
                      {duration} Phút
                    </span>
                  )
                },
                {
                  title: 'Nguồn gốc',
                  dataIndex: 'source',
                  key: 'source',
                  align: 'center',
                  render: (src: string) => {
                    if (src === 'ai') return <Badge status="warning" text={<span className="text-[10px] text-amber-600 font-bold uppercase">Gemini AI</span>} />;
                    if (src === 'matrix') return <Badge status="processing" text={<span className="text-[10px] text-blue-600 font-bold uppercase">Ma Trận</span>} />;
                    return <Badge status="default" text={<span className="text-[10px] text-slate-400 font-bold uppercase">Thủ công</span>} />;
                  }
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  key: 'status',
                  align: 'center',
                  render: (status: string, record: ExamPaper) => (
                    <span onClick={() => handleToggleExamStatus(record)} className="cursor-pointer select-none">
                      {status === 'active' && <Tag color="success" className="rounded-md font-bold text-[9px] uppercase m-0 border-transparent">🟢 Phát hành</Tag>}
                      {status === 'pending' && <Tag color="warning" className="rounded-md font-bold text-[9px] uppercase m-0 border-transparent">🟡 Chờ duyệt</Tag>}
                      {status === 'draft' && <Tag color="default" className="rounded-md font-bold text-[9px] uppercase m-0 border-transparent">⚪ Bản nháp</Tag>}
                      {status === 'closed' && <Tag color="error" className="rounded-md font-bold text-[9px] uppercase m-0 border-transparent">🔴 Đã khóa</Tag>}
                    </span>
                  )
                },
                {
                  title: 'Lượt tải',
                  dataIndex: 'attempts',
                  key: 'attempts',
                  align: 'center',
                  render: (val: number) => <strong className="text-slate-600">{val}</strong>
                },
                {
                  title: 'Thao tác nâng cao',
                  key: 'actions',
                  align: 'right',
                  render: (_, record: ExamPaper) => (
                    <Space size={4}>
                      <Tooltip title="Xem cấu trúc câu hỏi">
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => {
                            setSelectedExam(record);
                            setIsDetailOpen(true);
                          }}
                          className="bg-slate-50 border-slate-200 text-slate-600 rounded-lg cursor-pointer"
                        />
                      </Tooltip>
                      <Tooltip title="Xuất File Word/PDF">
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadExam(record)}
                          className="bg-sky-50 border-sky-200 text-sky-700 rounded-lg cursor-pointer hover:bg-sky-100"
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Bạn có chắc là muốn xóa đề thi này?"
                        onConfirm={() => handleDeleteExam(record.id, record.name)}
                        okText="Có"
                        cancelText="Không"
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          className="bg-red-50 border-red-150 text-red-600 rounded-lg cursor-pointer"
                        />
                      </Popconfirm>
                    </Space>
                  )
                }
              ]}
            />
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW SECTION 2: EXAM PACKAGES                              */}
      {/* ========================================================== */}
      {activeTab === 'packages' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Filters Area */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 flex-col md:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <Input
                  placeholder="Tra cứu tên gói tuyển tập đề mẫu..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  className="rounded-xl border-slate-200 text-xs font-semibold py-1.5"
                  value={pkgSearch}
                  onChange={e => setPkgSearch(e.target.value)}
                  allowClear
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Môn học:</span>
                <Select
                  value={pkgSubjectFilter}
                  onChange={setPkgSubjectFilter}
                  className="w-40 text-xs font-semibold"
                  options={[{ value: 'all', label: 'Tất cả' }, ...SUBJECTS]}
                />
              </div>
            </div>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenPkgCreate}
              className="bg-[#002147] border-transparent text-white font-black text-xs rounded-xl hover:opacity-90 active:scale-95 cursor-pointer shrink-0"
            >
              Thiết lập gói đề thi mới
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <Table
              dataSource={filteredPackages}
              rowKey="id"
              loading={loadingPackages}
              pagination={{ pageSize: 8 }}
              className="text-xs font-medium"
              columns={[
                {
                  title: 'Mã gói',
                  dataIndex: 'code',
                  key: 'code',
                  render: (code: string) => (
                    <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded text-[10px] border">
                      {code}
                    </span>
                  )
                },
                {
                  title: 'Tên gói tuyển tuyển đề',
                  dataIndex: 'name',
                  key: 'name',
                  render: (name: string, record: ExamPackage) => (
                    <div className="flex flex-col">
                      <strong className="text-slate-800 text-[12px]">{name}</strong>
                      <span className="text-[10px] text-slate-400 max-w-md block truncate mt-0.5 font-medium">
                        {record.description || 'Gói tuyển tập không kèm theo nhận xét.'}
                      </span>
                    </div>
                  )
                },
                {
                  title: 'Môn & Lớp',
                  key: 'labels',
                  render: (_, record: ExamPackage) => (
                    <Space size={4}>
                      <Tag color="geekblue" className="rounded-md font-bold text-[9px] uppercase m-0 border-transparent">{record.subject}</Tag>
                      <Tag color="orange" className="rounded-md font-bold text-[9px] uppercase m-0 border-transparent">{record.grade}</Tag>
                    </Space>
                  )
                },
                {
                  title: 'Số mẫu đề liên kết',
                  dataIndex: 'examsCount',
                  key: 'examsCount',
                  align: 'center',
                  render: (count: number) => (
                    <span className="font-mono font-bold bg-slate-50 px-2.5 py-0.5 rounded border text-slate-800">
                      {count} Bộ đề
                    </span>
                  )
                },
                {
                  title: 'Quy chế cấp',
                  dataIndex: 'accessType',
                  key: 'accessType',
                  align: 'center',
                  render: (type: string) => {
                    if (type === 'premium') return <Tag color="gold" className="font-bold border-transparent text-[9px] uppercase">VIP PREMIUM</Tag>;
                    if (type === 'free') return <Tag color="green" className="font-bold border-transparent text-[9px] uppercase">MIỄN PHÍ</Tag>;
                    return <Tag color="blue" className="font-bold border-transparent text-[9px] uppercase">TIÊU CHUẨN</Tag>;
                  }
                },
                {
                  title: 'Hạn trạng hoạt vụ',
                  dataIndex: 'status',
                  key: 'status',
                  align: 'center',
                  render: (status: string, record: ExamPackage) => (
                    <span onClick={() => handleTogglePkgStatus(record)} className="cursor-pointer select-none">
                      {status === 'active' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-100 rounded-md font-extrabold text-[9px]">
                          🟢 HOẠT ĐỘNG
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 border border-red-100 rounded-md font-extrabold text-[9px]">
                          🔴 TẠM KHÓA
                        </span>
                      )}
                    </span>
                  )
                },
                {
                  title: 'Lượt tải gói',
                  dataIndex: 'downloadsCount',
                  key: 'downloadsCount',
                  align: 'center',
                  render: (val: number) => <strong className="text-slate-600">{val}</strong>
                },
                {
                  title: 'Tác vụ sửa đổi',
                  key: 'actions',
                  align: 'right',
                  render: (_, record: ExamPackage) => (
                    <Space size={6}>
                      <Tooltip title="Hiệu cấu lại">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenPkgEdit(record)}
                          className="bg-slate-50 border-slate-200 text-slate-600 rounded-lg cursor-pointer"
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Bạn có chắc muốn xóa gói đề này không?"
                        onConfirm={() => handleDeletePackage(record.id, record.name)}
                        okText="Xóa hoàn toàn"
                        cancelText="Hủy"
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          className="bg-red-50 border-red-150 text-red-600 rounded-lg cursor-pointer"
                        />
                      </Popconfirm>
                    </Space>
                  )
                }
              ]}
            />
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 1: AI SMART WIZARD GENERATOR                         */}
      {/* ========================================================== */}
      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-2">
            <ThunderboltOutlined className="text-amber-500 animate-pulse text-lg" />
            <span className="font-extrabold uppercase text-[13px] text-slate-800 tracking-wide">
              MÔ ĐUN TỰ ĐỘNG SINH ĐỀ THI - TRỰC TUYẾN GEMINI AI
            </span>
          </div>
        }
        open={isWizardOpen}
        forceRender
        onCancel={() => {
          if (!aiGeneratingQuestions) {
            setIsWizardOpen(false);
          } else {
            toast.warning('Mô hình đang liên kết tạo đề. Vui lòng đợi trong giây lát...');
          }
        }}
        footer={
          wizardStep === 3 ? [
            <Button key="prev" onClick={() => setWizardStep(1)} className="rounded-xl text-xs font-bold">
              Làm lại cấu hình
            </Button>,
            <Button key="save" type="primary" onClick={handleWizardSubmit} className="bg-[#002147] border-transparent text-white rounded-xl text-xs font-bold">
              Xác nhận lưu vào ngân hàng đề
            </Button>
          ] : wizardStep === 1 ? [
            <Button key="back" onClick={() => setWizardStep(0)} className="rounded-xl text-xs font-bold">
              Quay lại khối
            </Button>,
            <Button key="gen" type="primary" icon={<ThunderboltOutlined />} onClick={handleAiGenerateQuestions} className="bg-amber-600 hover:bg-amber-500 border-transparent text-white rounded-xl text-xs font-bold">
              Bắt đầu sinh đề bằng Gemini
            </Button>
          ] : wizardStep === 0 ? [
            <Button key="next" type="primary" onClick={() => setWizardStep(1)} className="bg-[#002147] border-transparent text-white rounded-xl text-xs font-bold">
              Tiếp tục cấu hình đề
            </Button>
          ] : null
        }
        centered
        width={700}
        destroyOnHidden
      >
        <div className="pt-4" id="wizard-container-wrapper">
          <Steps
            current={wizardStep}
            size="small"
            className="mb-6 font-bold text-xs"
            items={[
              { title: 'Chuẩn học lực' },
              { title: 'Thông số thi đính' },
              { title: 'Vận hành AI' },
              { title: 'Xem trước đề thi và Lưu' }
            ]}
          />

          <Form form={wizardForm} layout="vertical" className="space-y-4">
            
            {/* STEP 0: SELECT BASIC LABEL GRADES */}
            {wizardStep === 0 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-blue-50 border border-blue-150 rounded-2xl p-4 flex gap-3">
                  <BulbOutlined className="text-blue-600 text-lg shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-blue-700 font-medium">
                    <p className="font-extrabold uppercase mb-1">CƠ CHẾ LÀM VIỆC CỐ VẤN:</p>
                    Bước này giúp gán phân phối chính xác môn học và khối lớp để Gemini tối ưu cấu trúc sư phạm và ngân hàng kiến thức.
                  </div>
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="subject" label={<span className="text-xs font-extrabold uppercase text-slate-500">Môn học thiết đính</span>} required>
                      <Select options={SUBJECTS} className="text-xs font-semibold" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="grade" label={<span className="text-xs font-extrabold uppercase text-slate-500">Khối lớp phân tầng</span>} required>
                      <Select options={GRADES} className="text-xs font-semibold" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="topic" label={<span className="text-xs font-extrabold uppercase text-slate-500">Trọng tâm ôn luyện (Topics/Syllabus)</span>} required>
                  <Input.TextArea rows={2} placeholder="Ví dụ: Nguyên hàm, tích phân từng phần; Ngữ pháp câu bị động và câu điều kiện ôn thi tốt nghiệp..." className="text-xs font-semibold rounded-xl" />
                </Form.Item>
              </div>
            )}

            {/* STEP 1: CONFIGURE DETAIL DETAILS & SUGGESTIONS */}
            {wizardStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <div className="text-xs text-amber-800 font-medium max-w-md">
                    <strong className="block uppercase text-[10px] text-amber-700 tracking-wider mb-1">💡 BẠN KHÔNG BIẾT ĐẶT TIÊU ĐỀ NÀO?</strong>
                    Hãy sử dụng năng lực của Gemini AI để tự động khuyên dùng tiêu đề, thời lượng phù hợp nhất dựa vào chuẩn học lực.
                  </div>
                  <Button
                    type="default"
                    icon={aiSuggestingInfo ? <LoadingOutlined /> : <BulbOutlined />}
                    disabled={aiSuggestingInfo}
                    onClick={handleAiSuggestInfo}
                    className="bg-amber-100 border-amber-250 text-amber-800 rounded-xl text-xs font-bold cursor-pointer hover:bg-amber-200"
                  >
                    AI tự gợi ý
                  </Button>
                </div>

                <Form.Item name="title" label={<span className="text-xs font-extrabold uppercase text-slate-500">Tiêu đề bản đề thi đề xuất</span>} required>
                  <Input placeholder="Nhập tiêu đề hoặc bấm AI tự gợi ý ở trên..." className="text-xs font-semibold rounded-xl" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="duration" label={<span className="text-xs font-extrabold uppercase text-slate-500">Thời gian thi mẫu (Phút)</span>} required>
                      <InputNumber min={5} max={180} className="w-full text-xs font-semibold rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="questionsCount" label={<span className="text-xs font-extrabold uppercase text-slate-500">Số lượng câu phát triển (5 - 15 câu)</span>} required>
                      <InputNumber min={5} max={15} className="w-full text-xs font-semibold rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label={<span className="text-xs font-extrabold uppercase text-slate-500">Mô tả định hướng / Chỉ dẫn kỳ thi</span>}>
                  <Input.TextArea rows={2} placeholder="Nhập tóm lược định hướng kỳ thi này..." className="text-xs font-semibold rounded-xl" />
                </Form.Item>

                <div className="bg-slate-50 border rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Tự phân bố tỷ lệ khó dễ (%)</span>
                  
                  <Row gutter={16} className="items-center text-xs">
                    <Col span={8}>
                      <span>Nhận biết (Dễ):</span>
                      <Form.Item name="easyPercent" noStyle><Slider min={10} max={80} /></Form.Item>
                    </Col>
                    <Col span={8}>
                      <span>Thông hiểu (Vừa):</span>
                      <Form.Item name="mediumPercent" noStyle><Slider min={10} max={80} /></Form.Item>
                    </Col>
                    <Col span={8}>
                      <span>Vận dụng (Khó):</span>
                      <Form.Item name="hardPercent" noStyle><Slider min={10} max={80} /></Form.Item>
                    </Col>
                  </Row>
                </div>
              </div>
            )}

            {/* STEP 2: LOGGING AND AI REPLICA SIMULATION IN PROGRESS */}
            {wizardStep === 2 && (
              <div className="space-y-4 py-8 text-center animate-in fade-in duration-300">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#d97706' }} spin />} />
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">ĐANG LIÊN KẾT GOOGLE GEMINI...</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Bản đề thi đang được soạn thảo chi li cấu trúc chất lượng chuẩn vĩ mô.</p>
                </div>

                <div className="bg-slate-900 border border-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-[10px] text-left h-44 overflow-y-auto space-y-1 shadow-inner max-w-lg mx-auto">
                  {aiLogLines.map((log, id) => (
                    <div key={id}>{log}</div>
                  ))}
                  <div className="animate-pulse">_</div>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW AND SAVE FROM THE REAL GEMINI RESPONSE */}
            {wizardStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-300 max-h-96 overflow-y-auto pr-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-emerald-700 font-medium">
                  <CheckCircleOutlined className="text-emerald-600 text-lg shrink-0 mt-0.5" />
                  <div>
                    <strong className="block uppercase text-[10px] tracking-wider mb-1 mb-0.5 text-emerald-800">SOẠN THẢO THÀNH CÔNG!</strong>
                    Gemini AI đã hoàn thành phân giải cơ cấu đề thi. Quý thầy cô vui lòng duyệt qua bảng xem trước cấu trúc câu hỏi chính thức trước khi ghi đè cơ sở dữ liệu.
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Nội dung câu hỏi trực tiếp ({generatedQuestions.length} câu)</span>

                  {generatedQuestions.map((q, id) => (
                    <div key={id} className="bg-white border rounded-2xl p-4 space-y-2 text-xs hover:border-slate-350 transition-colors">
                      <div className="flex justify-between items-start">
                        <strong className="text-slate-800">Câu hỏi {id + 1}: {q.text}</strong>
                        <Tag color={q.level === 'nhan_biet' ? 'blue' : q.level === 'thong_hieu' ? 'cyan' : 'orange'} className="rounded-md font-extrabold text-[8px] uppercase m-0 border-transparent py-0.5 px-2">
                          {q.level === 'nhan_biet' ? 'Nhận biết' : q.level === 'thong_hieu' ? 'Thông hiểu' : 'Vận dụng'}
                        </Tag>
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pl-2 text-slate-500 font-medium">
                          {q.options.map((opt, oid) => (
                            <div key={oid} className={q.correctAnswer === String.fromCharCode(65 + oid) ? "text-emerald-700 font-extrabold" : ""}>
                              {String.fromCharCode(65 + oid)}. {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-dashed flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Hình thức: Trắc nghiệm khách quan</span>
                        <span className="text-emerald-600">Đáp án chính xác: Tùy ý chọn {q.correctAnswer}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </Form>
        </div>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 2: DETAIL EXAM QUESTIONS VIEWER                      */}
      {/* ========================================================== */}
      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-1.5">
            <DatabaseOutlined className="text-[#002147]" />
            <span className="font-extrabold uppercase text-[12px] text-slate-800">CHI TIẾT NGÂN HÀNG CÂU HỎI TRONG ĐỀ THI</span>
          </div>
        }
        open={isDetailOpen}
        onCancel={() => setIsDetailOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsDetailOpen(false)} className="rounded-xl font-bold text-xs bg-[#002147] border-transparent text-white">
            Xác nhận Đóng cửa sổ
          </Button>
        ]}
        centered
        width={650}
      >
        <div className="space-y-4 pt-4 max-h-96 overflow-y-auto pr-1" id="exam-detail-body">
          {selectedExam && (
            <>
              <div className="bg-slate-50 border p-4 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between border-b pb-1.5 font-medium text-slate-500">
                  <span>Tên đề kiểm tra:</span>
                  <strong className="text-slate-800">{selectedExam.name}</strong>
                </div>
                <div className="flex justify-between border-b pb-1.5 font-medium text-slate-500">
                  <span>Mã định danh hệ thống:</span>
                  <strong className="text-slate-800 font-mono">{selectedExam.code}</strong>
                </div>
                <div className="flex justify-between font-medium text-slate-500">
                  <span>Thời lượng thi chính:</span>
                  <strong className="text-slate-800">{selectedExam.duration} Phút làm bài</strong>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Mẫu phân bổ cụm câu hỏi ({selectedExam.questions.length || 0} câu)</span>

                {selectedExam.questions.length === 0 ? (
                  <Empty description="Đề thi hiện chưa liên kết dữ liệu câu hỏi chi tiết." className="py-6" />
                ) : (
                  selectedExam.questions.map((q, id) => (
                    <div key={id} className="bg-white border rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <div className="text-slate-800 flex-1">
                          <strong>Câu hỏi {id + 1}:</strong>
                          <RichTextView html={q.text} />
                        </div>
                        <Tag color={q.level === 'nhan_biet' || q.level === 'easy' ? 'blue' : 'orange'} className="rounded-md font-bold text-[8px] uppercase m-0 border-transparent">
                          {q.level === 'easy' || q.level === 'nhan_biet' ? 'Nhận biết' : 'Yêu cầu Vận Dụng'}
                        </Tag>
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pl-2 text-slate-500 font-semibold text-[11px]">
                          {q.options.map((opt, oid) => (
                            <div key={oid} className="text-slate-650">
                              {String.fromCharCode(65 + oid)}. {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-dashed flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Hạng hệ thống: MCQ Một lựa chọn</span>
                        <span className="text-emerald-600">Đáp án chính: {q.correctAnswer}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 3: EXAM PACKAGE CREATE/EDIT                          */}
      {/* ========================================================== */}
      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-1.5">
            <GroupOutlined className="text-[#002147]" />
            <span className="font-extrabold uppercase text-[12px] text-slate-800">
              {pkgModalMode === 'create' ? 'THIẾT LẬP GÓI TUYỂN TẬP ĐỀ THI MỚI' : 'CẬP NHẬT GÓI TUYỂN TẬP ĐỀ THI'}
            </span>
          </div>
        }
        open={isPkgModalOpen}
        forceRender
        onCancel={() => setIsPkgModalOpen(false)}
        onOk={handlePkgFormSubmit}
        okText={pkgModalMode === 'create' ? 'Xác nhận tạo gói đề' : 'Xác nhận lưu thay đổi'}
        cancelText="Đóng cửa sổ"
        centered
        width={600}
        destroyOnHidden
      >
        <div className="pt-4" id="package-setup-body">
          <Form form={pkgForm} layout="vertical" className="space-y-3">
            <Form.Item name="name" label={<span className="text-xs font-extrabold uppercase text-slate-500">Tên gói tuyển tập đề mẫu</span>} required rules={[{ required: true, message: 'Nhập tên gói đề!' }]}>
              <Input placeholder="Ví dụ: Bộ đề thi thử học kì, Luyện thi THPT môn Toán..." className="text-xs font-semibold rounded-xl" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="code" label={<span className="text-xs font-extrabold uppercase text-slate-500">Mã gói đề xuất (tự sinh nếu bỏ trống)</span>}>
                  <Input placeholder="Ví dụ: GP-MATH12-01" className="text-xs font-semibold rounded-xl uppercase" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="accessType" label={<span className="text-xs font-extrabold uppercase text-slate-500">Quy chế tiếp cận</span>} required>
                  <Select className="text-xs font-semibold" options={[
                    { value: 'free', label: 'Miễn phí' },
                    { value: 'standard', label: 'Tiêu chuẩn / Nội bộ' },
                    { value: 'premium', label: 'VIP PREMIUM' }
                  ]} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="subject" label={<span className="text-xs font-extrabold uppercase text-slate-500">Môn học dán nhãn</span>} required>
                  <Select className="text-xs font-semibold" options={SUBJECTS} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="grade" label={<span className="text-xs font-extrabold uppercase text-slate-500">Khối đào tạo liên hệ</span>} required>
                  <Select className="text-xs font-semibold" options={GRADES} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label={<span className="text-xs font-extrabold uppercase text-slate-500">Bản ghi chú tổng quát bộ tuyển tập</span>}>
              <Input.TextArea rows={2} placeholder="Nhập tóm tắt mô tả phạm vi gói đề kiểm tra..." className="text-xs font-semibold rounded-xl" />
            </Form.Item>

            <Form.Item name="examIds" label={<span className="text-xs font-extrabold uppercase text-slate-500">Chọn đề thi liên kết vào tuyển tập</span>}>
              <Select
                mode="multiple"
                allowClear
                placeholder="Chọn danh sách các mẫu đề thi muốn dồn gói..."
                className="text-xs font-semibold rounded-xl"
                options={exams.map(e => ({ value: e.id, label: `[${e.code}] ${e.name}` }))}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

    </div>
  );
}
