import React from 'react';
import { Modal, Button, Table, Tag } from 'antd';
import { UserGroup } from '../../../../types';

interface MembersManagementModalProps {
  open: boolean;
  onCancel: () => void;
  activeGroup: UserGroup | null;
  groupMembers: any[];
  loadingMembers: boolean;
}
// interface định nghĩa các props cần thiết cho component MembersManagementModal
export default function MembersManagementModal({
  open,
  onCancel,
  activeGroup,
  groupMembers,
  loadingMembers
}: MembersManagementModalProps) {
  return (
    <Modal
      title={
        <div className="text-xl font-bold text-slate-800">
          Danh sách thành viên: {activeGroup?.name}
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <div className="flex justify-center mt-6">
          <Button
            onClick={onCancel}
            className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-32"
          >
            Đóng
          </Button>
        </div>
      }
      centered
      width={700}
      closeIcon={<span className="text-slate-500 hover:text-slate-700 text-lg font-bold">&times;</span>}
    >
      <Table
        dataSource={groupMembers}
        loading={loadingMembers}
        rowKey="id"
        pagination={{ pageSize: 5 }}
        className="mt-4"
        columns={[
          {
            title: 'Tài khoản',
            dataIndex: 'username',
            key: 'username',
            render: (text) => <strong className="text-blue-600">{text}</strong>
          },
          {
            title: 'Họ tên',
            dataIndex: 'fullName',
            key: 'fullName',
          },
          {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
              <Tag color={status === 'active' ? 'green' : 'red'} className="font-bold">
                {status === 'active' ? 'Hoạt động' : 'Đã khóa'}
              </Tag>
            )
          }
        ]}
      />
    </Modal>
  );
}
