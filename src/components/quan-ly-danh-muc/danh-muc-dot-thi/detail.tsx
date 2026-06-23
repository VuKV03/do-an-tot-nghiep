import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch, Button, ConfigProvider, DatePicker } from 'antd';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

export interface DetailDotThiModalProps {
  open: boolean;
  onClose: () => void;
  record?: any;
}

export default function DetailDotThiModal({ open, onClose, record }: DetailDotThiModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && record) {
      const dates = record.NgayBatDau && record.NgayKetThuc 
        ? [dayjs(record.NgayBatDau, 'DD-MM-YYYY'), dayjs(record.NgayKetThuc, 'DD-MM-YYYY')]
        : [];

      form.setFieldsValue({
        Ma: record.Ma,
        Ten: record.Ten,
        NgayHieuLuc: dates,
        GhiChu: record.GhiChu || '',
        isActive: record.IsActive,
      });
    } else if (!open) {
      form.resetFields();
    }
  }, [open, record, form]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 6,
        },
      }}
    >
      <Modal
        title={
          <div className="text-[20px] font-semibold text-slate-800 pb-3 border-b border-gray-200">
            Chi tiết đợt thi
          </div>
        }
        open={open}
        onCancel={onClose}
        footer={null}
        width={600}
        closeIcon={<span className="text-gray-500 text-xl font-bold">✕</span>}
        centered
        styles={{
          header: { marginBottom: 0, paddingBottom: 0 },
          body: { paddingTop: '16px' },
        }}
      >
        <div className="mb-4 text-[#1e3a8a] font-semibold text-[17px]">
          Thông tin đợt thi
        </div>

        <Form form={form} layout="vertical">
          <Form.Item
            name="Ma"
            label={<span className="text-gray-700 font-medium text-[15px]">Mã đợt thi</span>}
          >
            <Input disabled className="h-[42px] text-base text-gray-800 cursor-default bg-gray-50 font-medium" />
          </Form.Item>

          <Form.Item
            name="Ten"
            label={<span className="text-gray-700 font-medium text-[15px]">Tên đợt thi</span>}
          >
            <Input disabled className="h-[42px] text-base text-gray-800 cursor-default bg-gray-50 font-medium" />
          </Form.Item>

          <Form.Item
            name="NgayHieuLuc"
            label={<span className="text-gray-700 font-medium text-[15px]">Ngày hiệu lực</span>}
          >
            <RangePicker
              disabled
              className="h-[42px] text-base w-full text-gray-800 cursor-default bg-gray-50 font-medium"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="GhiChu"
            label={<span className="text-gray-700 font-medium text-[15px]">Ghi chú</span>}
          >
            <TextArea
              disabled
              rows={4}
              className="text-base py-2 text-gray-800 cursor-default bg-gray-50 font-medium"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-700 font-medium text-[15px]">Tình trạng</span>}
          >
            <div className="flex items-center gap-3 mt-1">
              <Form.Item name="isActive" valuePropName="checked" noStyle>
                <Switch disabled />
              </Form.Item>
              <span className="text-gray-800 text-[15px] font-medium">
                {record?.IsActive === false ? 'Không hoạt động' : 'Hoạt động'}
              </span>
            </div>
          </Form.Item>

          <div className="flex justify-center gap-4 mt-10 pt-5 border-t border-gray-200">
            <Button
              onClick={onClose}
              className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold hover:bg-blue-50 text-[15px]"
            >
              Đóng
            </Button>
          </div>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}
