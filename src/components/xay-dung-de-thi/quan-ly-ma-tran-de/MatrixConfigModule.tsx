import React, { useState, useEffect, useMemo } from 'react';
import {
  Input,
  InputNumber,
  Select,
  Button,
  Table,
  message,
  Modal,
  Spin,
  Tag,
  Badge,
  Tooltip,
  Steps,
  Popconfirm,
  Space,
  Empty
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  CalculatorOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  DownloadOutlined,
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

export default function MatrixConfigModule({ initialTab }: { initialTab?: 'list' | 'evaluation' }) {
  // Real Môn thi list fetched from database API
  const [dbSubjects, setDbSubjects] = useState<{ id: string; code: string; name: string }[]>([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await subjectCategoryApi.list();
        if (res && res.data) {
          setDbSubjects(res.data.filter((item: any) => item.is_active));
        }
      } catch (err) {
        console.error('Không thể tải danh sách môn thi:', err);
      }
    };
    fetchSubjects();
  }, []);

  // View mode: 'list' | 'create'
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [editingMatrixId, setEditingMatrixId] = useState<string | undefined>(undefined);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'list' | 'evaluation'>(initialTab || 'list');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
  const [evalDateRange, setEvalDateRange] = useState<string>(''); // Simulated Range picker text

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
      message.error('Lỗi kết nối API khi tải danh sách ma trận.');
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
      message.error('Lỗi kết nối API khi tải danh sách thẩm định.');
    } finally {
      setEvalTableLoading(false);
    }
  };

  // Load on mount and react to tab switches
  useEffect(() => {
    if (activeTab === 'list') {
      fetchMatrixList(1, pageSize);
      setSelectedRowIds([]);
    } else {
      fetchEvalList(1, evalPageSize);
      setEvalSelectedRowIds([]);
    }
  }, [activeTab]);

  // Handle search button click
  const handleSearchClick = () => {
    setCurrentPage(1);
    fetchMatrixList(1, pageSize);
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedRowIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 bản ghi để xóa.');
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
            message.success(json.message);
            setSelectedRowIds([]);
            fetchMatrixList(1, pageSize);
          } else {
            message.error(json.error);
          }
        } catch {
          message.error('Lỗi kết nối API khi xóa.');
        }
      }
    });
  };

  // Handle single row delete
  const handleDeleteRow = async (id: string) => {
    try {
      const res = await fetch(`/api/matrix-configs/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success(json.message);
        fetchMatrixList(currentPage, pageSize);
      } else {
        message.error(json.error);
      }
    } catch {
      message.error('Lỗi kết nối API khi xóa.');
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
        message.success('Đã gửi ma trận đề đi thẩm định thành công!');
        setActiveTab('evaluation');
      } else {
        message.error(json.error || 'Lỗi khi gửi thẩm định.');
      }
    } catch {
      message.error('Lỗi kết nối API khi gửi thẩm định.');
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

  // Status tag helper
  const renderStatusTag = (status: string) => {
    switch (status) {
      case 'approved': return <Tag color="green" className="rounded-full text-[11px] font-medium px-3">Đã thẩm định</Tag>;
      case 'rejected': return <Tag color="red" className="rounded-full text-[11px] font-medium px-3">Từ chối</Tag>;
      case 'new': return <Tag color="default" className="rounded-full text-[11px] font-medium px-3">Nháp</Tag>;
      case 'pending': return <Tag color="gold" className="rounded-full text-[11px] font-medium px-3">Chờ thẩm định</Tag>;
      default: return <Tag className="rounded-full text-[11px] font-medium px-3">{status}</Tag>;
    }
  };

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

  const handleExportExcel = () => {
    if (sortedEvalData.length === 0) {
      message.warning('Không có dữ liệu để xuất file.');
      return;
    }
    const headers = ['Mã ma trận', 'Tên ma trận', 'Môn học', 'Tổng điểm', 'Số câu hỏi', 'Thời gian làm bài (phút)', 'Trạng thái'];
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...sortedEvalData.map(r => [
        `"${r.code}"`,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.subject}"`,
        r.totalScore.toFixed(2),
        r.totalQuestions,
        r.duration,
        r.status === 'approved' ? 'Đã thẩm định' : r.status === 'rejected' ? 'Từ chối' : 'Chờ thẩm định'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_tham_dinh_ma_tran_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Đã xuất file báo cáo thẩm định ma trận thành công!');
  };

  const handleBatchReviewClick = () => {
    if (evalSelectedRowIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 ma trận để thẩm định.');
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
        message.success(json.message || 'Cập nhật kết quả thẩm định thành công.');
        setIsReviewModalOpen(false);
        setEvalSelectedRowIds([]);
        fetchEvalList(evalCurrentPage, evalPageSize);
      } else {
        message.error(json.error || 'Lỗi khi lưu thẩm định.');
      }
    } catch {
      message.error('Gặp sự cố khi lưu thẩm định.');
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
      {/* Tab Headers */}
      <div className="flex gap-1 border-b border-gray-300 relative select-none">
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                  {/* Tên ma trận */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tên ma trận</label>
                    <Input
                      placeholder="Nhập"
                      className="rounded border-slate-300 text-xs"
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      allowClear
                    />
                  </div>

                  {/* Môn thi */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Môn thi</label>
                    <Select
                      value={filterSubject}
                      onChange={setFilterSubject}
                      className="w-full text-xs"
                      options={[
                        { value: 'all', label: 'Tất cả' },
                        ...dbSubjects.map(s => ({ value: s.name, label: s.name }))
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

                  {/* Ngày tạo */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ngày tạo</label>
                    <Input
                      placeholder="Bắt đầu    →    Kết thúc"
                      className="rounded border-slate-300 text-xs"
                      suffix={<span className="text-slate-400 text-xs">📅</span>}
                      readOnly
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
                <Button
                  danger
                  className="font-semibold text-xs rounded cursor-pointer"
                  onClick={handleBatchDelete}
                  disabled={selectedRowIds.length === 0}
                >
                  Xóa{selectedRowIds.length > 0 ? ` (${selectedRowIds.length})` : ''}
                </Button>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-xs font-medium text-slate-700 border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
                  <th className="py-3 px-3 text-center w-10">
                    <input type="checkbox" className="cursor-pointer" checked={isAllSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="py-3 px-3 text-center w-14">STT</th>
                  <th className="py-3 px-3 text-left">Mã ma trận</th>
                  <th className="py-3 px-3 text-left">Tên ma trận</th>
                  <th className="py-3 px-3 text-left">Môn học</th>
                  <th className="py-3 px-3 text-center">Tổng điểm</th>
                  <th className="py-3 px-3 text-center">Số câu hỏi</th>
                  <th className="py-3 px-3 text-center">Thời gian làm bài (phút)</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <Spin size="default" />
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
                        <td className="py-3 px-3">{row.code}</td>
                        <td className="py-3 px-3">
                          <Tooltip title={row.name}>
                            <span className="block max-w-[200px] truncate">{row.name}</span>
                          </Tooltip>
                        </td>
                        <td className="py-3 px-3">{row.subject}</td>
                        <td className="py-3 px-3 text-center">{row.totalScore.toFixed(2)}</td>
                        <td className="py-3 px-3 text-center">{row.totalQuestions}</td>
                        <td className="py-3 px-3 text-center">{row.duration}</td>
                        <td className="py-3 px-3 text-center">{renderStatusTag(row.status)}</td>
                        <td className="py-3 px-3 text-center">
                          <Space size={4}>
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
                            <Tooltip title="Gửi thẩm định">
                              <Button
                                size="small"
                                type="text"
                                icon={<SendOutlined className="text-amber-500" />}
                                className="cursor-pointer"
                                onClick={() => handleConfirmSendToEvaluation(row)}
                              />
                            </Tooltip>
                            <Popconfirm
                              title="Xóa ma trận này?"
                              onConfirm={() => handleDeleteRow(row.id)}
                              okText="Xóa"
                              cancelText="Hủy"
                            >
                              <Tooltip title="Xóa">
                                <Button size="small" type="text" danger icon={<DeleteOutlined />} className="cursor-pointer" />
                              </Tooltip>
                            </Popconfirm>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  {/* Tên ma trận */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tên ma trận</label>
                    <Input
                      placeholder="Nhập"
                      className="rounded border-slate-300 text-xs"
                      value={evalSearchText}
                      onChange={e => setEvalSearchText(e.target.value)}
                      allowClear
                    />
                  </div>

                  {/* Môn thi */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Môn thi</label>
                    <Select
                      value={evalFilterSubject}
                      onChange={setEvalFilterSubject}
                      className="w-full text-xs"
                      options={[
                        { value: 'all', label: 'Tất cả' },
                        ...dbSubjects.map(s => ({ value: s.name, label: s.name }))
                      ]}
                    />
                  </div>

                  {/* Ngày gửi */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ngày gửi thẩm định/phản biện</label>
                    <Input
                      placeholder="Bắt đầu    →    Kết thúc"
                      className="rounded border-slate-300 text-xs"
                      suffix={<span className="text-slate-400 text-xs">📅</span>}
                      value={evalDateRange}
                      onChange={e => setEvalDateRange(e.target.value)}
                      allowClear
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
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded hover:bg-[#243590] cursor-pointer"
                  onClick={handleBatchReviewClick}
                  disabled={evalSelectedRowIds.length === 0}
                >
                  Thẩm định nhiều{evalSelectedRowIds.length > 0 ? ` (${evalSelectedRowIds.length})` : ''}
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  className="font-semibold text-xs rounded cursor-pointer border-slate-300 text-slate-700 hover:text-[#2c3e9e] hover:border-[#2c3e9e]"
                  onClick={handleExportExcel}
                >
                  Xuất Excel
                </Button>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-xs font-medium text-slate-700 border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
                  <th className="py-3 px-3 text-center w-10">
                    <input type="checkbox" className="cursor-pointer" checked={isAllEvalSelected} onChange={toggleSelectAllEval} />
                  </th>
                  <th className="py-3 px-3 text-center w-14">STT</th>
                  <th className="py-3 px-3 text-left">Mã ma trận</th>
                  <th className="py-3 px-3 text-left">Tên ma trận</th>
                  <th className="py-3 px-3 text-left">Môn học</th>
                  <th className="py-3 px-3 text-center">Tổng điểm</th>
                  <th className="py-3 px-3 text-center">Số câu hỏi</th>
                  <th className="py-3 px-3 text-center">Thời gian làm bài (phút)</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evalTableLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <Spin size="default" />
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
                        <td className="py-3 px-3 font-semibold">{row.code}</td>
                        <td className="py-3 px-3">
                          <Tooltip title={row.name}>
                            <span className="block max-w-[220px] truncate">{row.name}</span>
                          </Tooltip>
                        </td>
                        <td className="py-3 px-3">{row.subject}</td>
                        <td className="py-3 px-3 text-center">{row.totalScore.toFixed(2)}</td>
                        <td className="py-3 px-3 text-center">{row.totalQuestions}</td>
                        <td className="py-3 px-3 text-center">{row.duration}</td>
                        <td className="py-3 px-3 text-center">{renderStatusTag(row.status)}</td>
                        <td className="py-3 px-3 text-center">
                          <Tooltip title="Thẩm định">
                            <Button
                              size="small"
                              type="text"
                              icon={<FileTextOutlined className="text-[#2c3e9e]" />}
                              className="cursor-pointer"
                              onClick={() => handleSingleReviewClick(row)}
                            />
                          </Tooltip>
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
