import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Descriptions, Tag, message, Row, Col, Modal, Layout, Typography, Divider } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, EyeOutlined, ClockCircleOutlined, LogoutOutlined, SaveOutlined, SendOutlined, FlagOutlined } from '@ant-design/icons';
import { quanLyThiAdminApi, ExamSessionAPI, ExamCandidateAPI } from '../../services/quanLyThiApi';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface ExamSessionDetailProps {
  sessionId: string;
  onBack: () => void;
}

export default function ExamSessionDetail({ sessionId, onBack }: ExamSessionDetailProps) {
  const [session, setSession] = useState<ExamSessionAPI | null>(null);
  const [candidates, setCandidates] = useState<ExamCandidateAPI[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});
  const [previewFlagged, setPreviewFlagged] = useState<Record<string, boolean>>({});
  const [previewExam, setPreviewExam] = useState<any>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allSessions = await quanLyThiAdminApi.listSessions();
      const currentSession = allSessions.find(s => s.id === sessionId);
      if (currentSession) {
        setSession(currentSession);

        // Fetch exam paper if exists
        if (currentSession.exam_id) {
          try {
            const res = await fetch('/api/exams');
            const data = await res.json();
            if (data.success) {
              const exam = data.data.find((e: any) => e.id === currentSession.exam_id);
              if (exam) {
                // Ensure questions have part assigned
                exam.questions = (exam.questions || []).map((q: any) => ({
                  ...q,
                  part: q.part || 1 // default to part 1 if not specified
                }));
                setPreviewExam(exam);
              }
            }
          } catch (e) {
            console.error('Failed to fetch exam paper:', e);
          }
        }
      }

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

  const toggleFlag = (questionId: string) => {
    setPreviewFlagged(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setPreviewAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const mockQuestions = previewExam?.questions || [];
  const currentQ = mockQuestions[currentQuestionIdx];
  const totalQuestions = mockQuestions.length;
  const answeredCount = Object.keys(previewAnswers).length;

  const parts = mockQuestions.reduce((acc: any, q: any) => {
    if (!acc[q.part]) acc[q.part] = [];
    acc[q.part].push(q);
    return acc;
  }, {});

  const getQuestionGlobalIndex = (questionId: string) => mockQuestions.findIndex((q: any) => q.id === questionId);

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
                {session.exam_id && (
                  <Button icon={<EyeOutlined />} onClick={() => {
                    setPreviewAnswers({});
                    setPreviewFlagged({});
                    setCurrentQuestionIdx(0);
                    setIsPreviewModalVisible(true);
                  }}>
                    Xem nhanh giao diện làm bài
                  </Button>
                )}
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

      {/* Preview Exam Modal */}
      <Modal
        title={null}
        closable={false}
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
        footer={null}
        width="100%"
        style={{ top: 0, padding: 0, margin: 0, maxWidth: '100vw' }}
        styles={{
          body: { padding: 0, height: '100vh', overflow: 'hidden' },
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' }
        }}
        destroyOnClose
      >
        <Layout className="min-h-screen font-sans bg-white flex flex-col">
          {/* Top Header */}
          <header className="bg-[#1a365d] px-4 flex items-center justify-between h-14 shrink-0 text-white shadow-md z-50" style={{ color: 'white', lineHeight: 'normal' }}>
            <div className="flex flex-col text-xs font-medium tracking-wide" style={{ color: 'white' }}>
              <div className="font-bold text-sm mb-0.5 tracking-wider" style={{ color: 'white' }}>HỆ THỐNG THI TRỰC TUYẾN</div>
              <div className="flex gap-6 opacity-90 text-[11px]" style={{ color: 'white' }}>
                <span style={{ color: 'white' }}>Kỳ thi: {session?.name || 'Đang cập nhật'}</span>
                <span style={{ color: 'white' }}>Môn thi: {previewExam?.subject || 'Chưa xác định'}</span>
                <span style={{ color: 'white' }}>Mode: Preview</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2" style={{ color: 'white' }}>
                <ClockCircleOutlined className="text-xl" style={{ color: 'white' }} />
                <div className="flex flex-col items-center leading-none" style={{ color: 'white' }}>
                  <span className="font-bold text-xl font-mono" style={{ color: 'white' }}>
                    {session?.duration_minutes ? `${String(session.duration_minutes).padStart(2, '0')}:00` : '60:00'}
                  </span>
                  <span className="text-[10px] text-yellow-300 font-bold">(+05 phút)</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-4 mr-2" style={{ color: 'white' }}>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                <span className="text-xs font-medium" style={{ color: 'white' }}>Preview Mode</span>
              </div>

              <Button
                className="bg-white text-red-600 border-none font-bold px-5 h-8 text-xs hover:bg-red-50"
                onClick={() => setIsPreviewModalVisible(false)}
              >
                ĐÓNG
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <Layout.Content className="flex-1 flex flex-col mx-auto w-full max-w-6xl px-4 py-4 overflow-y-auto">
            {!currentQ ? (
              <div className="flex h-full w-full items-center justify-center text-slate-500">
                Kỳ thi này hiện chưa có câu hỏi nào.
              </div>
            ) : (
              <>
                {/* Controls Row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-3">
                    <Button
                      icon={<ArrowLeftOutlined />}
                      className="text-blue-700 border-blue-700 font-medium px-4 h-9"
                      onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
                      disabled={currentQuestionIdx === 0}
                    >
                      Quay lại
                    </Button>
                    <Button
                      type="primary"
                      className="bg-blue-700 font-medium px-4 h-9 flex flex-row-reverse items-center gap-2"
                      onClick={() => setCurrentQuestionIdx(Math.min(totalQuestions - 1, currentQuestionIdx + 1))}
                      disabled={currentQuestionIdx === totalQuestions - 1}
                    >
                      <ArrowRightOutlined />
                      Tiếp theo
                    </Button>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-slate-600 font-medium text-sm">
                      Số câu đã trả lời: <span className="text-green-600 font-bold text-lg ml-1">{answeredCount}</span> / {totalQuestions}
                    </span>
                  </div>
                </div>

                {/* Question Area */}
                <div className="flex-1">
                  <div className="border-b border-slate-200 pb-2 mb-6">
                    <h2 className="text-blue-800 font-bold text-base m-0 uppercase tracking-wide">
                      PHẦN {currentQ.part}: <span className="text-slate-600 font-medium lowercase normal-case ml-2">Thí sinh trả lời các câu hỏi phần {currentQ.part}. Mỗi câu hỏi thí sinh chỉ chọn một phương án</span>
                    </h2>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-8">
                        <div className="font-bold text-slate-800 text-lg shrink-0 pt-0.5">
                          Câu {currentQuestionIdx + 1}:
                        </div>
                        <div className="text-lg text-slate-800 font-medium leading-relaxed">
                          {currentQ.content}
                        </div>
                        <div
                          className="cursor-pointer ml-auto pl-4 shrink-0"
                          onClick={() => toggleFlag(currentQ.id)}
                        >
                          <FlagOutlined className={`text-2xl ${previewFlagged[currentQ.id] ? 'text-yellow-500' : 'text-slate-300 hover:text-slate-400'}`} />
                        </div>
                      </div>

                      <div className="space-y-4 pl-14">
                        {(() => {
                          let options: string[] = [];
                          try {
                            if (typeof currentQ.options === 'string') {
                              options = JSON.parse(currentQ.options);
                            } else if (Array.isArray(currentQ.options)) {
                              options = currentQ.options;
                            }
                          } catch (e) { }

                          if (options.length === 0) return null;

                          return (
                            <div className="flex flex-col gap-4">
                              {options.map((opt: string, oIdx: number) => {
                                const letter = String.fromCharCode(65 + oIdx);
                                const isSelected = previewAnswers[currentQ.id] === letter;
                                return (
                                  <div
                                    key={letter}
                                    className={`flex items-center gap-3 cursor-pointer p-2 rounded-md transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                    onClick={() => handleSelectAnswer(currentQ.id, letter)}
                                  >
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                    <span className="text-base text-slate-700 font-medium">
                                      <span className="font-bold">{letter}. </span> {opt}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="w-1.5 h-64 bg-slate-200 rounded-full shrink-0 ml-8"></div>
                  </div>
                </div>
              </>
            )}
          </Layout.Content>

          {/* Bottom Navigation */}
          {mockQuestions.length > 0 && (
            <Layout.Footer className="bg-white border-t-2 border-slate-200 p-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 shrink-0">
              <div className="max-w-7xl mx-auto w-full px-4 py-4">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mb-4">
                  {Object.keys(parts).map((partNum, pIdx) => (
                    <div key={partNum} className="flex items-center gap-3">
                      <div className="font-bold text-blue-900 text-sm">Phần {['I', 'II', 'III', 'IV'][parseInt(partNum) - 1] || partNum}:</div>
                      <div className="flex flex-wrap gap-2">
                        {parts[partNum].map((q: any) => {
                          const gIdx = getQuestionGlobalIndex(q.id);
                          const isAnswered = !!previewAnswers[q.id];
                          const isActive = gIdx === currentQuestionIdx;
                          const isFlagged = previewFlagged[q.id];

                          let bgClass = "bg-slate-200 text-slate-600";
                          if (isActive) bgClass = "bg-blue-500 text-white shadow-md shadow-blue-500/40 transform scale-110";
                          else if (isFlagged) bgClass = "bg-yellow-400 text-white shadow-sm";
                          else if (isAnswered) bgClass = "bg-green-600 text-white shadow-sm";

                          return (
                            <div
                              key={q.id}
                              onClick={() => setCurrentQuestionIdx(gIdx)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${bgClass} hover:opacity-80`}
                            >
                              {gIdx + 1}
                            </div>
                          );
                        })}
                      </div>
                      {pIdx < Object.keys(parts).length - 1 && (
                        <div className="h-6 w-px bg-slate-300 ml-5"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Layout.Footer>
          )}
        </Layout>
      </Modal>
    </div>
  );
}
