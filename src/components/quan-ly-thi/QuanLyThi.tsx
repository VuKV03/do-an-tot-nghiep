import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, DatePicker, message,
  Tag, Card, Row, Col, Select, Switch, Typography, Collapse, Tooltip
} from 'antd';
import {
  QuestionCircleOutlined, EyeOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import { quanLyThiAdminApi, ExamSessionAPI } from '../../services/quanLyThiApi';
import ExamSessionDetail from './ExamSessionDetail';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function QuanLyThi() {
  const [sessions, setSessions] = useState<ExamSessionAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<ExamSessionAPI | null>(null);

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ExamSessionAPI | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Search filter states
  const [searchName, setSearchName] = useState('');
  const [searchStatus, setSearchStatus] = useState('all');
  const [searchDateRange, setSearchDateRange] = useState<[any, any] | null>(null);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      // Filter by name or session_code
      const nameMatch = searchName.trim() === '' ||
        s.name.toLowerCase().includes(searchName.toLowerCase()) ||
        (s.session_code && s.session_code.toLowerCase().includes(searchName.toLowerCase()));

      // Filter by status
      const statusMatch = searchStatus === 'all' || s.status === searchStatus;

      // Filter by date range (start_time)
      let dateMatch = true;
      if (searchDateRange && searchDateRange[0] && searchDateRange[1]) {
        const startFilter = searchDateRange[0].startOf('day');
        const endFilter = searchDateRange[1].endOf('day');
        if (s.start_time) {
          const sessionStart = dayjs(s.start_time);
          dateMatch = sessionStart.isAfter(startFilter) && sessionStart.isBefore(endFilter) ||
            sessionStart.isSame(startFilter, 'day') || sessionStart.isSame(endFilter, 'day');
        } else {
          dateMatch = false;
        }
      }

      return nameMatch && statusMatch && dateMatch;
    });
  }, [sessions, searchName, searchStatus, searchDateRange]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await quanLyThiAdminApi.listSessions();
      setSessions(data);
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi tải danh sách kỳ thi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleOpenModal = (record?: ExamSessionAPI) => {
    if (record) {
      setEditingSession(record);
      form.setFieldsValue({
        session_code: record.session_code,
        name: record.name,
        dateRange: record.start_time && record.end_time ? [dayjs(record.start_time), dayjs(record.end_time)] : undefined,
        status: record.status || 'pending',
        note: '',
      });
    } else {
      setEditingSession(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCreateOrUpdate = async (values: any) => {
    try {
      const payload = {
        name: values.name,
        session_code: values.session_code,
        duration_minutes: values.duration_minutes || 60,
        start_time: values.dateRange ? values.dateRange[0].toISOString() : null,
        end_time: values.dateRange ? values.dateRange[1].toISOString() : null,
        status: values.status,
        exam_id: editingSession ? editingSession.exam_id : null,
      };

      if (editingSession) {
        await quanLyThiAdminApi.updateSession(editingSession.id, payload);
        message.success('Chỉnh sửa kỳ thi thành công!');
      } else {
        await quanLyThiAdminApi.createSession(payload);
        message.success('Tạo kỳ thi thành công!');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchSessions();
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi lưu kỳ thi');
    }
  };

  const handleDeleteSingle = (record: ExamSessionAPI) => {
    setSessionToDelete(record);
    setIsDeleteModalVisible(true);
  };

  const handleDeleteMultiple = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 kỳ thi để xóa!');
      return;
    }
    setSessionToDelete(null);
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    try {
      if (sessionToDelete) {
        await quanLyThiAdminApi.deleteSession(sessionToDelete.id);
        message.success(`Đã xóa kỳ thi: ${sessionToDelete.name}`);
      } else {
        for (const key of selectedRowKeys) {
          await quanLyThiAdminApi.deleteSession(key as string);
        }
        message.success(`Đã xóa ${selectedRowKeys.length} kỳ thi`);
        setSelectedRowKeys([]);
      }
      setIsDeleteModalVisible(false);
      fetchSessions();
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi xóa kỳ thi');
    }
  };

  const columns = [
    {
      title: 'STT',
      dataIndex: 'index',
      key: 'index',
      render: (text: any, record: any, index: number) => index + 1,
      width: 60,
      align: 'center' as const,
    },
    {
      title: 'Mã kỳ thi',
      dataIndex: 'session_code',
      key: 'session_code',
    },
    {
      title: 'Tên kỳ thi',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: () => dayjs().format('DD-MM-YYYY'), // Mock
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (val: string) => val ? dayjs(val).format('DD-MM-YYYY') : '-',
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (val: string) => val ? dayjs(val).format('DD-MM-YYYY') : '-',
    },
    {
      title: 'Tình trạng',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        let text = 'Chưa bắt đầu';
        if (status === 'active') { color = 'success'; text = 'Đang diễn ra'; }
        else if (status === 'completed') { color = 'error'; text = 'Đã kết thúc'; }
        else if (status === 'pending') { color = 'warning'; text = 'Chưa bắt đầu'; }

        return (
          <Tag color={color} style={{ minWidth: 120, textAlign: 'center', padding: '4px 0' }}>
            {text}
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: ExamSessionAPI) => (
        <Space size="middle">
          <Tooltip title="Chi tiết">
            <Button type="text" icon={<EyeOutlined style={{ color: '#1890ff' }} />} onClick={() => setSelectedSessionId(record.id)} />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleOpenModal(record)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSingle(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (selectedSessionId) {
    return <ExamSessionDetail sessionId={selectedSessionId} onBack={() => setSelectedSessionId(null)} />;
  }

  return (
    <div style={{ padding: 24, backgroundColor: '#f0f2f5', minHeight: '100vh' }}>

      <Card bordered={false} style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Collapse
          defaultActiveKey={['1']}
          ghost
          expandIconPosition="end"
          items={[{
            key: '1',
            label: <Text strong style={{ color: '#1d39c4', fontSize: 15 }}>Tìm kiếm thông tin</Text>,
            children: (
              <Form layout="vertical">
                <Row gutter={24}>
                  <Col span={8}>
                    <Form.Item label="Tên kỳ thi">
                      <Input
                        placeholder="Nhập tên hoặc mã kỳ thi"
                        value={searchName}
                        onChange={e => setSearchName(e.target.value)}
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Tình trạng">
                      <Select value={searchStatus} onChange={setSearchStatus}>
                        <Select.Option value="all">Tất cả</Select.Option>
                        <Select.Option value="pending">Chưa bắt đầu</Select.Option>
                        <Select.Option value="active">Đang diễn ra</Select.Option>
                        <Select.Option value="completed">Đã kết thúc</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Ngày bắt đầu">
                      <DatePicker.RangePicker
                        style={{ width: '100%' }}
                        placeholder={['Từ ngày', 'Đến ngày']}
                        format="DD-MM-YYYY"
                        value={searchDateRange}
                        onChange={(dates) => setSearchDateRange(dates as [any, any] | null)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <div style={{ textAlign: 'center' }}>
                  <Space>
                    <Button
                      type="primary"
                      style={{ backgroundColor: '#1d39c4', minWidth: 120 }}
                      onClick={() => { /* filtering is automatic via useMemo */ }}
                    >
                      Tìm kiếm
                    </Button>
                    <Button
                      style={{ minWidth: 100 }}
                      onClick={() => {
                        setSearchName('');
                        setSearchStatus('all');
                        setSearchDateRange(null);
                      }}
                    >
                      Đặt lại
                    </Button>
                  </Space>
                </div>
              </Form>
            )
          }]}
        />
      </Card>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Space>
            <Button type="primary" style={{ backgroundColor: '#1d39c4' }} onClick={() => handleOpenModal()}>
              Thêm mới
            </Button>
            {/* <Button style={{ color: '#1d39c4', borderColor: '#1d39c4' }}>Xuất Excel</Button> */}
            <Button danger onClick={handleDeleteMultiple}>Xóa</Button>
          </Space>
        </div>

        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          dataSource={filteredSessions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
            showSizeChanger: true,
            defaultPageSize: 10,
          }}
        />
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        title={
          <div style={{ paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
            <Text strong style={{ fontSize: 16 }}>{editingSession ? 'Chỉnh sửa thông tin kỳ thi' : 'Thêm mới kỳ thi'}</Text>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        footer={null}
        closeIcon={<span style={{ fontSize: 16 }}>✕</span>}
      >
        <div style={{ paddingTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ color: '#1d39c4' }}>Thông tin kỳ thi</Text>
          </div>
          <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
            <Form.Item
              name="session_code"
              label="Mã kỳ thi"
              rules={[{ required: true, message: 'Vui lòng nhập mã kỳ thi!' }]}
            >
              <Input placeholder="Nhập" />
            </Form.Item>
            <Form.Item
              name="name"
              label="Tên kỳ thi"
              rules={[{ required: true, message: 'Vui lòng nhập tên kỳ thi!' }]}
            >
              <Input placeholder="Nhập" />
            </Form.Item>
            <Form.Item name="dateRange" label="Ngày hiệu lực">
              <DatePicker.RangePicker style={{ width: '100%' }} placeholder={['Bắt đầu', 'Kết thúc']} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="note" label="Ghi chú">
              <Input.TextArea rows={3} placeholder="Nhập ghi chú cho danh mục kỳ thi" />
            </Form.Item>
            <Form.Item name="status" label="Tình trạng" initialValue="pending">
              <Select>
                <Select.Option value="pending">Chưa bắt đầu</Select.Option>
                <Select.Option value="active">Đang diễn ra</Select.Option>
                <Select.Option value="completed">Đã kết thúc</Select.Option>
              </Select>
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, paddingBottom: 8 }}>
              <Space size="middle">
                <Button onClick={() => setIsModalVisible(false)} style={{ color: '#1d39c4', borderColor: '#1d39c4', minWidth: 100 }}>Đóng</Button>
                <Button type="primary" htmlType="submit" style={{ backgroundColor: '#1d39c4', minWidth: 100 }}>Lưu</Button>
              </Space>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title={
          <div style={{ paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
            <Text strong style={{ fontSize: 16 }}>Xác nhận xóa</Text>
          </div>
        }
        open={isDeleteModalVisible}
        onCancel={() => setIsDeleteModalVisible(false)}
        footer={null}
        width={400}
        closeIcon={<span style={{ fontSize: 16 }}>✕</span>}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', margin: '24px 0' }}>
          <QuestionCircleOutlined style={{ fontSize: 24, color: '#8c8c8c', marginRight: 16 }} />
          <Text style={{ fontSize: 15 }}>
            {sessionToDelete
              ? `Bạn có chắc chắn xóa bản ghi có tên kỳ thi “${sessionToDelete.name}”?`
              : `Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} bản ghi kỳ thi?`}
          </Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <Space size="middle">
            <Button onClick={() => setIsDeleteModalVisible(false)} style={{ minWidth: 100 }}>Hủy</Button>
            <Button danger type="primary" onClick={confirmDelete} style={{ minWidth: 100, backgroundColor: '#e3342f' }}>Xóa</Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
}

