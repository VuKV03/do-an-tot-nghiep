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
  DownOutlined
} from '@ant-design/icons';
import { MatrixConfig, MatrixRow, Question, SubjectOption, GradeOption, TopicNode } from '../../../types';
import { SUBJECTS, GRADES, TOPICS_TREE } from '../../../data';
import CreateMatrixForm from './CreateMatrixForm';

export default function MatrixConfigModule() {
  // View mode: 'list' | 'create'
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');


  // List Searching & Filtering states
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');

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
      if (filterGrade !== 'all') params.set('status', filterGrade);

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

  // Load on mount
  useEffect(() => {
    fetchMatrixList(1, pageSize);
    setSelectedRowIds([]);
  }, []);

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
      case 'new': return <Tag color="blue" className="rounded-full text-[11px] font-medium px-3">Tạo mới</Tag>;
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



  if (viewMode === 'create') {
    return <CreateMatrixForm onBack={() => { setViewMode('list'); fetchMatrixList(1, pageSize); }} />;
  }

  return (
    <div className="space-y-6" id="matrix-module-facade">

      {/* ========================================== */}
      {/* VIEW: MATRIX DIRECTORY LIST                */}
      {/* ========================================== */}
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
                    allowClear
                  />
                </div>

                {/* Môn học */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Môn học</label>
                  <Select
                    value={filterSubject}
                    onChange={setFilterSubject}
                    className="w-full text-xs"
                    options={[
                      { value: 'all', label: 'Toán' },
                      ...SUBJECTS
                    ]}
                  />
                </div>

                {/* Trạng thái */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Trạng thái</label>
                  <Select
                    value={filterGrade}
                    onChange={setFilterGrade}
                    className="w-full text-xs"
                    options={[
                      { value: 'all', label: 'Tất cả' },
                      ...GRADES
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
                onClick={() => setViewMode('create')}
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
                      <td className="py-3 px-3">{row.name}</td>
                      <td className="py-3 px-3">{row.subject}</td>
                      <td className="py-3 px-3 text-center">{row.totalScore.toFixed(2)}</td>
                      <td className="py-3 px-3 text-center">{row.totalQuestions}</td>
                      <td className="py-3 px-3 text-center">{row.duration}</td>
                      <td className="py-3 px-3 text-center">{renderStatusTag(row.status)}</td>
                      <td className="py-3 px-3 text-center">
                        <Space size={4}>
                          <Tooltip title="Chỉnh sửa">
                            <Button size="small" type="text" icon={<EditOutlined className="text-[#2c3e9e]" />} className="cursor-pointer" />
                          </Tooltip>
                          <Popconfirm
                            title="Xóa ma trận này?"
                            onConfirm={() => handleDeleteRow(row.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                          // centered
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
    </div>
  );
}
