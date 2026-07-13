import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Descriptions, Tag, message, Row, Col } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { quanLyThiAdminApi, ExamSessionAPI, ExamCandidateAPI } from '../../services/quanLyThiApi';

interface ExamSessionDetailProps {
  sessionId: string;
  onBack: () => void;
}

export default function ExamSessionDetail({ sessionId, onBack }: ExamSessionDetailProps) {
  const [session, setSession] = useState<ExamSessionAPI | null>(null);
  const [candidates, setCandidates] = useState<ExamCandidateAPI[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // In a real implementation, you'd fetch the specific session by ID.
      // Since our API currently only lists all, we filter.
      const allSessions = await quanLyThiAdminApi.listSessions();
      const currentSession = allSessions.find(s => s.id === sessionId);
      if (currentSession) setSession(currentSession);

      // Fetch results
      const resultsData = await quanLyThiAdminApi.getResults(sessionId);
      setResults(resultsData);

      // Fetch candidates for this session
      const sessionCandidates = await quanLyThiAdminApi.getCandidates(sessionId);
      setCandidates(sessionCandidates);
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi tải thông tin chi tiết');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  const handleChangeStatus = async (newStatus: string) => {
    try {
      await quanLyThiAdminApi.updateSessionStatus(sessionId, newStatus);
      message.success(`Đã cập nhật trạng thái thành: ${newStatus}`);
      fetchData();
    } catch (error: any) {
      message.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleExportExcel = () => {
    message.info('Chức năng xuất Excel đang được phát triển');
  };

  const columns = [
    { title: 'Tên Đăng Nhập', dataIndex: 'username', key: 'username' },
    { title: 'Họ Tên', dataIndex: 'full_name', key: 'full_name' },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'not_started' ? 'default' : status === 'in_progress' ? 'processing' : 'success';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    { title: 'Điểm', dataIndex: 'score', key: 'score' },
  ];

  // Merge results with candidates for display (mock logic)
  const displayData = candidates.map(c => {
    const res = results.find(r => r.candidate_id === c.id);
    return { ...c, score: res?.score || '-' };
  });

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginBottom: 16 }}>
        Quay lại
      </Button>

      {session && (
        <Card title={`Kỳ thi: ${session.name}`} style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={16}>
              <Descriptions column={2}>
                <Descriptions.Item label="Mã đề thi">{session.exam_id}</Descriptions.Item>
                <Descriptions.Item label="Thời lượng">{session.duration_minutes} phút</Descriptions.Item>
                <Descriptions.Item label="Bắt đầu">{session.start_time ? new Date(session.start_time).toLocaleString() : '-'}</Descriptions.Item>
                <Descriptions.Item label="Kết thúc">{session.end_time ? new Date(session.end_time).toLocaleString() : '-'}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={session.status === 'pending' ? 'gold' : session.status === 'active' ? 'green' : 'red'}>
                    {session.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Space direction="vertical">
                {session.status === 'pending' && (
                  <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => handleChangeStatus('active')}>
                    Bắt đầu kỳ thi
                  </Button>
                )}
                {session.status === 'active' && (
                  <Button danger type="primary" onClick={() => handleChangeStatus('completed')}>
                    Kết thúc kỳ thi
                  </Button>
                )}
                <Button onClick={handleExportExcel}>Xuất danh sách thí sinh</Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      <Card title="Danh sách thí sinh">
        <Table
          dataSource={displayData}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: 'Chưa có thí sinh nào' }}
        />
      </Card>
    </div>
  );
}
