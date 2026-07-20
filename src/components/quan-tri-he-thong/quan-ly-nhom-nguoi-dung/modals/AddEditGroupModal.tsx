import React from 'react';
import { Modal, Form, Input, Button, Table, message } from 'antd';
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { UserGroup } from '../../../../types';

interface AddEditGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  editingGroup: UserGroup | null;
  form: any;
  groupMembers: any[];
  setGroupMembers: React.Dispatch<React.SetStateAction<any[]>>;
  onOpenAddUser: () => void;
}
// interface định nghĩa các props cần thiết cho component AddEditGroupModal
export default function AddEditGroupModal({
  open,
  onCancel,
  onSave,
  saving,
  editingGroup,
  form,
  groupMembers,
  setGroupMembers,
  onOpenAddUser
}: AddEditGroupModalProps) {
  return (
    <Modal
      title={
        <div className="text-xl font-bold text-slate-800">
          {editingGroup ? 'Chỉnh sửa nhóm người dùng' : 'Thêm mới nhóm người dùng'}
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <div className="flex justify-center gap-4 mt-6">
          <Button
            key="back"
            onClick={onCancel}
            disabled={saving}
            className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-32"
          >
            Đóng
          </Button>
          <Button
            key="submit"
            type="primary"
            onClick={onSave}
            loading={saving}
            className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold rounded px-8 w-32"
          >
            Lưu
          </Button>
        </div>
      }
      centered
      width={750}
      forceRender
      closeIcon={<span className="text-slate-500 hover:text-slate-700 text-lg font-bold">&times;</span>}
    >
      <Form form={form} layout="vertical" className="mt-6">
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-800 mb-4">Thông tin nhóm người dùng</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <Form.Item
              name="code"
              label={<span className="text-sm text-slate-500 font-medium">Mã nhóm <span className="text-red-500">*</span></span>}
              rules={[{ required: true, message: 'Vui lòng nhập mã nhóm' }]}
            >
              <Input placeholder="Nhập" className="rounded py-1.5" />
            </Form.Item>

            <Form.Item
              name="name"
              label={<span className="text-sm text-slate-500 font-medium">Tên nhóm <span className="text-red-500">*</span></span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên nhóm' }]}
            >
              <Input placeholder="Nhập" className="rounded py-1.5" />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label={<span className="text-sm text-slate-500 font-medium">Mô tả</span>}
            className="mt-2"
          >
            <Input.TextArea placeholder="Nhập" rows={3} className="rounded py-1.5" />
          </Form.Item>
        </div>

        <div className="mb-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-800 m-0">Danh sách người dùng trong nhóm</h3>
            <Button
              type="primary"
              className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-medium rounded"
              onClick={onOpenAddUser}
            >
              Thêm người dùng
            </Button>
          </div>

          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm kiếm theo tài khoản, họ và tên, chức vụ"
            className="rounded py-1.5 mb-4"
          />

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table
              dataSource={groupMembers}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                locale: { items_per_page: '/ trang' },
                size: 'small',
                showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`
              }}
              className="w-full text-sm text-slate-700"
              columns={[
                {
                  title: 'STT',
                  key: 'stt',
                  width: 60,
                  align: 'center',
                  render: (_, __, index) => index + 1,
                },
                {
                  title: 'Mã người dùng',
                  dataIndex: 'username',
                  key: 'username',
                },
                {
                  title: 'Họ và tên',
                  dataIndex: 'fullName',
                  key: 'fullName',
                },
                {
                  title: 'Chức vụ',
                  dataIndex: 'position',
                  key: 'position',
                  render: (text) => text || 'Cán bộ',
                },
                {
                  title: '',
                  key: 'action',
                  width: 60,
                  align: 'center',
                  render: (_, record) => (
                    <div
                      className="bg-red-50 text-red-500 p-1.5 rounded inline-flex cursor-pointer hover:bg-red-100"
                      onClick={() => {
                        setGroupMembers(prev => prev.filter(m => m.id !== record.id));
                        message.success('Đã xóa người dùng khỏi danh sách.');
                      }}
                    >
                      <DeleteOutlined />
                    </div>
                  )
                }
              ]}
              locale={{ emptyText: 'Chưa có người dùng nào được thêm.' }}
            />
          </div>
        </div>
      </Form>
    </Modal>
  );
}
