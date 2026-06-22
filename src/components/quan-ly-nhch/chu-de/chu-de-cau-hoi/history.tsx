import React, { useState } from 'react';
import { Modal, ConfigProvider, Table, Input, Select, DatePicker, Button, Space } from 'antd';
import { Eye } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import type { ChuDeType } from './index';

const { RangePicker } = DatePicker;

export interface LichSuChuDeModalProps {
  open: boolean;
  onClose: () => void;
  record?: ChuDeType | null;
}

interface HistoryRecordType {
  id: string;
  nguoiThucHien: string;
  thoiGian: string;
  noiDung: string;
}

// Mock data matching the screenshot
const mockHistoryData: HistoryRecordType[] = [
  { id: '1', nguoiThucHien: '4005- Nguyễn Văn A', thoiGian: 'dd/mm/yyyy\n00:00:00', noiDung: "Thêm mới chủ đề 'Tên chủ đề...'" },
  { id: '2', nguoiThucHien: '4005- Nguyễn Văn A', thoiGian: 'dd/mm/yyyy\n00:00:00', noiDung: 'Sửa thông tin "ghi chú..."' },
  { id: '3', nguoiThucHien: '4005- Nguyễn Văn A', thoiGian: 'dd/mm/yyyy\n00:00:00', noiDung: "Sửa thông tin chủ đề 'Tên chủ đề'" },
  { id: '4', nguoiThucHien: '4005- Nguyễn Văn A', thoiGian: 'dd/mm/yyyy\n00:00:00', noiDung: "Từ chối thẩm định chủ đề 'Tên chủ đề...'" },
  { id: '5', nguoiThucHien: '4005- Nguyễn Văn A', thoiGian: 'dd/mm/yyyy\n00:00:00', noiDung: "Đồng ý thẩm định chủ đề 'Tên chủ đề'" },
];

export default function LichSuChuDeModal({ open, onClose, record }: LichSuChuDeModalProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
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
      dataIndex: 'nguoiThucHien',
      key: 'nguoiThucHien',
      width: 220,
    },
    {
      title: 'Thời gian thực hiện',
      dataIndex: 'thoiGian',
      key: 'thoiGian',
      width: 180,
      render: (text) => <div className="whitespace-pre-line">{text}</div>,
    },
    {
      title: 'Nội dung thực hiện',
      dataIndex: 'noiDung',
      key: 'noiDung',
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      width: 100,
      render: () => (
        <Button
          type="text"
          icon={<Eye size={16} className="text-blue-600" />}
          className="bg-blue-50 hover:bg-blue-100 flex items-center justify-center p-2 rounded-md mx-auto"
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
                <Input placeholder="Nhập" className="h-[38px] w-full" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-600 text-sm font-medium">Ngày thực hiện</label>
                <RangePicker
                  className="h-[38px] w-full"
                  placeholder={['Bắt đầu', 'Kết thúc']}
                  format="DD/MM/YYYY"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-600 text-sm font-medium">Loại thao tác</label>
                <Select
                  defaultValue="Tất cả"
                  className="h-[38px] w-full"
                  options={[
                    { value: 'Tất cả', label: 'Tất cả' },
                    { value: 'Thêm mới', label: 'Thêm mới' },
                    { value: 'Sửa', label: 'Sửa' },
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
              <Button className="border-[#1d4ed8] text-[#1d4ed8] h-[36px] font-medium px-4 hover:bg-blue-50">
                Xuất Excel
              </Button>
            </div>

            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={mockHistoryData}
              rowKey="id"
              pagination={{
                total: 1234,
                showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
                showSizeChanger: true,
                defaultPageSize: 10,
                pageSizeOptions: ['10', '20', '50', '100'],
                locale: { items_per_page: '/ trang' },
                className: 'mt-6',
              }}
              className="border-t border-gray-200"
            />
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
    </ConfigProvider>
  );
}
