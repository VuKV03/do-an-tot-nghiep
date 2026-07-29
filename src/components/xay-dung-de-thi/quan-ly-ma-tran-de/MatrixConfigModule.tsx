import React, { useState, useEffect, useMemo } from 'react';
import {
  Input,
  InputNumber,
  Select,
  Button,
  Table,
  Modal,
  Spin,
  Badge,
  Tooltip,
  Steps,
  Popconfirm,
  Space,
  Empty
} from 'antd';
import { toast } from '../../../utils/toast';
import {
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  CalculatorOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  ProjectOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ArrowLeftOutlined,
  CheckCircleTwoTone,
  WarningOutlined,
  SearchOutlined,
  SlidersOutlined,
  UpOutlined,
  DownOutlined,
  SendOutlined
} from '@ant-design/icons';
import { MatrixConfig, MatrixRow, Question, SubjectOption, GradeOption, TopicNode } from '../../../types';
import { GRADES, TOPICS_TREE } from '../../../data';
import CreateMatrixForm from './CreateMatrixForm';
import { subjectCategoryApi } from '../../../services/danhMucApi.ts';
import { useResizableColumns, ColResizeHandle, ResizableTableStyles, RESIZABLE_TABLE_CLASS, TruncatedText } from '../../../utils/resizableTable';
import { exportToExcel, type ExcelColumn } from '../../../utils/excelExport';
import { hasActionPermission, hasAnyPermission, checkUserPermission } from '../../../utils/permissionUtils';
import { getUserSubjectFilter } from '../../../utils/subjectUtils';

const NAME_MAX_LENGTH = 255;

export default function MatrixConfigModule({ initialTab, currentUser }: { initialTab?: 'list' | 'evaluation', currentUser?: any }) {
  // Real Môn học list fetched from database API
  const [dbSubjects, setDbSubjects] = useState<{ id: string; code: string; name: string }[]>([]);
  const [allowedSubjects, setAllowedSubjects] = useState<{ id: string; code: string; name: string }[]>([]);
  const [isSubjectRestricted, setIsSubjectRestricted] = useState(false);
  const [isSubjectsLoaded, setIsSubjectsLoaded] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await subjectCategoryApi.list();
        if (res && res.data) {
          const activeSubjects = res.data.filter((item: any) => item.is_active);
          setDbSubjects(activeSubjects);

          const { filteredSubjects, isRestricted } = getUserSubjectFilter(activeSubjects, currentUser);
          setAllowedSubjects(filteredSubjects as any[]);
          setIsSubjectRestricted(isRestricted);

          if (isRestricted && filteredSubjects.length > 0) {
            // Không gán cứng môn học đầu tiên nữa để hiển thị "Tất cả" các môn được phân công
            // setFilterSubject(filteredSubjects[0].name);
            // setEvalFilterSubject(filteredSubjects[0].name);
          }
        }
      } catch (err) {
        console.error('Không thể tải danh sách môn thi:', err);
      } finally {
        setIsSubjectsLoaded(true);
      }
    };
    fetchSubjects();
  }, [currentUser]);

  // View mode: 'list' | 'create'
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [editingMatrixId, setEditingMatrixId] = useState<string | undefined>(undefined);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'list' | 'evaluation'>(initialTab || 'list');
  const { colGroup: matrixTableColGroup, startResize: startMatrixColResize, totalWidth: matrixTableTotalWidth } = useResizableColumns(
    [40, 56, 130, 220, 140, 100, 100, 140, 120, 120]
  );
  const { colGroup: evalMatrixTableColGroup, startResize: startEvalMatrixColResize, totalWidth: evalMatrixTableTotalWidth } = useResizableColumns(
    [40, 56, 130, 220, 140, 100, 100, 140, 120, 120]
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else {
      if (checkUserPermission(currentUser, 'tab-ma-tran-de')) {
        setActiveTab('list');
      } else if (checkUserPermission(currentUser, 'tab-tham-dinh-ma-tran-de')) {
        setActiveTab('evaluation');
      }
    }
  }, [initialTab, currentUser]);

  // List Searching & Filtering states
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Evaluation states
  const [evalIsSearchExpanded, setEvalIsSearchExpanded] = useState(true);
  const [evalSearchText, setEvalSearchText] = useState('');
  const [evalFilterSubject, setEvalFilterSubject] = useState<string>('all');

  const [evalTableData, setEvalTableData] = useState<MatrixTableDataRow[]>([]);
  const [evalTableTotal, setEvalTableTotal] = useState(0);
  const [evalCurrentPage, setEvalCurrentPage] = useState(1);
  const [evalPageSize, setEvalPageSize] = useState(10);
  const [evalSelectedRowIds, setEvalSelectedRowIds] = useState<string[]>([]);
  const [evalTableLoading, setEvalTableLoading] = useState(false);

  // Review popup modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTargetRecord, setReviewTargetRecord] = useState<MatrixTableDataRow | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isBatchReview, setIsBatchReview] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // === API-driven table state ===
  interface MatrixTableDataRow {
    id: string;
    code: string;
    name: string;
    subject: string;
    totalScore: number;
    totalQuestions: number;
    duration: number;
    status: string;
    createdAt: string;
  }
  const [tableData, setTableData] = useState<MatrixTableDataRow[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableTotalRows, setTableTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  // Đang xóa 1 ma trận cụ thể (per-row) — tránh 1 boolean chung khiến spinner hiện sai hàng
  // khi nhiều dòng bị xóa liên tiếp.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch data from API
  const fetchMatrixList = async (page = currentPage, size = pageSize) => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(size));
      if (searchText.trim()) params.set('search', searchText.trim());
      if (filterSubject !== 'all') params.set('subject', filterSubject);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const res = await fetch(`/api/matrix-configs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTableData(json.data);
        setTableTotalRows(json.total);
        setCurrentPage(json.page);
      }
    } catch (err) {
      toast.error('Lỗi kết nối API khi tải danh sách ma trận.');
    } finally {
      setTableLoading(false);
    }
  };

  // Fetch evaluation list from API
  const fetchEvalList = async (page = evalCurrentPage, size = evalPageSize) => {
    setEvalTableLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(size));
      if (evalSearchText.trim()) params.set('search', evalSearchText.trim());
      if (evalFilterSubject !== 'all') params.set('subject', evalFilterSubject);
      params.set('status', 'pending');

      const res = await fetch(`/api/matrix-configs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setEvalTableData(json.data);
        setEvalTableTotal(json.total);
        setEvalCurrentPage(json.page);
      }
    } catch (err) {
      toast.error('Lỗi kết nối API khi tải danh sách thẩm định.');
    } finally {
      setEvalTableLoading(false);
    }
  };

  // Load on mount and react to tab switches
  useEffect(() => {
    if (!isSubjectsLoaded) return;
    if (activeTab === 'list') {
      fetchMatrixList(1, pageSize);
      setSelectedRowIds([]);
    } else {
      fetchEvalList(1, evalPageSize);
      setEvalSelectedRowIds([]);
    }
  }, [activeTab, isSubjectsLoaded]);

  // Handle search button click
  const handleSearchClick = () => {
    setCurrentPage(1);
    fetchMatrixList(1, pageSize);
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedRowIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 bản ghi để xóa.');
      return;
    }
    Modal.confirm({
      title: `Xác nhận xóa ${selectedRowIds.length} bản ghi?`,
      content: 'Hành động này không thể hoàn tác.',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          const res = await fetch('/api/matrix-configs', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedRowIds }),
          });
          const json = await res.json();
          if (json.success) {
            toast.success(json.message);
            setSelectedRowIds([]);
            fetchMatrixList(1, pageSize);
          } else {
            toast.error(json.error);
          }
        } catch {
          toast.error('Lỗi kết nối API khi xóa.');
        }
      }
    });
  };

  // Handle single row delete
  const handleDeleteRow = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/matrix-configs/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchMatrixList(currentPage, pageSize);
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error('Lỗi kết nối API khi xóa.');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle single row send to evaluation
  const handleSendToEvaluation = async (id: string) => {
    try {
      const res = await fetch('/api/matrix-configs/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          ids: [id]
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Đã gửi ma trận đề đi thẩm định thành công!');
        setActiveTab('evaluation');
      } else {
        toast.error(json.error || 'Lỗi khi gửi thẩm định.');
      }
    } catch {
      toast.error('Lỗi kết nối API khi gửi thẩm định.');
    }
  };

  // Handle confirm sending to evaluation dialog
  const handleConfirmSendToEvaluation = (row: MatrixTableDataRow) => {
    Modal.confirm({
      title: 'Xác nhận gửi thẩm định',
      content: (
        <div className="text-xs text-slate-600">
          Bạn có chắc chắn muốn gửi ma trận đề <strong className="text-slate-800">"{row.name}"</strong> (Mã: {row.code}) đi thẩm định/phản biện không?
        </div>
      ),
      okText: 'Xác nhận gửi',
      cancelText: 'Hủy',
      centered: true,
      onOk: async () => {
        await handleSendToEvaluation(row.id);
      }
    });
  };

  // Checkbox helpers
  const isAllSelected = tableData.length > 0 && tableData.every(r => selectedRowIds.includes(r.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(tableData.map(r => r.id));
    }
  };
  const toggleSelectRow = (id: string) => {
    setSelectedRowIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Status tag helper — dùng span tự style (thay vì màu preset của antd Tag, viền quá mờ) để
  // kiểm soát viền rõ nét + kích thước cố định + căn giữa chữ đồng nhất giữa các trạng thái.
  const STATUS_TAG_BASE = "rounded text-[11px] font-semibold inline-flex items-center justify-center w-28 h-6 text-center leading-none border";
  const STATUS_TAG_COLORS: Record<string, string> = {
    approved: "bg-green-50 text-green-700 border-green-400",
    rejected: "bg-red-50 text-red-700 border-red-400",
    new: "bg-slate-100 text-slate-600 border-slate-300",
    pending: "bg-amber-50 text-amber-700 border-amber-400",
  };
  const STATUS_TAG_LABELS: Record<string, string> = {
    approved: "Đã thẩm định",
    rejected: "Từ chối",
    new: "Nháp",
    pending: "Chờ thẩm định",
  };
  const renderStatusTag = (status: string) => (
    <span className={`${STATUS_TAG_BASE} ${STATUS_TAG_COLORS[status] || "bg-slate-100 text-slate-600 border-slate-300"}`}>
      {STATUS_TAG_LABELS[status] || status}
    </span>
  );

  // Pagination helpers
  const totalPages = Math.ceil(tableTotalRows / pageSize);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchMatrixList(page, pageSize);
  };
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    fetchMatrixList(1, size);
  };

  // Evaluation handlers and sorting
  const sortedEvalData = useMemo(() => {
    return [...evalTableData].sort((a, b) => {
      const codeComp = (a.code || '').localeCompare(b.code || '');
      if (codeComp !== 0) return codeComp;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [evalTableData]);

  const handleEvalSearchClick = () => {
    setEvalCurrentPage(1);
    fetchEvalList(1, evalPageSize);
  };

  const isAllEvalSelected = sortedEvalData.length > 0 && sortedEvalData.every(r => evalSelectedRowIds.includes(r.id));

  const toggleSelectAllEval = () => {
    if (isAllEvalSelected) {
      setEvalSelectedRowIds([]);
    } else {
      setEvalSelectedRowIds(sortedEvalData.map(r => r.id));
    }
  };

  const toggleSelectRowEval = (id: string) => {
    setEvalSelectedRowIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const evalMatrixExcelColumns: ExcelColumn<MatrixTableDataRow>[] = [
    { header: 'STT', accessor: (_row, i) => i + 1, width: 6, align: 'center' },
    { header: 'Mã ma trận', accessor: row => row.code, width: 16 },
    { header: 'Tên ma trận', accessor: row => row.name, width: 30 },
    { header: 'Môn học', accessor: row => row.subject, width: 18 },
    { header: 'Tổng điểm', accessor: row => row.totalScore.toFixed(2), width: 12, align: 'center' },
    { header: 'Số câu hỏi', accessor: row => row.totalQuestions, width: 12, align: 'center' },
    { header: 'Thời gian làm bài (phút)', accessor: row => row.duration, width: 18, align: 'center' },
    { header: 'Trạng thái', accessor: row => row.status === 'approved' ? 'Đã thẩm định' : row.status === 'rejected' ? 'Từ chối' : 'Chờ thẩm định', width: 16, align: 'center' },
  ];

  const handleExportExcel = () => {
    if (sortedEvalData.length === 0) {
      toast.warning('Không có dữ liệu để xuất file.');
      return;
    }
    const fileName = `ThamDinhMaTranDe_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(sortedEvalData, evalMatrixExcelColumns, fileName, 'Thẩm định ma trận đề');
    toast.success('Đã xuất file báo cáo thẩm định ma trận thành công!');
  };

  const handleBatchReviewClick = () => {
    if (evalSelectedRowIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 ma trận để thẩm định.');
      return;
    }
    setIsBatchReview(true);
    setReviewTargetRecord(null);
    setReviewStatus('approved');
    setReviewNotes('');
    setIsReviewModalOpen(true);
  };

  const handleSingleReviewClick = (record: MatrixTableDataRow) => {
    setIsBatchReview(false);
    setReviewTargetRecord(record);
    setReviewStatus(record.status === 'rejected' ? 'rejected' : 'approved');
    setReviewNotes('');
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = async () => {
    setReviewSubmitting(true);
    const targetIds = isBatchReview ? evalSelectedRowIds : [reviewTargetRecord?.id].filter(Boolean) as string[];
    try {
      const res = await fetch('/api/matrix-configs/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewStatus,
          ids: targetIds,
          notes: reviewNotes
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Cập nhật kết quả thẩm định thành công.');
        setIsReviewModalOpen(false);
        setEvalSelectedRowIds([]);
        fetchEvalList(evalCurrentPage, evalPageSize);
      } else {
        toast.error(json.error || 'Lỗi khi lưu thẩm định.');
      }
    } catch {
      toast.error('Gặp sự cố khi lưu thẩm định.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const evalTotalPages = Math.ceil(evalTableTotal / evalPageSize);
  const handleEvalPageChange = (page: number) => {
    setEvalCurrentPage(page);
    fetchEvalList(page, evalPageSize);
  };
  const handleEvalPageSizeChange = (size: number) => {
    setEvalPageSize(size);
    setEvalCurrentPage(1);
    fetchEvalList(1, size);
  };

  if (viewMode === 'create') {
    return (
      <CreateMatrixForm
        currentUser={currentUser}
        editingId={editingMatrixId}
        onBack={() => {
          setEditingMatrixId(undefined);
          setViewMode('list');
          fetchMatrixList(1, pageSize);
        }}
      />
    );
  }

  return (
    <div className="pt-3 px-6 pb-6 flex flex-col gap-4 bg-white min-h-[calc(100vh-200px)]" id="matrix-module-facade">
      <ResizableTableStyles />
      {/* Tab Headers */}
      <div className="flex gap-1 border-b border-gray-300 relative select-none">
        {checkUserPermission(currentUser, 'tab-ma-tran-de') && (
          <button
            onClick={() => { setActiveTab('list'); setSelectedRowIds([]); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'list'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
            style={{
              borderBottomColor: activeTab === 'list' ? '#eff6ff' : undefined
            }}
          >
            Ma trận đề
          </button>
        )}
        {checkUserPermission(currentUser, 'tab-tham-dinh-ma-tran-de') && (
          <button
            onClick={() => { setActiveTab('evaluation'); setEvalSelectedRowIds([]); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'evaluation'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
            style={{
              borderBottomColor: activeTab === 'evaluation' ? '#eff6ff' : undefined
            }}
          >
            Thẩm định ma trận đề
          </button>
        )}
      </div>

      {activeTab === 'list' ? (
        /* ========================================== */
        /* VIEW: TAB 1 - MATRIX DIRECTORY LIST        */
        /* ========================================== */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Search Filter Section */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div
              className="flex items-center gap-2 cursor-pointer mb-4 w-fit group"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            >
              <h3 className="text-[#1a3c8b] font-bold text-sm italic m-0">Tìm kiếm thông tin</h3>
              <div className="text-[#1a3c8b] opacity-70 group-hover:opacity-100 transition-opacity">
                {isSearchExpanded ? <UpOutlined className="text-[10px]" /> : <DownOutlined className="text-[10px]" />}
              </div>
            </div>

            {isSearchExpanded && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  {/* Tên ma trận */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tên ma trận</label>
                    <Input
                      placeholder="Nhập"
                      className="rounded border-slate-300 text-xs"
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      maxLength={NAME_MAX_LENGTH}
                      status={searchText.length >= NAME_MAX_LENGTH ? 'error' : undefined}
                      allowClear
                    />
                    {searchText.length >= NAME_MAX_LENGTH && (
                      <div className="text-red-500 text-[11px] mt-1">Tên ma trận không được vượt quá {NAME_MAX_LENGTH} ký tự.</div>
                    )}
                  </div>

                  {/* Môn học */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Môn học</label>
                    <Select
                      value={filterSubject}
                      onChange={setFilterSubject}
                      className="w-full text-xs"
                      options={[
                        { value: 'all', label: 'Tất cả' },
                        ...allowedSubjects.map(s => ({ value: s.name, label: s.name }))
                      ]}
                    />
                  </div>

                  {/* Trạng thái */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Trạng thái</label>
                    <Select
                      value={filterStatus}
                      onChange={setFilterStatus}
                      className="w-full text-xs"
                      options={[
                        { value: 'all', label: 'Tất cả' },
                        { value: 'approved', label: 'Đã thẩm định' },
                        { value: 'pending', label: 'Chờ thẩm định' },
                        { value: 'rejected', label: 'Từ chối' },
                        { value: 'new', label: 'Nháp' }
                      ]}
                    />
                  </div>
                </div>

                {/* Tìm kiếm button */}
                <div className="flex justify-center mt-5">
                  <Button
                    type="primary"
                    className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded px-8 hover:bg-[#243590] cursor-pointer"
                    onClick={handleSearchClick}
                    loading={tableLoading}
                  >
                    Tìm kiếm
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Results Table Section */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="text-[#1a3c8b] font-bold text-sm italic m-0">Kết quả tìm kiếm</h3>
              <div className="flex items-center gap-2">
                {hasActionPermission(currentUser, 'matrices.manage') && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded hover:bg-[#243590] cursor-pointer"
                    onClick={() => {
                      setEditingMatrixId(undefined);
                      setViewMode('create');
                    }}
                  >
                    Thêm mới
                  </Button>
                )}
                {hasActionPermission(currentUser, 'matrices.manage') && (
                  <Button
                    danger
                    className="font-semibold text-xs rounded cursor-pointer"
                    onClick={handleBatchDelete}
                    disabled={selectedRowIds.length === 0}
                  >
                    Xóa{selectedRowIds.length > 0 ? ` (${selectedRowIds.length})` : ''}
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <table style={{ minWidth: matrixTableTotalWidth }} className={`w-full text-xs font-medium text-slate-700 border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}>
              {matrixTableColGroup}
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
                  <th className="relative py-3 px-3 text-center">
                    <input type="checkbox" className="cursor-pointer" checked={isAllSelected} onChange={toggleSelectAll} />
                    <ColResizeHandle onMouseDown={startMatrixColResize(0)} />
                  </th>
                  <th className="relative py-3 px-3 text-center">STT<ColResizeHandle onMouseDown={startMatrixColResize(1)} /></th>
                  <th className="relative py-3 px-3 text-left">Mã ma trận<ColResizeHandle onMouseDown={startMatrixColResize(2)} /></th>
                  <th className="relative py-3 px-3 text-left">Tên ma trận<ColResizeHandle onMouseDown={startMatrixColResize(3)} /></th>
                  <th className="relative py-3 px-3 text-left">Môn học<ColResizeHandle onMouseDown={startMatrixColResize(4)} /></th>
                  <th className="relative py-3 px-3 text-center">Tổng điểm<ColResizeHandle onMouseDown={startMatrixColResize(5)} /></th>
                  <th className="relative py-3 px-3 text-center">Số câu hỏi<ColResizeHandle onMouseDown={startMatrixColResize(6)} /></th>
                  <th className="relative py-3 px-3 text-center">Thời gian làm bài (phút)<ColResizeHandle onMouseDown={startMatrixColResize(7)} /></th>
                  <th className="relative py-3 px-3 text-center">Trạng thái<ColResizeHandle onMouseDown={startMatrixColResize(8)} /></th>
                  <th className="relative py-3 px-3 text-center">Thao tác<ColResizeHandle onMouseDown={startMatrixColResize(9)} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <Spin size="medium" />
                    </td>
                  </tr>
                ) : tableData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <Empty description="Không tìm thấy ma trận đề nào." />
                    </td>
                  </tr>
                ) : (
                  tableData.map((row, idx) => {
                    const isChecked = selectedRowIds.includes(row.id);
                    return (
                      <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            className="cursor-pointer accent-[#2c3e9e]"
                            checked={isChecked}
                            onChange={() => toggleSelectRow(row.id)}
                          />
                        </td>
                        <td className="py-3 px-3 text-center">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="py-3 px-3"><TruncatedText text={row.code} /></td>
                        <td className="py-3 px-3">
                          <TruncatedText text={row.name} />
                        </td>
                        <td className="py-3 px-3"><TruncatedText text={row.subject} /></td>
                        <td className="py-3 px-3 text-center">{row.totalScore.toFixed(2)}</td>
                        <td className="py-3 px-3 text-center">{row.totalQuestions}</td>
                        <td className="py-3 px-3 text-center">{row.duration}</td>
                        <td className="py-3 px-3 text-center">{renderStatusTag(row.status)}</td>
                        <td className="py-3 px-3 text-center">
                          <Space size={4}>
                            {hasActionPermission(currentUser, 'matrices.manage') && (
                              <Tooltip title="Chỉnh sửa">
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<EditOutlined className="text-[#2c3e9e]" />}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setEditingMatrixId(row.id);
                                    setViewMode('create');
                                  }}
                                />
                              </Tooltip>
                            )}
                            {hasActionPermission(currentUser, 'matrices.submit') && (
                              <Tooltip title="Gửi thẩm định">
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<SendOutlined className="text-amber-500" />}
                                  className="cursor-pointer"
                                  onClick={() => handleConfirmSendToEvaluation(row)}
                                />
                              </Tooltip>
                            )}
                            {hasActionPermission(currentUser, 'matrices.manage') && (
                              <Popconfirm
                                title="Xóa ma trận này?"
                                onConfirm={() => handleDeleteRow(row.id)}
                                okText="Xóa"
                                cancelText="Hủy"
                              >
                                <Tooltip title="Xóa">
                                  <Button
                                    size="small" type="text" danger icon={<DeleteOutlined />} className="cursor-pointer"
                                    loading={deletingId === row.id}
                                    disabled={deletingId !== null && deletingId !== row.id}
                                  />
                                </Tooltip>
                              </Popconfirm>
                            )}
                          </Space>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 text-xs text-slate-500">
              <span>
                {tableData.length > 0
                  ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, tableTotalRows)} / ${tableTotalRows} bản ghi`
                  : '0 bản ghi'}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="small"
                  type="text"
                  className="text-xs cursor-pointer"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >&lt;</Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = i + 1;
                  return (
                    <Button
                      key={pg}
                      size="small"
                      type={pg === currentPage ? 'primary' : 'text'}
                      className={`text-xs cursor-pointer min-w-[28px] ${pg === currentPage ? 'bg-[#2c3e9e] border-transparent text-white rounded' : ''}`}
                      onClick={() => handlePageChange(pg)}
                    >{pg}</Button>
                  );
                })}
                {totalPages > 5 && <span className="px-1">...</span>}
                {totalPages > 5 && (
                  <Button
                    size="small"
                    type="text"
                    className="text-xs cursor-pointer min-w-[28px]"
                    onClick={() => handlePageChange(totalPages)}
                  >{totalPages}</Button>
                )}
                <Button
                  size="small"
                  type="text"
                  className="text-xs cursor-pointer"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >&gt;</Button>
                <Select
                  size="small"
                  value={String(pageSize)}
                  className="text-xs ml-2"
                  style={{ width: 100 }}
                  onChange={(val) => handlePageSizeChange(Number(val))}
                  options={[
                    { value: '10', label: '10/ trang' },
                    { value: '20', label: '20/ trang' },
                    { value: '50', label: '50/ trang' },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================== */
        /* VIEW: TAB 2 - EVALUATION / PEER REVIEW     */
        /* ========================================== */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Search Filter Section */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div
              className="flex items-center gap-2 cursor-pointer mb-4 w-fit group"
              onClick={() => setEvalIsSearchExpanded(!evalIsSearchExpanded)}
            >
              <h3 className="text-[#1a3c8b] font-bold text-sm italic m-0">Tìm kiếm thông tin</h3>
              <div className="text-[#1a3c8b] opacity-70 group-hover:opacity-100 transition-opacity">
                {evalIsSearchExpanded ? <UpOutlined className="text-[10px]" /> : <DownOutlined className="text-[10px]" />}
              </div>
            </div>

            {evalIsSearchExpanded && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Tên ma trận */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tên ma trận</label>
                    <Input
                      placeholder="Nhập"
                      className="rounded border-slate-300 text-xs"
                      value={evalSearchText}
                      onChange={e => setEvalSearchText(e.target.value)}
                      maxLength={NAME_MAX_LENGTH}
                      status={evalSearchText.length >= NAME_MAX_LENGTH ? 'error' : undefined}
                      allowClear
                    />
                    {evalSearchText.length >= NAME_MAX_LENGTH && (
                      <div className="text-red-500 text-[11px] mt-1">Tên ma trận không được vượt quá {NAME_MAX_LENGTH} ký tự.</div>
                    )}
                  </div>

                  {/* Môn học */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Môn học</label>
                    <Select
                      value={evalFilterSubject}
                      onChange={setEvalFilterSubject}
                      className="w-full text-xs"
                      options={[
                        { value: 'all', label: 'Tất cả' },
                        ...allowedSubjects.map(s => ({ value: s.name, label: s.name }))
                      ]}
                    />
                  </div>
                </div>

                {/* Tìm kiếm button */}
                <div className="flex justify-center mt-5">
                  <Button
                    type="primary"
                    className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded px-8 hover:bg-[#243590] cursor-pointer"
                    onClick={handleEvalSearchClick}
                    loading={evalTableLoading}
                  >
                    Tìm kiếm
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Results Table Section */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <h3 className="text-[#1a3c8b] font-bold text-sm italic m-0">Kết quả tìm kiếm</h3>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-100">
                  Phân quyền: Hội đồng thẩm định
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasActionPermission(currentUser, 'matrices.approve') && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded hover:bg-[#243590] cursor-pointer"
                    onClick={handleBatchReviewClick}
                    disabled={evalSelectedRowIds.length === 0}
                  >
                    Thẩm định nhiều{evalSelectedRowIds.length > 0 ? ` (${evalSelectedRowIds.length})` : ''}
                  </Button>
                )}
                {hasActionPermission(currentUser, 'matrices.export') && (
                  <Button
                    type="primary"
                    icon={<FileExcelOutlined />}
                    className="!bg-green-600 !border-green-600 !text-white font-semibold text-xs rounded hover:!bg-green-700 cursor-pointer"
                    onClick={handleExportExcel}
                  >
                    Xuất Excel
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <table style={{ minWidth: evalMatrixTableTotalWidth }} className={`w-full text-xs font-medium text-slate-700 border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}>
              {evalMatrixTableColGroup}
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
                  <th className="relative py-3 px-3 text-center">
                    <input type="checkbox" className="cursor-pointer" checked={isAllEvalSelected} onChange={toggleSelectAllEval} />
                    <ColResizeHandle onMouseDown={startEvalMatrixColResize(0)} />
                  </th>
                  <th className="relative py-3 px-3 text-center">STT<ColResizeHandle onMouseDown={startEvalMatrixColResize(1)} /></th>
                  <th className="relative py-3 px-3 text-left">Mã ma trận<ColResizeHandle onMouseDown={startEvalMatrixColResize(2)} /></th>
                  <th className="relative py-3 px-3 text-left">Tên ma trận<ColResizeHandle onMouseDown={startEvalMatrixColResize(3)} /></th>
                  <th className="relative py-3 px-3 text-left">Môn học<ColResizeHandle onMouseDown={startEvalMatrixColResize(4)} /></th>
                  <th className="relative py-3 px-3 text-center">Tổng điểm<ColResizeHandle onMouseDown={startEvalMatrixColResize(5)} /></th>
                  <th className="relative py-3 px-3 text-center">Số câu hỏi<ColResizeHandle onMouseDown={startEvalMatrixColResize(6)} /></th>
                  <th className="relative py-3 px-3 text-center">Thời gian làm bài (phút)<ColResizeHandle onMouseDown={startEvalMatrixColResize(7)} /></th>
                  <th className="relative py-3 px-3 text-center">Trạng thái<ColResizeHandle onMouseDown={startEvalMatrixColResize(8)} /></th>
                  <th className="relative py-3 px-3 text-center">Thao tác<ColResizeHandle onMouseDown={startEvalMatrixColResize(9)} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evalTableLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <Spin size="medium" />
                    </td>
                  </tr>
                ) : sortedEvalData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <Empty description="Không tìm thấy ma trận đề thi nào cần thẩm định." />
                    </td>
                  </tr>
                ) : (
                  sortedEvalData.map((row, idx) => {
                    const isChecked = evalSelectedRowIds.includes(row.id);
                    return (
                      <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            className="cursor-pointer accent-[#2c3e9e]"
                            checked={isChecked}
                            onChange={() => toggleSelectRowEval(row.id)}
                          />
                        </td>
                        <td className="py-3 px-3 text-center">{(evalCurrentPage - 1) * evalPageSize + idx + 1}</td>
                        <td className="py-3 px-3 font-semibold"><TruncatedText text={row.code} /></td>
                        <td className="py-3 px-3">
                          <TruncatedText text={row.name} />
                        </td>
                        <td className="py-3 px-3"><TruncatedText text={row.subject} /></td>
                        <td className="py-3 px-3 text-center">{row.totalScore.toFixed(2)}</td>
                        <td className="py-3 px-3 text-center">{row.totalQuestions}</td>
                        <td className="py-3 px-3 text-center">{row.duration}</td>
                        <td className="py-3 px-3 text-center">{renderStatusTag(row.status)}</td>
                        <td className="py-3 px-3 text-center">
                          {hasActionPermission(currentUser, 'matrices.approve') && (
                            <Tooltip title="Thẩm định">
                              <Button
                                size="small"
                                type="text"
                                icon={<FileTextOutlined className="text-[#2c3e9e]" />}
                                className="cursor-pointer"
                                onClick={() => handleSingleReviewClick(row)}
                              />
                            </Tooltip>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 text-xs text-slate-500">
              <span>
                {sortedEvalData.length > 0
                  ? `${(evalCurrentPage - 1) * evalPageSize + 1} - ${Math.min(evalCurrentPage * evalPageSize, evalTableTotal)} / ${evalTableTotal} bản ghi`
                  : '0 bản ghi'}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="small"
                  type="text"
                  className="text-xs cursor-pointer"
                  disabled={evalCurrentPage <= 1}
                  onClick={() => handleEvalPageChange(evalCurrentPage - 1)}
                >&lt;</Button>
                {Array.from({ length: Math.min(evalTotalPages, 5) }, (_, i) => {
                  const pg = i + 1;
                  return (
                    <Button
                      key={pg}
                      size="small"
                      type={pg === evalCurrentPage ? 'primary' : 'text'}
                      className={`text-xs cursor-pointer min-w-[28px] ${pg === evalCurrentPage ? 'bg-[#2c3e9e] border-transparent text-white rounded' : ''}`}
                      onClick={() => handleEvalPageChange(pg)}
                    >{pg}</Button>
                  );
                })}
                {evalTotalPages > 5 && <span className="px-1">...</span>}
                {evalTotalPages > 5 && (
                  <Button
                    size="small"
                    type="text"
                    className="text-xs cursor-pointer min-w-[28px]"
                    onClick={() => handleEvalPageChange(evalTotalPages)}
                  >{evalTotalPages}</Button>
                )}
                <Button
                  size="small"
                  type="text"
                  className="text-xs cursor-pointer"
                  disabled={evalCurrentPage >= evalTotalPages}
                  onClick={() => handleEvalPageChange(evalCurrentPage + 1)}
                >&gt;</Button>
                <Select
                  size="small"
                  value={String(evalPageSize)}
                  className="text-xs ml-2"
                  style={{ width: 100 }}
                  onChange={(val) => handleEvalPageSizeChange(Number(val))}
                  options={[
                    { value: '10', label: '10/ trang' },
                    { value: '20', label: '20/ trang' },
                    { value: '50', label: '50/ trang' },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-[#1a3c8b] font-bold text-sm italic">
            <CheckCircleOutlined className="text-[#2c3e9e]" />
            {isBatchReview
              ? `Thẩm định đồng thời ${evalSelectedRowIds.length} ma trận đề`
              : `Thẩm định ma trận đề thi: ${reviewTargetRecord?.name || ''}`}
          </div>
        }
        open={isReviewModalOpen}
        onCancel={() => setIsReviewModalOpen(false)}
        centered
        footer={[
          <Button key="cancel" onClick={() => setIsReviewModalOpen(false)} className="rounded text-xs font-semibold">
            Hủy bỏ
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={reviewSubmitting}
            onClick={handleSaveReview}
            className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded hover:bg-[#243590] cursor-pointer"
          >
            Lưu kết quả
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          {!isBatchReview && reviewTargetRecord && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 text-slate-600">
              <div><strong>Mã ma trận:</strong> {reviewTargetRecord.code}</div>
              <div><strong>Môn học:</strong> {reviewTargetRecord.subject}</div>
              <div><strong>Tổng số câu hỏi:</strong> {reviewTargetRecord.totalQuestions}</div>
              <div><strong>Tổng số điểm:</strong> {reviewTargetRecord.totalScore.toFixed(2)}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Kết quả thẩm định</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="review-status"
                  value="approved"
                  checked={reviewStatus === 'approved'}
                  onChange={() => setReviewStatus('approved')}
                  className="accent-[#2c3e9e] cursor-pointer"
                />
                Đồng ý thông qua (Đã thẩm định)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="review-status"
                  value="rejected"
                  checked={reviewStatus === 'rejected'}
                  onChange={() => setReviewStatus('rejected')}
                  className="accent-red-600 cursor-pointer"
                />
                Từ chối thông qua
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ý kiến thẩm định / Nhận xét phản biện
            </label>
            <Input.TextArea
              rows={4}
              placeholder="Nhập nội dung nhận xét chi tiết..."
              className="rounded text-xs"
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
