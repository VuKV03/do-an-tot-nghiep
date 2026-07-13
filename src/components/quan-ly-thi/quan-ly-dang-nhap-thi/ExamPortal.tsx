import React, { useState, useEffect } from 'react';
import { Layout, Button, message, Spin, Card, Typography, Space, Row, Col, Divider, Modal, Tag } from 'antd';
import { ClockCircleOutlined, LogoutOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { SystemUser } from '../../../types';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface ExamPortalProps {
  currentUser: SystemUser;
  onLogout: () => void;
}

export default function ExamPortal({ currentUser, onLogout }: ExamPortalProps) {
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSessionInfo();
  }, []);

  const fetchSessionInfo = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/portal/me/session-info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessionInfo(data.data);
        // Assuming duration is in minutes in data.data.exam.duration
        // or we just set a mock duration if it's missing
        const duration = data.data.session.duration || 60;
        setTimeLeft(duration * 60);
      } else {
        message.error(data.detail || 'Không thể tải thông tin kỳ thi.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && sessionInfo) {
      // Time's up, auto submit
      handleSubmitFinal();
    }
  }, [timeLeft, sessionInfo]);

  const handleLogout = () => {
    Modal.confirm({
      title: 'Đăng xuất',
      content: 'Bạn có chắc chắn muốn thoát khỏi phiên thi này không?',
      okText: 'Thoát',
      cancelText: 'Hủy',
      onOk: onLogout
    });
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitDraft = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/portal/submit-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          answers
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        message.success('Đã lưu bài làm tạm thời.');
      } else {
        message.error(data.detail || 'Lưu tạm thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối máy chủ.');
    }
  };

  const handleSubmitFinal = () => {
    Modal.confirm({
      title: 'Nộp bài thi',
      content: 'Bạn có chắc chắn muốn nộp bài? Sau khi nộp bạn sẽ không thể sửa lại đáp án.',
      okText: 'Nộp bài',
      cancelText: 'Chưa',
      onOk: async () => {
        setSubmitting(true);
        try {
          const token = localStorage.getItem('auth_token');
          const res = await fetch('/api/portal/submit-final', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              answers
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            message.success('Nộp bài thành công!');
            // Log out or show result
            onLogout();
          } else {
            message.error(data.detail || 'Nộp bài thất bại.');
          }
        } catch (err) {
          console.error(err);
          message.error('Lỗi kết nối máy chủ.');
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md text-center shadow-sm">
          <Title level={4} className="text-red-600 mb-2">Không tìm thấy ca thi</Title>
          <Text className="text-slate-500 block mb-6">Bạn chưa được phân vào ca thi nào hoặc ca thi đã kết thúc.</Text>
          <Button type="primary" onClick={onLogout} icon={<LogoutOutlined />}>
            Đăng xuất
          </Button>
        </Card>
      </div>
    );
  }

  // Mock questions since the actual API might not return them yet in our setup
  const mockQuestions = sessionInfo.questions || [
    { id: 'q1', content: 'Câu 1: Thủ đô của Việt Nam là?', options: ['A. Hà Nội', 'B. Hồ Chí Minh', 'C. Đà Nẵng', 'D. Hải Phòng'] },
    { id: 'q2', content: 'Câu 2: 1 + 1 bằng mấy?', options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'] },
    { id: 'q3', content: 'Câu 3: Nguyên tố hóa học nào có ký hiệu là O?', options: ['A. Vàng', 'B. Bạc', 'C. Oxi', 'D. Sắt'] }
  ];

  return (
    <Layout className="min-h-screen bg-slate-100 font-sans">
      <Header className="bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm h-16">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 m-0 leading-tight">Hệ thống Thi Trực tuyến</h1>
            <p className="text-xs text-slate-500 m-0">{sessionInfo.session?.name || 'Kỳ thi Demo'}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-2 rounded-lg">
            <ClockCircleOutlined className="text-red-500 text-lg" />
            <span className="text-red-600 font-bold text-xl font-mono tracking-wider">{formatTime(timeLeft)}</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">{currentUser.fullName}</div>
              <div className="text-xs text-slate-500">SBD: {currentUser.username}</div>
            </div>
            <Button type="text" danger icon={<LogoutOutlined />} onClick={handleLogout}>Thoát</Button>
          </div>
        </div>
      </Header>

      <Content className="p-6 max-w-7xl mx-auto w-full flex gap-6">
        {/* Left column: Questions */}
        <div className="flex-1 overflow-y-auto pr-2 pb-20 space-y-6">
          {mockQuestions.map((q: any, idx: number) => (
            <Card key={q.id} className="rounded-2xl shadow-sm border-slate-200" id={`question-${q.id}`}>
              <div className="flex gap-4">
                <div className="w-10 h-10 shrink-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg border border-blue-100">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-4 pt-1">
                  <div className="text-base font-medium text-slate-800 leading-relaxed">
                    {q.content}
                  </div>
                  <div className="space-y-2">
                    {q.options.map((opt: string, oIdx: number) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isSelected = answers[q.id] === letter;
                      return (
                        <div
                          key={oIdx}
                          onClick={() => handleSelectAnswer(q.id, letter)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3
                            ${isSelected ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                        >
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5
                            ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                          <span className={`${isSelected ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Right column: Navigation & Submit */}
        <div className="w-80 shrink-0 sticky top-24 self-start space-y-4">
          <Card className="rounded-2xl shadow-sm border-slate-200" title={<span className="font-bold">Danh sách câu hỏi</span>}>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {mockQuestions.map((q: any, idx: number) => {
                const isAnswered = !!answers[q.id];
                return (
                  <Button
                    key={q.id}
                    type={isAnswered ? 'primary' : 'default'}
                    className={`w-full aspect-square flex items-center justify-center rounded-lg font-medium p-0
                      ${isAnswered ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-400'}`}
                    onClick={() => {
                      document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    {idx + 1}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-6">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div> Đã làm
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></div> Chưa làm
              </div>
            </div>

            <Divider className="my-4" />

            <div className="space-y-3">
              <Button
                block
                size="large"
                icon={<SaveOutlined />}
                onClick={handleSubmitDraft}
                className="rounded-xl border-slate-300 text-slate-600 font-medium hover:text-blue-600 hover:border-blue-600"
              >
                Lưu tạm bài làm
              </Button>
              <Button
                block
                type="primary"
                size="large"
                icon={<SendOutlined />}
                loading={submitting}
                onClick={handleSubmitFinal}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 border-none font-bold shadow-lg shadow-emerald-500/30"
              >
                NỘP BÀI THI
              </Button>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
