import React from 'react';
import { Modal, Form, Input, Switch, Button, ConfigProvider } from 'antd';

const { TextArea } = Input;

export interface CreateLoaiHinhCauHoiModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (values: any) => void;
}

export default function CreateLoaiHinhCauHoiModal({ open, onClose, onSave }: CreateLoaiHinhCauHoiModalProps) {
  const [form] = Form.useForm();

  // Watch isActive value to update the label dynamically
  const isActive = Form.useWatch('isActive', form);

  const handleFinish = (values: any) => {
    if (onSave) {
      onSave(values);
    }
    form.resetFields();
    onClose();
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
            Thêm mới loại hình câu hỏi
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
          Thông tin loại hình câu hỏi
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ isActive: true }}
          requiredMark={(label, info) => (
            <div className="flex items-center gap-1">
              {label} {info.required && <span className="text-red-500">*</span>}
            </div>
          )}
        >
          <Form.Item
            name="Ma"
            label={<span className="text-gray-700 font-medium text-[15px]">Mã loại hình câu hỏi</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mã loại hình câu hỏi' }]}
          >
            <Input placeholder="Nhập" className="h-[42px] text-base" />
          </Form.Item>

          <Form.Item
            name="Ten"
            label={<span className="text-gray-700 font-medium text-[15px]">Tên loại hình câu hỏi</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên loại hình câu hỏi' }]}
          >
            <Input placeholder="Nhập" className="h-[42px] text-base" />
          </Form.Item>

          <Form.Item
            name="GhiChu"
            label={<span className="text-gray-700 font-medium text-[15px]">Ghi chú</span>}
          >
            <TextArea
              rows={4}
              placeholder="Nhập ghi chú cho loại hình câu hỏi."
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
