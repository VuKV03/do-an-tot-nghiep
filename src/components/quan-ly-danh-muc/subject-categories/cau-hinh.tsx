import React from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, Space, Divider } from 'antd';
import type { DmMonHocType } from './index';

export interface CauHinhMonHocType {
  Id: string;
  Ma: string;
  Ten: string;
  ThoiGianThi: number;
  SoLuongDe: number;
  SoCauHoi: number;
  ThangDiem: number;
  CauTruc: CauTrucMonHoc[];
}

export interface CauTrucMonHoc {
  Phan: string;
  LoaiCauHoi: string;
  TuCau: number;
  DenCau: number;
  DiemMoiCau: number;
  CacLuaChon?: LuaChonDiem[];
}

export interface LuaChonDiem {
  Ten: string;
  Diem: number;
}

interface CauHinhMonHocModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: Partial<CauHinhMonHocType>) => void;
  record?: DmMonHocType | null;
}

export default function CauHinhMonHocModal({ open, onClose, onSave, record }: CauHinhMonHocModalProps) {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open && record) {
      form.setFieldsValue({
        name: record.name,
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, record, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSave(values);
      form.resetFields();
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-[#1e3a8a]">Cấu hình môn học</span>
        </div>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      width={800}
      footer={
        <Space>
          <Button onClick={handleCancel} className="border-blue-600 text-blue-600">
            Đóng
          </Button>
          <Button type="primary" className="bg-blue-600 hover:bg-blue-700 border-none">
            Lưu
          </Button>
        </Space>
      }
    >
      <div className="mt-4">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Thông tin Môn học</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1.5">
                Tên môn học <span className="text-red-500">*</span>
              </label>
              <div className="h-10 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md flex items-center text-gray-700">
                {record?.name || 'Chưa có tên môn học'}
              </div>
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1.5">
                Thời gian thi (phút) <span className="text-red-500">*</span>
              </label>
              <InputNumber placeholder="Nhập" className="w-full h-10" min={1} />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1.5">
                Số lượng đề <span className="text-red-500">*</span>
              </label>
              <InputNumber placeholder="Nhập" className="w-full h-10" min={1} />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1.5">
                Số câu hỏi <span className="text-red-500">*</span>
              </label>
              <InputNumber placeholder="Nhập" className="w-full h-10" min={1} />
            </div>
            <div className="col-span-2">
              <label className="block text-gray-600 text-sm font-medium mb-1.5">
                Thang điểm <span className="text-red-500">*</span>
              </label>
              <InputNumber placeholder="Nhập" className="w-full h-10" min={1} />
            </div>
          </div>
        </div>

        <Divider />

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Cấu trúc môn học và cách tính điểm <span className="text-red-500">*</span>
          </h3>
          
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Phần I</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm font-medium mb-1.5">Loại câu hỏi</label>
                  <Select 
                    placeholder="Chọn loại câu hỏi" 
                    className="w-full h-10"
                    options={[
                      { value: 'trac-nghiem', label: 'Câu hỏi trắc nghiệm một lựa chọn' },
                      { value: 'dung-sai', label: 'Câu hỏi đúng sai dạng bảng' },
                      { value: 'tu-luan', label: 'Câu hỏi tự luận' },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-1.5">Từ câu</label>
                    <InputNumber placeholder="Nhập" className="w-full h-10" min={1} />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-1.5">Đến câu</label>
                    <InputNumber placeholder="Nhập" className="w-full h-10" min={1} />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-gray-600 text-sm font-medium mb-1.5">
                  Điểm của mỗi câu trả lời đúng:
                </label>
                <div className="flex items-center gap-2">
                  <InputNumber placeholder="Nhập" className="w-32 h-10" min={0} step={0.25} />
                  <span className="text-gray-600">đ /1 câu</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Phần II</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm font-medium mb-1.5">Loại câu hỏi</label>
                  <Select 
                    placeholder="Chọn loại câu hỏi" 
                    className="w-full h-10"
                    options={[
                      { value: 'trac-nghiem', label: 'Câu hỏi trắc nghiệm một lựa chọn' },
                      { value: 'dung-sai', label: 'Câu hỏi đúng sai dạng bảng' },
                      { value: 'tu-luan', label: 'Câu hỏi tự luận' },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-1.5">Từ câu</label>
                    <InputNumber placeholder="Nhập" className="w-full h-10" min={1} />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-1.5">Đến câu</label>
                    <InputNumber placeholder="Nhập" className="w-full h-10" min={1} />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 text-sm flex-1">
                    Lựa chọn 01 ý trả lời đúng trong 01 câu được
                  </span>
                  <InputNumber placeholder="Nhập" className="w-24 h-10" min={0} step={0.25} />
                  <span className="text-gray-600 text-sm">đ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 text-sm flex-1">
                    Lựa chọn 02 ý trả lời đúng trong 01 câu được
                  </span>
                  <InputNumber placeholder="Nhập" className="w-24 h-10" min={0} step={0.25} />
                  <span className="text-gray-600 text-sm">đ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 text-sm flex-1">
                    Lựa chọn 03 ý trả lời đúng trong 01 câu được
                  </span>
                  <InputNumber placeholder="Nhập" className="w-24 h-10" min={0} step={0.25} />
                  <span className="text-gray-600 text-sm">đ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 text-sm flex-1">
                    Lựa chọn 04 ý trả lời đúng trong 01 câu được
                  </span>
                  <InputNumber placeholder="Nhập" className="w-24 h-10" min={0} step={0.25} />
                  <span className="text-gray-600 text-sm">đ</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Phần III</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm font-medium mb-1.5">Loại câu hỏi</label>
                  <Select 
                    placeholder="Chọn loại câu hỏi" 
                    className="w-full h-10"
                    options={[
                      { value: 'trac-nghiem', label: 'Câu hỏi trắc nghiệm một lựa chọn' },
                      { value: 'dung-sai', label: 'Câu hỏi đúng sai dạng bảng' },
                      { value: 'tu-luan', label: 'Câu hỏi tự luận' },
                      { value: 'tra-loi-ngan', label: 'Câu trả lời ngắn' },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-1.5">Từ câu</label>
                    <InputNumber placeholder="Nhập" className="w-full h-10" min={1} />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-1.5">Đến câu</label>
                    <InputNumber placeholder="Nhập" className="w-full h-10" min={1} />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-gray-600 text-sm font-medium mb-1.5">
                  Điểm của mỗi câu trả lời đúng:
                </label>
                <div className="flex items-center gap-2">
                  <InputNumber placeholder="Nhập" className="w-32 h-10" min={0} step={0.25} />
                  <span className="text-gray-600">đ /1 câu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}