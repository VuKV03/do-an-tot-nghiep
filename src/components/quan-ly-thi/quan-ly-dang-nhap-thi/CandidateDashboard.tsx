import { API_ORIGIN } from '../../../config/apiBase';
import React, { useEffect, useState } from 'react';
import { Card, Button, Typography, Spin, message, Badge } from 'antd';
import { BookOutlined, CheckCircleOutlined, PlayCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { SystemUser } from '../../../types';

const { Title, Text } = Typography;

interface SubjectInfo {
  subject: string;
  status: 'available' | 'in_progress' | 'submitted';
  score?: number;
  started_at?: string;
  duration?: number;
}

interface CandidateDashboardProps {
  currentUser: SystemUser;
  onLogout: () => void;
  onStartExam: (subject: string) => void;
}

const CountdownTimer = ({ startedAt, duration, onTimeUp }: { startedAt: string, duration: number, onTimeUp?: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const durationMs = duration * 60 * 1000;
    const end = start + durationMs;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onTimeUp) onTimeUp();
      }
    }, 1000);

    const now = new Date().getTime();
    setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)));

    return () => clearInterval(interval);
  }, [startedAt, duration]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return <span>{formatTime(timeLeft)}</span>;
};

export default function CandidateDashboard({ currentUser, onLogout, onStartExam }: CandidateDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [startingSubject, setStartingSubject] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableSubjects();
  }, []);

  const fetchAvailableSubjects = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_ORIGIN}/api/exam/portal/me/available-subjects?candidate_id=${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSubjects(data.available_subjects || []);
      } else {
        message.error(data.detail || 'Không thể lấy danh sách môn thi.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (subject: string) => {
    setStartingSubject(subject);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_ORIGIN}/api/exam/portal/me/start-exam?candidate_id=${currentUser.id}&subject=${encodeURIComponent(subject)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        onStartExam(subject);
      } else {
        message.error(data.detail || 'Không thể bắt đầu ca thi.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối đến máy chủ.');
    } finally {
      setStartingSubject(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 font-sans flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-100/50 to-transparent pointer-events-none -z-10" />
      
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-white px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full flex justify-center items-center text-white font-bold text-sm sm:text-lg shadow-md border-2 border-white shrink-0">
            {currentUser.fullName?.charAt(0) || 'C'}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-800 text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{currentUser.fullName}</div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">SBD: {currentUser.username}</div>
          </div>
        </div>
        <Button onClick={onLogout} icon={<LogoutOutlined />} type="text" className="text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full px-2.5 sm:px-4 text-xs sm:text-sm font-medium transition-colors">
          Đăng xuất
        </Button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12 flex flex-col gap-6 sm:gap-10 z-10">
        <div className="flex flex-col items-center text-center">
          <Title level={2} className="m-0 mb-2 sm:mb-3 font-extrabold !text-xl sm:!text-3xl" style={{ background: 'linear-gradient(to right, #2563eb, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            KỲ THI TRỰC TUYẾN
          </Title>
          <Text className="text-slate-500 text-xs sm:text-base">Vui lòng chọn bài thi bên dưới để bắt đầu</Text>
        </div>

        {subjects.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-sm border border-white p-8 sm:p-16 text-center max-w-2xl mx-auto w-full">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <BookOutlined className="text-3xl sm:text-5xl text-blue-300" />
            </div>
            <Title level={4} className="text-slate-700 mt-0 mb-2 sm:mb-3 font-bold text-base sm:text-xl">Chưa có bài thi nào</Title>
            <Text className="text-slate-500 text-xs sm:text-base">Hiện tại bạn chưa được phân công môn thi nào hoặc các kỳ thi chưa đến giờ mở cửa.</Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {subjects.map((sub, idx) => (
              <Card
                key={idx}
                className="rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-white bg-white/90 backdrop-blur-sm overflow-hidden flex flex-col"
                styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}
              >
                <div className={`h-2 w-full ${sub.status === 'submitted' ? 'bg-gradient-to-r from-emerald-400 to-green-500' : sub.status === 'in_progress' ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}></div>
                <div className="p-4 sm:p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4 sm:mb-5 gap-2">
                    <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl shadow-sm border ${sub.status === 'submitted' ? 'bg-green-50 text-green-600 border-green-100' : sub.status === 'in_progress' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                      <BookOutlined />
                    </div>
                    {sub.status === 'submitted' && <div className="shrink-0 font-semibold text-[11px] sm:text-xs bg-green-100/50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-green-700 border border-green-200/50 flex items-center gap-1"><CheckCircleOutlined /> Đã nộp</div>}
                    {sub.status === 'in_progress' && <div className="shrink-0 font-semibold text-[11px] sm:text-xs bg-orange-100/50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-orange-700 border border-orange-200/50 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Đang làm</div>}
                    {sub.status === 'available' && <div className="shrink-0 font-semibold text-[11px] sm:text-xs bg-blue-100/50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-blue-700 border border-blue-200/50">Sẵn sàng</div>}
                  </div>
                  
                  <div className="flex-1">
                    <Title level={4} className="text-slate-800 m-0 mb-2 font-bold line-clamp-2 leading-tight !text-base sm:!text-lg" title={sub.subject}>{sub.subject}</Title>
                    <div className="text-slate-500 mb-4 sm:mb-6 text-sm flex flex-col gap-1 mt-3 sm:mt-5">
                      {sub.status === 'in_progress' && sub.started_at && sub.duration ? (
                        <>
                          <span className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-wider uppercase">Thời gian còn lại</span>
                          <span className="text-xl sm:text-2xl font-black text-orange-600 drop-shadow-sm"><CountdownTimer startedAt={sub.started_at} duration={sub.duration} /></span>
                        </>
                      ) : sub.status === 'submitted' && sub.score !== undefined ? (
                        <>
                          <span className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-wider uppercase">Điểm đạt được</span>
                          <span className="text-xl sm:text-2xl font-black text-green-600 drop-shadow-sm">{sub.score} <span className="text-xs sm:text-sm font-bold text-slate-500">điểm</span></span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-wider uppercase">Thời gian làm bài</span>
                          <span className="text-slate-700 font-bold text-lg sm:text-xl">{sub.duration ? `${sub.duration} phút` : '--'}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-2">
                    {sub.status === 'submitted' ? (
                      <Button block disabled className="h-10 sm:h-11 font-semibold rounded-xl bg-slate-50/80 border-slate-200 text-slate-400 text-xs sm:text-sm">
                        Đã hoàn thành
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        block
                        icon={<PlayCircleOutlined />}
                        className={`h-10 sm:h-11 font-bold rounded-xl border-0 shadow-md transition-all text-xs sm:text-sm ${sub.status === 'in_progress' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-orange-500/40 hover:-translate-y-0.5 shadow-orange-500/20 text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/40 hover:-translate-y-0.5 shadow-blue-500/20 text-white'}`}
                        loading={startingSubject === sub.subject}
                        onClick={() => handleStart(sub.subject)}
                      >
                        {sub.status === 'in_progress' ? 'TIẾP TỤC THI' : 'VÀO THI'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
