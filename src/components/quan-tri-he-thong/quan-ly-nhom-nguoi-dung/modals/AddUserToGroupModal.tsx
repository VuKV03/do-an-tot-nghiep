import React from 'react';
import { Modal, Button, Table, Tag, Input, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface AddUserToGroupModalProps {
  open: boolean;
  onCancel: () => void;
  allUsers: any[];
  groupMembers: any[];
  setGroupMembers: React.Dispatch<React.SetStateAction<any[]>>;
  tempSelectedUserIds: string[];
  setTempSelectedUserIds: React.Dispatch<React.SetStateAction<string[]>>;
  searchUserAdd: string;
  setSearchUserAdd: React.Dispatch<React.SetStateAction<string>>;
}
// interface định nghĩa các props cần thiết cho component AddUserToGroupModal
export default function AddUserToGroupModal({
  open,
  onCancel,
  allUsers,
  groupMembers,
  setGroupMembers,
  tempSelectedUserIds,
  setTempSelectedUserIds,
  searchUserAdd,
  setSearchUserAdd
}: AddUserToGroupModalProps) {
  return (
    <Modal
      title={
        <div className="text-xl font-bold text-slate-800">
          Thêm người dùng
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <div className="flex justify-center gap-4 mt-6">
          <Button
            key="back"
            onClick={onCancel}
            className="border-[#1e40af] text-[#1e40af] font-semibold rounded px-8 w-32"
          >
            Đóng
          </Button>
          <Button
            key="submit"
            type="primary"
            onClick={() => {
              const selectedUsers = allUsers.filter(u => tempSelectedUserIds.includes(u.id));
              const newMembers = [...groupMembers];
              selectedUsers.forEach(user => {
                if (!newMembers.find(m => m.id === user.id)) {
                  newMembers.push(user);
                }
              });
              setGroupMembers(newMembers);
              onCancel();
              message.success(`Đã thêm ${selectedUsers.length} người dùng vào danh sách.`);
            }}
            className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold rounded px-8 w-32"
          >
            Lưu
          </Button>
        </div>
      }
      centered
      width={800}
      closeIcon={<span className="text-slate-500 hover:text-slate-700 text-lg font-bold">&times;</span>}
    >
      <div className="mt-4">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder="Tìm kiếm theo tài khoản, họ và tên, chức vụ"
          className="rounded py-1.5 mb-4"
          value={searchUserAdd}
          onChange={(e) => setSearchUserAdd(e.target.value)}
        />

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <Table
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys: tempSelectedUserIds,
              onChange: (selectedRowKeys) => {
                setTempSelectedUserIds(selectedRowKeys as string[]);
              },
              getCheckboxProps: (record) => ({
                disabled: groupMembers.some(m => m.id === record.id),
              })
            }}
            dataSource={allUsers.filter(u =>
              u.username?.toLowerCase().includes(searchUserAdd.trim().toLowerCase()) ||
              u.fullName?.toLowerCase().includes(searchUserAdd.trim().toLowerCase())
            )}
            rowKey="id"
            pagination={{
              pageSize: 5,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20'],
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
                title: 'Tài khoản',
                dataIndex: 'username',
                key: 'username',
                render: (text) => <strong className="text-[#1e40af]">{text}</strong>
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
            locale={{ emptyText: 'Không tìm thấy người dùng.' }}
          />
        </div>
      </div>
    </Modal>
  );
}
