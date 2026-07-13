import React, { useState, useEffect } from 'react';
import { Layout, Button, message, Spin, Typography, Modal, Radio, Space, Input } from 'antd';
import { ClockCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined, FlagOutlined, FlagFilled, FullscreenOutlined, AppstoreOutlined, UnorderedListOutlined, LogoutOutlined, RollbackOutlined } from '@ant-design/icons';
import { SystemUser } from '../../../types';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

interface ExamPortalProps {
  currentUser: SystemUser;
  onLogout: () => void;
  mode?: 'taking' | 'preview';
  previewExamData?: any;
}

export default function ExamPortal({ currentUser, onLogout, mode = 'taking', previewExamData }: ExamPortalProps) {
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

  const [viewMode, setViewMode] = useState<'waiting' | 'taking' | 'review'>(mode === 'preview' ? 'taking' : 'waiting');
  const [waitCountdown, setWaitCountdown] = useState(10);

  useEffect(() => {
    if (mode === 'preview' && previewExamData) {
      setSessionInfo(previewExamData);
      setTimeLeft((previewExamData.session?.duration_minutes || 45) * 60);
      setViewMode('taking');
      setLoading(false);
      return;
    }
    fetchSessionInfo();
  }, [mode, previewExamData]);

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
    if (viewMode !== 'waiting' && timeLeft > 0 && mode !== 'preview') {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (viewMode !== 'waiting' && timeLeft === 0 && sessionInfo && !submitting && !resultModalVisible && mode !== 'preview') {
      doSubmit(true);
    }
  }, [timeLeft, sessionInfo, viewMode, submitting, resultModalVisible, mode]);

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
    if (mode === 'preview') {
      message.success('Đã lưu bài làm tạm thời (Preview).');
      return;
    }
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
    if (mode === 'preview') {
      setIsTimeOutSubmit(isAuto);
      setExamResultData({ score: 10 });
      setResultModalVisible(true);
      return;
    }
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

  // Helper: get display name for type_code
  const getTypeDisplayName = (typeCode: string) => {
    const tc = (typeCode || '').toLowerCase();
    if (tc === 'true_false' || tc === 'đs' || tc === 'ds') return 'Đúng sai';
    if (tc === 'short' || tc.includes('ngan') || tc === 'tln') return 'Trả lời ngắn';
    return 'Trắc nghiệm';
  };

  // Normalize type_code to a group key
  const getTypeGroupKey = (typeCode: string) => {
    const tc = (typeCode || '').toLowerCase();
    if (tc === 'true_false' || tc === 'đs' || tc === 'ds') return 'true_false';
    if (tc === 'short' || tc.includes('ngan') || tc === 'tln') return 'short';
    return 'single';
  };

  // Group questions by type_code for bottom nav (like student interface)
  const parts = questions.reduce((acc: any, q: any) => {
    const key = getTypeGroupKey(q.type_code);
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  const getQuestionGlobalIndex = (questionId: string) => questions.findIndex((q: any) => q.id === questionId);

  if (viewMode === 'waiting') {
    return (
      <div className="flex flex-col min-h-screen w-full bg-[#f4f6f9] items-center justify-center py-12 px-4 font-sans">
        <h1 className="text-[28px] text-slate-800 uppercase mb-3 font-medium tracking-wide text-center">
          {sessionInfo.session?.name ? sessionInfo.session.name.toUpperCase() : 'KỲ THI TRỰC TUYẾN'}
        </h1>
        <p className="text-slate-800 mb-12 text-[15px]">
          Ngày thi: {new Date().toLocaleDateString('vi-VN')} ({sessionInfo.session?.start_time ? new Date(sessionInfo.session.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '09:00'} - {sessionInfo.session?.end_time ? new Date(sessionInfo.session.end_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '11:00'})
        </p>

        <div className="flex flex-col md:flex-row gap-6 max-w-[960px] w-full mb-10">
          <div className="flex-1 bg-white p-8 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-blue-800 font-bold mb-6 uppercase tracking-wider text-[15px]">THÍ SINH</h3>
            <div className="space-y-6 text-slate-800 font-bold text-[15px]">
              <div><span className="text-slate-500 mr-2 font-normal">Họ và tên:</span> {currentUser.fullName}</div>
              <div><span className="text-slate-500 mr-2 font-normal">SBD:</span> {currentUser.username}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Ngày sinh:</span> {sessionInfo.candidate?.dob || '30/05/2007'}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Giới tính:</span> {sessionInfo.candidate?.gender || 'Nữ'}</div>
            </div>
          </div>
          <div className="flex-1 bg-white p-8 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-blue-800 font-bold mb-6 uppercase tracking-wider text-[15px]">MÔN THI</h3>
            <div className="space-y-6 text-slate-800 font-bold text-[15px]">
              <div><span className="text-slate-500 mr-2 font-normal">Môn thi:</span> {sessionInfo.exam?.subject || 'Toán học'}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Số lượng câu hỏi:</span> {totalQuestions}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Thời gian làm bài (phút):</span> {sessionInfo.session?.duration_minutes || 60}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Điểm tối đa:</span> 10</div>
            </div>
          </div>
        </div>

        <div className="max-w-[960px] w-full mb-14 text-slate-600 text-[15px] space-y-2">
          <div className="font-bold text-slate-800 mb-3 text-base">Lưu ý</div>
          <div>Thí sinh cần xác nhận xem hướng dẫn làm bài trước khi bắt đầu làm bài thi</div>
          <div>Thí sinh chỉ có thể bắt đầu làm bài khi ca thi đã mở</div>
        </div>

        <div className="flex justify-center gap-4 w-full">
          <Button size="large" className="px-8 h-11 text-slate-600 font-medium border-slate-300 rounded hover:text-slate-800 hover:border-slate-400" onClick={onLogout}>Thoát</Button>
          <Button type="primary" size="large" className="px-8 h-11 font-medium bg-[#1677ff] rounded shadow-sm hover:bg-blue-600" onClick={() => setViewMode('taking')}>
            Bắt đầu làm bài
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
              {Object.keys(parts).map((partKey) => (
                <div key={partKey} className="space-y-6">
                  <div className="font-bold text-blue-900 uppercase">PHẦN {getTypeDisplayName(partKey).toUpperCase()}:</div>
                  
                  {parts[partKey].map((q: any) => {
                    const globalIdx = getQuestionGlobalIndex(q.id);
                    return (
                      <div key={q.id} className="border-b pb-6 last:border-0 border-slate-100">
                        <div className="font-bold text-slate-800 mb-4 flex gap-1"><span className="shrink-0">Câu {globalIdx + 1}: </span> <span className="font-medium">{q.content}</span></div>
                        {q.type_code === 'true_false' || q.type_code?.toLowerCase() === 'đs' || q.type_code?.toLowerCase() === 'ds' ? (
                          <div className="pl-12 w-full max-w-4xl">
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                              <table className="w-full text-left text-[14px] text-slate-800">
                                <thead className="bg-slate-100 border-b border-slate-200">
                                  <tr>
                                    <th className="py-2.5 px-4 font-bold text-slate-700 w-12 text-center">Ý</th>
                                    <th className="py-2.5 px-4 font-bold text-slate-700">Phát biểu</th>
                                    <th className="py-2.5 px-4 font-bold text-slate-700 w-24 text-center">Đúng</th>
                                    <th className="py-2.5 px-4 font-bold text-slate-700 w-24 text-center">Sai</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {q.options.map((opt: string, oIdx: number) => {
                                    const letter = String.fromCharCode(97 + oIdx); // a, b, c, d
                                    const currentAns = answers[q.id] || "";
                                    const parts = currentAns ? currentAns.split(', ') : [];
                                    const isTrue = parts[oIdx] === `${oIdx + 1}. Đúng`;
                                    const isFalse = parts[oIdx] === `${oIdx + 1}. Sai`;
                                    
                                    return (
                                      <tr key={letter} className="hover:bg-slate-50 transition-colors bg-white">
                                        <td className="py-3 px-4 text-center font-bold">{letter})</td>
                                        <td className="py-3 px-4">{opt}</td>
                                        <td className="py-3 px-4 text-center border-l border-slate-100">
                                          <Radio 
                                            checked={isTrue} 
                                            onChange={() => {
                                              const newParts = [...(parts.length === q.options.length ? parts : Array.from({length: q.options.length}).map((_, i) => `${i + 1}. `))];
                                              newParts[oIdx] = `${oIdx + 1}. Đúng`;
                                              handleSelectAnswer(q.id, newParts.join(', '));
                                            }}
                                            className="m-0"
                                          />
                                        </td>
                                        <td className="py-3 px-4 text-center border-l border-slate-100">
                                          <Radio 
                                            checked={isFalse} 
                                            onChange={() => {
                                              const newParts = [...(parts.length === q.options.length ? parts : Array.from({length: q.options.length}).map((_, i) => `${i + 1}. `))];
                                              newParts[oIdx] = `${oIdx + 1}. Sai`;
                                              handleSelectAnswer(q.id, newParts.join(', '));
                                            }}
                                            className="m-0"
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (!q.options || q.options.length === 0 || q.type_code?.toLowerCase().includes('ngan') || q.type_code === 'TLN') ? (
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
                {Object.keys(parts).map((partKey) => (
                  <div key={partKey}>
                    <div className="text-sm text-blue-900 mb-3">Phần {getTypeDisplayName(partKey)}: Câu {parts[partKey].map((q: any) => getQuestionGlobalIndex(q.id) + 1).join(', ')}</div>
                    <div className="flex flex-wrap gap-2">
                      {parts[partKey].map((q: any) => {
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
    <Layout className="h-screen overflow-hidden font-sans bg-[#f4f6f9] flex flex-col">
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
            <div className={`w-2.5 h-2.5 rounded-full ${mode === 'preview' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'}`}></div>
            <span className="text-xs font-medium" style={{ color: 'white' }}>{mode === 'preview' ? 'Preview Mode' : 'Đang kết nối'}</span>
          </div>

          {mode !== 'preview' && (
            <Button
              className="bg-white text-blue-800 border-none font-bold px-5 h-8 text-xs hover:bg-blue-50"
              onClick={() => setViewMode('review')}
              loading={submitting}
            >
              NỘP BÀI
            </Button>
          )}
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
      <Content className="flex-1 flex flex-col bg-[#f4f6f9] w-full overflow-hidden">
        {/* Controls Row */}
        <div className="flex items-center justify-center py-3 px-8 border-b border-slate-200 shrink-0 bg-white shadow-sm z-10 relative">
          <div className="w-full max-w-[1200px] flex justify-center relative items-center">
            <div className="flex gap-2">
              <Button
                className="text-blue-800 border-blue-800 font-medium px-4 h-8 rounded-sm hover:bg-blue-50 flex items-center gap-1 transition-all text-xs"
                onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
                disabled={currentQuestionIdx === 0}
              >
                <ArrowLeftOutlined className="text-[10px]" /> Quay lại
              </Button>
              <Button
                type="primary"
                className="bg-[#244384] font-medium px-4 h-8 flex flex-row-reverse items-center gap-1 rounded-sm shadow-none hover:bg-[#1a365d] transition-all text-xs"
                onClick={() => setCurrentQuestionIdx(Math.min(totalQuestions - 1, currentQuestionIdx + 1))}
                disabled={currentQuestionIdx === totalQuestions - 1}
              >
                <ArrowRightOutlined className="text-[10px]" /> Tiếp theo
              </Button>
            </div>
            <div className="absolute right-0 flex items-center gap-4 hidden sm:flex">
              <span className="text-slate-700 text-sm">
                Số câu đã trả lời: <span className="text-green-600 font-bold ml-1">{answeredCount}</span> / {totalQuestions}
              </span>
              <div className="flex gap-1 ml-2">
                <Button type="text" className="bg-blue-700 text-white hover:bg-blue-800 w-7 h-7 rounded-sm flex items-center justify-center p-0" icon={<UnorderedListOutlined className="text-[14px]" />} />
                <Button type="text" className="bg-blue-700 text-white hover:bg-blue-800 w-7 h-7 rounded-sm flex items-center justify-center p-0" icon={<AppstoreOutlined className="text-[14px]" />} />
              </div>
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-6 sm:py-8 w-full flex justify-center">
          <div className="w-full max-w-[1200px] bg-white p-6 sm:p-10 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 h-fit">
            {(() => {
            const currentTypeKey = getTypeGroupKey(currentQ.type_code);
            const partQuestions = parts[currentTypeKey] || [];
            if (partQuestions.length === 0) return null;
            const startIdx = getQuestionGlobalIndex(partQuestions[0].id) + 1;
            const endIdx = getQuestionGlobalIndex(partQuestions[partQuestions.length - 1].id) + 1;
            
            let partDesc = "Mỗi câu hỏi thí sinh chỉ chọn một phương án.";
            if (currentTypeKey === 'true_false') {
              partDesc = "Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.";
            } else if (currentTypeKey === 'short') {
              partDesc = "Thí sinh trả lời bằng cách nhập đáp án vào ô trống.";
            }

            return (
              <div className="mb-8 flex flex-wrap items-center gap-4 text-[#1a365d]">
                <span className="font-bold uppercase tracking-wider text-[15px] whitespace-nowrap">PHẦN {getTypeDisplayName(currentTypeKey).toUpperCase()}:</span>
                <span className="text-[15px] font-medium">Thí sinh trả lời từ câu {startIdx} đến câu {endIdx}. {partDesc}</span>
              </div>
            );
          })()}

          <div className="flex gap-6 max-w-full">
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <div className="font-bold text-slate-800 text-[15px] shrink-0 pt-[2px]">
                  Câu {currentQuestionIdx + 1}:
                </div>
                <div className="text-[15px] text-slate-800 font-medium leading-relaxed flex-1">
                  {currentQ.content}
                </div>
                <div
                  className="cursor-pointer shrink-0 ml-4 flex flex-col items-center justify-center p-2 rounded-lg transition-all hover:bg-slate-100"
                  onClick={() => toggleFlag(currentQ.id)}
                  title="Đánh dấu câu hỏi này"
                >
                  {flagged[currentQ.id] ? (
                    <FlagFilled className="text-xl text-yellow-500 drop-shadow-md mb-1" />
                  ) : (
                    <FlagOutlined className="text-xl text-slate-400 hover:text-slate-500 mb-1" />
                  )}
                  <span className={`text-[11px] font-semibold ${flagged[currentQ.id] ? 'text-yellow-600' : 'text-slate-500'}`}>
                    Đánh dấu
                  </span>
                </div>
              </div>

              <div className="space-y-4 pl-[54px] pr-12">
                {currentQ.type_code === 'true_false' || currentQ.type_code?.toLowerCase() === 'đs' || currentQ.type_code?.toLowerCase() === 'ds' ? (
                  <div className="w-full border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[15px] text-slate-800">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-bold text-slate-700 w-12 text-center">Ý</th>
                          <th className="py-3 px-4 font-bold text-slate-700">Phát biểu</th>
                          <th className="py-3 px-4 font-bold text-slate-700 w-24 text-center">Đúng</th>
                          <th className="py-3 px-4 font-bold text-slate-700 w-24 text-center">Sai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {currentQ.options.map((opt: string, oIdx: number) => {
                          const letter = String.fromCharCode(97 + oIdx); // a, b, c, d
                          const currentAns = answers[currentQ.id] || "";
                          const parts = currentAns ? currentAns.split(', ') : [];
                          const isTrue = parts[oIdx] === `${oIdx + 1}. Đúng`;
                          const isFalse = parts[oIdx] === `${oIdx + 1}. Sai`;
                          
                          return (
                            <tr key={letter} className="hover:bg-slate-50 transition-colors bg-white">
                              <td className="py-3.5 px-4 text-center font-bold">{letter})</td>
                              <td className="py-3.5 px-4">{opt}</td>
                              <td className="py-3.5 px-4 text-center border-l border-slate-100">
                                <Radio 
                                  checked={isTrue} 
                                  onChange={() => {
                                    const newParts = [...(parts.length === currentQ.options.length ? parts : Array.from({length: currentQ.options.length}).map((_, i) => `${i + 1}. `))];
                                    newParts[oIdx] = `${oIdx + 1}. Đúng`;
                                    handleSelectAnswer(currentQ.id, newParts.join(', '));
                                  }}
                                  className="m-0"
                                />
                              </td>
                              <td className="py-3.5 px-4 text-center border-l border-slate-100">
                                <Radio 
                                  checked={isFalse} 
                                  onChange={() => {
                                    const newParts = [...(parts.length === currentQ.options.length ? parts : Array.from({length: currentQ.options.length}).map((_, i) => `${i + 1}. `))];
                                    newParts[oIdx] = `${oIdx + 1}. Sai`;
                                    handleSelectAnswer(currentQ.id, newParts.join(', '));
                                  }}
                                  className="m-0"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (!currentQ.options || currentQ.options.length === 0 || currentQ.type_code?.toLowerCase().includes('ngan') || currentQ.type_code === 'TLN') ? (
                  <Input.TextArea
                    placeholder="Nhập câu trả lời của bạn vào đây..."
                    rows={4}
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                    className="w-full text-[15px] p-3 rounded shadow-none border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                ) : (
                  <Radio.Group
                    onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                    value={answers[currentQ.id]}
                    className="flex flex-col gap-2 w-full"
                  >
                    {currentQ.options.map((opt: string, oIdx: number) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isSelected = answers[currentQ.id] === letter;
                      return (
                        <Radio 
                          key={letter} 
                          value={letter} 
                          className="text-[15px] text-slate-800 font-normal w-full m-0 py-1"
                        >
                          <span className={`font-bold mr-1 ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{letter}.</span> 
                          <span>{opt.substring(3)}</span>
                        </Radio>
                      );
                    })}
                  </Radio.Group>
                )}
              </div>
            </div>

            {/* Scroll bar placeholder spacing similar to the image */}
            <div className="w-1.5 h-64 bg-slate-200 rounded-full shrink-0 hidden md:block"></div>
          </div>
          </div>
        </div>
      </Content>

      {/* Bottom Navigation */}
      <Footer className="bg-white border-t border-slate-300 p-0 z-40 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <div className="w-full max-w-[1200px] mx-auto px-6 py-4 flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-4 w-full">
            {Object.keys(parts).map((partKey, pIdx) => (
              <div key={partKey} className="flex items-center gap-3">
                <div className="font-bold text-[#1a365d] text-[15px]">Phần {getTypeDisplayName(partKey)}:</div>
                <div className="flex flex-wrap gap-2">
                  {parts[partKey].map((q: any) => {
                    const gIdx = getQuestionGlobalIndex(q.id);
                    const isAnswered = !!answers[q.id];
                    const isActive = gIdx === currentQuestionIdx;
                    const isFlagged = flagged[q.id];

                    let bgClass = "bg-slate-200 text-slate-600 border-transparent";
                    if (isActive) bgClass = "bg-[#1677ff] text-white border-[#1677ff] shadow-md transform scale-110";
                    else if (isFlagged) bgClass = "bg-[#fadb14] text-white border-[#fadb14]";
                    else if (isAnswered) bgClass = "bg-[#389e0d] text-white border-[#389e0d]";

                    return (
                      <div
                        key={q.id}
                        onClick={() => setCurrentQuestionIdx(gIdx)}
                        className={`w-[28px] h-[28px] rounded-full flex items-center justify-center text-[13px] font-bold cursor-pointer transition-all border ${bgClass} hover:opacity-80`}
                      >
                        {gIdx + 1}
                      </div>
                    );
                  })}
                </div>
                {pIdx < Object.keys(parts).length - 1 && (
                  <div className="h-5 w-[1px] bg-slate-300 mx-1"></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            {mode !== 'preview' && (
              <Button 
                className="bg-blue-50 text-blue-800 border-blue-200 font-medium px-6 h-8 text-[13px] hover:bg-blue-100" 
                onClick={handleSubmitDraft} 
                loading={submitting}
              >
                LƯU BÀI TẠM
              </Button>
            )}
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
