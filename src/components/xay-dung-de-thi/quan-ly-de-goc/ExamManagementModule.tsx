import React, { useState, useEffect, useMemo } from 'react';
import {
  Input,
  Select,
  Button,
  Modal,
  Spin,
  Tag,
  Tooltip,
  Space,
  Empty,
  DatePicker,
  Timeline,
  Dropdown,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SearchOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  FileExcelOutlined,
  DownOutlined,
  UpOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RetweetOutlined
} from '@ant-design/icons';
import { SUBJECTS, GRADES } from '../../../data';
import { Question } from '../../../types';
import { bankQuestionApi, subjectCategoryApi, type BankQuestionHistoryAPI } from '../../../services/danhMucApi';
import { getUserSubjectFilter } from '../../../utils/subjectUtils';
import { buildExamDocxBlob, triggerBlobDownload } from '../../../utils/examWordExport';
import { exportToExcel, type ExcelColumn } from '../../../utils/excelExport';
import { toast } from '../../../utils/toast';
import { useResizableColumns, ColResizeHandle, ResizableTableStyles, RESIZABLE_TABLE_CLASS, TruncatedText } from '../../../utils/resizableTable';
import { hasActionPermission, hasAnyPermission, checkUserPermission } from '../../../utils/permissionUtils';
import { compareByPartAndLineNumber } from '../../../utils/examParts';
import ModalDeRiengLe from './ModalDeRiengLe';
import ModalTaoDeTuDong from './ModalTaoDeTuDong';
import ModalSinhDeHoanVi from './ModalSinhDeHoanVi';
import ExamContentDisplay from './ExamContentDisplay';
import ExportAnswerChoiceModal from '../../ExportAnswerChoiceModal';

const { RangePicker } = DatePicker;

interface ExamManagementModuleProps {
  onNavigateTab?: (key: string) => void;
  currentUser?: any;
}

export default function ExamManagementModule({ onNavigateTab, currentUser }: ExamManagementModuleProps) {
  // Tabs: 'exam_variants' | 'exam_roots' | 'exam_packages'
  const [activeTab, setActiveTab] = useState<'exam_roots' | 'exam_review'>(
    checkUserPermission(currentUser, 'tab-de-goc') ? 'exam_roots' : 'exam_review'
  );

  // Core Data States
  const [exams, setExams] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isSubjectRestricted, setIsSubjectRestricted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filters for Exams
  const [examSearch, setExamSearch] = useState('');
  const [examSubject, setExamSubject] = useState('all');
  const [examGrade, setExamGrade] = useState('all');
  const [examMatrix, setExamMatrix] = useState('all');
  const [examStatus, setExamStatus] = useState('all');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Filters for Packages (Tab 3)
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgSubject, setPkgSubject] = useState('all');
  const [pkgPeriod, setPkgPeriod] = useState('all');

  // Batch action selection
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [selectedPkgIds, setSelectedPkgIds] = useState<string[]>([]);

  // Trạng thái đang duyệt/từ chối 1 đề thi cụ thể (per-row) — tránh 1 boolean chung khiến
  // spinner hiện sai hàng khi nhiều dòng bị thao tác liên tiếp.
  const [reviewActioning, setReviewActioning] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null);
  const [bulkReviewing, setBulkReviewing] = useState(false);

  // Modal Triggers
  const [isDeRiengLeOpen, setIsDeRiengLeOpen] = useState(false);
  const [isTuDongMoiOpen, setIsTuDongMoiOpen] = useState(false);
  const [isSinhHoanViOpen, setIsSinhHoanViOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<any | null>(null);

  // Secondary interactive modals state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Xem chi tiết đề thi
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewQuestions, setViewQuestions] = useState<Question[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  // Form states for secondary modals
  const [historyLogs, setHistoryLogs] = useState<(BankQuestionHistoryAPI & { questionCode?: string })[]>([]);

  // Độ rộng từng cột bảng "Kết quả tìm kiếm" — co giãn được bằng cách kéo cạnh phải tiêu đề cột.
  // Thứ tự: checkbox, STT, Mã đề, Tên đề thi, Môn học, Ma trận đề, Tổng điểm, Số câu hỏi,
  // Thời gian làm bài, Ngày tạo, Trạng thái, Thao tác.
  const { colGroup: examTableColGroup, startResize: startExamColResize, totalWidth: examTableTotalWidth } = useResizableColumns(
    [40, 56, 110, 260, 110, 120, 90, 90, 130, 100, 190, 160]
  );

  // Fetch Exams & Packages
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resExams, resPkgs, resSubjects] = await Promise.all([
        fetch('/api/exams').then(r => r.json()),
        fetch('/api/exams/packages').then(r => r.json()),
        subjectCategoryApi.list()
      ]);

      if (resExams.success) setExams(resExams.data || []);
      if (resPkgs.success) setPackages(resPkgs.data || []);
      
      const activeSubjects = (resSubjects?.data || []).filter((s: any) => s.is_active);
      const { filteredSubjects, isRestricted } = getUserSubjectFilter(activeSubjects, currentUser);
      setSubjects(filteredSubjects);
      setIsSubjectRestricted(isRestricted);
      if (isRestricted && filteredSubjects.length > 0) {
        // Không gán cứng môn học đầu tiên nữa để hiển thị "Tất cả" các môn được phân công
        // setExamSubject(filteredSubjects[0].name);
      }
    } catch {
      toast.error('Lỗi cổng kết nối khi tải danh sách.');
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
      const matchesSubject = examSubject === 'all' 
        ? (!isSubjectRestricted || subjects.some(s => s.name === e.subject))
        : e.subject === examSubject;
      const matchesGrade = examGrade === 'all' || e.grade === examGrade;
      const matchesStatus = examStatus === 'all' || e.status === examStatus;
      return isVariant && matchesSearch && matchesSubject && matchesGrade && matchesStatus;
    });
  }, [exams, examSearch, examSubject, examGrade, examStatus]);

  // Đề hoán vị (tạo từ ModalSinhDeHoanVi) CŨNG lưu source='ai' giống hệt đề gốc sinh bằng AI
  // (ModalTaoDeTuDong > "Theo AI") — 2 trường hợp này không phân biệt được bằng `source`. Cách duy
  // nhất để nhận diện đúng "đề hoán vị" (không phải đề gốc): nó luôn được thêm vào 1 gói đề với
  // examIds = [đề_gốc, ...các_đề_hoán_vị] (xem handleSavePackage) — tức nằm ở vị trí > 0 trong
  // examIds của gói. Đề gốc THẬT (kể cả sinh bằng AI) không bao giờ ở vị trí này.
  const variantExamIds = useMemo(() => {
    const set = new Set<string>();
    packages.forEach((pkg: any) => {
      const ids: string[] = pkg.examIds || [];
      ids.slice(1).forEach(id => set.add(id));
    });
    return set;
  }, [packages]);

  const filteredExamRoots = useMemo(() => {
    const kw = examSearch.trim().toLowerCase();
    return exams.filter(e => {
      const isRoot = !variantExamIds.has(e.id);
      const matchesSearch = (e.name || '').toLowerCase().includes(kw) || (e.code || '').toLowerCase().includes(kw);
      const matchesSubject = examSubject === 'all'
        ? (!isSubjectRestricted || subjects.some(s => s.name === e.subject))
        : e.subject === examSubject;
      const matchesStatus = examStatus === 'all' || e.status === examStatus;
      return isRoot && matchesSearch && matchesSubject && matchesStatus;
    });
  }, [exams, variantExamIds, examSearch, examSubject, examStatus]);

  const filteredExamReview = useMemo(() => {
    return exams.filter(e => {
      const isPending = e.status === 'pending' || e.status === '2';
      const isAllowedSubject = !isSubjectRestricted || subjects.some(s => s.name === e.subject);
      return isPending && isAllowedSubject;
    });
  }, [exams, isSubjectRestricted, subjects]);

  // Danh sách đang hiển thị THEO ĐÚNG TAB — trước đây checkbox "chọn tất cả" ở header bảng cứng dùng
  // filteredExamRoots bất kể đang ở tab nào, nên ở tab "Thẩm định đề gốc" (dùng filteredExamReview)
  // tick "chọn tất cả" không khớp với các dòng đang hiển thị thật, khiến checkbox từng dòng không
  // được tick theo dù trạng thái header hiện đã chọn hết.
  const visibleExamRows = activeTab === 'exam_roots' ? filteredExamRoots : filteredExamReview;

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
          toast.success('Đã xóa thành công các đề thi được chọn.');
          setSelectedExamIds([]);
          fetchData();
        } catch {
          toast.error('Có lỗi xảy ra khi xóa hàng loạt.');
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
            toast.success(json.message);
            fetchData();
          }
        } catch {
          toast.error('Không thể xóa đề thi.');
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
        toast.info(`Đã chuyển đổi trạng thái gói đề sang: ${nextStatus === 'active' ? 'HOẠT ĐỘNG' : 'TẠM KHÓA'}`);
        fetchData();
      }
    } catch {
      toast.error('Không thể cập nhật trạng thái gói.');
    }
  };

  const handleDeletePackage = (id: string, name: string) => {
    Modal.confirm({
      title: `Xác nhận xóa gói đề: "${name}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          const res = await fetch(`/api/exams/packages/${id}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) {
            toast.success(json.message);
            fetchData();
          }
        } catch {
          toast.error('Không thể xóa gói đề.');
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
          lineNumber: q.lineNumber,
        }))
        // Giữ đúng thứ tự đã lưu (vd đề hoán vị) — GET /bank-questions/ không đảm bảo trả về theo
        // đúng thứ tự này. Sort theo (Phần, lineNumber trong Phần) — không chỉ lineNumber thô, vì
        // lineNumber đánh số lại từ 1 ở MỖI Phần (xem ModalSinhDeHoanVi.tsx).
        .sort(compareByPartAndLineNumber);
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
  // Bấm "Tải đề thi (.docx)" mở modal hỏi Có/Không đáp án trước — xem exportExamTarget bên dưới.
  const doExportWord = async (exam: any, includeAnswers: boolean) => {
    toast.loading({ content: `Đang biên dịch & xuất tài liệu cho đề ${exam.code}...`, key: 'word' });
    const questions = await fetchExamQuestions(exam.id);
    const blob = await buildExamDocxBlob('ĐỀ THI TRẮC NGHIỆM', exam.subject, exam.grade, questions, exam.duration || 90, includeAnswers);
    triggerBlobDownload(blob, `${exam.code}_DeThi_${exam.subject.replace(/\s+/g, '')}`, 'docx');
    toast.success({ content: `Xuất thành công file Word đề thi ${exam.code}!`, key: 'word', duration: 3 });
  };

  // Đề đang chờ chọn "Có đáp án"/"Không đáp án" trước khi thực sự xuất — null = modal đang đóng.
  const [exportExamTarget, setExportExamTarget] = useState<any | null>(null);
  const handleExportWord = (exam: any) => setExportExamTarget(exam);

  // Cột xuất Excel — khớp đúng các cột đang hiển thị ở bảng "Kết quả tìm kiếm".
  const examExcelColumns: ExcelColumn<any>[] = [
    { header: 'STT', accessor: (_row, i) => i + 1, width: 6, align: 'center' },
    { header: 'Mã đề', accessor: row => row.code, width: 16 },
    { header: 'Tên đề thi', accessor: row => row.name, width: 32 },
    { header: 'Môn học', accessor: row => row.subject, width: 14 },
    { header: 'Ma trận đề', accessor: row => row.matrixName || 'Ma trận đề 01', width: 16 },
    { header: 'Tổng điểm', accessor: row => row.totalScore || '10.00', width: 10, align: 'center' },
    { header: 'Số câu hỏi', accessor: row => row.totalQuestions || 0, width: 10, align: 'center' },
    { header: 'Thời gian làm bài (phút)', accessor: row => row.duration || 90, width: 14, align: 'center' },
    { header: 'Ngày tạo', accessor: row => (row.createdAt ? row.createdAt.slice(0, 10) : ''), width: 12 },
    { header: 'Trạng thái', accessor: row => getStatusLabel(row.status), width: 16 },
  ];

  // Xuất Excel đúng bảng "Kết quả tìm kiếm" đang hiển thị (đã áp dụng bộ lọc tìm kiếm).
  const handleExportExcel = () => {
    const rows = activeTab === 'exam_roots' ? filteredExamRoots : filteredExamReview;
    if (rows.length === 0) {
      toast.warning('Không có dữ liệu để xuất Excel.');
      return;
    }
    const fileName = `DanhSachDeThi_${activeTab === 'exam_roots' ? 'DeGoc' : 'ThamDinh'}_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(rows, examExcelColumns, fileName, 'Đề thi');
    toast.success('Xuất báo cáo Excel thành công!');
  };

  // Gửi thẩm định: đề thi đã ở trạng thái "Chờ thẩm định" ngay khi tạo, nên chỉ cần
  // chuyển sang tab "Thẩm định/phản biện đề" để hội đồng xử lý tiếp.
  const handleSendReview = () => {
    setSelectedExamIds([]);
    setActiveTab('exam_review');
  };

  // Duyệt / Từ chối đề thi ở tab thẩm định
  const handleReviewDecision = async (exam: any, status: 'approved' | 'rejected') => {
    setReviewActioning({ id: exam.id, action: status });
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(status === 'approved' ? `Đã duyệt đề thi "${exam.name}".` : `Đã từ chối đề thi "${exam.name}".`);
        fetchData();
      } else {
        toast.error(json.error || 'Lỗi khi cập nhật kết quả thẩm định.');
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật kết quả thẩm định.');
    } finally {
      setReviewActioning(null);
    }
  };

  // Duyệt/Từ chối hàng loạt các đề đang chọn (tick) ở tab "Thẩm định đề gốc" — chạy song song bằng
  // Promise.all thay vì tuần tự từng đề (giống lý do đã tối ưu bulk-delete câu hỏi: mỗi request PUT
  // vẫn tốn round-trip DB riêng dù backend không có endpoint bulk-review cho exams, nên chạy song song
  // ở FE là cách nhanh nhất mà không cần đổi API).
  const handleBulkReviewDecision = async (status: 'approved' | 'rejected') => {
    if (selectedExamIds.length === 0) return;
    setBulkReviewing(true);
    try {
      const results = await Promise.all(selectedExamIds.map(async (id) => {
        try {
          const res = await fetch(`/api/exams/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          });
          const json = await res.json();
          return !!json.success;
        } catch {
          return false;
        }
      }));
      const successCount = results.filter(Boolean).length;
      const failCount = results.length - successCount;
      const verb = status === 'approved' ? 'duyệt' : 'từ chối';
      if (successCount > 0) toast.success(`Đã ${verb} ${successCount} đề thi.`);
      if (failCount > 0) toast.warning(`${failCount} đề thi ${verb} thất bại — vui lòng thử lại.`);
      setSelectedExamIds([]);
      fetchData();
    } finally {
      setBulkReviewing(false);
    }
  };

  // Đề thi không có bảng lịch sử riêng ở backend — ghép lại từ lịch sử thẩm định THẬT của từng câu
  // hỏi thuộc đề (bảng question_histories, ghi khi duyệt/từ chối/thẩm định hàng loạt — xem
  // bankQuestionApi.getHistory), thay vì dữ liệu Nhật ký cố định trước đây.
  const handleOpenHistory = async (exam: any) => {
    setSelectedExam(exam);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const questions = await fetchExamQuestions(exam.id);
      const results = await Promise.all(
        questions.map(q => bankQuestionApi.getHistory(q.id).catch(() => null))
      );
      const logs = results
        .flatMap((res, idx) => {
          if (!res || !res.success) return [];
          const questionCode = questions[idx].code;
          return res.data.map(entry => ({ ...entry, questionCode }));
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistoryLogs(logs);
    } catch {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Text label tương ứng getStatusTag — dùng cho xuất Excel (không thể ghi JSX vào ô Excel).
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case '1':
      case 'draft':
        return 'Lưu nháp';
      case '2':
      case 'pending':
        return 'Chờ thẩm định';
      case '3':
      case 'approved':
      case 'active':
        return 'Đã thẩm định';
      case '4':
      case 'rejected':
      case 'closed':
        return 'Từ chối';
      default:
        return status;
    }
  };

  // Status tag formatters
  const getStatusTag = (status: string) => {
    switch (status) {
      case '1':
      case 'draft':
        return <Tag color="default" className="!inline-flex !items-center !justify-center !text-center rounded-full text-[14px] font-bold uppercase w-[150px] !h-[26px] !m-0 !border-1 !border-slate-400">Lưu nháp</Tag>;
      case '2':
      case 'pending':
        return <Tag color="warning" className="!inline-flex !items-center !justify-center !text-center rounded-full text-[14px] font-bold uppercase w-[150px] !h-[26px] !m-0 !border-1 !border-amber-500">Chờ thẩm định</Tag>;
      case '3':
      case 'approved':
      case 'active':
        return <Tag color="success" className="!inline-flex !items-center !justify-center !text-center rounded-full text-[14px] font-bold uppercase w-[150px] !h-[26px] !m-0 !border-1 !border-emerald-500">Đã thẩm định</Tag>;
      case '4':
      case 'rejected':
      case 'closed':
        return <Tag color="error" className="!inline-flex !items-center !justify-center !text-center rounded-full text-[14px] font-bold uppercase w-[150px] !h-[26px] !m-0 !border-1 !border-red-500">Từ chối</Tag>;
      default:
        return <Tag className="!inline-flex !items-center !justify-center !text-center rounded-full text-[14px] font-bold uppercase w-[150px] !h-[26px] !m-0 !border-1 !border-slate-400">{status}</Tag>;
    }
  };

  // Chỉ cho sửa đề khi chưa "Đã thẩm định" (Nháp / Chờ thẩm định / Từ chối) — đề đã thẩm định coi như chốt.
  const canEditExam = (status: string) => !['3', 'approved', 'active'].includes(status);

  // Chỉ cho sinh đề hoán vị khi đề gốc đã "Đã thẩm định" — nội dung câu hỏi lúc đó mới coi như chốt,
  // hoán vị dựa trên đề chưa thẩm định thì nội dung có thể còn thay đổi.
  const canGenerateVariant = (status: string) => ['3', 'approved', 'active'].includes(status);

  // Dropdown actions generator
  const getActionMenuItems = (exam: any) => {
    const items = [];
    if (hasActionPermission(currentUser, 'exams.submit')) {
      items.push({
        key: 'review',
        label: 'Gửi thẩm định/phản biên',
        icon: <SafetyCertificateOutlined />,
        onClick: () => handleSendReview()
      });
    }
    if (hasActionPermission(currentUser, 'exams.manage')) {
      items.push({
        key: 'history',
        label: 'Lịch sử chỉnh sửa',
        icon: <HistoryOutlined />,
        onClick: () => handleOpenHistory(exam)
      });
    }
    if (hasActionPermission(currentUser, 'exams.export')) {
      items.push({
        key: 'docx',
        label: 'Tải đề thi (.docx)',
        icon: <DownloadOutlined />,
        onClick: () => handleExportWord(exam)
      });
    }
    if (hasActionPermission(currentUser, 'exams.manage')) {
      if (items.length > 0) items.push({ type: 'divider' as const });
      items.push({
        key: 'delete',
        label: <span className="text-red-500 font-semibold">Xóa đề thi</span>,
        icon: <DeleteOutlined className="text-red-500" />,
        onClick: () => handleSingleDeleteExam(exam.id, exam.name)
      });
    }
    return items;
  };

  return (
    <div className="pt-3 px-6 pb-6 flex flex-col gap-4 bg-white min-h-[calc(100vh-200px)]" id="exam-management-layout-facade">
      <ResizableTableStyles />
      {/* Tab Headers */}
      <div className="flex gap-1 border-b border-gray-300 relative select-none">
        {checkUserPermission(currentUser, 'tab-de-goc') && (
          <button
            onClick={() => { setActiveTab('exam_roots'); setSelectedExamIds([]); }}
            className={`px-3 py-1.5 text-[14px] font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'exam_roots'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
            style={{
              borderBottomColor: activeTab === 'exam_roots' ? '#eff6ff' : undefined
            }}
          >
            Đề gốc
          </button>
        )}
        {checkUserPermission(currentUser, 'tab-tham-dinh-de-goc') && (
          <button
            onClick={() => { setActiveTab('exam_review'); setSelectedExamIds([]); }}
            className={`px-3 py-1.5 text-[14px] font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'exam_review'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
            style={{
              borderBottomColor: activeTab === 'exam_review' ? '#eff6ff' : undefined
            }}
          >
            Thẩm định đề gốc
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div
          className="flex items-center gap-2 cursor-pointer mb-4 w-fit group"
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
        >
          <h3 className="text-black font-bold text-[14px] not-italic m-0">Tìm kiếm thông tin</h3>
          <div className="text-[#1a3c8b] opacity-70 group-hover:opacity-100 transition-opacity">
            {isFiltersExpanded ? <UpOutlined className="text-[14px]" /> : <DownOutlined className="text-[14px]" />}
          </div>
        </div>

        {isFiltersExpanded && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-3 gap-x-4 gap-y-3 text-[14px] mb-4">
              <div>
                <label className="block text-[14px] font-medium text-slate-700 mb-1">Mã/tên đề</label>
                <Input
                  placeholder="Nhập"
                  className="rounded border-slate-300 text-[14px]"
                  value={examSearch}
                  onChange={e => setExamSearch(e.target.value)}
                  allowClear
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-slate-700 mb-1">Môn học</label>
                <Select
                  value={examSubject}
                  onChange={setExamSubject}
                  className="w-full text-[14px]"
                  options={[
                    { value: 'all', label: 'Tất cả' },
                    ...subjects.map(s => ({ value: s.name, label: s.name }))
                  ]}
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-slate-700 mb-1">Ma trận đề thi</label>
                <Select
                  value={examMatrix}
                  onChange={setExamMatrix}
                  className="w-full text-[14px]"
                  options={[{ value: 'all', label: 'Tất cả' }, { value: 'ma-tran-01', label: 'Ma trận đề 01' }, { value: 'ma-tran-02', label: 'Ma trận đề 02' }]}
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-slate-700 mb-1">Ngày tạo</label>
                <RangePicker size="small" className="w-full" placeholder={['Bắt đầu', 'Kết thúc']} />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-slate-700 mb-1">Trạng thái</label>
                {activeTab === 'exam_review' ? (
                  // Tab thẩm định chỉ hiển thị đề đang chờ thẩm định — khoá cứng, không cho đổi.
                  <Select
                    value="pending"
                    disabled
                    className="w-full text-[14px]"
                    options={[{ value: 'pending', label: 'Chờ thẩm định' }]}
                  />
                ) : (
                  <Select
                    value={examStatus}
                    onChange={setExamStatus}
                    className="w-full text-[14px]"
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
                className="bg-[#2c3e9e] border-transparent text-white font-semibold text-[14px] rounded px-8 hover:bg-[#243590] cursor-pointer"
                onClick={() => { }}
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
          <h3 className="text-black font-bold text-[14px] not-italic m-0">
            Kết quả tìm kiếm
          </h3>

          <Space size={8}>
            {activeTab === 'exam_roots' && (
              <>
                {hasActionPermission(currentUser, 'exams.manage') && (
                  <>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => { setSelectedExam(null); setIsDeRiengLeOpen(true); }}
                      className="bg-[#2c3e9e] border-transparent text-white font-semibold text-[14px] rounded hover:bg-[#243590] cursor-pointer"
                    >
                      Thêm mới thủ công
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setIsTuDongMoiOpen(true)}
                      className="bg-[#2c3e9e] border-transparent text-white font-semibold text-[14px] rounded hover:bg-[#243590] cursor-pointer"
                    >
                      Thêm mới tự động
                    </Button>
                  </>
                )}
                {hasActionPermission(currentUser, 'exams.export') && (
                  <Button
                    type="primary"
                    icon={<FileExcelOutlined />}
                    onClick={handleExportExcel}
                    className="!bg-green-600 !border-green-600 !text-white font-semibold text-[14px] rounded hover:!bg-green-700 cursor-pointer"
                  >
                    Xuất Excel
                  </Button>
                )}
                {hasActionPermission(currentUser, 'exams.submit') && (
                  <Button
                    icon={<SafetyCertificateOutlined />}
                    disabled={selectedExamIds.length === 0}
                    onClick={handleSendReview}
                    className="border-slate-300 text-slate-700 font-semibold text-[14px] rounded cursor-pointer"
                  >
                    Gửi thẩm định
                  </Button>
                )}
                {hasActionPermission(currentUser, 'exams.manage') && (
                  <Button
                    danger
                    onClick={handleBatchDeleteExams}
                    disabled={selectedExamIds.length === 0}
                    className="font-semibold text-[14px] rounded cursor-pointer"
                  >
                    Xóa
                  </Button>
                )}
              </>
            )}
            {activeTab === 'exam_review' && (
              <>
                {hasActionPermission(currentUser, 'exams.approve') && (
                  <>
                    <Popconfirm
                      title={`Duyệt ${selectedExamIds.length} đề thi đã chọn?`}
                      okText="Duyệt" cancelText="Hủy"
                      onConfirm={() => handleBulkReviewDecision('approved')}
                    >
                      <Button
                        icon={<CheckCircleOutlined className="text-green-600" />}
                        disabled={selectedExamIds.length === 0}
                        loading={bulkReviewing}
                        className="border-slate-300 text-slate-700 font-semibold text-[14px] rounded cursor-pointer"
                      >
                        Duyệt hàng loạt
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title={`Từ chối ${selectedExamIds.length} đề thi đã chọn?`}
                      okText="Từ chối" cancelText="Hủy" okButtonProps={{ danger: true }}
                      onConfirm={() => handleBulkReviewDecision('rejected')}
                    >
                      <Button
                        danger
                        icon={<CloseCircleOutlined />}
                        disabled={selectedExamIds.length === 0}
                        loading={bulkReviewing}
                        className="font-semibold text-[14px] rounded cursor-pointer"
                      >
                        Từ chối hàng loạt
                      </Button>
                    </Popconfirm>
                  </>
                )}
                {hasActionPermission(currentUser, 'exams.manage') && (
                  <Button
                    danger
                    onClick={handleBatchDeleteExams}
                    disabled={selectedExamIds.length === 0}
                    className="font-semibold text-[14px] rounded cursor-pointer"
                  >
                    Xóa
                  </Button>
                )}
                {hasActionPermission(currentUser, 'exams.export') && (
                  <Button
                    type="primary"
                    icon={<FileExcelOutlined />}
                    onClick={handleExportExcel}
                    className="bg-green-600 border-transparent text-white font-semibold text-[14px] rounded hover:bg-green-700 cursor-pointer"
                  >
                    Xuất Excel
                  </Button>
                )}
              </>
            )}
          </Space>
        </div>

        {/* Custom styled HTML Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center">
              <Spin indicator={<SyncOutlined className="text-[14px]" spin />} />
              <p className="text-[14px] text-slate-400 font-bold mt-2">Đang tải tài liệu...</p>
            </div>
          ) : visibleExamRows.length === 0 ? (
            <Empty description="Không có đề thi nào." className="py-12" />
          ) : (
            <table style={{ minWidth: examTableTotalWidth }} className={`w-full text-[14px] font-normal text-black border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}>
              {examTableColGroup}
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[14px] text-black font-bold">
                  <th className="relative py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      className="cursor-pointer accent-[#2c3e9e]"
                      checked={visibleExamRows.length > 0 && visibleExamRows.every(e => selectedExamIds.includes(e.id))}
                      onChange={() => {
                        const allSelected = visibleExamRows.every(e => selectedExamIds.includes(e.id));
                        if (allSelected) setSelectedExamIds(prev => prev.filter(id => !visibleExamRows.map(e => e.id).includes(id)));
                        else setSelectedExamIds(prev => Array.from(new Set([...prev, ...visibleExamRows.map(e => e.id)])));
                      }}
                    />
                    <ColResizeHandle onMouseDown={startExamColResize(0)} />
                  </th>
                  <th className="relative py-3 px-3 text-center font-bold">STT<ColResizeHandle onMouseDown={startExamColResize(1)} /></th>
                  <th className="relative py-3 px-3 text-left font-bold">Mã đề<ColResizeHandle onMouseDown={startExamColResize(2)} /></th>
                  <th className="relative py-3 px-3 text-left font-bold">Tên đề thi<ColResizeHandle onMouseDown={startExamColResize(3)} /></th>
                  <th className="relative py-3 px-3 text-center font-bold">Môn học<ColResizeHandle onMouseDown={startExamColResize(4)} /></th>
                  <th className="relative py-3 px-3 text-center font-bold">Ma trận đề<ColResizeHandle onMouseDown={startExamColResize(5)} /></th>
                  <th className="relative py-3 px-3 text-center font-bold">Tổng điểm<ColResizeHandle onMouseDown={startExamColResize(6)} /></th>
                  <th className="relative py-3 px-3 text-center font-bold">Số câu hỏi<ColResizeHandle onMouseDown={startExamColResize(7)} /></th>
                  <th className="relative py-3 px-3 text-center font-bold">Thời gian làm bài (phút)<ColResizeHandle onMouseDown={startExamColResize(8)} /></th>
                  <th className="relative py-3 px-3 text-center font-bold">Ngày tạo<ColResizeHandle onMouseDown={startExamColResize(9)} /></th>
                  <th className="relative py-3 px-3 text-center font-bold">Trạng thái<ColResizeHandle onMouseDown={startExamColResize(10)} /></th>
                  <th className="relative py-3 px-3 text-center font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleExamRows.map((row, idx) => (
                  <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${selectedExamIds.includes(row.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="py-2.5 px-3 text-center">
                      <input type="checkbox" className="cursor-pointer accent-[#2c3e9e]"
                        checked={selectedExamIds.includes(row.id)}
                        onChange={() => setSelectedExamIds(prev => prev.includes(row.id) ? prev.filter(id => id !== row.id) : [...prev, row.id])} />
                    </td>
                    <td className="py-2.5 px-3 text-center text-black text-[14px]">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <TruncatedText text={row.code} className="font-mono text-black text-[14px]" />
                    </td>
                    <td className="py-2.5 px-3">
                      <TruncatedText text={row.name} className="text-black text-[14px]" />
                      <TruncatedText text={row.description || ''} className="text-[14px] text-black" />
                    </td>
                    <td className="py-2.5 px-3 text-center"><TruncatedText text={row.subject} className="text-black text-[14px]" /></td>
                    <td className="py-2.5 px-3 text-center"><TruncatedText text={row.matrixName || 'Ma trận đề 01'} className="text-[14px] text-black" /></td>
                    <td className="py-2.5 px-3 text-center"><TruncatedText text={row.totalScore || '10.00'} className="text-[14px] text-black" /></td>
                    <td className="py-2.5 px-3 text-center"><TruncatedText text={row.totalQuestions || 0} className="text-black text-[14px]" /></td>
                    <td className="py-2.5 px-3 text-center"><TruncatedText text={row.duration || 90} className="text-[14px] text-black" /></td>
                    <td className="py-2.5 px-3 text-center"><TruncatedText text={row.createdAt ? row.createdAt.slice(0, 10) : '20/10/2006'} className="text-[14px] text-black" /></td>
                    <td className="py-2.5 px-3 text-center">{getStatusTag(row.status)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Space size={2}>
                        {activeTab === 'exam_review' && hasActionPermission(currentUser, 'exams.approve') && (
                          <>
                            <Popconfirm
                              title={`Duyệt đề thi "${row.name}"?`}
                              okText="Duyệt" cancelText="Hủy"
                              onConfirm={() => handleReviewDecision(row, 'approved')}
                            >
                              <Tooltip title="Duyệt (Đã thẩm định)">
                                <Button
                                  size="small" type="text" icon={<CheckCircleOutlined className="text-green-600" />} className="cursor-pointer"
                                  loading={reviewActioning?.id === row.id && reviewActioning.action === 'approved'}
                                  disabled={reviewActioning !== null && reviewActioning.id !== row.id}
                                />
                              </Tooltip>
                            </Popconfirm>
                            <Popconfirm
                              title={`Từ chối đề thi "${row.name}"?`}
                              okText="Từ chối" cancelText="Hủy" okButtonProps={{ danger: true }}
                              onConfirm={() => handleReviewDecision(row, 'rejected')}
                            >
                              <Tooltip title="Từ chối">
                                <Button
                                  size="small" type="text" danger icon={<CloseCircleOutlined />} className="cursor-pointer"
                                  loading={reviewActioning?.id === row.id && reviewActioning.action === 'rejected'}
                                  disabled={reviewActioning !== null && reviewActioning.id !== row.id}
                                />
                              </Tooltip>
                            </Popconfirm>
                          </>
                        )}
                        <Tooltip title="Xem đề thi">
                          <Button size="small" type="text" icon={<EyeOutlined className="text-[#2c3e9e]" />}
                            onClick={() => handleOpenView(row)} className="cursor-pointer" />
                        </Tooltip>
                        {canEditExam(row.status) && hasActionPermission(currentUser, 'exams.manage') && (
                          <Tooltip title="Chỉnh sửa">
                            <Button size="small" type="text" icon={<EditOutlined className="text-[#2c3e9e]" />}
                              onClick={() => { setSelectedExam(row); setIsDeRiengLeOpen(true); }} className="cursor-pointer" />
                          </Tooltip>
                        )}
                        {canGenerateVariant(row.status) && hasActionPermission(currentUser, 'exams.generate_variants') && (
                          <Tooltip title="Sinh đề hoán vị">
                            <Button size="small" type="text" icon={<RetweetOutlined className="text-[#2c3e9e]" />}
                              onClick={() => { setSelectedExam(row); setIsSinhHoanViOpen(true); }} className="cursor-pointer" />
                          </Tooltip>
                        )}
                        {getActionMenuItems(row).length > 0 && (
                          <Dropdown menu={{ items: getActionMenuItems(row) }} trigger={['click']} placement="bottomRight">
                            <Button size="small" type="text" icon={<MoreOutlined className="text-[#2c3e9e]" />} className="cursor-pointer" />
                          </Dropdown>
                        )}
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
            <span className="font-extrabold uppercase text-[14px] text-slate-800">Xem đề thi</span>
            {selectedExam && <Tag color="blue" className="rounded-md font-mono m-0">{selectedExam.code}</Tag>}
          </div>
        }
        open={isViewOpen}
        onCancel={() => { setIsViewOpen(false); setViewQuestions([]); }}
        footer={[
          <Button key="close" onClick={() => { setIsViewOpen(false); setViewQuestions([]); }} className="rounded font-semibold text-[14px]">Đóng</Button>
        ]}
        centered
        width={720}
      >
        {selectedExam && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-[14px] flex flex-wrap gap-x-6 gap-y-1">
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

      {/* Modal C: Lịch sử chỉnh sửa — ghép từ lịch sử thẩm định thật của từng câu hỏi thuộc đề */}
      <Modal
        title={
          <span className="font-extrabold uppercase text-[14px] text-slate-800">
            Lịch sử thẩm định & Nhật ký chỉnh sửa đề thi
          </span>
        }
        open={isHistoryOpen}
        onCancel={() => setIsHistoryOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsHistoryOpen(false)} className="rounded-xl font-bold text-[14px] bg-[#0f172a] border-transparent text-white">
            Đóng lịch sử
          </Button>
        ]}
        centered
        width={500}
      >
        <div className="pt-4 max-h-96 overflow-y-auto pr-1">
          {historyLoading ? (
            <div className="py-8 text-center"><Spin /></div>
          ) : historyLogs.length === 0 ? (
            <Empty description="Chưa có lịch sử thẩm định nào cho đề thi này." />
          ) : (
            <Timeline
              className="text-[14px] font-semibold"
              items={historyLogs.map((log, idx) => ({
                color: idx === 0 ? 'green' : 'gray',
                children: (
                  <div className="space-y-1">
                    <div className="text-[14px] text-slate-400 font-bold">{log.timestamp}</div>
                    <div className="text-slate-800">
                      {log.questionCode ? `Câu ${log.questionCode}: ` : ''}{log.action}
                      {log.note ? ` — ${log.note}` : ''}
                    </div>
                    <div className="text-[14px] text-slate-500 font-medium">Bởi nhân sự: {log.actor || 'Hội đồng Chuyên môn'}</div>
                  </div>
                )
              }))}
            />
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

      <ExportAnswerChoiceModal
        open={exportExamTarget !== null}
        onCancel={() => setExportExamTarget(null)}
        onConfirm={(includeAnswers) => {
          const exam = exportExamTarget;
          setExportExamTarget(null);
          if (exam) doExportWord(exam, includeAnswers);
        }}
        targetLabel={exportExamTarget ? `đề ${exportExamTarget.code}` : undefined}
      />
    </div>
  );
}
