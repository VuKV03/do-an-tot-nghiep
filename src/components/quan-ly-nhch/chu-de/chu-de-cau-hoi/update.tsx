import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, ConfigProvider } from 'antd';
import type { ChuDeType } from './index';
import { mockMonHoc, mockKhoiLop } from './index';

const { TextArea } = Input;

export interface UpdateChuDeModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (values: any) => Promise<boolean | 'duplicate_code'> | boolean | 'duplicate_code';
  record?: ChuDeType | null;
  allData: ChuDeType[];
  monHocs?: { Id: string; Ma: string; Ten: string }[];
  khoiLops?: { Id: string; Ma: string; Ten: string }[];
  isSubjectRestricted?: boolean;
  onDuplicateCode?: () => void;
}

export default function UpdateChuDeModal({ open, onClose, onSave, record, allData, monHocs = [], khoiLops = [], isSubjectRestricted = false, onDuplicateCode }: UpdateChuDeModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const cap = Form.useWatch('Cap', form);
  const monHocId = Form.useWatch('IdMonHoc', form);
  const khoiLopId = Form.useWatch('IdKhoiLop', form);

  // Lọc chủ đề cha
  const filteredParents = allData.filter(
    (item) => item.IdMonHoc === monHocId && item.IdKhoiLop === khoiLopId && !item.ParentId
  );

  useEffect(() => {
    if (open && record) {
      const isSubtopic = record.ParentId !== null && record.ParentId !== undefined;
      form.setFieldsValue({
        IdMonHoc: record.IdMonHoc,
        IdKhoiLop: record.IdKhoiLop,
        Cap: isSubtopic ? 'Tieumuc' : 'Chude',
        ParentId: record.ParentId,
        Ma: record.Ma,
        Ten: record.Ten,
        GhiChu: record.GhiChu,
      });
    } else if (!open) {
      form.resetFields();
    }
  }, [open, record, form]);

  const handleFinish = async (values: any) => {
    if (onSave) {
      setSubmitting(true);
      try {
        const result = await onSave({
          ...record,
          ...values,
        });
        if (result === true) {
          onClose();
        } else if (result === 'duplicate_code') {
          form.setFields([{
            name: 'Ma',
            errors: ['Mã chủ đề này đã tồn tại, vui lòng nhập mã khác!'],
          }]);
          onDuplicateCode?.();
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      onClose();
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
            Sửa thông tin chủ đề/tiểu mục
          </div>
        }
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={750}
        closeIcon={<span className="text-gray-500 text-xl font-bold">✕</span>}
        centered
        styles={{
          header: { marginBottom: 0, paddingBottom: 0 },
          body: { paddingTop: '16px' },
        }}
      >
        <div className="mb-4 text-[#1e3a8a] font-semibold text-[17px]">
          Thông tin chủ đề/tiểu mục
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
          <div className="grid grid-cols-2 gap-x-6">
            <Form.Item
              name="IdMonHoc"
              label={<span className="text-gray-700 font-medium text-[15px]">Môn học</span>}
              rules={[{ required: true, message: 'Vui lòng chọn môn học' }]}
            >
              <Select
                placeholder="Chọn môn học"
                className="h-[42px] text-base"
                options={(monHocs.length > 0 || isSubjectRestricted ? monHocs : mockMonHoc).map(m => ({ value: m.Id, label: m.Ten }))}
                disabled // Thường khi sửa không cho đổi môn học nếu đã map câu hỏi, tạm disable
              />
            </Form.Item>

            <Form.Item
              name="IdKhoiLop"
              label={<span className="text-gray-700 font-medium text-[15px]">Khối lớp</span>}
              rules={[{ required: true, message: 'Vui lòng chọn khối lớp' }]}
            >
              <Select
                placeholder="Chọn khối lớp"
                className="h-[42px] text-base bg-gray-50"
                disabled={cap === 'Tieumuc'}
                options={(khoiLops.length > 0 ? khoiLops : mockKhoiLop).map(k => ({ value: k.Id, label: k.Ten }))}
              />
            </Form.Item>

            <Form.Item
              name="Cap"
              label={<span className="text-gray-700 font-medium text-[15px]">Cấp</span>}
              rules={[{ required: true, message: 'Vui lòng chọn cấp' }]}
            >
              <Select
                className="h-[42px] text-base bg-gray-50"
                disabled // Cấp: Không cho sửa
                options={[
                  { value: 'Chude', label: 'Chủ đề' },
                  { value: 'Tieumuc', label: 'Tiểu mục' },
                ]}
              />
            </Form.Item>

            {cap === 'Tieumuc' && (
              <Form.Item
                name="ParentId"
                label={<span className="text-gray-700 font-medium text-[15px]">Chủ đề</span>}
                rules={[{ required: true, message: 'Vui lòng chọn chủ đề' }]}
              >
                <Select
                  placeholder="Chọn chủ đề"
                  className="h-[42px] text-base"
                  options={filteredParents.map(p => ({ value: p.Id, label: p.Ten }))}
                />
              </Form.Item>
            )}

            <Form.Item
              name="Ma"
              label={<span className="text-gray-700 font-medium text-[15px]">Mã</span>}
              rules={[{ required: true, message: 'Vui lòng nhập mã' }]}
              className="col-span-2"
            >
              <Input placeholder="Nhập mã" maxLength={50} className="h-[42px] text-base" />
            </Form.Item>

            <Form.Item
              name="Ten"
              label={<span className="text-gray-700 font-medium text-[15px]">Tên</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
              className="col-span-2"
            >
              <Input placeholder="Tên chủ đề/tiểu mục" maxLength={255} className="h-[42px] text-base" />
            </Form.Item>

            {cap === 'Tieumuc' && (
              <Form.Item
                name="GhiChu"
                label={<span className="text-gray-700 font-medium text-[15px]">Ghi chú/Yêu cầu cần đạt</span>}
                className="col-span-2"
              >
                <TextArea
                  rows={4}
                  placeholder="Nhập ghi chú"
                  className="text-base py-2"
                />
              </Form.Item>
            )}
          </div>

          <div className="flex justify-center gap-4 mt-6 pt-5 border-t border-gray-200">
            <Button
              onClick={handleCancel}
              disabled={submitting}
              className="border-[#1d4ed8] text-[#1d4ed8] px-10 h-10 font-semibold hover:bg-blue-50 text-[15px]"
            >
              Đóng
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
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
