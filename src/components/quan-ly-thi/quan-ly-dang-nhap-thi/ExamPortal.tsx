import { API_ORIGIN } from '../../../config/apiBase';
import React, { useState, useEffect } from 'react';
import { Layout, Button, message, Spin, Typography, Modal, Radio, Space, Input } from 'antd';
import { ClockCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined, FlagOutlined, FlagFilled, FullscreenOutlined, AppstoreOutlined, UnorderedListOutlined, LogoutOutlined, RollbackOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { SystemUser } from '../../../types';
import { RichTextView } from '../../../utils/htmlContent';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const cleanOptionText = (text: string) => {
  if (!text) return text;
  // Removes "A. ", "B. ", etc. at the start (ignoring HTML tags if any)
  return text.replace(/^(<[^>]+>)?\s*[A-Z][\.\)]\s*/, '$1');
};
interface ExamPortalProps {
  currentUser: SystemUser;
  subject: string;
  onLogout: () => void;
  onExamStart?: () => void;
  mode?: 'taking' | 'preview';
  previewExamData?: any;
}

export default function ExamPortal({ currentUser, subject, onLogout, onExamStart, mode = 'taking', previewExamData }: ExamPortalProps) {
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
      const res = await fetch(`${API_ORIGIN}/api/exam/portal/me/exam-info?candidate_id=${currentUser.id}&subject=${encodeURIComponent(subject)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && (data.success || data.exam)) {
        const payload = data.data || data;
        setSessionInfo(payload);
        const duration = payload.exam?.duration || 45;

        if (payload.result_info?.started_at) {
          const startedAt = new Date(payload.result_info.started_at).getTime();
          const durationMs = duration * 60 * 1000;
          const endAt = startedAt + durationMs;
          const now = new Date().getTime();
          setTimeLeft(Math.max(0, Math.floor((endAt - now) / 1000)));
          if (mode !== 'preview') {
            setViewMode('taking');
          }
        } else {
          setTimeLeft(duration * 60);
        }

        if (payload.result_info?.answers_json) {
          try {
            const savedAnswers = JSON.parse(payload.result_info.answers_json);
            if (savedAnswers && typeof savedAnswers === 'object') {
              setAnswers(savedAnswers);
            }
          } catch (e) {
            console.error("Lỗi khi tải câu trả lời đã lưu:", e);
          }
        }
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

  const handleConfirmStart = async () => {
    if (mode === 'preview') {
      setViewMode('taking');
      onExamStart?.();
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_ORIGIN}/api/exam/portal/me/confirm-start?result_id=${sessionInfo?.result_info?.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Update sessionInfo with started_at
        if (data.started_at) {
          const startedAt = new Date(data.started_at).getTime();
          const duration = sessionInfo.exam?.duration || 45;
          const durationMs = duration * 60 * 1000;
          const endAt = startedAt + durationMs;
          const now = new Date().getTime();
          setTimeLeft(Math.max(0, Math.floor((endAt - now) / 1000)));

          setSessionInfo((prev: any) => ({
            ...prev,
            result_info: {
              ...prev.result_info,
              started_at: data.started_at
            }
          }));
        }
        setViewMode('taking');
        onExamStart?.();
      } else {
        message.error(data.detail || 'Không thể bắt đầu làm bài.');
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
        if (sessionInfo?.result_info?.started_at) {
          const startedAt = new Date(sessionInfo.result_info.started_at).getTime();
          const duration = sessionInfo.exam?.duration || 45;
          const endAt = startedAt + duration * 60 * 1000;
          const now = new Date().getTime();
          setTimeLeft(Math.max(0, Math.floor((endAt - now) / 1000)));
        } else {
          setTimeLeft(prev => prev - 1);
        }
      }, 1000);
      return () => clearInterval(timer);
    } else if (viewMode !== 'waiting' && timeLeft <= 0 && sessionInfo && !submitting && !resultModalVisible && mode !== 'preview') {
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
      const res = await fetch(`${API_ORIGIN}/api/exam/portal/submit-draft?result_id=${sessionInfo?.result_info?.id}`, {
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
      // Chế độ xem trước (preview) không thực sự chấm bài (không có result_id/candidate thật để gọi
      // /submit-final) nên KHÔNG bịa điểm số đã làm được — chỉ hiện đúng thang điểm tối đa (max_score)
      // của đề đang xem trước, nếu có, thay vì đặt cứng cả điểm số lẫn điểm tối đa thành 10.
      setExamResultData({ score: 0, max_score: previewExamData?.totalScore ?? 10 });
      setResultModalVisible(true);
      setViewMode('taking');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_ORIGIN}/api/exam/portal/submit-final?result_id=${sessionInfo?.result_info?.id}`, {
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
        setViewMode('taking');
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

  const rawQuestions = sessionInfo.questions && sessionInfo.questions.length > 0 ? sessionInfo.questions : [];

  // Normalize type_code to a group key
  const getTypeGroupKey = (typeCode: string) => {
    const tc = (typeCode || '').toLowerCase();
    if (tc === 'true_false' || tc === 'đs' || tc === 'ds') return 'p2';
    if (tc === 'short' || tc.includes('ngan') || tc === 'tln') return 'p3';
    return 'p1';
  };

  // Giữ nguyên thứ tự của đề hoán vị từ backend (line_number)
  const questions = rawQuestions;

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
    if (typeCode === 'p2') return 'II: Trắc nghiệm Đúng/Sai';
    if (typeCode === 'p3') return 'III: Trắc nghiệm trả lời ngắn';
    return 'I: Trắc nghiệm 1 lựa chọn';
  };

  // Group questions by type_code for bottom nav (like student interface)
  const parts = questions.reduce((acc: any, q: any) => {
    const key = getTypeGroupKey(q.type_code);
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  const getQuestionGlobalIndex = (questionId: string) => questions.findIndex((q: any) => q.id === questionId);

  const orderedQuestions = ['p1', 'p2', 'p3'].reduce((acc: any[], key: string) => {
    if (parts[key]) acc = acc.concat(parts[key]);
    return acc;
  }, []);

  const currentVisualIdx = orderedQuestions.findIndex((q: any) => q.id === currentQ.id);
  const canGoBack = currentVisualIdx > 0;
  const canGoNext = currentVisualIdx < orderedQuestions.length - 1;

  const handleGoBack = () => {
    if (canGoBack) {
      const prevQ = orderedQuestions[currentVisualIdx - 1];
      setCurrentQuestionIdx(getQuestionGlobalIndex(prevQ.id));
    }
  };

  const handleGoNext = () => {
    if (canGoNext) {
      const nextQ = orderedQuestions[currentVisualIdx + 1];
      setCurrentQuestionIdx(getQuestionGlobalIndex(nextQ.id));
    }
  };

  if (viewMode === 'waiting') {
    return (
      <div className="flex flex-col min-h-screen w-full bg-[#f4f6f9] items-center justify-center py-6 sm:py-12 px-4 font-sans">

        {/* <h1 className="text-xl sm:text-[28px] text-slate-800 uppercase mb-2 sm:mb-3 font-bold tracking-wide text-center">
          {sessionInfo.exam?.name ? sessionInfo.exam.name.toUpperCase() : `KỲ THI MÔN ${sessionInfo.exam?.subject || 'TRỰC TUYẾN'}`}
        </h1> */}
        {/* Cỡ chữ do đúng 2 class text-base/sm:text-xl quyết định — thẻ <h1> không tự mang cỡ chữ nào
            (Tailwind Preflight reset heading về font-size: inherit), đổi tag không ảnh hưởng gì. */}
        <h1 className="text-slate-600 font-semibold mb-6 sm:mb-12 text-base sm:text-xl text-center">
          Ngày thi: {new Date().toLocaleDateString('vi-VN')} ({new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
        </h1>

        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 max-w-[960px] w-full mb-6 sm:mb-10">
          <div className="flex-1 bg-white p-5 sm:p-8 rounded-xl sm:rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-blue-800 font-bold mb-4 sm:mb-6 uppercase tracking-wider text-xs sm:text-[15px]">THÍ SINH</h3>
            <div className="space-y-4 sm:space-y-6 text-slate-800 font-bold text-xs sm:text-[15px]">
              <div><span className="text-slate-500 mr-2 font-normal">Họ và tên:</span> {sessionInfo?.candidate_info?.fullName || currentUser.fullName}</div>
              <div><span className="text-slate-500 mr-2 font-normal">SBD:</span> {sessionInfo?.candidate_info?.username || currentUser.username}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Ngày sinh:</span> {sessionInfo?.candidate_info?.dob || currentUser.dob || 'Đang cập nhật'}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Giới tính:</span> {sessionInfo?.candidate_info?.gender || currentUser.gender || 'Đang cập nhật'}</div>
            </div>
          </div>
          <div className="flex-1 bg-white p-5 sm:p-8 rounded-xl sm:rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-blue-800 font-bold mb-4 sm:mb-6 uppercase tracking-wider text-xs sm:text-[15px]">MÔN THI</h3>
            <div className="space-y-4 sm:space-y-6 text-slate-800 font-bold text-xs sm:text-[15px]">
              <div><span className="text-slate-500 mr-2 font-normal">Môn thi:</span> {sessionInfo.exam?.subject || 'Toán học'}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Số lượng câu hỏi:</span> {totalQuestions}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Thời gian làm bài (phút):</span> {sessionInfo.exam?.duration || 45}</div>
              <div><span className="text-slate-500 mr-2 font-normal">Điểm tối đa:</span> {sessionInfo.exam?.maxScore ?? 10}</div>
            </div>
          </div>
        </div>

        <div className="max-w-[960px] w-full mb-8 sm:mb-14 text-slate-600 text-xs sm:text-[15px] space-y-1.5 sm:space-y-2 bg-white/60 p-4 rounded-xl border border-slate-200/60">
          <div className="font-bold text-slate-800 mb-2 text-sm sm:text-base">Lưu ý</div>
          <div>Thí sinh cần xác nhận xem hướng dẫn làm bài trước khi bắt đầu làm bài thi</div>
          <div>Thí sinh chỉ có thể bắt đầu làm bài khi ca thi đã mở</div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-center gap-3 sm:gap-4 w-full max-w-sm sm:max-w-none mx-auto">
          <Button size="large" className="w-full sm:w-auto px-8 h-11 text-slate-600 font-medium border-slate-300 rounded hover:text-slate-800 hover:border-slate-400" onClick={onLogout}>Thoát</Button>
          <Button type="primary" size="large" className="w-full sm:w-auto px-8 h-11 font-medium bg-[#1677ff] rounded shadow-sm hover:bg-blue-600" onClick={handleConfirmStart} loading={loading}>
            Bắt đầu làm bài
          </Button>
        </div>
      </div>
    );
  }

  if (viewMode === 'review') {
    return (
      <div className="flex h-screen w-full bg-[#5f5757] p-0 sm:p-8 justify-center font-sans overflow-hidden">
        <div className="bg-white max-w-[1200px] w-full rounded-none sm:rounded shadow-2xl flex flex-col md:flex-row overflow-hidden">
          {/* Left main content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="h-12 sm:h-14 border-b flex items-center px-4 sm:px-6 shrink-0 bg-white">
              <span className="font-bold text-slate-800 uppercase tracking-wide text-sm sm:text-base">RÀ SOÁT BÀI THI</span>
            </div>

            <div className="p-3 sm:p-4 px-4 sm:px-6 border-b flex flex-wrap items-center gap-x-4 sm:gap-x-8 gap-y-1.5 text-xs sm:text-sm text-slate-700 shrink-0 bg-white">
              <div>Họ và tên: <span className="text-blue-800 font-bold ml-1">{sessionInfo?.candidate_info?.fullName || currentUser.fullName}</span></div>
              <div>SBD: <span className="text-blue-800 font-bold ml-1">{sessionInfo?.candidate_info?.username || currentUser.username}</span></div>
              <div>Môn thi: <span className="text-blue-800 font-bold ml-1">{sessionInfo.exam?.subject || 'TOÁN'}</span></div>
              <div className="md:hidden">Đã làm: <span className="text-red-600 font-bold ml-1">{answeredCount}/{totalQuestions}</span></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 bg-white">
              {['p1', 'p2', 'p3'].filter(k => parts[k]).map((partKey) => (
                <div key={partKey} className="space-y-4 sm:space-y-6">
                  <div className="font-bold text-blue-900 uppercase text-xs sm:text-sm">PHẦN {getTypeDisplayName(partKey).toUpperCase()}:</div>

                  {parts[partKey].map((q: any) => {
                    const globalIdx = getQuestionGlobalIndex(q.id);
                    return (
                      <div key={q.id} className="border-b pb-4 sm:pb-6 last:border-0 border-slate-100">
                        <div className="font-bold text-slate-800 mb-3 sm:mb-4 flex gap-1 text-xs sm:text-sm"><span className="shrink-0">Câu {q.line_number || (globalIdx + 1)}: </span> <RichTextView html={q.content} className="font-medium" /></div>
                        {q.type_code === 'true_false' || q.type_code?.toLowerCase() === 'đs' || q.type_code?.toLowerCase() === 'ds' ? (
                          <div className="pl-0 sm:pl-12 w-full max-w-4xl">
                            <div className="border border-slate-200 rounded-lg overflow-x-auto">
                              <table className="w-full text-left text-xs sm:text-[14px] text-slate-800">
                                <thead className="bg-slate-100 border-b border-slate-200">
                                  <tr>
                                    <th className="py-2.5 px-3 sm:px-4 font-bold text-slate-700 w-10 sm:w-12 text-center">Ý</th>
                                    <th className="py-2.5 px-3 sm:px-4 font-bold text-slate-700">Phát biểu</th>
                                    <th className="py-2.5 px-3 sm:px-4 font-bold text-slate-700 w-16 sm:w-24 text-center">Đúng</th>
                                    <th className="py-2.5 px-3 sm:px-4 font-bold text-slate-700 w-16 sm:w-24 text-center">Sai</th>
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
                                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold">{letter})</td>
                                        <td className="py-2.5 sm:py-3 px-3 sm:px-4"><RichTextView html={opt} /></td>
                                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center border-l border-slate-100">
                                          <Radio
                                            checked={isTrue}
                                            onChange={() => {
                                              const newParts = [...(parts.length === q.options.length ? parts : Array.from({ length: q.options.length }).map((_, i) => `${i + 1}. `))];
                                              newParts[oIdx] = `${oIdx + 1}. Đúng`;
                                              handleSelectAnswer(q.id, newParts.join(', '));
                                            }}
                                            className="m-0"
                                          />
                                        </td>
                                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center border-l border-slate-100">
                                          <Radio
                                            checked={isFalse}
                                            onChange={() => {
                                              const newParts = [...(parts.length === q.options.length ? parts : Array.from({ length: q.options.length }).map((_, i) => `${i + 1}. `))];
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
                          <div className="pl-0 sm:pl-12">
                            <Input
                              placeholder="Nhập câu trả lời của bạn..."
                              value={answers[q.id] || ''}
                              onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                              className="w-full max-w-md text-sm"
                            />
                          </div>
                        ) : (
                          <Radio.Group value={answers[q.id]} className="flex flex-col gap-2 pl-0 sm:pl-12" onChange={(e) => handleSelectAnswer(q.id, e.target.value)}>
                            {q.options.map((opt: string, oIdx: number) => {
                              const letter = String.fromCharCode(65 + oIdx);
                              return (
                                <Radio key={letter} value={letter} className="text-slate-700 text-xs sm:text-sm">
                                  <span className="font-bold">{letter}. </span> <RichTextView html={cleanOptionText(opt)} className="inline" />
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

              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-6 sm:pt-10 pb-6 sm:pb-10">
                <Button size="large" className="px-6 sm:px-8 font-bold text-blue-700 border-blue-600 rounded text-xs sm:text-sm h-10 sm:h-11" onClick={() => setViewMode('taking')}>Quay lại</Button>
                <Button type="primary" size="large" className="px-6 sm:px-8 font-bold bg-blue-800 rounded text-xs sm:text-sm h-10 sm:h-11" onClick={handleSubmitFinal} loading={submitting}>Nộp bài</Button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col bg-white shrink-0 max-h-[35vh] md:max-h-none">
            <div className="h-12 sm:h-14 border-b flex items-center justify-between px-4 sm:px-6 shrink-0">
              <div className="flex items-center gap-2 text-red-600 font-bold text-lg sm:text-xl">
                <ClockCircleOutlined />
                <span>{formatTime(timeLeft)}</span>
              </div>
              <Button type="text" onClick={() => setViewMode('taking')} className="text-slate-400 hover:text-slate-600 px-2 text-xl" icon={<span className="leading-none pb-1 font-light">&times;</span>} />
            </div>

            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              <div className="text-xs sm:text-sm text-slate-700 mb-4 sm:mb-6">
                Số câu đã trả lời: <span className="font-bold ml-1">{answeredCount}/{totalQuestions}</span>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {['p1', 'p2', 'p3'].filter(k => parts[k]).map((partKey) => (
                  <div key={partKey}>
                    <div className="text-xs sm:text-sm text-blue-900 mb-2 sm:mb-3 font-semibold">Phần {getTypeDisplayName(partKey)}: Câu {parts[partKey].map((q: any) => q.line_number || (getQuestionGlobalIndex(q.id) + 1)).join(', ')}</div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold cursor-pointer transition-all ${bgClass} hover:opacity-80`}
                          >
                            {q.line_number || (gIdx + 1)}
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
      <header className="bg-[#1a365d] px-3 sm:px-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between min-h-[56px] py-2 sm:py-0 shrink-0 text-white shadow-md z-50 gap-2 sm:gap-0" style={{ color: 'white', lineHeight: 'normal' }}>
        <div className="flex flex-col text-xs font-medium tracking-wide" style={{ color: 'white' }}>
          <div className="font-bold text-xs sm:text-sm mb-0.5 tracking-wider truncate" style={{ color: 'white' }}>HỆ THỐNG THI TRỰC TUYẾN</div>
          <div className="flex flex-wrap gap-x-3 sm:gap-6 gap-y-0.5 opacity-90 text-[10px] sm:text-[11px]" style={{ color: 'white' }}>
            <span style={{ color: 'white' }}>Mã đề: {sessionInfo.exam?.code || sessionInfo.exam?.name || 'Đang cập nhật'}</span>
            <span style={{ color: 'white' }}>Môn: {sessionInfo.exam?.subject || 'Chưa xác định'}</span>
            <span className="hidden sm:inline" style={{ color: 'white' }}>Ngày: {new Date().toLocaleDateString('vi-VN')}</span>
            <span className="hidden md:inline" style={{ color: 'white' }}>Thí sinh: {sessionInfo?.candidate_info?.fullName || currentUser?.fullName || 'Đang cập nhật'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 border-t border-blue-900/50 sm:border-t-0 pt-1.5 sm:pt-0">
          <div className="flex items-center gap-1.5 sm:gap-2" style={{ color: 'white' }}>
            <ClockCircleOutlined className="text-base sm:text-xl text-yellow-400 sm:text-white" style={{ color: 'white' }} />
            <div className="flex flex-col items-center leading-none" style={{ color: 'white' }}>
              <span className="font-bold text-base sm:text-xl font-mono text-yellow-400 sm:text-white" style={{ color: 'white' }}>{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex items-center gap-1.5 ml-2 mr-2" style={{ color: 'white' }}>
              <div className={`w-2.5 h-2.5 rounded-full ${mode === 'preview' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'}`}></div>
              <span className="text-xs font-medium" style={{ color: 'white' }}>{mode === 'preview' ? 'Preview' : 'Đang kết nối'}</span>
            </div>

            {mode !== 'preview' && (
              <Button
                className="bg-white text-blue-800 border-none font-bold px-3 sm:px-5 h-7 sm:h-8 text-[11px] sm:text-xs hover:bg-blue-50"
                onClick={() => setViewMode('review')}
                loading={submitting}
              >
                NỘP BÀI
              </Button>
            )}
            <Button
              className="bg-white text-red-600 border-none font-bold px-3 sm:px-5 h-7 sm:h-8 text-[11px] sm:text-xs hover:bg-red-50"
              onClick={handleLogout}
            >
              THOÁT
            </Button>
            <Button
              type="text"
              className="text-white hover:bg-white/10 flex items-center justify-center p-0 w-7 h-7 sm:w-8 sm:h-8 hidden sm:flex"
              onClick={handleFullscreen}
            >
              <FullscreenOutlined className="text-base sm:text-lg" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <Content className="flex-1 flex flex-col bg-[#f4f6f9] w-full overflow-hidden">
        {/* Controls Row */}
        <div className="flex items-center justify-center py-2 sm:py-3 px-3 sm:px-8 border-b border-slate-200 shrink-0 bg-white shadow-sm z-10 relative">
          <div className="w-full max-w-[1200px] flex justify-between sm:justify-center relative items-center">
            <div className="flex gap-2">
              <Button
                className="text-blue-800 border-blue-800 font-medium px-3 sm:px-4 h-7 sm:h-8 rounded-sm hover:bg-blue-50 flex items-center gap-1 transition-all text-xs"
                onClick={handleGoBack}
                disabled={!canGoBack}
              >
                <ArrowLeftOutlined className="text-[10px]" /> Quay lại
              </Button>
              <Button
                type="primary"
                className="bg-[#244384] font-medium px-3 sm:px-4 h-7 sm:h-8 flex flex-row-reverse items-center gap-1 rounded-sm shadow-none hover:bg-[#1a365d] transition-all text-xs"
                onClick={handleGoNext}
                disabled={!canGoNext}
              >
                <ArrowRightOutlined className="text-[10px]" /> Tiếp theo
              </Button>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 sm:absolute sm:right-0">
              <span className="text-slate-700 text-xs sm:text-sm">
                Đã làm: <span className="text-green-600 font-bold">{answeredCount}</span>/{totalQuestions}
              </span>
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto px-2.5 sm:px-10 py-3 sm:py-8 w-full flex justify-center">
          <div className="w-full max-w-[1200px] bg-white p-4 sm:p-10 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 h-fit">
            {(() => {
              const currentTypeKey = getTypeGroupKey(currentQ.type_code);
              const partQuestions = parts[currentTypeKey] || [];
              if (partQuestions.length === 0) return null;
              const startIdx = partQuestions[0].line_number || (getQuestionGlobalIndex(partQuestions[0].id) + 1);
              const endIdx = partQuestions[partQuestions.length - 1].line_number || (getQuestionGlobalIndex(partQuestions[partQuestions.length - 1].id) + 1);

              let partDesc = "Mỗi câu hỏi thí sinh chỉ chọn một phương án.";
              if (currentTypeKey === 'p2') {
                partDesc = "Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.";
              } else if (currentTypeKey === 'p3') {
                partDesc = "Thí sinh trả lời bằng cách nhập đáp án vào ô trống.";
              }

              return (
                <div className="mb-4 sm:mb-8 flex flex-wrap items-center gap-2 sm:gap-4 text-[#1a365d]">
                  <span className="font-bold uppercase tracking-wider text-xs sm:text-[15px] whitespace-nowrap">PHẦN {getTypeDisplayName(currentTypeKey).toUpperCase()}:</span>
                  <span className="text-xs sm:text-[15px] font-medium">Thí sinh trả lời từ câu {startIdx} đến câu {endIdx}. {partDesc}</span>
                </div>
              );
            })()}

            <div className="flex gap-6 max-w-full">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 sm:gap-4 mb-4">
                  <div className="font-bold text-slate-800 text-sm sm:text-[15px] shrink-0 pt-[2px]">
                    Câu {currentQ.line_number || (currentQuestionIdx + 1)}:
                  </div>
                  <div className="flex-1 min-w-0">
                    <RichTextView html={currentQ.content} className="text-sm sm:text-[15px] text-slate-800 font-medium leading-relaxed" />
                  </div>
                  <div
                    className="cursor-pointer shrink-0 ml-1 sm:ml-4 flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg transition-all hover:bg-slate-100"
                    onClick={() => toggleFlag(currentQ.id)}
                    title="Đánh dấu câu hỏi này"
                  >
                    {flagged[currentQ.id] ? (
                      <FlagFilled className="text-lg sm:text-xl text-yellow-500 drop-shadow-md mb-0.5 sm:mb-1" />
                    ) : (
                      <FlagOutlined className="text-lg sm:text-xl text-slate-400 hover:text-slate-500 mb-0.5 sm:mb-1" />
                    )}
                    <span className={`text-[10px] sm:text-[11px] font-semibold ${flagged[currentQ.id] ? 'text-yellow-600' : 'text-slate-500'}`}>
                      Đánh dấu
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pl-0 sm:pl-[54px] pr-0 sm:pr-12">
                  {currentQ.type_code === 'true_false' || currentQ.type_code?.toLowerCase() === 'đs' || currentQ.type_code?.toLowerCase() === 'ds' ? (
                    <div className="w-full border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-[15px] text-slate-800">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-2 sm:px-4 font-bold text-slate-700 w-10 sm:w-12 text-center">Ý</th>
                            <th className="py-2.5 px-2 sm:px-4 font-bold text-slate-700">Phát biểu</th>
                            <th className="py-2.5 px-2 sm:px-4 font-bold text-slate-700 w-16 sm:w-24 text-center">Đúng</th>
                            <th className="py-2.5 px-2 sm:px-4 font-bold text-slate-700 w-16 sm:w-24 text-center">Sai</th>
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
                                <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center font-bold">{letter})</td>
                                <td className="py-2.5 sm:py-3.5 px-2 sm:px-4"><RichTextView html={opt} /></td>
                                <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center border-l border-slate-100">
                                  <Radio
                                    checked={isTrue}
                                    onChange={() => {
                                      const newParts = [...(parts.length === currentQ.options.length ? parts : Array.from({ length: currentQ.options.length }).map((_, i) => `${i + 1}. `))];
                                      newParts[oIdx] = `${oIdx + 1}. Đúng`;
                                      handleSelectAnswer(currentQ.id, newParts.join(', '));
                                    }}
                                    className="m-0"
                                  />
                                </td>
                                <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center border-l border-slate-100">
                                  <Radio
                                    checked={isFalse}
                                    onChange={() => {
                                      const newParts = [...(parts.length === currentQ.options.length ? parts : Array.from({ length: currentQ.options.length }).map((_, i) => `${i + 1}. `))];
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
                      className="w-full text-xs sm:text-[15px] p-3 rounded shadow-none border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
                            className="text-xs sm:text-[15px] text-slate-800 font-normal w-full m-0 py-1"
                          >
                            <span className={`font-bold mr-1 ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{letter}.</span>
                            <RichTextView html={cleanOptionText(opt)} className="inline" />
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
        <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex flex-col items-center">
          {/* Mobile Footer View (Tabbed per part to prevent clipping) */}
          <div className="sm:hidden w-full flex flex-col items-center mb-2">
            {/* Part Tabs on Mobile */}
            <div className="flex items-center justify-center gap-1.5 w-full mb-2 border-b border-slate-100 pb-2 overflow-x-auto">
              {Object.keys(parts).sort().map((partKey) => {
                const currentTypeKey = getTypeGroupKey(currentQ.type_code);
                const isCurrentPart = currentTypeKey === partKey;
                return (
                  <button
                    key={partKey}
                    onClick={() => {
                      const firstQ = parts[partKey]?.[0];
                      if (firstQ) {
                        setCurrentQuestionIdx(getQuestionGlobalIndex(firstQ.id));
                      }
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-all whitespace-nowrap ${isCurrentPart
                      ? 'bg-[#1a365d] text-white shadow-sm scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    Phần {getTypeDisplayName(partKey)} ({parts[partKey].length})
                  </button>
                );
              })}
            </div>

            {/* Current Part Question Pills on Mobile */}
            {(() => {
              const currentTypeKey = getTypeGroupKey(currentQ.type_code);
              const partQuestions = parts[currentTypeKey] || [];
              return (
                <div className="flex flex-col items-center w-full my-1">
                  <div className="font-bold text-[#1a365d] text-xs mb-2 text-center">
                    Phần {getTypeDisplayName(currentTypeKey)}: Trả lời câu {partQuestions[0]?.line_number || (getQuestionGlobalIndex(partQuestions[0]?.id) + 1)} đến câu {partQuestions[partQuestions.length - 1]?.line_number || (getQuestionGlobalIndex(partQuestions[partQuestions.length - 1]?.id) + 1)}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 max-w-full px-2 max-h-32 overflow-y-auto py-1">
                    {partQuestions.map((q: any) => {
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
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-all border ${bgClass} hover:opacity-80 shrink-0`}
                        >
                          {q.line_number || (gIdx + 1)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Desktop Footer View (Preserved 100% unchanged) */}
          <div className="hidden sm:flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-4 w-full">
            {Object.keys(parts).sort().map((partKey, pIdx) => (
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
                        {q.line_number || (gIdx + 1)}
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

          <div className="flex gap-4 mt-1 sm:mt-0">
            {mode !== 'preview' && (
              <Button
                className="bg-blue-50 text-blue-800 border-blue-200 font-semibold px-5 sm:px-6 h-8 text-xs sm:text-[13px] hover:bg-blue-100 rounded"
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
        title={<span className="font-bold text-slate-800 text-sm sm:text-base">Kết quả thi</span>}
        open={resultModalVisible}
        onCancel={onLogout}
        footer={
          <div className="flex justify-center w-full py-2 sm:py-3">
            <Button
              className="px-8 sm:px-10 h-8 sm:h-9 text-[#1677ff] border-[#1677ff] font-medium rounded hover:bg-blue-50 text-xs sm:text-sm"
              onClick={onLogout}
            >
              Hoàn thành
            </Button>
          </div>
        }
        centered
        width={1000}
        closeIcon={<span className="text-xl font-light leading-none text-slate-400 hover:text-slate-600">&times;</span>}
      >
        <div className="py-3 sm:py-6 flex flex-col font-sans max-h-[75vh] overflow-y-auto">
          {isTimeOutSubmit ? (
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-red-600 font-bold text-lg sm:text-[24px] m-0 mb-2 sm:mb-3 uppercase tracking-wide">HẾT GIỜ!</h2>
              <p className="text-red-600 font-bold text-xs sm:text-[15px] m-0">Bài thi của bạn đã được hệ thống nộp tự động.</p>
            </div>
          ) : (
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-slate-800 font-bold text-base sm:text-[18px] m-0">Bạn đã nộp bài thi thành công!</h2>
            </div>
          )}

          <div className="w-full space-y-3 sm:space-y-4 text-xs sm:text-[15px] text-slate-800 mx-auto max-w-[400px] mb-6 sm:mb-8 bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200">
            {examResultData && examResultData.score !== undefined ? (
              <>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-600 font-medium">Điểm số:</span>

                  <strong className="text-[#1677ff] font-bold text-base sm:text-[20px]">{examResultData.score} / {examResultData.max_score ?? 10}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Số câu đúng:</span>
                  <strong className="text-[#22c55e] font-bold text-sm sm:text-[18px]">{examResultData.total_correct}/{examResultData.total_questions}</strong>
                </div>
                {
                  examResultData.is_show_result === false && (
                    <div className="text-center text-slate-500 italic text-xs sm:text-sm mt-3 pt-3 border-t border-slate-200">
                      Chi tiết bài làm đang được ẩn theo cấu hình của gói đề thi.
                    </div>
                  )
                }
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Số câu đã trả lời:</span>
                <strong className="text-[#22c55e] font-bold text-sm sm:text-[18px]">{answeredCount}/{totalQuestions}</strong>
              </div>
            )
            }
          </div >

          {examResultData && examResultData.detailed_results && (
            <div className="w-full mt-2 sm:mt-4">
              <h3 className="font-bold text-slate-700 text-sm sm:text-base mb-3 sm:mb-4 border-b pb-2 uppercase">Chi tiết bài làm</h3>

              <div className="space-y-4 sm:space-y-8">
                {['p1', 'p2', 'p3'].filter(k => parts[k]).map((partKey) => (
                  <div key={partKey} className="space-y-4 sm:space-y-6 bg-white p-3 sm:p-6 rounded-lg border border-slate-200 shadow-sm">
                    <div className="font-bold text-blue-900 uppercase text-sm sm:text-lg border-b pb-2">PHẦN {getTypeDisplayName(partKey).toUpperCase()}:</div>

                    {parts[partKey].map((q: any) => {
                      const globalIdx = getQuestionGlobalIndex(q.id);
                      const detail = examResultData.detailed_results.find((d: any) => d.question_id === q.id);
                      const isCorrect = detail?.is_correct;

                      return (
                        <div key={q.id} className="border-b pb-4 sm:pb-6 last:border-0 border-slate-100">
                          <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                            <div className="font-bold text-slate-800 flex gap-1 text-xs sm:text-sm"><span className="shrink-0">Câu {q.line_number || (globalIdx + 1)}: </span> <RichTextView html={q.content} className="font-medium" /></div>
                            {detail ? (
                              <div className={`shrink-0 ml-2 px-2.5 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-bold border ${isCorrect ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {isCorrect ? 'ĐÚNG' : 'SAI'}
                              </div>
                            ) : (
                              <div className="shrink-0 ml-2 px-2.5 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-bold border bg-slate-50 text-slate-500 border-slate-200">
                                CHƯA TRẢ LỜI
                              </div>
                            )}
                          </div>

                          {q.type_code === 'true_false' || q.type_code?.toLowerCase() === 'đs' || q.type_code?.toLowerCase() === 'ds' ? (
                            <div className="pl-0 sm:pl-12 w-full max-w-4xl">
                              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-[14px] text-slate-800">
                                  <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr>
                                      <th className="py-2.5 px-3 sm:px-4 font-bold text-slate-700 w-10 sm:w-12 text-center">Ý</th>
                                      <th className="py-2.5 px-3 sm:px-4 font-bold text-slate-700">Phát biểu</th>
                                      <th className="py-2.5 px-3 sm:px-4 font-bold text-slate-700 w-24 sm:w-32 text-center">Thí sinh chọn</th>
                                      <th className="py-2.5 px-3 sm:px-4 font-bold text-slate-700 w-24 sm:w-32 text-center">Đáp án đúng</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {q.options.map((opt: string, oIdx: number) => {
                                      const letter = String.fromCharCode(97 + oIdx); // a, b, c, d

                                      const userParts = detail?.user_answer ? detail.user_answer.split(', ') : [];
                                      const correctParts = detail?.correct_answer ? detail.correct_answer.split(', ') : [];

                                      const userSelectedTrue = userParts[oIdx] === `${oIdx + 1}. Đúng`;
                                      const userSelectedFalse = userParts[oIdx] === `${oIdx + 1}. Sai`;
                                      const userChoice = userSelectedTrue ? 'Đúng' : (userSelectedFalse ? 'Sai' : '-');

                                      const correctIsTrue = correctParts[oIdx] === `${oIdx + 1}. Đúng`;
                                      const correctIsFalse = correctParts[oIdx] === `${oIdx + 1}. Sai`;
                                      const correctChoice = correctIsTrue ? 'Đúng' : (correctIsFalse ? 'Sai' : '-');

                                      const isRowCorrect = userChoice === correctChoice && userChoice !== '-';

                                      return (
                                        <tr key={letter} className={`bg-white ${isRowCorrect ? 'bg-green-50' : (userChoice !== '-' ? 'bg-red-50' : '')}`}>
                                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold">{letter})</td>
                                          <td className="py-2.5 sm:py-3 px-3 sm:px-4"><RichTextView html={opt} /></td>
                                          <td className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center border-l border-slate-100 font-bold ${isRowCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                            {userChoice}
                                          </td>
                                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center border-l border-slate-100 font-bold text-blue-600">
                                            {correctChoice}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (!q.options || q.options.length === 0 || q.type_code?.toLowerCase().includes('ngan') || q.type_code === 'TLN') ? (
                            <div className="pl-0 sm:pl-12 space-y-2 text-xs sm:text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 w-20 sm:w-24 shrink-0">Trả lời:</span>
                                <span className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                  <RichTextView html={detail?.user_answer || '(Trống)'} className="inline" />
                                </span>
                              </div>
                              {!isCorrect && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 w-20 sm:w-24 shrink-0">Đáp án đúng:</span>
                                  <span className="font-bold text-blue-600">
                                    <RichTextView html={detail?.correct_answer || ''} className="inline" />
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 pl-0 sm:pl-12 text-xs sm:text-sm">
                              {q.options.map((opt: string, oIdx: number) => {
                                const letter = String.fromCharCode(65 + oIdx);
                                const isUserChoice = detail?.user_answer === letter;
                                const isCorrectChoice = detail?.correct_answer === letter;

                                let optionClass = "text-slate-700";
                                let icon = <span className="w-5 sm:w-6 inline-block" />;

                                if (isCorrectChoice) {
                                  optionClass = "text-green-700 font-bold bg-green-50 px-2 py-1 rounded border border-green-200 inline-block w-fit pr-4";
                                  icon = <CheckCircleOutlined className="text-green-600 mr-1.5 sm:mr-2" />;
                                } else if (isUserChoice && !isCorrectChoice) {
                                  optionClass = "text-red-700 font-bold bg-red-50 px-2 py-1 rounded border border-red-200 inline-block w-fit pr-4";
                                  icon = <CloseCircleOutlined className="text-red-600 mr-1.5 sm:mr-2" />;
                                } else if (isUserChoice) {
                                  optionClass = "text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded inline-block w-fit pr-4";
                                }

                                return (
                                  <div key={letter} className={`flex items-center ${optionClass}`}>
                                    {icon}
                                    <span className="font-bold mr-1">{letter}. </span> <RichTextView html={cleanOptionText(opt)} className="inline" />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div >
      </Modal >
    </Layout >
  );
}


