import React, { useEffect } from 'react';
import { Button, ConfigProvider, Form, Input, Modal, Switch } from 'antd';
import type { DmMonHocType } from './index.tsx';

const { TextArea } = Input;

export interface UpdateSubjectCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (values: Partial<DmMonHocType>) => Promise<boolean> | boolean;
  record?: DmMonHocType | null;
}

export default function UpdateSubjectCategoryModal({
  open, onClose, onSave, record,
}: UpdateSubjectCategoryModalProps) {
  const [form] = Form.useForm();
  const isActive = Form.useWatch('is_active', form);

  useEffect(() => {
    if (open && record) {
      form.setFieldsValue({
        code: record.code,
        name: record.name,
        note: record.note || '',
        is_active: record.is_active,
      });
    } else if (!open) {
      form.resetFields();
    }
  }, [open, record, form]);

  const handleFinish = async (values: Partial<DmMonHocType>) => {
    if (onSave) {
      const success = await onSave({ ...record, ...values });
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
    <ConfigProvider theme={{ token: { colorPrimary: '#1d4ed8', borderRadius: 6 } }}>
      <Modal
        title={<div className="text-[20px] font-semibold text-slate-800 pb-3 border-b border-gray-200">Cập nhật môn học</div>}
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={600}
        closeIcon={<span className="text-gray-500 text-xl font-bold">✕</span>}
        centered
        styles={{ header: { marginBottom: 0, paddingBottom: 0 }, body: { paddingTop: '16px' } }}
      >
        <div className="mb-4 text-[#1e3a8a] font-semibold text-[17px]">Thông tin môn học</div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={(label, info) => (
            <div className="flex items-center gap-1">{label} {info.required && <span className="text-red-500">*</span>}</div>
          )}
        >
          <Form.Item name="code" label={<span className="text-gray-700 font-medium text-[15px]">Mã môn học</span>} rules={[{ required: true, message: 'Vui lòng nhập mã môn học' }]}>
            <Input placeholder="Nhập" className="h-[42px] text-base uppercase" maxLength={50} />
          </Form.Item>

          <Form.Item name="name" label={<span className="text-gray-700 font-medium text-[15px]">Tên môn học</span>} rules={[{ required: true, message: 'Vui lòng nhập tên môn học' }]}>
            <Input placeholder="Nhập" className="h-[42px] text-base" maxLength={255} />
          </Form.Item>

          <Form.Item name="note" label={<span className="text-gray-700 font-medium text-[15px]">Ghi chú</span>}>
            <TextArea rows={4} placeholder="Nhập ghi chú cho môn học." className="text-base py-2" maxLength={500} />
          </Form.Item>

          <Form.Item label={<span className="text-gray-700 font-medium text-[15px]">Tình trạng</span>}>
            <div className="flex items-center gap-3 mt-1">
              <Form.Item name="is_active" valuePropName="checked" noStyle><Switch /></Form.Item>
              <span className="text-gray-800 text-[15px]">{isActive === false ? 'Không hoạt động' : 'Hoạt động'}</span>
            </div>
          </Form.Item>

          <div className="flex justify-center gap-4 mt-10 pt-5 border-t border-gray-200">
            <Button onClick={handleCancel} className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold hover:bg-blue-50 text-[15px]">Đóng</Button>
            <Button type="primary" htmlType="submit" className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none px-10 h-10 font-semibold text-[15px]">Lưu</Button>
          </div>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}
