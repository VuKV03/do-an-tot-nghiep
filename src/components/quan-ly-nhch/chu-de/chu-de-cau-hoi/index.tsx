import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Input, Select, DatePicker, Button, Space, ConfigProvider, Dropdown, MenuProps, Spin, Empty, Pagination } from 'antd';
import { toast } from '../../../../utils/toast';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2, MoreVertical, Send, History } from 'lucide-react';
import { FileExcelOutlined } from '@ant-design/icons';
import CreateChuDeModal from './create';
import UpdateChuDeModal from './update';
import DeleteChuDeModal from './delete';
import DetailChuDeModal from './detail';
import GuiThamDinhChuDeModal from './send-review';
import LichSuChuDeModal from './history';
import { topicsApi, subjectCategoryApi, gradeLevelApi } from '../../../../services/danhMucApi.ts';
import { SystemUser } from '../../../../types';
import { getUserSubjectFilter } from '../../../../utils/subjectUtils';
import { hasActionPermission } from '../../../../utils/permissionUtils';
import { useResizableColumns, ColResizeHandle, ResizableTableStyles, RESIZABLE_TABLE_CLASS, TruncatedText } from '../../../../utils/resizableTable';
import { exportToExcel, type ExcelColumn } from '../../../../utils/excelExport';

const { RangePicker } = DatePicker;

export interface ChuDeType {
  Id: string;
  ParentId: string | null;
  Ma: string;
  Ten: string;
  IdMonHoc: string;
  IdKhoiLop: string;
  TrangThai: number; // 0: Tạo mới, 1: Chờ thẩm định, 2: Đã thẩm định, 3: Từ chối
  IdNguoiTao: string;
  ThoiGianTao: string;
  IdNguoiGui: string | null;
  ThoiGianGui: string | null;
  IdNguoiThamDinh: string | null;
  ThoiGianThamDinh: string | null;
  NoiDungThamDinh: string | null;
  GhiChu: string | null;
  MonHocName?: string;
  KhoiLopName?: string;
  children?: ChuDeType[];
}

// Fallback mocks if needed for typescript type exports
export const mockMonHoc = [
  { Id: 'mon-01', Ma: 'MATH', Ten: 'Toán học' },
  { Id: 'mon-02', Ma: 'PHYS', Ten: 'Vật lý' },
];

export const mockKhoiLop = [
  { Id: 'kl-12', Ma: 'G12', Ten: 'Khối 12' },
  { Id: 'kl-11', Ma: 'G11', Ten: 'Khối 11' },
];

function buildTopicTree(flatList: ChuDeType[]): ChuDeType[] {
  const map: { [key: string]: ChuDeType } = {};
  const roots: ChuDeType[] = [];

  flatList.forEach((item) => {
    map[item.Id] = { ...item, children: [] };
  });

  flatList.forEach((item) => {
    const cloned = map[item.Id];
    if (cloned.ParentId && map[cloned.ParentId]) {
      if (!map[cloned.ParentId].children) {
        map[cloned.ParentId].children = [];
      }
      map[cloned.ParentId].children!.push(cloned);
    } else {
      roots.push(cloned);
    }
  });

  const cleanEmptyChildren = (nodes: ChuDeType[]) => {
    nodes.forEach(node => {
      if (node.children && node.children.length === 0) {
        delete node.children;
      } else if (node.children) {
        cleanEmptyChildren(node.children);
      }
    });
  };
  cleanEmptyChildren(roots);

  return roots;
}

interface ChuDeCauHoiProps {
  currentUser?: SystemUser | null;
}

export default function ChuDeCauHoi({ currentUser }: ChuDeCauHoiProps) {
  const actorName = currentUser?.fullName || currentUser?.username || 'Hội đồng Chuyên môn';
  const canManage = hasActionPermission(currentUser, 'topics.manage');
  const canSubmit = hasActionPermission(currentUser, 'topics.submit');

  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [monHocs, setMonHocs] = useState<{ Id: string; Ma: string; Ten: string; IsActive?: boolean }[]>([]);
  const [khoiLops, setKhoiLops] = useState<{ Id: string; Ma: string; Ten: string; IsActive?: boolean }[]>([]);
  const [isSubjectRestricted, setIsSubjectRestricted] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

  // Filters
  const [searchTen, setSearchTen] = useState('');
  const [filterMonHoc, setFilterMonHoc] = useState<string>('');
  const [filterKhoiLop, setFilterKhoiLop] = useState<string[]>([]);
  const [filterParentTopic, setFilterParentTopic] = useState<string>('Tất cả');
  const [filterStatus, setFilterStatus] = useState<any>('Tất cả');
  const [filterDates, setFilterDates] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const { colGroup: chuDeColGroup, startResize: startChuDeColResize, totalWidth: chuDeTableTotalWidth } = useResizableColumns(
    [40, 200, 280, 130, 120, 130, 150, 140]
  );

  const parentTopicsOptions = useMemo(() => {
    const parents = rawData
      .filter((item: any) => !item.parent_id)
      .filter((item: any) => {
        const matchMonHoc = !filterMonHoc || item.subject_id === filterMonHoc;
        const matchKhoiLop = filterKhoiLop.length === 0 || filterKhoiLop.includes(item.grade_id);
        return matchMonHoc && matchKhoiLop;
      });
    return parents.map((p: any) => ({ value: p.id, label: p.name }));
  }, [rawData, filterMonHoc, filterKhoiLop]);

  useEffect(() => {
    setFilterParentTopic('Tất cả');
  }, [filterMonHoc, filterKhoiLop]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGuiThamDinhModalOpen, setIsGuiThamDinhModalOpen] = useState(false);
  const [isLichSuModalOpen, setIsLichSuModalOpen] = useState(false);

  const [isMultipleAction, setIsMultipleAction] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ChuDeType | null>(null);

  const fetchFilters = async () => {
    try {
      const [mtRes, klRes] = await Promise.all([
        subjectCategoryApi.list(),
        gradeLevelApi.list()
      ]);
      const mappedMonHoc = mtRes.data.map((i: any) => ({ Id: i.id, Ma: i.code, Ten: i.name, IsActive: i.is_active }));
      const mappedKhoiLop = klRes.data.map((i: any) => ({ Id: i.id, Ma: i.code, Ten: i.name, IsActive: i.is_active }));

      const { filteredSubjects, isRestricted, defaultSubjectId } = getUserSubjectFilter(
        mappedMonHoc.map((m: any) => ({ id: m.Id, name: m.Ten, code: m.Ma })),
        currentUser
      );

      const finalMonHocs = mappedMonHoc.filter((m: any) => filteredSubjects.some(fs => fs.id === m.Id));

      setMonHocs(finalMonHocs);
      setIsSubjectRestricted(isRestricted);
      setKhoiLops(mappedKhoiLop);

      if (isRestricted && defaultSubjectId) {
        setFilterMonHoc(defaultSubjectId);
      } else if (mappedMonHoc.length > 0) {
        setFilterMonHoc('');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Không thể tải bộ lọc Môn học / Khối lớp!');
    }
  };

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await topicsApi.list();
      setRawData(res.data);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Không thể tải danh sách chủ đề!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
    fetchTopics();
  }, [fetchTopics]);

  const handleOpenUpdate = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsUpdateModalOpen(true);
  };

  const handleOpenDetail = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleOpenDelete = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsMultipleAction(false);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeleteMultiple = () => {
    setIsMultipleAction(true);
    setIsDeleteModalOpen(true);
  };

  const handleOpenGuiThamDinh = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsMultipleAction(false);
    setIsGuiThamDinhModalOpen(true);
  };

  const handleOpenGuiThamDinhMultiple = () => {
    setIsMultipleAction(true);
    setIsGuiThamDinhModalOpen(true);
  };

  const handleOpenLichSu = (record: ChuDeType) => {
    setSelectedRecord(record);
    setIsLichSuModalOpen(true);
  };

  const getSubTopicIdsRecursive = (topicIds: string[]): string[] => {
    const result = new Set<string>(topicIds);
    const queue = [...topicIds];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) continue;
      const children = rawData.filter(item => item.parent_id === currentId);
      children.forEach(child => {
        if (!result.has(child.id)) {
          result.add(child.id);
          queue.push(child.id);
        }
      });
    }
    return Array.from(result);
  };

  const getDescendantKeys = (record: ChuDeType): React.Key[] => {
    const keys: React.Key[] = [];
    const recurse = (node: ChuDeType) => {
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          keys.push(child.Id);
          recurse(child);
        });
      }
    };
    recurse(record);
    return keys;
  };

  const handleSelect = (record: ChuDeType, selected: boolean) => {
    const descendantKeys = getDescendantKeys(record);
    setSelectedRowKeys(prev => {
      if (selected) {
        const next = [...prev];
        const keysToAdd = [record.Id, ...descendantKeys];
        keysToAdd.forEach(key => {
          if (!next.includes(key)) {
            next.push(key);
          }
        });
        return next;
      } else {
        const keysToRemove = [record.Id, ...descendantKeys];
        return prev.filter(key => !keysToRemove.includes(key));
      }
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getAllIdsUnder = (nodes: ChuDeType[]): string[] => {
    const ids: string[] = [];
    const walk = (list: ChuDeType[]) => {
      list.forEach(n => { ids.push(n.Id); if (n.children) walk(n.children); });
    };
    walk(nodes);
    return ids;
  };

  const getTrangThaiTag = (trangThai: number) => {
    switch (trangThai) {
      case 0:
        return <span className="px-3 py-1 rounded border border-gray-400 text-gray-600 bg-gray-50 text-sm font-medium">Tạo mới</span>;
      case 1:
        return <span className="px-3 py-1 rounded border border-amber-400 text-amber-600 bg-amber-50 text-sm font-medium">Chờ thẩm định</span>;
      case 2:
        return <span className="px-3 py-1 rounded border border-emerald-400 text-emerald-600 bg-emerald-50 text-sm font-medium">Đã thẩm định</span>;
      case 3:
        return <span className="px-3 py-1 rounded border border-rose-400 text-rose-500 bg-rose-50 text-sm font-medium">Từ chối</span>;
      default:
        return null;
    }
  };

  const renderActionMenu = (record: ChuDeType): MenuProps => {
    const items: MenuProps['items'] = [];

    if (canSubmit && (record.TrangThai === 0 || record.TrangThai === 3)) {
      items.push({
        key: 'send',
        icon: <Send size={16} />,
        label: 'Gửi thẩm định/phản biện',
        onClick: () => handleOpenGuiThamDinh(record)
      });
    }

    items.push({
      key: 'history',
      icon: <History size={16} />,
      label: 'Lịch sử chỉnh sửa, thẩm định',
      onClick: () => handleOpenLichSu(record)
    });

    if (canManage) {
      items.push({
        key: 'delete',
        icon: <Trash2 size={16} className="text-red-500" />,
        label: <span className="text-red-500 font-medium">Xóa chủ đề</span>,
        onClick: () => handleOpenDelete(record)
      });
    }

    return { items };
  };

  const filteredTree = useMemo(() => {
    const mapped: ChuDeType[] = rawData.map((item: any) => ({
      Id: item.id,
      ParentId: item.parent_id,
      Ma: item.code,
      Ten: item.name,
      IdMonHoc: item.subject_id,
      IdKhoiLop: item.grade_id,
      TrangThai: item.status,
      IdNguoiTao: item.created_by || 'user1',
      ThoiGianTao: item.created_at,
      IdNguoiGui: item.submitted_by,
      ThoiGianGui: item.submitted_at,
      IdNguoiThamDinh: item.approved_by,
      ThoiGianThamDinh: item.approved_at,
      NoiDungThamDinh: item.approval_note,
      GhiChu: item.note,
      MonHocName: item.subject_name || '',
      KhoiLopName: item.grade_name || '',
    }));

    const filteredFlat = mapped.filter((item) => {
      const kwTen = searchTen.trim().toLowerCase();
      const matchTen = !kwTen ||
        item.Ten.toLowerCase().includes(kwTen) ||
        item.Ma.toLowerCase().includes(kwTen);

      const allowedSubjectIds = isSubjectRestricted ? monHocs.map(m => m.Id) : null;
      const matchMonHoc = filterMonHoc
        ? item.IdMonHoc === filterMonHoc
        : (allowedSubjectIds ? allowedSubjectIds.includes(item.IdMonHoc) : true);

      const matchKhoiLop = filterKhoiLop.length === 0 || filterKhoiLop.includes(item.IdKhoiLop);
      const matchStatus = filterStatus === 'Tất cả' || item.TrangThai === filterStatus;

      const matchParent = filterParentTopic === 'Tất cả' || item.Id === filterParentTopic || item.ParentId === filterParentTopic;

      let matchDate = true;
      if (filterDates && filterDates[0] && filterDates[1] && item.ThoiGianTao) {
        const itemTime = new Date(item.ThoiGianTao).getTime();
        const start = filterDates[0].startOf('day').valueOf();
        const end = filterDates[1].endOf('day').valueOf();
        matchDate = itemTime >= start && itemTime <= end;
      }

      return matchTen && matchMonHoc && matchKhoiLop && matchStatus && matchDate && matchParent;
    });

    return buildTopicTree(filteredFlat);
  }, [rawData, searchTen, filterMonHoc, filterKhoiLop, filterStatus, filterDates, filterParentTopic, isSubjectRestricted, monHocs]);

  useEffect(() => { setCurrentPage(1); }, [searchTen, filterMonHoc, filterKhoiLop, filterStatus, filterDates, filterParentTopic]);

  const paginatedRoots = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTree.slice(start, start + pageSize);
  }, [filteredTree, currentPage, pageSize]);

  interface FlatRow { node: ChuDeType; depth: number }
  const visibleRows: FlatRow[] = useMemo(() => {
    const out: FlatRow[] = [];
    const walk = (nodes: ChuDeType[], depth: number) => {
      nodes.forEach(node => {
        out.push({ node, depth });
        if (node.children && node.children.length > 0 && expandedKeys.has(node.Id)) {
          walk(node.children, depth + 1);
        }
      });
    };
    walk(paginatedRoots, 0);
    return out;
  }, [paginatedRoots, expandedKeys]);

  const currentPageAllIds = useMemo(() => getAllIdsUnder(paginatedRoots), [paginatedRoots]);
  const isAllSelected = currentPageAllIds.length > 0 && currentPageAllIds.every(id => selectedRowKeys.includes(id));
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedRowKeys(prev => prev.filter(k => !currentPageAllIds.includes(k as string)));
    else setSelectedRowKeys(prev => Array.from(new Set([...prev, ...currentPageAllIds])));
  };

  const getTrangThaiLabel = (trangThai: number) => {
    switch (trangThai) {
      case 0: return 'Tạo mới';
      case 1: return 'Chờ thẩm định';
      case 2: return 'Đã thẩm định';
      case 3: return 'Từ chối';
      default: return '';
    }
  };

  const flattenChuDeTree = (nodes: ChuDeType[]): ChuDeType[] => {
    const result: ChuDeType[] = [];
    const walk = (list: ChuDeType[]) => {
      list.forEach(n => { result.push(n); if (n.children && n.children.length) walk(n.children); });
    };
    walk(nodes);
    return result;
  };

  const excelColumns: ExcelColumn<ChuDeType>[] = [
    { header: 'STT', accessor: (_row, i) => i + 1, width: 6, align: 'center' },
    { header: 'Mã chủ đề/tiểu mục', accessor: row => row.Ma, width: 20 },
    { header: 'Nội dung chủ đề/tiểu mục', accessor: row => row.Ten, width: 34 },
    { header: 'Môn học', accessor: row => row.MonHocName || '', width: 18 },
    { header: 'Khối lớp', accessor: row => row.KhoiLopName || '', width: 14 },
    { header: 'Ngày tạo', accessor: row => row.ThoiGianTao ? new Date(row.ThoiGianTao).toLocaleDateString('vi-VN') : '', width: 14, align: 'center' },
    { header: 'Trạng thái', accessor: row => getTrangThaiLabel(row.TrangThai), width: 16, align: 'center' },
  ];

  const handleExportExcel = () => {
    const rows = flattenChuDeTree(filteredTree);
    if (rows.length === 0) {
      toast.warning('Không có dữ liệu để xuất Excel.');
      return;
    }
    const fileName = `ChuDeCauHoi_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(rows, excelColumns, fileName, 'Chủ đề câu hỏi');
    toast.success('Xuất báo cáo Excel thành công!');
  };

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
      <div className="flex flex-col gap-6">
        {/* Search Section */}
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 transition-all duration-300">
          <div
            className="flex items-center gap-2 cursor-pointer text-[#1e3a8a] font-semibold text-lg select-none w-fit"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          >
            <span>Tìm kiếm thông tin</span>
            {isSearchExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {isSearchExpanded && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Tên chủ đề/tiểu mục</label>
                  <Input
                    placeholder="Nhập"
                    className="h-10 w-full"
                    value={searchTen}
                    onChange={(e) => setSearchTen(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">
                    Môn học <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={filterMonHoc}
                    onChange={setFilterMonHoc}
                    className="h-10 w-full"
                    options={[
                      { value: '', label: 'Tất cả' },
                      ...monHocs.map(m => ({ value: m.Id, label: m.Ten }))
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Khối lớp</label>
                  <Select
                    value={filterKhoiLop}
                    onChange={setFilterKhoiLop}
                    className="h-10 w-full text-sm"
                    mode="multiple"
                    placeholder="Chọn khối lớp"
                    maxTagCount="responsive"
                    options={khoiLops.map(m => ({ value: m.Id, label: m.Ten }))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Chủ đề</label>
                  <Select
                    value={filterParentTopic}
                    onChange={setFilterParentTopic}
                    className="h-10 w-full"
                    options={[
                      { value: 'Tất cả', label: 'Tất cả' },
                      ...parentTopicsOptions
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Trạng thái</label>
                  <Select
                    value={filterStatus}
                    onChange={setFilterStatus}
                    className="h-10 w-full"
                    options={[
                      { value: 'Tất cả', label: 'Tất cả' },
                      { value: 0, label: 'Tạo mới' },
                      { value: 1, label: 'Chờ thẩm định' },
                      { value: 2, label: 'Đã thẩm định' },
                      { value: 3, label: 'Từ chối' },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-600 text-sm font-medium">Ngày tạo</label>
                  <RangePicker
                    className="h-10 w-full text-sm"
                    placeholder={['Bắt đầu', 'Kết thúc']}
                    format="DD/MM/YYYY"
                    value={filterDates}
                    onChange={setFilterDates}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-[#1e3a8a] font-semibold text-lg">Kết quả tìm kiếm</h2>
              {selectedRowKeys.length > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                  Đã chọn <span className="font-bold">{selectedRowKeys.length}</span> chủ đề/tiểu mục
                </span>
              )}
            </div>
            <Space>

              <Button
                type="primary"
                className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none h-10 font-medium px-4 outline-none"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Thêm mới
              </Button>
              <Button type="primary" icon={<FileExcelOutlined />} className="!bg-green-600 !border-green-600 !text-white h-10 font-medium px-4 hover:!bg-green-700" onClick={handleExportExcel}>
                Xuất Excel
              </Button>
              <Button
                className="border-[#1d4ed8] text-[#1d4ed8] h-10 font-medium px-4 hover:bg-blue-50"
                disabled={selectedRowKeys.length === 0}
                onClick={handleOpenGuiThamDinhMultiple}
              >
                Gửi thẩm định
              </Button>
              <Button
                className="border-red-500 text-red-500 h-10 font-medium px-4 hover:bg-red-50"
                disabled={selectedRowKeys.length === 0}
                onClick={handleOpenDeleteMultiple}
              >
                Xóa
              </Button>
            </Space>
          </div>

          <ResizableTableStyles />
          <Spin spinning={loading}>
            <div className="overflow-x-auto border-t border-gray-200">
              <table style={{ minWidth: chuDeTableTotalWidth }} className={`w-full text-sm text-slate-700 border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}>
                {chuDeColGroup}
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-gray-200 text-[#334155] font-semibold">
                    <th className="relative py-3 px-3 text-center">
                      <input type="checkbox" className="cursor-pointer" checked={isAllSelected} onChange={toggleSelectAll} />
                      <ColResizeHandle onMouseDown={startChuDeColResize(0)} />
                    </th>
                    <th className="relative py-3 px-3 text-left">Mã chủ đề/tiểu mục<ColResizeHandle onMouseDown={startChuDeColResize(1)} /></th>
                    <th className="relative py-3 px-3 text-left">Nội dung chủ đề/tiểu mục<ColResizeHandle onMouseDown={startChuDeColResize(2)} /></th>
                    <th className="relative py-3 px-3 text-left">Môn học<ColResizeHandle onMouseDown={startChuDeColResize(3)} /></th>
                    <th className="relative py-3 px-3 text-left">Khối lớp<ColResizeHandle onMouseDown={startChuDeColResize(4)} /></th>
                    <th className="relative py-3 px-3 text-left">Ngày tạo<ColResizeHandle onMouseDown={startChuDeColResize(5)} /></th>
                    <th className="relative py-3 px-3 text-center">Trạng thái<ColResizeHandle onMouseDown={startChuDeColResize(6)} /></th>
                    <th className="relative py-3 px-3 text-center">Thao tác<ColResizeHandle onMouseDown={startChuDeColResize(7)} /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleRows.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center"><Empty description="Không có dữ liệu chủ đề/tiểu mục" /></td></tr>
                  ) : visibleRows.map(({ node, depth }) => {
                    const hasChildren = !!node.children && node.children.length > 0;
                    const isExpanded = expandedKeys.has(node.Id);
                    return (
                      <tr key={node.Id} className="hover:bg-[#f1f5f9] transition-colors">
                        <td className="py-3 px-3 text-center">
                          <input type="checkbox" className="cursor-pointer" checked={selectedRowKeys.includes(node.Id)} onChange={(e) => handleSelect(node, e.target.checked)} />
                        </td>
                        <td className="py-3 px-3">
                          <div style={{ paddingLeft: depth * 20 }} className="flex items-center gap-1.5">
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(node.Id)}
                                className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer flex-shrink-0"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            ) : (
                              <span className="w-4 flex-shrink-0" />
                            )}
                            <TruncatedText text={node.Ma} />
                          </div>
                        </td>
                        <td className="py-3 px-3"><TruncatedText text={node.Ten} /></td>
                        <td className="py-3 px-3"><TruncatedText text={node.MonHocName || ''} /></td>
                        <td className="py-3 px-3"><TruncatedText text={node.KhoiLopName || ''} /></td>
                        <td className="py-3 px-3"><TruncatedText text={node.ThoiGianTao ? new Date(node.ThoiGianTao).toLocaleDateString('vi-VN') : ''} /></td>
                        <td className="py-3 px-3 text-center">{getTrangThaiTag(node.TrangThai)}</td>
                        <td className="py-3 px-3 text-center">
                          <Space size="small">
                            <Button
                              type="text"
                              icon={<Eye size={16} className="text-blue-600" />}
                              className="hover:bg-blue-50 flex items-center justify-center p-2 rounded-md"
                              title="Xem chi tiết"
                              onClick={() => handleOpenDetail(node)}
                            />
                            {(node.TrangThai === 0 || node.TrangThai === 3) && (
                              <Button
                                type="text"
                                onClick={() => handleOpenUpdate(node)}
                                icon={<Edit size={16} className="text-blue-600" />}
                                className="hover:bg-blue-50 flex items-center justify-center p-2 rounded-md"
                              />
                            )}
                            <Dropdown menu={renderActionMenu(node)} trigger={['click']} placement="bottomRight">
                              <Button
                                type="text"
                                icon={<MoreVertical size={16} className="text-gray-600" />}
                                className="hover:bg-gray-100 flex items-center justify-center p-2 rounded-md"
                              />
                            </Dropdown>
                          </Space>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Spin>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-slate-500 font-medium">
              {filteredTree.length === 0 ? '0 - 0' : `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredTree.length)}`} / {filteredTree.length} bản ghi
            </div>
            <Pagination
              current={currentPage}
              total={filteredTree.length}
              pageSize={pageSize}
              onChange={(page, size) => { setCurrentPage(page); setPageSize(size); }}
              showSizeChanger
              showQuickJumper={false}
              pageSizeOptions={['10', '20', '50', '100']}
              locale={{ items_per_page: '/ trang' }}
            />
          </div>
        </div>

        {/* Modals */}
        <CreateKhoiLopModalWrapper
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          monHocs={monHocs.filter(m => m.IsActive !== false)}
          khoiLops={khoiLops.filter(k => k.IsActive !== false)}
          isSubjectRestricted={isSubjectRestricted}
          onSave={async (values: any) => {
            try {
              await topicsApi.create({
                parent_id: values.ParentId || null,
                code: values.Ma,
                name: values.Ten,
                subject_id: values.IdMonHoc,
                grade_id: values.IdKhoiLop,
                status: 0,
                note: values.GhiChu || '',
                created_by: actorName,
              });
              toast.success('Tạo chủ đề/tiểu mục thành công!');
              fetchTopics();
              return true;
            } catch (e: any) {
              if (e.message?.includes('Mã chủ đề đã tồn tại')) {
                toast.warning(`Mã "${values.Ma}" đã tồn tại trong hệ thống. Vui lòng nhập mã khác!`);
                return 'duplicate_code';
              }
              if (e.message?.includes('Failed to fetch')) {
                toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend!');
                return false;
              }
              toast.error(e.message || 'Không thể tạo chủ đề!');
              return false;
            }
          }}
          allData={rawData.map(i => ({ Id: i.id, ParentId: i.parent_id, Ma: i.code, Ten: i.name, IdMonHoc: i.subject_id, IdKhoiLop: i.grade_id, TrangThai: i.status, IdNguoiTao: i.created_by, ThoiGianTao: i.created_at, IdNguoiGui: i.submitted_by, ThoiGianGui: i.submitted_at, IdNguoiThamDinh: i.approved_by, ThoiGianThamDinh: i.approved_at, NoiDungThamDinh: i.approval_note, GhiChu: i.note }))}
        />

        <UpdateChuDeModal
          open={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          record={selectedRecord}
          monHocs={monHocs}
          khoiLops={khoiLops}
          isSubjectRestricted={isSubjectRestricted}
          onSave={async (values) => {
            try {
              await topicsApi.update(selectedRecord!.Id, {
                parent_id: values.ParentId || null,
                code: values.Ma,
                name: values.Ten,
                subject_id: values.IdMonHoc,
                grade_id: values.IdKhoiLop,
                note: values.GhiChu || '',
                actor: actorName,
              });
              toast.success('Cập nhật chủ đề/tiểu mục thành công!');
              fetchTopics();
              return true;
            } catch (e: any) {
              if (e.message?.includes('Mã chủ đề đã tồn tại')) {
                toast.warning(`Mã "${values.Ma}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác!`);
                return 'duplicate_code';
              }
              if (e.message?.includes('Failed to fetch')) {
                toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend!');
                return false;
              }
              toast.error(e.message || 'Không thể cập nhật chủ đề!');
              return false;
            }
          }}
          allData={rawData.map(i => ({ Id: i.id, ParentId: i.parent_id, Ma: i.code, Ten: i.name, IdMonHoc: i.subject_id, IdKhoiLop: i.grade_id, TrangThai: i.status, IdNguoiTao: i.created_by, ThoiGianTao: i.created_at, IdNguoiGui: i.submitted_by, ThoiGianGui: i.submitted_at, IdNguoiThamDinh: i.approved_by, ThoiGianThamDinh: i.approved_at, NoiDungThamDinh: i.approval_note, GhiChu: i.note }))}
        />

        <DeleteChuDeModal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          itemName={selectedRecord?.Ten}
          isMultiple={isMultipleAction}
          multipleCount={selectedRowKeys.length}
          hasSubTopics={
            isMultipleAction
              ? selectedRowKeys.some(key => rawData.some(item => item.parent_id === key))
              : !!selectedRecord && rawData.some(item => item.parent_id === selectedRecord.Id)
          }
          onConfirm={async () => {
            try {
              if (isMultipleAction) {
                // Chỉ xóa các chủ đề "gốc" trong tập đã chọn — nếu cả cha lẫn con cùng
                // được chọn, xóa cha đã cascade xóa con ở backend, gọi lại delete cho
                // con sẽ 404 "Không tìm thấy chủ đề" một cách thừa thãi.
                const selectedSet = new Set(selectedRowKeys.map(k => k.toString()));
                const parentMap = new Map(rawData.map((item: any) => [item.id, item.parent_id]));
                const isDescendantOfAnotherSelected = (id: string): boolean => {
                  let current = parentMap.get(id);
                  while (current) {
                    if (selectedSet.has(current)) return true;
                    current = parentMap.get(current);
                  }
                  return false;
                };
                const rootKeys = selectedRowKeys.filter(key => !isDescendantOfAnotherSelected(key.toString()));

                for (const key of rootKeys) {
                  await topicsApi.delete(key.toString());
                }
                toast.success('Đã xóa các chủ đề được chọn!');
                setSelectedRowKeys([]);
              } else if (selectedRecord) {
                await topicsApi.delete(selectedRecord.Id);
                toast.success(`Đã xóa chủ đề "${selectedRecord.Ten}"!`);
              }
              setIsDeleteModalOpen(false);
              fetchTopics();
            } catch (e: any) {
              toast.error(e.message || 'Không thể xóa chủ đề!');
            }
          }}
        />

        <GuiThamDinhChuDeModal
          open={isGuiThamDinhModalOpen}
          onClose={() => setIsGuiThamDinhModalOpen(false)}
          itemName={selectedRecord?.Ten}
          isMultiple={isMultipleAction}
          multipleCount={selectedRowKeys.length}
          onConfirm={async () => {
            try {
              // Chủ đề/tiểu mục đã thẩm định (status 2) giữ nguyên trạng thái, không gửi lại.
              const isApproved = (id: string) => rawData.find(item => item.id === id)?.status === 2;

              if (isMultipleAction) {
                const allIdsToSubmit = getSubTopicIdsRecursive(selectedRowKeys.map(k => k.toString()))
                  .filter(id => !isApproved(id));
                if (allIdsToSubmit.length > 0) {
                  await Promise.all(allIdsToSubmit.map(id => topicsApi.submit(id, actorName)));
                }
                toast.success(
                  allIdsToSubmit.length > 0
                    ? 'Đã gửi thẩm định các chủ đề được chọn!'
                    : 'Các chủ đề được chọn đều đã thẩm định, không cần gửi lại.'
                );
                setSelectedRowKeys([]);
              } else if (selectedRecord) {
                const allIdsToSubmit = getSubTopicIdsRecursive([selectedRecord.Id])
                  .filter(id => !isApproved(id));
                if (allIdsToSubmit.length > 0) {
                  await Promise.all(allIdsToSubmit.map(id => topicsApi.submit(id, actorName)));
                  const hasChildren = allIdsToSubmit.length > 1;
                  toast.success(
                    hasChildren
                      ? `Đã gửi thẩm định chủ đề "${selectedRecord.Ten}" và các tiểu mục bên trong!`
                      : `Đã gửi thẩm định chủ đề "${selectedRecord.Ten}"!`
                  );
                } else {
                  toast.success(`Chủ đề "${selectedRecord.Ten}" đã thẩm định, giữ nguyên trạng thái.`);
                }
              }
              setIsGuiThamDinhModalOpen(false);
              fetchTopics();
            } catch (e: any) {
              toast.error(e.message || 'Không thể gửi thẩm định!');
            }
          }}
        />

        <LichSuChuDeModal
          open={isLichSuModalOpen}
          onClose={() => setIsLichSuModalOpen(false)}
          record={selectedRecord}
        />

        <DetailChuDeModal
          open={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          record={selectedRecord}
          allData={rawData.map(i => ({ Id: i.id, ParentId: i.parent_id, Ma: i.code, Ten: i.name, IdMonHoc: i.subject_id, IdKhoiLop: i.grade_id, TrangThai: i.status, IdNguoiTao: i.created_by, ThoiGianTao: i.created_at, IdNguoiGui: i.submitted_by, ThoiGianGui: i.submitted_at, IdNguoiThamDinh: i.approved_by, ThoiGianThamDinh: i.approved_at, NoiDungThamDinh: i.approval_note, GhiChu: i.note, MonHocName: i.subject_name || '', KhoiLopName: i.grade_name || '' }))}
        />
      </div>
    </ConfigProvider>
  );
}

function CreateKhoiLopModalWrapper(props: any) {
  return <CreateChuDeModal {...props} />;
}
