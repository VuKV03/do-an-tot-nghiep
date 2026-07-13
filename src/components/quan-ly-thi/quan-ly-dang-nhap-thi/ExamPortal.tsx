import React, { useState, useEffect } from 'react';
import { Layout, Button, message, Spin, Typography, Modal, Radio, Space, Input } from 'antd';
import { ClockCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined, FlagOutlined, FullscreenOutlined, AppstoreOutlined, UnorderedListOutlined, LogoutOutlined, RollbackOutlined } from '@ant-design/icons';
import { SystemUser } from '../../../types';

const { Header, Content, Footer } = Layout;
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
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [examResultData, setExamResultData] = useState<any>(null);
  const [isTimeOutSubmit, setIsTimeOutSubmit] = useState(false);

  const [viewMode, setViewMode] = useState<'waiting' | 'taking' | 'review'>('waiting');
  const [waitCountdown, setWaitCountdown] = useState(10);

  useEffect(() => {
    fetchSessionInfo();
  }, []);

  const fetchSessionInfo = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/exam/portal/me/session-info?candidate_id=${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && (data.success || data.session)) {
        const payload = data.data || data;
        setSessionInfo(payload);
        const duration = payload.session?.duration_minutes || 45;
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
    if (viewMode === 'waiting' && waitCountdown > 0) {
      const timer = setInterval(() => setWaitCountdown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [viewMode, waitCountdown]);

  useEffect(() => {
    if (viewMode !== 'waiting' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (viewMode !== 'waiting' && timeLeft === 0 && sessionInfo && !submitting && !resultModalVisible) {
      doSubmit(true);
    }
  }, [timeLeft, sessionInfo, viewMode, submitting, resultModalVisible]);

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

  const toggleFlag = (questionId: string) => {
    setFlagged(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleSubmitDraft = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/exam/portal/submit-draft?candidate_id=${currentUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers_json: JSON.stringify(answers) })
      });
      const data = await res.json();
      if (res.ok && (data.success !== false)) {
        message.success('Đã lưu bài làm tạm thời.');
      } else {
        message.error(data.detail || 'Lưu tạm thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối máy chủ.');
    }
  };

  const doSubmit = async (isAuto: boolean) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/exam/portal/submit-final?candidate_id=${currentUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers_json: JSON.stringify(answers) })
      });
      const data = await res.json();
      if (res.ok && (data.success !== false)) {
        setIsTimeOutSubmit(isAuto);
        setExamResultData(data);
        setResultModalVisible(true);
      } else {
        message.error(data.detail || 'Nộp bài thất bại.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFinal = () => {
    Modal.confirm({
      title: 'Xác nhận nộp bài',
      content: 'Bạn có chắc chắn muốn nộp bài? Sau khi nộp bạn sẽ không thể sửa lại đáp án.',
      okText: 'Nộp bài',
      cancelText: 'Quay lại',
      onOk: () => doSubmit(false)
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

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
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
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center">
          <Title level={4} className="text-red-600 mb-2">Không tìm thấy ca thi</Title>
          <Text className="text-slate-500 block mb-6">Bạn chưa được phân vào ca thi nào hoặc ca thi đã kết thúc.</Text>
          <Button type="primary" onClick={onLogout} icon={<LogoutOutlined />}>
            Đăng xuất
          </Button>
        </div>
      </div>
    );
  }

  const questions = sessionInfo.questions && sessionInfo.questions.length > 0 ? sessionInfo.questions : [];
  
  if (questions.length === 0 && viewMode !== 'waiting') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-sans">
        <div className="bg-white py-12 px-8 rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)] max-w-[480px] w-full text-center flex flex-col items-center">
          <h2 className="text-slate-800 font-bold text-[18px] m-0 mb-4">Chưa có câu hỏi</h2>
          <p className="text-slate-600 m-0 mb-8 text-[14px]">Ca thi này chưa được cập nhật danh sách câu hỏi.</p>
          <Button type="primary" onClick={onLogout} className="bg-[#1677ff] hover:bg-blue-600 px-6 h-9 flex items-center justify-center font-medium rounded shadow-none border-none" icon={<RollbackOutlined />}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIdx] || {};
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  // Group questions by parts for bottom nav
  const parts = questions.reduce((acc: any, q: any) => {
    if (!acc[q.part]) acc[q.part] = [];
    acc[q.part].push(q);
    return acc;
  }, {});

  const getQuestionGlobalIndex = (questionId: string) => questions.findIndex((q: any) => q.id === questionId);

  if (viewMode === 'waiting') {
    return (
      <div className="flex flex-col h-screen w-full bg-[#f0f4f8] items-center justify-center p-4">
        <Title level={3} className="text-[#1a365d] uppercase mb-2 font-bold tracking-wide">
          {sessionInfo.session?.name ? sessionInfo.session.name.toUpperCase() : 'KỲ THI TRỰC TUYẾN'}
        </Title>
        <Text className="text-slate-600 mb-10 font-medium">Ngày thi: {new Date().toLocaleDateString('vi-VN')} ({sessionInfo.session?.start_time ? new Date(sessionInfo.session.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '09:00'} - {sessionInfo.session?.end_time ? new Date(sessionInfo.session.end_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '11:00'})</Text>

        <div className="flex gap-6 max-w-4xl w-full mb-10">
          <div className="flex-1 bg-white p-8 rounded-xl shadow-sm">
            <h3 className="text-blue-800 font-bold mb-6 uppercase tracking-wider text-sm">THÍ SINH</h3>
            <div className="space-y-5 text-slate-800 font-bold text-sm">
              <div><span className="text-slate-500 mr-2 font-normal">Họ và tên:</span> {currentUser.fullName}</div>
              <div><span className="text-slate-500 mr-2 font-normal">SBD:</span> {currentUser.username}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Ngày sinh:</span> {sessionInfo.candidate?.dob || '30/05/2007'}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Giới tính:</span> {sessionInfo.candidate?.gender || 'NAM'}</div>
            </div>
          </div>
          <div className="flex-1 bg-white p-8 rounded-xl shadow-sm">
            <h3 className="text-blue-800 font-bold mb-6 uppercase tracking-wider text-sm">MÔN THI</h3>
            <div className="space-y-5 text-slate-800 font-bold text-sm">
              <div><span className="text-slate-500 mr-2 font-normal">Môn thi:</span> {sessionInfo.exam?.subject || 'TOÁN'}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Số lượng câu hỏi:</span> {totalQuestions}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Thời gian làm bài (phút):</span> {sessionInfo.session?.duration_minutes || 60}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Điểm tối đa:</span> 10</div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl w-full mb-12 text-slate-600 text-sm space-y-1">
          <div className="font-bold text-slate-800 mb-2">Lưu ý</div>
          <div>Thí sinh cần xác nhận xem hướng dẫn làm bài trước khi bắt đầu làm bài thi</div>
          <div>Thí sinh chỉ có thể bắt đầu làm bài khi ca thi đã mở</div>
        </div>

        <div className="flex gap-4">
          <Button size="large" className="px-10 h-10 font-bold border-blue-600 text-blue-700 rounded" onClick={onLogout}>Thoát</Button>
          <Button type="primary" size="large" className="px-10 h-10 font-bold bg-blue-800 rounded" onClick={() => setViewMode('taking')} disabled={waitCountdown > 0}>
            {waitCountdown > 0 ? `Bắt đầu làm bài (${waitCountdown}s)` : 'Bắt đầu làm bài'}
          </Button>
        </div>
      </div>
    );
  }

  if (viewMode === 'review') {
    return (
      <div className="flex h-screen w-full bg-[#5f5757] p-8 justify-center font-sans">
        <div className="bg-white max-w-[1200px] w-full rounded shadow-2xl flex flex-col md:flex-row overflow-hidden">
          {/* Left main content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="h-14 border-b flex items-center px-6 shrink-0 bg-white">
              <span className="font-medium text-slate-700 uppercase tracking-wide">RÀ SOÁT BÀI THI</span>
            </div>
            
            <div className="p-4 px-6 border-b flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-700 shrink-0 bg-white">
              <div>Họ và tên: <span className="text-blue-800 font-bold ml-1">{currentUser.fullName}</span></div>
              <div>SBD: <span className="text-blue-800 font-bold ml-1">{currentUser.username}</span></div>
              <div>Môn thi: <span className="text-blue-800 font-bold ml-1">{sessionInfo.exam?.subject || 'TOÁN'}</span></div>
              <div className="md:hidden">Số câu đã trả lời: <span className="text-red-600 font-bold ml-1">{answeredCount}/{totalQuestions}</span></div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
              {Object.keys(parts).map((partNum) => (
                <div key={partNum} className="space-y-6">
                  <div className="font-bold text-blue-900 uppercase">PHẦN {['I', 'II', 'III', 'IV'][parseInt(partNum) - 1]}:</div>
                  
                  {parts[partNum].map((q: any) => {
                    const globalIdx = getQuestionGlobalIndex(q.id);
                    return (
                      <div key={q.id} className="border-b pb-6 last:border-0 border-slate-100">
                        <div className="font-bold text-slate-800 mb-4 flex gap-1"><span className="shrink-0">Câu {globalIdx + 1}: </span> <span className="font-medium">{q.content}</span></div>
                        {(!q.options || q.options.length === 0 || q.type_code?.toLowerCase().includes('ngan') || q.type_code === 'TLN') ? (
                          <div className="pl-12">
                            <Input 
                              placeholder="Nhập câu trả lời của bạn..." 
                              value={answers[q.id] || ''} 
                              onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                              className="w-full max-w-md"
                            />
                          </div>
                        ) : (
                          <Radio.Group value={answers[q.id]} className="flex flex-col gap-2 pl-12" onChange={(e) => handleSelectAnswer(q.id, e.target.value)}>
                            {q.options.map((opt: string, oIdx: number) => {
                              const letter = String.fromCharCode(65 + oIdx);
                              return (
                                <Radio key={letter} value={letter} className="text-slate-700">
                                  <span className="font-bold">{letter}. </span> {opt.substring(3)}
                                </Radio>
                              );
                            })}
                          </Radio.Group>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              
              <div className="flex justify-center gap-4 pt-10 pb-10">
                <Button size="large" className="px-8 font-bold text-blue-700 border-blue-600 rounded" onClick={() => setViewMode('taking')}>Quay lại</Button>
                <Button type="primary" size="large" className="px-8 font-bold bg-blue-800 rounded" onClick={handleSubmitFinal} loading={submitting}>Nộp bài</Button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-full md:w-80 border-l border-slate-200 flex flex-col bg-white shrink-0">
            <div className="h-14 border-b flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-2 text-red-600 font-bold text-xl">
                <ClockCircleOutlined />
                <span>{formatTime(timeLeft)}</span>
              </div>
              <Button type="text" onClick={() => setViewMode('taking')} className="text-slate-400 hover:text-slate-600 px-2 text-xl" icon={<span className="leading-none pb-1 font-light">&times;</span>} />
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="text-sm text-slate-700 mb-6">
                Số câu đã trả lời: <span className="font-bold ml-1">{answeredCount}/{totalQuestions}</span>
              </div>

              <div className="space-y-6">
                {Object.keys(parts).map((partNum) => (
                  <div key={partNum}>
                    <div className="text-sm text-blue-900 mb-3">Phần {['I', 'II', 'III', 'IV'][parseInt(partNum) - 1]}: Thí sinh trả lời từ câu {getQuestionGlobalIndex(parts[partNum][0].id) + 1} đến câu {getQuestionGlobalIndex(parts[partNum][parts[partNum].length - 1].id) + 1}</div>
                    <div className="flex flex-wrap gap-2">
                      {parts[partNum].map((q: any) => {
                        const gIdx = getQuestionGlobalIndex(q.id);
                        const isAnswered = !!answers[q.id];
                        const isFlagged = flagged[q.id];

                        let bgClass = "bg-slate-200 text-slate-600";
                        if (isFlagged) bgClass = "bg-yellow-400 text-white";
                        else if (isAnswered) bgClass = "bg-green-600 text-white";

                        return (
                          <div
                            key={q.id}
                            onClick={() => {
                              setCurrentQuestionIdx(gIdx);
                              setViewMode('taking');
                            }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer transition-all ${bgClass} hover:opacity-80`}
                          >
                            {gIdx + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout className="min-h-screen font-sans bg-white flex flex-col">
      {/* Top Header */}
      <header className="bg-[#1a365d] px-4 flex items-center justify-between h-14 shrink-0 text-white shadow-md z-50" style={{ color: 'white', lineHeight: 'normal' }}>
        <div className="flex flex-col text-xs font-medium tracking-wide" style={{ color: 'white' }}>
          <div className="font-bold text-sm mb-0.5 tracking-wider" style={{ color: 'white' }}>HỆ THỐNG THI TRỰC TUYẾN</div>
          <div className="flex gap-6 opacity-90 text-[11px]" style={{ color: 'white' }}>
            <span style={{ color: 'white' }}>Kỳ thi: {sessionInfo.session?.name || 'Đang cập nhật'}</span>
            <span style={{ color: 'white' }}>Môn thi: {sessionInfo.exam?.subject || 'Chưa xác định'}</span>
            <span style={{ color: 'white' }}>Ngày thi: {new Date().toLocaleDateString('vi-VN')}</span>
            <span style={{ color: 'white' }}>Thí sinh: {currentUser?.fullName || 'Đang cập nhật'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2" style={{ color: 'white' }}>
            <ClockCircleOutlined className="text-xl" style={{ color: 'white' }} />
            <div className="flex flex-col items-center leading-none" style={{ color: 'white' }}>
              <span className="font-bold text-xl font-mono" style={{ color: 'white' }}>{formatTime(timeLeft)}</span>
              <span className="text-[10px] text-yellow-300 font-bold">(+05 phút)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-4 mr-2" style={{ color: 'white' }}>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            <span className="text-xs font-medium" style={{ color: 'white' }}>Đang kết nối</span>
          </div>

          <Button
            className="bg-white text-blue-800 border-none font-bold px-5 h-8 text-xs hover:bg-blue-50"
            onClick={() => setViewMode('review')}
            loading={submitting}
          >
            NỘP BÀI
          </Button>
          <Button
            className="bg-white text-red-600 border-none font-bold px-5 h-8 text-xs hover:bg-red-50"
            onClick={handleLogout}
          >
            THOÁT
          </Button>
          <Button
            type="text"
            className="text-white hover:bg-white/10 flex items-center justify-center p-0 w-8 h-8"
            onClick={handleFullscreen}
          >
            <FullscreenOutlined className="text-lg" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <Content className="flex-1 flex flex-col mx-auto w-full max-w-6xl px-4 py-4 overflow-y-auto">
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
            <div className="flex gap-1 text-slate-400">
              <Button type="text" size="small" icon={<UnorderedListOutlined />} />
              <Button type="text" size="small" icon={<AppstoreOutlined />} className="text-blue-600 bg-blue-50" />
            </div>
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
                  <FlagOutlined className={`text-2xl ${flagged[currentQ.id] ? 'text-yellow-500' : 'text-slate-300 hover:text-slate-400'}`} />
                </div>
              </div>

              <div className="space-y-4 pl-14">
                {(!currentQ.options || currentQ.options.length === 0 || currentQ.type_code?.toLowerCase().includes('ngan') || currentQ.type_code === 'TLN') ? (
                  <Input.TextArea
                    placeholder="Nhập câu trả lời của bạn vào đây..."
                    rows={4}
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                    className="w-full max-w-2xl text-base"
                  />
                ) : (
                  <Radio.Group
                    onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                    value={answers[currentQ.id]}
                    className="flex flex-col gap-4"
                  >
                    {currentQ.options.map((opt: string, oIdx: number) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      return (
                        <Radio key={letter} value={letter} className="text-base text-slate-700 font-medium">
                          <span className="font-bold">{letter}. </span> {opt.substring(3)}
                        </Radio>
                      );
                    })}
                  </Radio.Group>
                )}
              </div>
            </div>

            {/* Scroll bar placeholder spacing similar to the image */}
            <div className="w-1.5 h-64 bg-slate-200 rounded-full shrink-0 ml-8"></div>
          </div>
        </div>
      </Content>

      {/* Bottom Navigation */}
      <Footer className="bg-white border-t-2 border-slate-200 p-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 shrink-0">
        <div className="max-w-7xl mx-auto w-full px-4 py-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mb-4">
            {Object.keys(parts).map((partNum, pIdx) => (
              <div key={partNum} className="flex items-center gap-3">
                <div className="font-bold text-blue-900 text-sm">Phần {['I', 'II', 'III', 'IV'][parseInt(partNum) - 1]}:</div>
                <div className="flex flex-wrap gap-2">
                  {parts[partNum].map((q: any) => {
                    const gIdx = getQuestionGlobalIndex(q.id);
                    const isAnswered = !!answers[q.id];
                    const isActive = gIdx === currentQuestionIdx;
                    const isFlagged = flagged[q.id];

                    let bgClass = "bg-slate-200 text-slate-600"; // Default
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
          <div className="flex justify-center mt-2 pb-2">
            <Button
              type="primary"
              className="bg-blue-800 px-10 h-8 font-bold text-xs tracking-wide rounded-md shadow-md hover:bg-blue-700"
              onClick={handleSubmitDraft}
            >
              Lưu
            </Button>
          </div>
        </div>
      </Footer>

      <Modal
        title={<span className="font-medium text-slate-700 text-sm">Kết quả thi</span>}
        open={resultModalVisible}
        onCancel={onLogout}
        footer={
          <div className="flex justify-center w-full py-3">
            <Button 
              className="px-10 h-8 text-[#1677ff] border-[#1677ff] font-medium rounded hover:bg-blue-50"
              onClick={onLogout}
            >
              Hoàn thành
            </Button>
          </div>
        }
        centered
        width={600}
        closeIcon={<span className="text-xl font-light leading-none text-slate-400 hover:text-slate-600">&times;</span>}
      >
        <div className="py-12 flex flex-col items-center font-sans">
          {isTimeOutSubmit ? (
            <div className="text-center mb-10">
              <h2 className="text-red-600 font-bold text-[24px] m-0 mb-3 uppercase tracking-wide">HẾT GIỜ!</h2>
              <p className="text-red-600 font-bold text-[15px] m-0">Bài thi của bạn đã được hệ thống nộp tự động.</p>
            </div>
          ) : (
            <div className="text-center mb-10">
              <h2 className="text-slate-800 font-bold text-[18px] m-0">Bạn đã nộp bài thi thành công!</h2>
            </div>
          )}

          <div className="w-full space-y-5 text-[15px] text-slate-800 mx-auto max-w-[340px]">
            <div className="grid grid-cols-[180px_auto] gap-2 items-center">
              <span className="text-slate-700">Số câu đã trả lời:</span>
              <strong className="text-[#22c55e] font-bold text-[17px]">{answeredCount}/{totalQuestions}</strong>
            </div>
            <div className="grid grid-cols-[180px_auto] gap-2 items-center">
              <span className="text-slate-700">Số điểm đạt được:</span>
              <strong className="text-[#22c55e] font-bold text-[17px]">{examResultData?.score?.toString().replace('.', ',')}/10</strong>
            </div>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
