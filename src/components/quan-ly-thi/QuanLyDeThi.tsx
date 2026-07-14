import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Input,
  Button,
  Select,
  Modal,
  Tag,
  Space,
  message,
  Card,
  Tooltip,
  Empty,
  Collapse,
  Form,
  Row,
  Col,
  Typography
} from 'antd';
import {
  ClockCircleOutlined,
  LinkOutlined,
  EyeOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { SUBJECTS, GRADES } from '../../data';
import { quanLyThiAdminApi, ExamSessionAPI } from '../../services/quanLyThiApi';

const { Text } = Typography;

interface Question {
  id: string;
  code: string;
  content: string;
  type_id: string;
  level_id: string;
  options?: string[];
  correct_answer: string;
}

interface ExamPaper {
  id: string;
  code: string;
  name: string;
  subject: string;
  grade: string;
  status: "active" | "pending" | "draft" | "closed";
  attempts: number;
  totalQuestions: number;
  questions: Question[];
  avgScore: number;
  duration: number;
  createdAt: string;
  description?: string;
  source: "matrix" | "ai" | "manual";
}

export default function QuanLyDeThi() {
  const [exams, setExams] = useState<ExamPaper[]>([]);
  const [sessions, setSessions] = useState<ExamSessionAPI[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Search/Filters for Exams
  const [examSearch, setExamSearch] = useState('');
  const [examSubjectFilter, setExamSubjectFilter] = useState('all');
  const [examGradeFilter, setExamGradeFilter] = useState('all');

  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamPaper | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchActiveExams();
    fetchSessions();
  }, []);

  const fetchActiveExams = async () => {
    setLoadingExams(true);
    try {
      const res = await fetch('/api/exams');
      const data = await res.json();
      if (data.success) {
        // Only get approved/active exams for distribution
        const activeExams = data.data.filter((e: ExamPaper) => ['active', 'approved', '3'].includes(e.status));
        setExams(activeExams);
      } else {
        message.error('Lỗi khi tải danh sách đề thi.');
      }
    } catch (err) {
      console.error(err);
      message.error('Không kết nối được dịch vụ danh sách đề.');
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await quanLyThiAdminApi.listSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách kỳ thi.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const filteredExams = useMemo(() => {
    const kw = examSearch.trim().toLowerCase();
    return exams.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(kw) ||
        e.code.toLowerCase().includes(kw);
      const matchesSubject = examSubjectFilter === 'all' || e.subject === examSubjectFilter;
      const matchesGrade = examGradeFilter === 'all' || e.grade === examGradeFilter;
      return matchesSearch && matchesSubject && matchesGrade;
    });
  }, [exams, examSearch, examSubjectFilter, examGradeFilter]);

  const handleOpenAssignModal = (exam: ExamPaper) => {
    setSelectedExam(exam);
    setSelectedSessionId(null);
    setIsAssignModalOpen(true);
  };

  const handleOpenDetailModal = (exam: ExamPaper) => {
    setSelectedExam(exam);
    setIsDetailOpen(true);
  };

  const handleAssignExamToSession = async () => {
    if (!selectedExam || !selectedSessionId) {
      message.warning('Vui lòng chọn kỳ thi để phát đề.');
      return;
    }

    setAssigning(true);
    try {
      await quanLyThiAdminApi.updateSession(selectedSessionId, {
        exam_id: selectedExam.id,
        duration_minutes: selectedExam.duration
      });
      message.success(`Đã phát đề thi "${selectedExam.name}" cho kỳ thi thành công!`);
      setIsAssignModalOpen(false);
      fetchSessions(); // Refresh sessions to show the updated exam_id
    } catch (err) {
      console.error(err);
      message.error(err instanceof Error ? err.message : 'Phát sinh lỗi khi gán đề thi.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div style={{ padding: 24, backgroundColor: '#f0f2f5', minHeight: '100vh' }}>

      {/* Search Section */}
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
                    <Form.Item label="Tên đề thi / Mã đề">
                      <Input
                        placeholder="Nhập tên đề thi hoặc mã đề"
                        value={examSearch}
                        onChange={e => setExamSearch(e.target.value)}
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Môn học">
                      <Select
                        value={examSubjectFilter}
                        onChange={setExamSubjectFilter}
                        style={{ width: '100%' }}
                      >
                        <Select.Option value="all">Tất cả</Select.Option>
                        {SUBJECTS.map(s => (
                          <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Khối">
                      <Select
                        value={examGradeFilter}
                        onChange={setExamGradeFilter}
                        style={{ width: '100%' }}
                      >
                        <Select.Option value="all">Tất cả</Select.Option>
                        {GRADES.map(g => (
                          <Select.Option key={g.value} value={g.value}>{g.label}</Select.Option>
                        ))}
                      </Select>
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
                        setExamSearch('');
                        setExamSubjectFilter('all');
                        setExamGradeFilter('all');
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

      {/* Table Section */}
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={filteredExams}
          rowKey="id"
          loading={loadingExams}
          pagination={{
            showTotal: (total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`,
            showSizeChanger: true,
            defaultPageSize: 10,
          }}
          locale={{
            emptyText: 'Không có đề thi nào sẵn sàng. Vui lòng sang tab "Quản lý đề thi & gói đề" để duyệt (Phát hành) đề thi.'
          }}
          columns={[
            {
              title: 'Mã đề thi',
              dataIndex: 'code',
              key: 'code',
              render: (code: string) => (
                <Tag color="blue" style={{ borderRadius: 4, fontWeight: 600 }}>{code}</Tag>
              )
            },
            {
              title: 'Tên đề thi',
              dataIndex: 'name',
              key: 'name',
              render: (name: string, record: ExamPaper) => (
                <div>
                  <div style={{ fontWeight: 600, color: '#1d2939' }}>{name}</div>
                  <div style={{ fontSize: 12, color: '#98a2b3', marginTop: 2 }}>
                    {record.description || 'Không có mô tả.'}
                  </div>
                </div>
              )
            },
            {
              title: 'Môn / Khối',
              key: 'labels',
              render: (_, record: ExamPaper) => (
                <Space size={4}>
                  <Tag color="blue" style={{ borderRadius: 4, fontWeight: 600, margin: 0 }}>{record.subject}</Tag>
                  <Tag color="purple" style={{ borderRadius: 4, fontWeight: 600, margin: 0 }}>{record.grade}</Tag>
                </Space>
              )
            },
            {
              title: 'Cấu trúc',
              key: 'structure',
              align: 'center',
              render: (_, record: ExamPaper) => (
                <div style={{ textAlign: 'center' }}>
                  <Tag style={{ borderRadius: 4, fontWeight: 600 }}>{record.totalQuestions} Câu</Tag>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {record.duration} Phút
                  </div>
                </div>
              )
            },
            {
              title: 'Đã gán cho',
              key: 'assignedTo',
              render: (_, record: ExamPaper) => {
                const assignedSessions = sessions.filter(s => s.exam_id === record.id);
                if (assignedSessions.length === 0) {
                  return <span style={{ color: '#98a2b3', fontStyle: 'italic', fontSize: 13 }}>Chưa gán</span>;
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 200 }}>
                    {assignedSessions.map(s => (
                      <Tag key={s.id} color="green" style={{ borderRadius: 4, fontWeight: 600, margin: 0 }}>
                        • {s.name}
                      </Tag>
                    ))}
                  </div>
                );
              }
            },
            {
              title: 'Thao tác',
              key: 'actions',
              align: 'center',
              render: (_, record: ExamPaper) => (
                <Space>
                  <Tooltip title="Xem chi tiết đề thi">
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleOpenDetailModal(record)}
                    />
                  </Tooltip>
                  <Button
                    type="primary"
                    size="small"
                    icon={<LinkOutlined />}
                    style={{ backgroundColor: '#1d39c4' }}
                    onClick={() => handleOpenAssignModal(record)}
                  >
                    Phát Đề
                  </Button>
                </Space>
              )
            }
          ]}
        />
      </Card>

      {/* Assignment Modal */}
      <Modal
        title={
          <div style={{ paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
            <Text strong style={{ fontSize: 16 }}>Phát Đề Thi Cho Kỳ Thi</Text>
          </div>
        }
        open={isAssignModalOpen}
        onCancel={() => setIsAssignModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsAssignModalOpen(false)}>
            Hủy Bỏ
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={assigning}
            onClick={handleAssignExamToSession}
            disabled={!selectedSessionId}
            style={{ backgroundColor: '#1d39c4' }}
          >
            Xác nhận Phát Đề
          </Button>
        ]}
        centered
        width={600}
        closeIcon={<span style={{ fontSize: 16 }}>✕</span>}
      >
        <div style={{ paddingTop: 16 }}>
          {selectedExam && (
            <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Đề thi đã chọn:</Text>
              <Text strong>{selectedExam.code} - {selectedExam.name}</Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Tag color="blue" style={{ borderRadius: 4, margin: 0 }}>{selectedExam.subject}</Tag>
                <Tag style={{ borderRadius: 4, margin: 0 }}>{selectedExam.duration} phút</Tag>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ color: '#1d39c4' }}>Chọn kỳ thi để phát đề</Text>
            <span style={{ color: '#ff4d4f' }}> *</span>
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="-- Chọn kỳ thi --"
            value={selectedSessionId}
            onChange={setSelectedSessionId}
            showSearch
            optionFilterProp="label"
            loading={loadingSessions}
          >
            {sessions.map(s => {
              const disabled = s.status !== 'pending';
              return (
                <Select.Option key={s.id} value={s.id} label={s.name} disabled={disabled}>
                  <div>
                    <div style={{ fontWeight: 600, color: disabled ? '#98a2b3' : '#1d2939' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#667085' }}>
                      Trạng thái: {s.status === 'pending' ? 'Chưa bắt đầu' : s.status === 'active' ? 'Đang diễn ra' : 'Đã kết thúc'}
                      {s.exam_id ? ` | Đã có đề gán` : ' | Chưa gán đề'}
                      {disabled ? ' (Không thể đổi đề)' : ''}
                    </div>
                  </div>
                </Select.Option>
              );
            })}
          </Select>
          <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic', display: 'block', marginTop: 8 }}>
            Lưu ý: Nếu kỳ thi đã được gán đề trước đó, hành động này sẽ thay thế đề thi cũ bằng đề thi mới.
          </Text>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={
          <div style={{ paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
            <Text strong style={{ fontSize: 16 }}>Chi tiết ngân hàng câu hỏi trong đề thi</Text>
          </div>
        }
        open={isDetailOpen}
        onCancel={() => setIsDetailOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsDetailOpen(false)} style={{ backgroundColor: '#1d39c4' }}>
            Đóng
          </Button>
        ]}
        centered
        width={650}
        closeIcon={<span style={{ fontSize: 16 }}>✕</span>}
      >
        <div style={{ paddingTop: 16, maxHeight: 400, overflowY: 'auto' }} id="exam-detail-body">
          {selectedExam && (
            <>
              <div style={{ background: '#f8f9fa', border: '1px solid #f0f0f0', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 8, marginBottom: 8 }}>
                  <Text type="secondary">Tên đề kiểm tra:</Text>
                  <Text strong>{selectedExam.name}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 8, marginBottom: 8 }}>
                  <Text type="secondary">Mã định danh hệ thống:</Text>
                  <Text strong style={{ fontFamily: 'monospace' }}>{selectedExam.code}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Thời lượng thi chính:</Text>
                  <Text strong>{selectedExam.duration} Phút làm bài</Text>
                </div>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                  Mẫu phân bổ cụm câu hỏi ({selectedExam.questions?.length || 0} câu)
                </Text>

                {!selectedExam.questions || selectedExam.questions.length === 0 ? (
                  <Empty description="Đề thi hiện chưa liên kết dữ liệu câu hỏi chi tiết." style={{ padding: '24px 0' }} />
                ) : (
                  selectedExam.questions.map((q, id) => (
                    <div key={id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <Text strong>Câu hỏi {id + 1}: {q.content}</Text>
                        <Tag color={q.level_id === 'nhan_biet' || q.level_id === 'easy' ? 'blue' : 'orange'} style={{ borderRadius: 4, margin: 0 }}>
                          {q.level_id === 'easy' || q.level_id === 'nhan_biet' ? 'Nhận biết' : 'Vận Dụng'}
                        </Tag>
                      </div>

                      {(() => {
                        let parsedOptions: string[] = [];
                        try {
                          if (typeof q.options === 'string') {
                            parsedOptions = JSON.parse(q.options);
                          } else if (Array.isArray(q.options)) {
                            parsedOptions = q.options;
                          }
                        } catch (e) { }

                        if (parsedOptions.length > 0) {
                          return (
                            <Row gutter={[16, 8]} style={{ paddingLeft: 8, marginBottom: 8 }}>
                              {parsedOptions.map((opt, oid) => (
                                <Col span={12} key={oid}>
                                  <Text type="secondary">{String.fromCharCode(65 + oid)}. {opt}</Text>
                                </Col>
                              ))}
                            </Row>
                          );
                        }
                        return null;
                      })()}

                      <div style={{ paddingTop: 8, borderTop: '1px dashed #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>MCQ Một lựa chọn</Text>
                        <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>Đáp án chính: {q.correct_answer}</Text>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
