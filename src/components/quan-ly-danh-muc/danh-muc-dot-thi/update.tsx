import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch, Button, ConfigProvider, DatePicker } from 'antd';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

export interface UpdateDotThiModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (values: any) => Promise<boolean> | boolean;
  record?: any;
}

export default function UpdateDotThiModal({ open, onClose, onSave, record }: UpdateDotThiModalProps) {
  const [form] = Form.useForm();

  // Watch isActive value to update the label dynamically
  const isActive = Form.useWatch('isActive', form);

  useEffect(() => {
    if (open && record) {
      const parseDate = (dateStr: string) => {
        if (!dateStr) return null;
        // Try parsing assuming YYYY-MM-DD or standard ISO format first
        const parsed = dayjs(dateStr);
        if (parsed.isValid() && dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
          return parsed;
        }
        // Fallback to DD-MM-YYYY
        return dayjs(dateStr, 'DD-MM-YYYY');
      };

      const dates = record.NgayBatDau && record.NgayKetThuc
        ? [parseDate(record.NgayBatDau), parseDate(record.NgayKetThuc)]
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

  const handleFinish = async (values: any) => {
    const { NgayHieuLuc, ...rest } = values;
    let NgayBatDau = null;
    let NgayKetThuc = null;
    if (NgayHieuLuc && NgayHieuLuc.length === 2) {
      NgayBatDau = NgayHieuLuc[0].format('DD-MM-YYYY');
      NgayKetThuc = NgayHieuLuc[1].format('DD-MM-YYYY');
    }

    if (onSave) {
      const success = await onSave({
        ...record,
        ...rest,
        NgayBatDau,
        NgayKetThuc,
      });
      if (success) {
        onClose();
      }
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

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
            Cập nhật kỳ thi
          </div>
        }
        open={open}
        onCancel={handleCancel}
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
          Thông tin kỳ thi
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={(label, info) => (
            <div className="flex items-center gap-1">
              {label} {info.required && <span className="text-red-500">*</span>}
            </div>
          )}
        >
          <Form.Item
            name="Ma"
            label={<span className="text-gray-700 font-medium text-[15px]">Mã kỳ thi</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mã kỳ thi' }]}
          >
            <Input placeholder="Nhập" className="h-[42px] text-base" />
          </Form.Item>

          <Form.Item
            name="Ten"
            label={<span className="text-gray-700 font-medium text-[15px]">Tên kỳ thi</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên kỳ thi' }]}
          >
            <Input placeholder="Nhập" className="h-[42px] text-base" />
          </Form.Item>

          <Form.Item
            name="NgayHieuLuc"
            label={<span className="text-gray-700 font-medium text-[15px]">Ngày hiệu lực</span>}
            rules={[{ required: true, message: 'Vui lòng chọn ngày hiệu lực' }]}
          >
            <RangePicker
              className="h-[42px] text-base w-full"
              placeholder={['Bắt đầu', 'Kết thúc']}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="GhiChu"
            label={<span className="text-gray-700 font-medium text-[15px]">Ghi chú</span>}
          >
            <TextArea
              rows={4}
              placeholder="Nhập ghi chú cho danh mục kỳ thi"
              className="text-base py-2"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-700 font-medium text-[15px]">Tình trạng</span>}
          >
            <div className="flex items-center gap-3 mt-1">
              <Form.Item name="isActive" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
              <span className="text-gray-800 text-[15px]">
                {isActive === false ? 'Không hoạt động' : 'Hoạt động'}
              </span>
            </div>
          </Form.Item>

          <div className="flex justify-center gap-4 mt-10 pt-5 border-t border-gray-200">
            <Button
              onClick={handleCancel}
              className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold hover:bg-blue-50 text-[15px]"
            >
              Đóng
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none px-10 h-10 font-semibold text-[15px]"
            >
              Lưu
            </Button>
          </div>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}
