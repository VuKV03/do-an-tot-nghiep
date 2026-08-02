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
  Popconfirm,
  Pagination,
  Tabs,
} from 'antd';
import { toast } from '../../../utils/toast';
import {
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  SyncOutlined,
  FileExcelOutlined,
  DownOutlined,
  UpOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import JSZip from 'jszip';
import { Question } from '../../../types';
import { subjectCategoryApi, bankQuestionApi, type SubjectCategoryAPI } from '../../../services/danhMucApi';
import { buildExamDocxBlob, triggerBlobDownload } from '../../../utils/examWordExport';
import { useResizableColumns, ColResizeHandle, ResizableTableStyles, RESIZABLE_TABLE_CLASS, TruncatedText } from '../../../utils/resizableTable';
import { exportToExcel, type ExcelColumn } from '../../../utils/excelExport';
import { hasActionPermission, hasAnyPermission, checkUserPermission } from '../../../utils/permissionUtils';
import { getUserSubjectFilter } from '../../../utils/subjectUtils';
import { compareByPartAndLineNumber } from '../../../utils/examParts';
import ExamContentDisplay from '../quan-ly-de-goc/ExamContentDisplay';
import ExportAnswerChoiceModal from '../../ExportAnswerChoiceModal';

const { RangePicker } = DatePicker;

interface PackageManagementModuleProps {
  initialTab?: 'list' | 'review';
  currentUser?: any;
}

// Gói đề thi hiện chỉ được tạo ra qua "Sinh đề hoán vị" (ModalSinhDeHoanVi.tsx, trong "Quản lý đề
// thi & gói đề") — mỗi lần sinh hoán vị 1 đề gốc tạo ra đúng 1 gói. Màn này chỉ để xem/lọc/thẩm
// định/tải/xóa, không có luồng tạo gói thủ công riêng.
export default function PackageManagementModule({ initialTab, currentUser }: PackageManagementModuleProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'review'>(
    initialTab || (checkUserPermission(currentUser, 'tab-goi-de') ? 'list' : 'review')
  );
  const { colGroup: pkgTableColGroup, startResize: startPkgColResize, totalWidth: pkgTableTotalWidth } = useResizableColumns(
    [40, 48, 140, 200, 100, 100, 130, 140, 100, 120, 140]
  );

  const [packages, setPackages] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<SubjectCategoryAPI[]>([]);
  const [isSubjectRestricted, setIsSubjectRestricted] = useState(false);
  const [matrices, setMatrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgSubject, setPkgSubject] = useState('all');
  const [pkgMatrixId, setPkgMatrixId] = useState('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  const [selectedPkgIds, setSelectedPkgIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Trạng thái đang thao tác 1 gói đề cụ thể (per-row) — tránh 1 boolean chung khiến spinner
  // hiện sai hàng khi nhiều dòng bị thao tác liên tiếp (duyệt/từ chối/cho thi/tắt phát/xóa).
  const [actioning, setActioning] = useState<{ id: string; kind: 'approve' | 'reject' | 'publish' | 'unpublish' | 'delete' | 'toggle_result' } | null>(null);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewPkg, setViewPkg] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewQuestionsByExamId, setViewQuestionsByExamId] = useState<Record<string, Question[]>>({});

  // Đang chờ chọn "Có đáp án"/"Không đáp án" trước khi thực sự xuất file — dùng chung cho cả nút
  // "Tải xuống" cả gói (zip) lẫn "Tải xuống" từng đề riêng trong modal xem chi tiết gói.
  const [pendingExport, setPendingExport] = useState<{ label: string; run: (includeAnswers: boolean) => void } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pkgRes, examRes] = await Promise.all([
        fetch('/api/exams/packages').then(r => r.json()),
        fetch('/api/exams').then(r => r.json()),
      ]);
      if (pkgRes.success) setPackages(pkgRes.data || []);
      if (examRes.success) setExams(examRes.data || []);
    } catch {
      toast.error('Lỗi kết nối khi tải danh sách gói đề.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    subjectCategoryApi.list().then(res => {
      const activeSubjects = (res.data || []).filter((s: any) => s.is_active);
      const { filteredSubjects, isRestricted } = getUserSubjectFilter(activeSubjects, currentUser);
      setSubjects(filteredSubjects as SubjectCategoryAPI[]);
      setIsSubjectRestricted(isRestricted);
    }).catch(() => setSubjects([]));
    // Không có matrixConfigApi dùng chung trong danhMucApi.ts — mô phỏng đúng cách raw-fetch mà
    // ModalSinhDeHoanVi.tsx đang dùng để lấy danh sách ma trận đề.
    fetch('/api/matrix-configs?page=1&pageSize=200')
      .then(r => r.json())
      .then(json => { if (json.success) setMatrices(json.data || []); })
      .catch(() => setMatrices([]));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, pkgSearch, pkgSubject, pkgMatrixId, dateRange]);

  const examsById = useMemo(() => {
    const map = new Map<string, any>();
    exams.forEach(e => map.set(e.id, e));
    return map;
  }, [exams]);

  const matrixNameById = useMemo(() => {
    const map = new Map<string, string>();
    matrices.forEach(m => map.set(m.id, `${m.name} (${m.code})`));
    return map;
  }, [matrices]);

  // 1 gói hoán vị gồm nhiều đề nhưng tất cả cùng số câu/thời gian làm bài (đúng cách
  // ModalSinhDeHoanVi.tsx tạo ra chúng), nên chỉ cần tra đề đầu tiên trong examIds.
  const getPackageStats = (pkg: any) => {
    const firstExam = (pkg.examIds || []).map((id: string) => examsById.get(id)).find(Boolean);
    return {
      totalQuestions: firstExam?.totalQuestions ?? 0,
      duration: firstExam?.duration ?? 0,
    };
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case '1':
      case 'draft':
      case 'new':
        return <Tag color="default" className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">Nháp</Tag>;
      case '2':
      case 'pending':
        return <Tag color="warning" className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">Chờ thẩm định</Tag>;
      case '3':
      case 'approved':
        return <Tag color="success" className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">Đã thẩm định</Tag>;
      case 'active':
        return <Tag color="processing" className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">Đang thi</Tag>;
      case 'inactive':
        return <Tag color="default" className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">Ngừng thi</Tag>;
      case '4':
      case 'rejected':
        return <Tag color="error" className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">Từ chối</Tag>;
      default:
        return <Tag className="rounded-full text-[10px] font-bold uppercase py-0.5 px-2 border-transparent">{status}</Tag>;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case '1': case 'draft': case 'new': return 'Nháp';
      case '2': case 'pending': return 'Chờ thẩm định';
      case '3': case 'approved': return 'Đã thẩm định';
      case 'active': return 'Đang phát';
      case 'inactive': return 'Ngừng phát';
      case '4': case 'rejected': return 'Từ chối';
      default: return status;
    }
  };

  const filteredListPackages = useMemo(() => {
    const kw = pkgSearch.trim().toLowerCase();
    return packages.filter(p => {
      const matchesSearch = !kw || (p.name || '').toLowerCase().includes(kw) || (p.code || '').toLowerCase().includes(kw);
      const matchesSubject = pkgSubject === 'all'
        ? (!isSubjectRestricted || subjects.some(s => s.name === p.subject))
        : p.subject === pkgSubject;
      const matchesMatrix = pkgMatrixId === 'all' || p.matrix_id === pkgMatrixId;
      const matchesDate = !dateRange || !dateRange[0] || !dateRange[1] || (
        // dayjs core (không cần plugin isBetween): tạo >= đầu ngày bắt đầu và <= cuối ngày kết thúc.
        !!p.createdAt
        && !dayjs(p.createdAt).isBefore(dateRange[0].startOf('day'))
        && !dayjs(p.createdAt).isAfter(dateRange[1].endOf('day'))
      );
      return matchesSearch && matchesSubject && matchesMatrix && matchesDate;
    });
  }, [packages, pkgSearch, pkgSubject, pkgMatrixId, dateRange]);

  const filteredReviewPackages = useMemo(() => {
    // Hiện đủ 3 trạng thái đã gửi thẩm định (Chờ thẩm định/Đã thẩm định/Từ chối) — trước đây chỉ
    // lọc "pending", ẩn mất các gói đã thẩm định xong khỏi tab này. "draft"/"1" (Nháp, chưa gửi
    // thẩm định) vẫn cố tình loại trừ — khớp getStatusTag/getStatusLabel ở trên.
    const REVIEWABLE_STATUSES = ['pending', '2', 'approved', '3', 'rejected', '4'];
    return packages.filter(p => {
      const isReviewable = REVIEWABLE_STATUSES.includes(p.status);
      const isAllowedSubject = !isSubjectRestricted || subjects.some(s => s.name === p.subject);
      return isReviewable && isAllowedSubject;
    });
  }, [packages, isSubjectRestricted, subjects]);

  const currentRows = activeTab === 'list' ? filteredListPackages : filteredReviewPackages;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentRows.slice(start, start + pageSize);
  }, [currentRows, currentPage, pageSize]);

  const handleReviewDecision = async (pkg: any, status: 'approved' | 'rejected') => {
    setActioning({ id: pkg.id, kind: status === 'approved' ? 'approve' : 'reject' });
    try {
      const res = await fetch(`/api/exams/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(status === 'approved' ? `Đã duyệt gói đề "${pkg.name}".` : `Đã từ chối gói đề "${pkg.name}".`);
        fetchData();
      } else {
        toast.error(json.error || 'Lỗi khi cập nhật kết quả thẩm định.');
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật kết quả thẩm định.');
    } finally {
      setActioning(null);
    }
  };

  const handlePublishPackage = async (pkg: any) => {
    setActioning({ id: pkg.id, kind: 'publish' });
    try {
      const res = await fetch(`/api/exams/packages/${pkg.id}/publish`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || `Đã cho thi gói đề "${pkg.name}".`);
        fetchData();
      } else {
        toast.error(json.detail || json.error || 'Lỗi khi cho thi gói đề.');
      }
    } catch {
      toast.error('Lỗi kết nối khi cho thi gói đề.');
    } finally {
      setActioning(null);
    }
  };

  const handleUnpublishPackage = async (pkg: any) => {
    setActioning({ id: pkg.id, kind: 'unpublish' });
    try {
      const res = await fetch(`/api/exams/packages/${pkg.id}/unpublish`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || `Đã tắt cho thi gói đề "${pkg.name}".`);
        fetchData();
      } else {
        toast.error(json.detail || json.error || 'Lỗi khi tắt cho thi gói đề.');
      }
    } catch {
      toast.error('Lỗi kết nối khi tắt cho thi gói đề.');
    } finally {
      setActioning(null);
    }
  };

  const handleToggleShowResult = async (pkg: any) => {
    setActioning({ id: pkg.id, kind: 'toggle_result' });
    try {
      const res = await fetch(`/api/exams/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_show_result: !pkg.is_show_result }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Đã ${!pkg.is_show_result ? 'bật' : 'tắt'} hiển thị kết quả cho gói đề "${pkg.name}".`);
        fetchData();
      } else {
        toast.error(json.error || 'Lỗi khi cập nhật trạng thái hiển thị kết quả.');
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật trạng thái hiển thị kết quả.');
    } finally {
      setActioning(null);
    }
  };

  const handleDeletePackage = (pkg: any) => {
    const isActive = pkg.status === 'active';

    Modal.confirm({
      title: isActive
        ? `Cảnh báo: Gói đề "${pkg.name}" đang được cho thi!`
        : `Xác nhận xóa gói đề: "${pkg.name}"?`,
      content: isActive
        ? 'Việc xóa gói đề đang cho thi có thể ảnh hưởng nghiêm trọng đến kỳ thi đang diễn ra. Bạn có chắc chắn muốn xóa (làm mất toàn bộ dữ liệu thi của thí sinh đang thi)?'
        : undefined,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        setActioning({ id: pkg.id, kind: 'delete' });
        try {
          const res = await fetch(`/api/exams/packages/${pkg.id}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) {
            toast.success(json.message);
            setSelectedPkgIds(prev => prev.filter(x => x !== pkg.id));
            fetchData();
          } else {
            toast.error(json.error || 'Không thể xóa gói đề.');
          }
        } catch {
          toast.error('Lỗi kết nối khi xóa gói đề.');
        } finally {
          setActioning(null);
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedPkgIds.length === 0) return;

    const selectedPackages = packages.filter(p => selectedPkgIds.includes(p.id));
    const invalidPackages = selectedPackages.filter(p => !['2', 'pending', '3', 'approved', 'inactive', 'active'].includes(p.status));

    if (invalidPackages.length > 0) {
      toast.error('Chỉ được xóa các gói đề ở trạng thái: Chờ thẩm định, Đã thẩm định, Ngừng phát hoặc Đang phát.');
      return;
    }

    const hasActive = selectedPackages.some(p => p.status === 'active');

    Modal.confirm({
      title: `Xác nhận xóa ${selectedPkgIds.length} gói đề đã chọn?`,
      content: hasActive
        ? 'Trong danh sách chọn có chứa gói đề ĐANG PHÁT. Việc xóa có thể ảnh hưởng đến kỳ thi. Bạn có chắc chắn muốn xóa?'
        : 'Hành động này sẽ gỡ bỏ vĩnh viễn các gói đề được chọn.',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          for (const id of selectedPkgIds) {
            await fetch(`/api/exams/packages/${id}`, { method: 'DELETE' });
          }
          toast.success('Đã xóa thành công các gói đề được chọn.');
          setSelectedPkgIds([]);
          fetchData();
        } catch {
          toast.error('Có lỗi xảy ra khi xóa hàng loạt.');
        }
      },
    });
  };

  // Tải toàn bộ đề trong gói dưới dạng .docx thật, nén trong 1 file zip — mô phỏng đúng "Tải
  // xuống tất cả đề" của ModalSinhDeHoanVi.tsx. Bấm nút mở modal hỏi Có/Không đáp án trước — xem
  // pendingExport bên dưới.
  const doDownloadPackage = async (pkg: any, includeAnswers: boolean) => {
    const examIds: string[] = pkg.examIds || [];
    if (examIds.length === 0) {
      toast.error('Gói đề này chưa có đề thi nào.');
      return;
    }
    toast.loading({ content: `Đang chuẩn bị tải gói đề ${pkg.code}...`, key: 'pkg-dl' });
    try {
      const res = await bankQuestionApi.list();
      const allQuestions = res.data || [];
      const zip = new JSZip();
      await Promise.all(examIds.map(async (examId) => {
        const exam = examsById.get(examId);
        if (!exam) return;
        const qs: Question[] = allQuestions
          .filter(q => q.examId === examId)
          .map((q): Question => ({
            id: q.id, code: q.code, text: q.text, type: q.type, level: q.level, status: q.status,
            subject: q.subject, grade: q.grade, topicId: q.topicId || '', topicName: q.topicName || 'Chưa phân loại',
            subTopicName: q.subTopicName || '', options: q.options, correctAnswer: q.correctAnswer,
            statements: q.statements, creator: q.creator, createdAt: q.createdAt, nangLucId: q.nangLucId,
            lineNumber: q.lineNumber,
          }))
          .sort(compareByPartAndLineNumber);
        const blob = await buildExamDocxBlob(exam.name, exam.subject, exam.grade, qs, exam.duration || 90, includeAnswers);
        zip.file(`${exam.code}.docx`, blob);
      }));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      triggerBlobDownload(zipBlob, `${pkg.code}_GoiDeThi`, 'zip');
      toast.success({ content: `Đã tải gói đề ${pkg.code}!`, key: 'pkg-dl', duration: 3 });
    } catch {
      toast.error({ content: 'Lỗi khi tải gói đề.', key: 'pkg-dl' });
    }
  };
  const handleDownloadPackage = (pkg: any) =>
    setPendingExport({ label: `gói đề ${pkg.code}`, run: (includeAnswers) => doDownloadPackage(pkg, includeAnswers) });

  // Xem chi tiết gói đề — tải nội dung câu hỏi thật của TỪNG đề trong gói (đề gốc + các đề hoán
  // vị), UI dạng Tabs giống hệt "Sinh đề hoán vị" (ModalSinhDeHoanVi.tsx): mỗi tab 1 đề, render
  // qua ExamContentDisplay. examIds[0] luôn là đề gốc — đúng theo cách ModalSinhDeHoanVi.tsx lưu
  // package (`examIds: [exam.id, ...newExamIds]`), các phần tử còn lại là đề hoán vị.
  const handleOpenView = async (pkg: any) => {
    setViewPkg(pkg);
    setIsViewOpen(true);
    setViewLoading(true);
    try {
      const res = await bankQuestionApi.list();
      const allQuestions = res.data || [];
      const map: Record<string, Question[]> = {};
      (pkg.examIds || []).forEach((examId: string) => {
        map[examId] = allQuestions
          .filter(q => q.examId === examId)
          .map((q): Question => ({
            id: q.id, code: q.code, text: q.text, type: q.type, level: q.level, status: q.status,
            subject: q.subject, grade: q.grade, topicId: q.topicId || '', topicName: q.topicName || 'Chưa phân loại',
            subTopicName: q.subTopicName || '', options: q.options, correctAnswer: q.correctAnswer,
            statements: q.statements, creator: q.creator, createdAt: q.createdAt, nangLucId: q.nangLucId,
            lineNumber: q.lineNumber,
          }))
          .sort(compareByPartAndLineNumber);
      });
      setViewQuestionsByExamId(map);
    } catch {
      toast.error('Không tải được nội dung các đề trong gói.');
    } finally {
      setViewLoading(false);
    }
  };

  const handleCloseView = () => {
    setIsViewOpen(false);
    setViewPkg(null);
    setViewQuestionsByExamId({});
  };

  const doDownloadSingleExam = async (exam: any, qs: Question[], includeAnswers: boolean) => {
    const blob = await buildExamDocxBlob(exam.name, exam.subject, exam.grade, qs, exam.duration || 90, includeAnswers);
    triggerBlobDownload(blob, exam.code, 'docx');
  };
  const handleDownloadSingleExam = (exam: any, qs: Question[]) =>
    setPendingExport({ label: `đề ${exam.code}`, run: (includeAnswers) => doDownloadSingleExam(exam, qs, includeAnswers) });

  const packageExcelColumns: ExcelColumn<any>[] = [
    { header: 'STT', accessor: (_row, i) => i + 1, width: 6, align: 'center' },
    { header: 'Mã gói đề', accessor: row => row.code, width: 16 },
    { header: 'Tên gói đề', accessor: row => row.name, width: 30 },
    { header: 'Môn học', accessor: row => row.subject, width: 14, align: 'center' },
    { header: 'Tổng số đề', accessor: row => row.examsCount || 0, width: 12, align: 'center' },
    { header: 'Số câu hỏi trong đề', accessor: row => getPackageStats(row).totalQuestions, width: 16, align: 'center' },
    { header: 'Thời gian làm bài (phút)', accessor: row => getPackageStats(row).duration, width: 18, align: 'center' },
    { header: 'Ngày tạo', accessor: row => row.createdAt ? row.createdAt.slice(0, 10) : '', width: 14, align: 'center' },
    { header: 'Trạng thái', accessor: row => getStatusLabel(row.status), width: 16, align: 'center' },
  ];

  const handleExportExcel = () => {
    if (currentRows.length === 0) {
      toast.warning('Không có dữ liệu để xuất Excel.');
      return;
    }
    const fileName = `GoiDeThi_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(currentRows, packageExcelColumns, fileName, 'Gói đề thi');
    toast.success('Xuất báo cáo Excel thành công!');
  };

  return (
    <div className="pt-3 px-6 pb-6 flex flex-col gap-4 bg-white min-h-[calc(100vh-200px)]" id="package-management-layout-facade">
      <ResizableTableStyles />
      {/* Tab Headers */}
      <div className="flex gap-1 border-b border-gray-300 relative select-none">
        {checkUserPermission(currentUser, 'tab-goi-de') && (
          <button
            onClick={() => { setActiveTab('list'); setSelectedPkgIds([]); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'list'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
          >
            Gói đề
          </button>
        )}
        {checkUserPermission(currentUser, 'tab-tham-dinh-goi-de') && (
          <button
            onClick={() => { setActiveTab('review'); setSelectedPkgIds([]); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'review'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
          >
            Thẩm định gói đề
          </button>
        )}
      </div>

      {/* Filters Panel */}
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Tên gói đề</label>
                <Input
                  placeholder="Nhập"
                  className="rounded border-slate-300 text-xs"
                  value={pkgSearch}
                  onChange={e => setPkgSearch(e.target.value)}
                  allowClear
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Môn học</label>
                <Select
                  value={pkgSubject}
                  onChange={setPkgSubject}
                  className="w-full text-xs"
                  options={[
                    { value: 'all', label: 'Tất cả' },
                    ...subjects.map(s => ({ value: s.name, label: s.name }))
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ma trận đề</label>
                <Select
                  value={pkgMatrixId}
                  onChange={setPkgMatrixId}
                  className="w-full text-xs"
                  options={[{ value: 'all', label: 'Tất cả' }, ...matrices.map(m => ({ value: m.id, label: `${m.name} (${m.code})` }))]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ngày tạo</label>
                <RangePicker
                  size="small"
                  className="w-full"
                  placeholder={['Bắt đầu', 'Kết thúc']}
                  value={dateRange}
                  onChange={v => setDateRange(v as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
                />
              </div>
            </div>
            <div className="flex justify-center">
              <Button
                type="primary"
                className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded px-8 hover:bg-[#243590] cursor-pointer"
                onClick={() => setCurrentPage(1)}
              >
                Tìm kiếm
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Results Board */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-[#1a3c8b] font-bold text-sm italic m-0">Kết quả tìm kiếm</h3>
          <Space size={8}>
            {activeTab === 'list' && hasActionPermission(currentUser, 'exams.manage') && (
              <Button
                danger
                onClick={handleBatchDelete}
                disabled={selectedPkgIds.length === 0}
                className="font-semibold text-xs rounded cursor-pointer"
              >
                Xóa
              </Button>
            )}
            {activeTab === 'review' && hasActionPermission(currentUser, 'exams.export') && (
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={handleExportExcel}
                className="!bg-green-600 !border-green-600 !text-white font-semibold text-xs rounded hover:!bg-green-700 cursor-pointer"
              >
                Xuất Excel
              </Button>
            )}
          </Space>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center">
              <Spin indicator={<SyncOutlined className="text-2xl" spin />} />
              <p className="text-xs text-slate-400 font-bold mt-2">Đang tải dữ liệu...</p>
            </div>
          ) : currentRows.length === 0 ? (
            <Empty description="Không có gói đề nào." className="py-12" />
          ) : (
            <table style={{ minWidth: pkgTableTotalWidth }} className={`w-full text-xs font-medium text-slate-700 border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}>
              {pkgTableColGroup}
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
                  <th className="relative py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      className="cursor-pointer accent-[#2c3e9e]"
                      checked={paginatedRows.length > 0 && paginatedRows.every(p => selectedPkgIds.includes(p.id))}
                      onChange={() => {
                        const allSelected = paginatedRows.every(p => selectedPkgIds.includes(p.id));
                        if (allSelected) setSelectedPkgIds(prev => prev.filter(id => !paginatedRows.map(p => p.id).includes(id)));
                        else setSelectedPkgIds(prev => Array.from(new Set([...prev, ...paginatedRows.map(p => p.id)])));
                      }}
                    />
                    <ColResizeHandle onMouseDown={startPkgColResize(0)} />
                  </th>
                  <th className="relative py-3 px-3 text-center font-semibold">STT<ColResizeHandle onMouseDown={startPkgColResize(1)} /></th>
                  <th className="relative py-3 px-3 text-left font-semibold">Mã gói đề<ColResizeHandle onMouseDown={startPkgColResize(2)} /></th>
                  <th className="relative py-3 px-3 text-left font-semibold">Tên gói đề<ColResizeHandle onMouseDown={startPkgColResize(3)} /></th>
                  <th className="relative py-3 px-3 text-center font-semibold">Môn học<ColResizeHandle onMouseDown={startPkgColResize(4)} /></th>
                  <th className="relative py-3 px-3 text-center font-semibold">Tổng số đề<ColResizeHandle onMouseDown={startPkgColResize(5)} /></th>
                  <th className="relative py-3 px-3 text-center font-semibold">Số câu hỏi trong đề<ColResizeHandle onMouseDown={startPkgColResize(6)} /></th>
                  <th className="relative py-3 px-3 text-center font-semibold">Thời gian làm bài (phút)<ColResizeHandle onMouseDown={startPkgColResize(7)} /></th>
                  <th className="relative py-3 px-3 text-center font-semibold">Ngày tạo<ColResizeHandle onMouseDown={startPkgColResize(8)} /></th>
                  <th className="relative py-3 px-3 text-center font-semibold">Trạng thái<ColResizeHandle onMouseDown={startPkgColResize(9)} /></th>
                  <th className="relative py-3 px-3 text-center font-semibold">Thao tác<ColResizeHandle onMouseDown={startPkgColResize(10)} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row, idx) => {
                  const stats = getPackageStats(row);
                  return (
                    <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${selectedPkgIds.includes(row.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          className="cursor-pointer accent-[#2c3e9e]"
                          checked={selectedPkgIds.includes(row.id)}
                          onChange={() => setSelectedPkgIds(prev => prev.includes(row.id) ? prev.filter(id => id !== row.id) : [...prev, row.id])}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400 font-bold text-[11px]">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 border rounded text-[10px]">{row.code}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <TruncatedText text={row.name} className="font-semibold text-slate-800 text-[11px]" />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Tag color="blue" className="rounded-md font-bold text-[9px] m-0 border-transparent">{row.subject}</Tag>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-[11px]">{row.examsCount || 0}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border text-[11px]">{stats.totalQuestions}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-[11px]">{stats.duration}</td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-slate-500">{row.createdAt ? row.createdAt.slice(0, 10) : ''}</td>
                      <td className="py-2.5 px-3 text-center">{getStatusTag(row.status)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Space size={2}>
                          {activeTab === 'review' && hasActionPermission(currentUser, 'exams.approve') && (
                            <>
                              <Popconfirm
                                title={`Duyệt gói đề "${row.name}"?`}
                                okText="Duyệt" cancelText="Hủy"
                                onConfirm={() => handleReviewDecision(row, 'approved')}
                              >
                                <Tooltip title="Duyệt (Đã thẩm định)">
                                  <Button
                                    size="small" type="text" icon={<CheckCircleOutlined className="text-green-600" />} className="cursor-pointer"
                                    loading={actioning?.id === row.id && actioning.kind === 'approve'}
                                    disabled={actioning !== null && actioning.id !== row.id}
                                  />
                                </Tooltip>
                              </Popconfirm>
                              <Popconfirm
                                title={`Từ chối gói đề "${row.name}"?`}
                                okText="Từ chối" cancelText="Hủy" okButtonProps={{ danger: true }}
                                onConfirm={() => handleReviewDecision(row, 'rejected')}
                              >
                                <Tooltip title="Từ chối">
                                  <Button
                                    size="small" type="text" danger icon={<CloseCircleOutlined />} className="cursor-pointer"
                                    loading={actioning?.id === row.id && actioning.kind === 'reject'}
                                    disabled={actioning !== null && actioning.id !== row.id}
                                  />
                                </Tooltip>
                              </Popconfirm>
                            </>
                          )}
                          {(row.status === '3' || row.status === 'approved' || row.status === 'inactive') && activeTab === 'list' && hasActionPermission(currentUser, 'exams.test_run') && (
                            <Popconfirm
                              title={`Cho thi gói đề "${row.name}"?`}
                              okText="Cho thi" cancelText="Hủy"
                              onConfirm={() => handlePublishPackage(row)}
                            >
                              <Tooltip title="Cho thi">
                                <Button
                                  size="small" type="text" icon={<PlayCircleOutlined className="text-green-600" />} className="cursor-pointer"
                                  loading={actioning?.id === row.id && actioning.kind === 'publish'}
                                  disabled={actioning !== null && actioning.id !== row.id}
                                />
                              </Tooltip>
                            </Popconfirm>
                          )}
                          {row.status === 'active' && activeTab === 'list' && hasActionPermission(currentUser, 'exams.test_run') && (
                            <Popconfirm
                              title={`Tắt cho thi gói đề "${row.name}"?`}
                              okText="Tắt cho thi" cancelText="Hủy"
                              onConfirm={() => handleUnpublishPackage(row)}
                            >
                              <Tooltip title="Tắt cho thi">
                                <Button
                                  size="small" type="text" icon={<PauseCircleOutlined className="text-orange-500" />} className="cursor-pointer"
                                  loading={actioning?.id === row.id && actioning.kind === 'unpublish'}
                                  disabled={actioning !== null && actioning.id !== row.id}
                                />
                              </Tooltip>
                            </Popconfirm>
                          )}
                          <Tooltip title="Xem chi tiết gói đề">
                            <Button size="small" type="text" icon={<EyeOutlined className="text-[#2c3e9e]" />}
                              onClick={() => handleOpenView(row)} className="cursor-pointer" />
                          </Tooltip>
                          {hasActionPermission(currentUser, 'exams.manage') && (
                            <Popconfirm
                              title={`Bạn muốn ${row.is_show_result ? 'ẩn' : 'hiển thị'} kết quả cho học sinh?`}
                              okText="Đồng ý" cancelText="Hủy"
                              onConfirm={() => handleToggleShowResult(row)}
                            >
                              <Tooltip title={row.is_show_result ? "Đang cho xem kết quả bài làm (Nhấn để ẩn)" : "Đang ẩn kết quả bài làm (Nhấn để cho xem)"}>
                                <Button
                                  size="small"
                                  type="text"
                                  icon={row.is_show_result ? <UnlockOutlined className="text-green-600" /> : <LockOutlined className="text-red-500" />}
                                  className="cursor-pointer"
                                  loading={actioning?.id === row.id && actioning.kind === 'toggle_result'}
                                  disabled={actioning !== null && actioning.id !== row.id}
                                />
                              </Tooltip>
                            </Popconfirm>
                          )}
                          {hasActionPermission(currentUser, 'exams.export') && (
                            <Tooltip title="Tải gói đề thi">
                              <Button size="small" type="text" icon={<DownloadOutlined className="text-[#2c3e9e]" />}
                                onClick={() => handleDownloadPackage(row)} className="cursor-pointer" />
                            </Tooltip>
                          )}
                          {hasActionPermission(currentUser, 'exams.manage') && ['2', 'pending', '3', 'approved', 'inactive', 'active'].includes(row.status) && (
                            <Tooltip title="Xóa">
                              <Button
                                size="small" type="text" danger icon={<DeleteOutlined />} className="cursor-pointer"
                                onClick={() => handleDeletePackage(row)}
                                loading={actioning?.id === row.id && actioning.kind === 'delete'}
                                disabled={actioning !== null && actioning.id !== row.id}
                              />
                            </Tooltip>
                          )}
                        </Space>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {currentRows.length > 0 && (
          <div className="flex items-center justify-end px-5 py-3 border-t border-slate-200">
            <Pagination
              size="small"
              current={currentPage}
              pageSize={pageSize}
              total={currentRows.length}
              showSizeChanger
              pageSizeOptions={[10, 20, 50]}
              showTotal={total => `${total} bản ghi`}
              onChange={(page, size) => { setCurrentPage(page); setPageSize(size); }}
            />
          </div>
        )}
      </div>

      {/* Modal: Xem chi tiết gói đề — đề gốc + các đề hoán vị, UI dạng Tabs giống Sinh đề hoán vị */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="font-extrabold uppercase text-[12px] text-slate-800">Chi tiết gói đề</span>
            {viewPkg && <Tag color="blue" className="rounded-md font-mono m-0">{viewPkg.code}</Tag>}
          </div>
        }
        open={isViewOpen}
        onCancel={handleCloseView}
        footer={[
          <Button key="close" onClick={handleCloseView} className="rounded font-semibold text-xs">Đóng</Button>,
        ]}
        centered
        width={900}
      >
        {viewPkg && (
          <div className="pt-1 text-xs">
            <div className="text-slate-500 mb-3">Gói đề: <strong>{viewPkg.name}</strong> ({viewPkg.code})</div>
            {viewLoading ? (
              <div className="py-16 text-center"><Spin /></div>
            ) : (viewPkg.examIds || []).length === 0 ? (
              <Empty description="Gói đề này chưa có đề thi nào." className="py-12" />
            ) : (
              <Tabs
                size="small"
                items={(viewPkg.examIds || []).map((examId: string, idx: number) => {
                  const exam = examsById.get(examId);
                  const qs = viewQuestionsByExamId[examId] || [];
                  const label = idx === 0
                    ? `Đề gốc${exam ? ` (${exam.code})` : ''}`
                    : `Đề hoán vị ${idx}${exam ? ` (${exam.code})` : ''}`;
                  return {
                    key: examId,
                    label,
                    children: (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] text-slate-500">
                            {exam ? <>Trạng thái: {getStatusTag(exam.status)}</> : 'Không tìm thấy dữ liệu đề này.'}
                          </div>
                          {exam && (
                            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadSingleExam(exam, qs)} disabled={qs.length === 0} className="rounded text-xs">
                              Tải xuống
                            </Button>
                          )}
                        </div>
                        <div className="border border-slate-200 rounded p-2">
                          <ExamContentDisplay questions={qs} allowEdit={false} />
                        </div>
                      </div>
                    ),
                  };
                })}
              />
            )}
          </div>
        )}
      </Modal>

      <ExportAnswerChoiceModal
        open={pendingExport !== null}
        onCancel={() => setPendingExport(null)}
        onConfirm={(includeAnswers) => {
          const action = pendingExport;
          setPendingExport(null);
          action?.run(includeAnswers);
        }}
        targetLabel={pendingExport?.label}
      />
    </div>
  );
}
