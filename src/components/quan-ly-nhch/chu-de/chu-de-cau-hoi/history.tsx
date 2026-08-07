import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, ConfigProvider, Table, Input, Select, DatePicker, Button, Spin } from 'antd';
import { toast } from '../../../../utils/toast';
import { Eye } from 'lucide-react';
import { FileExcelOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ChuDeType } from './index';
import { topicsApi } from '../../../../services/danhMucApi.ts';
import { exportToExcel, type ExcelColumn } from '../../../../utils/excelExport';

const { RangePicker } = DatePicker;

export interface LichSuChuDeModalProps {
  open: boolean;
  onClose: () => void;
  record?: ChuDeType | null;
}

interface HistoryRecordType {
  id: string;
  topic_id: string;
  action: string;
  actor: string;
  timestamp: string;
  note: string;
  /** Nhận xét thật của người thẩm định (Đồng ý/Từ chối) — chỉ có ở 2 hành động này, "Thêm mới"/"Sửa"/
   * "Gửi thẩm định" không có nhận xét nên trường này rỗng/undefined. */
  comment?: string | null;
}

export default function LichSuChuDeModal({ open, onClose, record }: LichSuChuDeModalProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<HistoryRecordType[]>([]);
  // Bản ghi lịch sử đang xem chi tiết — nút "Xem chi tiết" trước đây không gắn onClick nên bấm
  // không có tác dụng gì.
  const [detailRecord, setDetailRecord] = useState<HistoryRecordType | null>(null);

  // Filters
  const [searchNoiDung, setSearchNoiDung] = useState('');
  const [searchDates, setSearchDates] = useState<any>(null);
  const [searchAction, setSearchAction] = useState('Tất cả');

  const fetchHistory = useCallback(async () => {
    if (!record?.Id) return;
    setLoading(true);
    try {
      const res = await topicsApi.getHistory(record.Id);
      setRawData(res.data);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Không thể tải lịch sử!');
    } finally {
      setLoading(false);
    }
  }, [record?.Id]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    } else {
      setRawData([]);
      setSearchNoiDung('');
      setSearchDates(null);
      setSearchAction('Tất cả');
    }
  }, [open, fetchHistory]);

  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      const matchText = !searchNoiDung.trim() || item.note.toLowerCase().includes(searchNoiDung.trim().toLowerCase());
      
      const matchAction = searchAction === 'Tất cả' || item.action === searchAction;

      let matchDate = true;
      if (searchDates && searchDates[0] && searchDates[1] && item.timestamp) {
        const itemTime = new Date(item.timestamp).getTime();
        const start = searchDates[0].startOf('day').valueOf();
        const end = searchDates[1].endOf('day').valueOf();
        matchDate = itemTime >= start && itemTime <= end;
      }

      return matchText && matchAction && matchDate;
    });
  }, [rawData, searchNoiDung, searchAction, searchDates]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const excelColumns: ExcelColumn<HistoryRecordType>[] = [
    { header: 'STT', accessor: (_row, i) => i + 1, width: 6, align: 'center' },
    { header: 'Người thực hiện', accessor: row => row.actor, width: 22 },
    { header: 'Thời gian thực hiện', accessor: row => row.timestamp ? new Date(row.timestamp).toLocaleString('vi-VN') : '', width: 20, align: 'center' },
    { header: 'Nội dung thực hiện', accessor: row => row.note, width: 50 },
  ];

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      return;
    }
    const fileName = `LichSuChuDe_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(filteredData, excelColumns, fileName, 'Lịch sử chủ đề');
    toast.success('Xuất báo cáo Excel thành công!');
  };

  const columns: ColumnsType<HistoryRecordType> = [
    {
      title: 'STT',
      dataIndex: 'stt',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'actor',
      key: 'actor',
      width: 220,
    },
    {
      title: 'Thời gian thực hiện',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (v) => v ? new Date(v).toLocaleString('vi-VN') : '',
    },
    {
      title: 'Nội dung thực hiện',
      dataIndex: 'note',
      key: 'note',
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      width: 100,
      render: (_, row) => (
        <Button
          type="text"
          icon={<Eye size={16} className="text-blue-600" />}
          className="bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md mx-auto"
          title="Xem chi tiết"
          onClick={() => setDetailRecord(row)}
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
      <Modal
        title={
          <div className="text-[18px] font-semibold text-slate-800 pb-4 border-b border-gray-200">
            Lịch sử chỉnh sửa, thẩm định chủ đề
          </div>
        }
        open={open}
        onCancel={onClose}
        footer={null}
        width={1000}
        closeIcon={<span className="text-gray-500 text-xl font-bold">✕</span>}
        centered
        styles={{
          header: { marginBottom: 0, paddingBottom: 0 },
          body: { paddingTop: '20px' },
        }}
      >
        <div className="flex flex-col gap-8 min-h-[500px]">
          {/* Search Section */}
          <div className="flex flex-col gap-4 border-b border-gray-100 pb-6">
            <h3 className="text-[#1e3a8a] font-semibold text-[15px] m-0">Tìm kiếm thông tin</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-600 text-sm font-medium">Nội dung thực hiện</label>
                <Input 
                  placeholder="Nhập" 
                  className="h-[38px] w-full" 
                  value={searchNoiDung}
                  onChange={(e) => setSearchNoiDung(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-600 text-sm font-medium">Ngày thực hiện</label>
                <RangePicker
                  className="h-[38px] w-full"
                  placeholder={['Bắt đầu', 'Kết thúc']}
                  format="DD/MM/YYYY"
                  value={searchDates}
                  onChange={setSearchDates}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-600 text-sm font-medium">Loại thao tác</label>
                <Select
                  value={searchAction}
                  onChange={setSearchAction}
                  className="h-[38px] w-full"
                  options={[
                    { value: 'Tất cả', label: 'Tất cả' },
                    { value: 'Thêm mới', label: 'Thêm mới' },
                    { value: 'Sửa', label: 'Sửa' },
                    { value: 'Gửi thẩm định', label: 'Gửi thẩm định' },
                    { value: 'Từ chối', label: 'Từ chối' },
                    { value: 'Đồng ý', label: 'Đồng ý' },
                  ]}
                />
              </div>
            </div>

            <div className="flex justify-center mt-2">
              <Button type="primary" className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none px-8 h-[38px] font-medium">
                Tìm kiếm
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[#1e3a8a] font-semibold text-[15px] m-0">Kết quả đánh giá</h3>
              <Button type="primary" icon={<FileExcelOutlined />} className="!bg-green-600 !border-green-600 !text-white h-[36px] font-medium px-4 hover:!bg-green-700" onClick={handleExportExcel}>
                Xuất Excel
              </Button>
            </div>

            <Spin spinning={loading}>
              <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={filteredData}
                rowKey="id"
                pagination={{
                  total: filteredData.length,
                  showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
                  showSizeChanger: true,
                  defaultPageSize: 10,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  locale: { items_per_page: '/ trang' },
                  className: 'mt-6',
                }}
                className="border-t border-gray-200"
              />
            </Spin>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-center border-t border-gray-200 pt-5 mt-auto">
            <Button
              onClick={onClose}
              className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold hover:bg-blue-50 text-[15px]"
            >
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* Chi tiết 1 dòng lịch sử */}
      <Modal
        title={
          <span className="text-slate-800 font-bold text-[15px] tracking-wide">
            Chi tiết lịch sử
          </span>
        }
        open={!!detailRecord}
        onCancel={() => setDetailRecord(null)}
        centered
        width={480}
        footer={
          <div className="flex justify-center">
            <Button
              onClick={() => setDetailRecord(null)}
              className="rounded border border-blue-600 text-blue-600 font-bold text-xs px-6 h-8 flex items-center justify-center hover:bg-blue-50 transition-colors"
            >
              Đóng
            </Button>
          </div>
        }
      >
        {detailRecord && (
          <div className="flex flex-col gap-3 text-sm py-1">
            {record && (
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Chủ đề</div>
                <div className="font-medium text-slate-800">{record.Ten} <span className="text-gray-400 font-normal">({record.Ma})</span></div>
              </div>
            )}
            <div>
              <div className="text-gray-500 text-xs mb-0.5">Loại thao tác</div>
              <div className="font-medium text-slate-800">{detailRecord.action}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-0.5">Người thực hiện</div>
              <div className="font-medium text-slate-800">{detailRecord.actor}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-0.5">Thời gian thực hiện</div>
              <div className="font-medium text-slate-800">
                {detailRecord.timestamp ? new Date(detailRecord.timestamp).toLocaleString('vi-VN') : ''}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-0.5">Nội dung thực hiện</div>
              <div className="font-medium text-slate-800 whitespace-pre-wrap">{detailRecord.note}</div>
            </div>
            {/* Chỉ có ở hành động Đồng ý/Từ chối — "Thêm mới"/"Sửa"/"Gửi thẩm định" không có nhận xét. */}
            {detailRecord.comment && (
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Nhận xét</div>
                <div className="font-medium text-slate-800 whitespace-pre-wrap">{detailRecord.comment}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </ConfigProvider>
  );
}
