import React, { useEffect } from 'react';
import { Button, ConfigProvider, Form, Input, Modal, Switch } from 'antd';
import type { DmMonThiType } from './index.tsx';

const { TextArea } = Input;

export interface DetailSubjectCategoryModalProps {
  open: boolean;
  onClose: () => void;
  record?: DmMonThiType | null;
}

export default function DetailSubjectCategoryModal({ open, onClose, record }: DetailSubjectCategoryModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && record) {
      form.setFieldsValue({
        code: record.code,
        name: record.name,
        note: record.note || '',
        is_active: record.is_active,
        created_at: record.created_at,
        updated_at: record.updated_at || '',
      });
    } else if (!open) {
      form.resetFields();
    }
  }, [open, record, form]);

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1d4ed8', borderRadius: 6 } }}>
      <Modal
        title={<div className="text-[20px] font-semibold text-slate-800 pb-3 border-b border-gray-200">Chi tiết môn thi</div>}
        open={open}
        onCancel={onClose}
        footer={null}
        width={600}
        closeIcon={<span className="text-gray-500 text-xl font-bold">✕</span>}
        centered
        styles={{ header: { marginBottom: 0, paddingBottom: 0 }, body: { paddingTop: '16px' } }}
      >
        <div className="mb-4 text-[#1e3a8a] font-semibold text-[17px]">Thông tin môn thi</div>

        <Form form={form} layout="vertical">
          <Form.Item name="code" label={<span className="text-gray-700 font-medium text-[15px]">Mã môn thi</span>}>
            <Input disabled className="h-[42px] text-base text-gray-800 cursor-default bg-gray-50 font-medium uppercase" />
          </Form.Item>

          <Form.Item name="name" label={<span className="text-gray-700 font-medium text-[15px]">Tên môn thi</span>}>
            <Input disabled className="h-[42px] text-base text-gray-800 cursor-default bg-gray-50 font-medium" />
          </Form.Item>

          <Form.Item name="note" label={<span className="text-gray-700 font-medium text-[15px]">Ghi chú</span>}>
            <TextArea disabled rows={4} className="text-base py-2 text-gray-800 cursor-default bg-gray-50 font-medium" />
          </Form.Item>

          <Form.Item label={<span className="text-gray-700 font-medium text-[15px]">Tình trạng</span>}>
            <div className="flex items-center gap-3 mt-1">
              <Form.Item name="is_active" valuePropName="checked" noStyle><Switch disabled /></Form.Item>
              <span className="text-gray-800 text-[15px] font-medium">{record?.is_active === false ? 'Không hoạt động' : 'Hoạt động'}</span>
            </div>
          </Form.Item>

          <Form.Item name="created_at" label={<span className="text-gray-700 font-medium text-[15px]">Ngày tạo</span>}>
            <Input disabled className="h-[42px] text-base text-gray-800 cursor-default bg-gray-50 font-medium" />
          </Form.Item>

          <Form.Item name="updated_at" label={<span className="text-gray-700 font-medium text-[15px]">Ngày cập nhật</span>}>
            <Input disabled className="h-[42px] text-base text-gray-800 cursor-default bg-gray-50 font-medium" />
          </Form.Item>

          <div className="flex justify-center gap-4 mt-10 pt-5 border-t border-gray-200">
            <Button onClick={onClose} className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold hover:bg-blue-50 text-[15px]">Đóng</Button>
          </div>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}
