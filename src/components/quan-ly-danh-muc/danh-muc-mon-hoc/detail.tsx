import React, { useEffect } from 'react';
import { Button, ConfigProvider, Form, Input, Modal, Switch } from 'antd';
import type { DmMonHocType } from './index.tsx';

const { TextArea } = Input;

export interface DetailMonHocModalProps {
  open: boolean;
  onClose: () => void;
  record?: DmMonHocType | null;
}

export default function DetailMonHocModal({ open, onClose, record }: DetailMonHocModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && record) {
      form.setFieldsValue({
        Ma: record.Ma,
        Ten: record.Ten,
        GhiChu: record.GhiChu || '',
        IsActive: record.IsActive,
        CreatedAt: record.CreatedAt,
        UpdatedAt: record.UpdatedAt || '',
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
            Chi tiết môn học
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
          Thông tin môn học
        </div>

        <Form form={form} layout="vertical">
          <Form.Item
            name="Ma"
            label={<span className="text-gray-700 font-medium text-[15px]">Mã môn học</span>}
          >
            <Input disabled className="h-[42px] text-base text-gray-800 cursor-default bg-gray-50 font-medium uppercase" />
          </Form.Item>

          <Form.Item
            name="Ten"
            label={<span className="text-gray-700 font-medium text-[15px]">Tên môn học</span>}
          >
            <Input disabled className="h-[42px] text-base text-gray-800 cursor-default bg-gray-50 font-medium" />
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

          <Form.Item label={<span className="text-gray-700 font-medium text-[15px]">Tình trạng</span>}>
            <div className="flex items-center gap-3 mt-1">
              <Form.Item name="IsActive" valuePropName="checked" noStyle>
                <Switch disabled />
              </Form.Item>
              <span className="text-gray-800 text-[15px] font-medium">
                {record?.IsActive === false ? 'Không hoạt động' : 'Hoạt động'}
              </span>
            </div>
          </Form.Item>

          <Form.Item
            name="CreatedAt"
            label={<span className="text-gray-700 font-medium text-[15px]">Ngày tạo</span>}
          >
            <Input disabled className="h-[42px] text-base text-gray-800 cursor-default bg-gray-50 font-medium" />
          </Form.Item>

          <Form.Item
            name="UpdatedAt"
            label={<span className="text-gray-700 font-medium text-[15px]">Ngày cập nhật</span>}
          >
            <Input disabled className="h-[42px] text-base text-gray-800 cursor-default bg-gray-50 font-medium" />
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
