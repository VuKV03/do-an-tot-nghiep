import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, ConfigProvider, Tooltip, message, Spin } from 'antd';
import { ChevronDown, ChevronUp, HelpCircle, FileText } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import ChuDeCauHoi from '../chu-de-cau-hoi';
import ReviewModal from './review';
import { topicsApi, dmMonThiApi, dmKhoiLopApi } from '../../../../services/danhMucApi.ts';

const { RangePicker } = DatePicker;

interface ThamDinhType {
  Key: string;
  Id: string;
  Ma: string;
  Ten: string;
  MonThi: string;
  KhoiLop: string;
  NgayTao: string;
  TrangThai: 'approved' | 'rejected' | 'pending';
  NguoiTao?: string;
  NguoiDuyetCuoi?: string;
  NgayDuyetCuoi?: string;
  GhiChu?: string | null;
  ParentId?: string | null;
  children?: ThamDinhType[];
}

function buildTree(flatList: ThamDinhType[]): ThamDinhType[] {
  const map: { [key: string]: ThamDinhType } = {};
  const roots: ThamDinhType[] = [];

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

  const cleanEmptyChildren = (nodes: ThamDinhType[]) => {
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

export default function ThamDinhChuDeMain() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [monThis, setMonThis] = useState<{ id: string; name: string }[]>([]);
  const [khoiLops, setKhoiLops] = useState<{ id: string; name: string }[]>([]);

  const [activeTab, setActiveTab] = useState<'topic' | 'review'>('topic');
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Filters State
  const [searchText, setSearchText] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [searchGrade, setSearchGrade] = useState<string[]>([]);
  const [searchParent, setSearchParent] = useState('Tất cả');
  const [searchStatus, setSearchStatus] = useState('Chờ thẩm định');
  const [filterDates, setFilterDates] = useState<any>(null);

  // Modal State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ThamDinhType | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mtRes, klRes] = await Promise.all([
        topicsApi.list(),
        dmMonThiApi.list(),
        dmKhoiLopApi.list(),
      ]);
      setRawData(tRes.data);
      const mappedMonThi = mtRes.data.map(i => ({ id: i.id, name: i.name }));
      const mappedKhoiLop = klRes.data.map(i => ({ id: i.id, name: i.name }));
      setMonThis(mappedMonThi);
      setKhoiLops(mappedKhoiLop);
    } catch (e: any) {
      console.error(e);
      message.error(e.message || 'Không thể tải dữ liệu thẩm định!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenReview = (record: ThamDinhType) => {
    setSelectedRecord(record);
    setIsReviewOpen(true);
  };

  const handleOpenReviewMultiple = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất một chủ đề để thẩm định');
      return;
    }
    const firstKey = selectedRowKeys[0];
    const findRecord = (data: ThamDinhType[]): ThamDinhType | null => {
      for (const item of data) {
        if (item.Key === firstKey) return item;
        if (item.children) {
          const child = findRecord(item.children);
          if (child) return child;
        }
      }
      return null;
    };
    const recordToReview = findRecord(filteredTree);
    setSelectedRecord(recordToReview || filteredTree[0]);
    setIsReviewOpen(true);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const getStatusBadge = (status: 'approved' | 'rejected' | 'pending') => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-3 py-1 rounded border border-emerald-400 text-emerald-600 bg-emerald-50 text-sm font-medium">
            Đã thẩm định
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded border border-rose-400 text-rose-500 bg-rose-50 text-sm font-medium">
            Từ chối
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 rounded border border-red-300 text-red-500 bg-red-50 text-sm font-medium">
            Chờ thẩm định
          </span>
        );
      default:
        return null;
    }
  };

  const filteredTree = useMemo(() => {
    const mapped: ThamDinhType[] = rawData.map((item: any) => ({
      Key: item.id,
      Id: item.id,
      Ma: item.code,
      Ten: item.name,
      MonThi: item.subject_name || '',
      KhoiLop: item.grade_name || '',
      NgayTao: item.created_at,
      TrangThai: item.status === 2 ? 'approved' : item.status === 3 ? 'rejected' : 'pending',
      NguoiTao: item.created_by || 'user1',
      NguoiDuyetCuoi: item.approved_by || 'Chưa có thông tin',
      NgayDuyetCuoi: item.approved_at ? new Date(item.approved_at).toLocaleDateString('vi-VN') : 'Chưa có thông tin',
      GhiChu: item.note || null,
      ParentId: item.parent_id
    }));

    const filteredFlat = mapped.filter((item) => {
      const matchText = !searchText ||
        item.Ten.toLowerCase().includes(searchText.toLowerCase()) ||
        item.Ma.toLowerCase().includes(searchText.toLowerCase());

      const matchSubject = !searchSubject || item.MonThi === searchSubject;
      const matchGrade = searchGrade.length === 0 || searchGrade.includes(item.KhoiLop);

      let matchStatus = true;
      if (searchStatus !== 'Tất cả') {
        if (searchStatus === 'Chờ thẩm định') matchStatus = item.TrangThai === 'pending';
        else if (searchStatus === 'Đã thẩm định') matchStatus = item.TrangThai === 'approved';
        else if (searchStatus === 'Từ chối') matchStatus = item.TrangThai === 'rejected';
      }

      let matchDate = true;
      if (filterDates && filterDates[0] && filterDates[1] && item.NgayTao) {
        const itemTime = new Date(item.NgayTao).getTime();
        const start = filterDates[0].startOf('day').valueOf();
        const end = filterDates[1].endOf('day').valueOf();
        matchDate = itemTime >= start && itemTime <= end;
      }

      return matchText && matchSubject && matchGrade && matchStatus && matchDate;
    });

    return buildTree(filteredFlat);
  }, [rawData, searchText, searchSubject, searchGrade, searchStatus, filterDates]);

  const columns: ColumnsType<ThamDinhType> = [
    {
      title: 'Mã chủ đề/tiểu mục',
      dataIndex: 'Ma',
      key: 'Ma',
      width: 180,
    },
    {
      title: 'Nội dung chủ đề/tiểu mục',
      dataIndex: 'Ten',
      key: 'Ten',
    },
    {
      title: 'Môn học',
      dataIndex: 'MonThi',
      key: 'MonThi',
      width: 120,
    },
    {
      title: 'Khối lớp',
      dataIndex: 'KhoiLop',
      key: 'KhoiLop',
      width: 120,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'NgayTao',
      key: 'NgayTao',
      width: 140,
      render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      key: 'TrangThai',
      width: 160,
      render: (status) => getStatusBadge(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      width: 100,
      render: (_, record) => (
        <Button
          type="text"
          icon={<FileText size={16} className="text-blue-600" />}
          className="bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md mx-auto"
          onClick={() => handleOpenReview(record)}
          title="Thẩm định chi tiết"
        />
      ),
    },
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
      <div className="pt-3 px-6 pb-6 flex flex-col gap-6 bg-white min-h-[calc(100vh-200px)]">
        {/* Tab Headers */}
        <div className="flex gap-1 border-b border-gray-300 relative">
          <button
            onClick={() => setActiveTab('topic')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'topic'
                ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
            style={{
              borderBottomColor: activeTab === 'topic' ? '#eff6ff' : undefined
            }}
          >
            Chủ đề câu hỏi
          </button>
          <button
            onClick={() => { setActiveTab('review'); fetchData(); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'review'
                ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
            style={{
              borderBottomColor: activeTab === 'review' ? '#eff6ff' : undefined
            }}
          >
            Thẩm định chủ đề
          </button>
        </div>

        {/* Render Tab Contents */}
        {activeTab === 'topic' ? (
          <div className="animate-in fade-in duration-300">
            <ChuDeCauHoi />
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Search Information Panel */}
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
                    {/* Tên chủ đề, tiểu mục */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-gray-600 text-sm font-medium">Tên chủ đề, tiểu mục</label>
                      <Input
                        placeholder="Nhập"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="h-10 w-full text-sm"
                      />
                    </div>

                    {/* Môn thi */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-gray-600 text-sm font-medium">
                        Môn thi <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={searchSubject}
                        onChange={setSearchSubject}
                        className="h-10 w-full"
                        options={[
                          { value: '', label: 'Tất cả' },
                          ...monThis.map(m => ({ value: m.name, label: m.name }))
                        ]}
                      />
                    </div>

                    {/* Khối lớp */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-gray-600 text-sm font-medium">Khối lớp</label>
                      <Select
                        mode="multiple"
                        maxTagCount="responsive"
                        placeholder="Chọn khối lớp"
                        value={searchGrade}
                        onChange={setSearchGrade}
                        className="min-h-10 w-full text-sm"
                        options={khoiLops.map(k => ({ value: k.name, label: k.name }))}
                      />
                    </div>

                    {/* Trạng thái */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-gray-600 text-sm font-medium">Trạng thái</label>
                      <Select
                        value={searchStatus}
                        onChange={setSearchStatus}
                        className="h-10 w-full"
                        options={[
                          { value: 'Tất cả', label: 'Tất cả' },
                          { value: 'Chờ thẩm định', label: 'Chờ thẩm định' },
                          { value: 'Đã thẩm định', label: 'Đã thẩm định' },
                          { value: 'Từ chối', label: 'Từ chối' },
                        ]}
                      />
                    </div>

                    {/* Ngày tạo */}
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

            {/* Results Grid Section */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-[#1e3a8a] font-bold text-lg">Kết quả tìm kiếm</h2>
                <Space>
                  <Button
                    type="primary"
                    className="bg-[#1e3a8a] hover:bg-[#1d4ed8] border-none h-10 font-semibold px-6"
                    onClick={handleOpenReviewMultiple}
                  >
                    Thẩm định
                  </Button>
                  <Button className="border-[#1d4ed8] text-[#1d4ed8] h-10 font-semibold px-6 hover:bg-blue-50">
                    Xuất Excel
                  </Button>
                </Space>
              </div>

              {/* Tree Table */}
              <Spin spinning={loading}>
                <Table
                  rowSelection={rowSelection}
                  columns={columns}
                  dataSource={filteredTree}
                  pagination={{
                    total: filteredTree.length,
                    showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
                    showSizeChanger: true,
                    defaultPageSize: 10,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    locale: { items_per_page: '/ trang' },
                    className: 'mt-6'
                  }}
                  className="border-t border-gray-100"
                />
              </Spin>
            </div>

            {/* Review Dialog */}
            <ReviewModal
              open={isReviewOpen}
              onClose={() => setIsReviewOpen(false)}
              record={selectedRecord}
              onApprove={async (comment) => {
                try {
                  await topicsApi.approve(selectedRecord!.Id, comment);
                  message.success(`Đã phê duyệt chủ đề: "${selectedRecord?.Ten}"`);
                  fetchData();
                } catch (e: any) {
                  message.error(e.message || 'Không thể phê duyệt chủ đề!');
                }
              }}
              onReject={async (comment) => {
                try {
                  await topicsApi.reject(selectedRecord!.Id, comment);
                  message.error(`Từ chối chủ đề: "${selectedRecord?.Ten}"`);
                  fetchData();
                } catch (e: any) {
                  message.error(e.message || 'Không thể từ chối chủ đề!');
                }
              }}
            />
          </div>
        )}
      </div>
    </ConfigProvider>
  );
}
