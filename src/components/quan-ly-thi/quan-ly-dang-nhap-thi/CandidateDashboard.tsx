import { API_ORIGIN } from '../../../config/apiBase';
import React, { useEffect, useState } from 'react';
import { Button, Typography, Spin, message } from 'antd';
import { BookOutlined, CheckCircleOutlined, PlayCircleOutlined, LogoutOutlined, AppstoreOutlined, StarOutlined } from '@ant-design/icons';
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
  const [theme, setTheme] = useState<'classic' | 'glass'>(() => {
    return (localStorage.getItem('candidate_dashboard_theme') as 'classic' | 'glass') || 'classic';
  });

  const changeTheme = (newTheme: 'classic' | 'glass') => {
    setTheme(newTheme);
    localStorage.setItem('candidate_dashboard_theme', newTheme);
  };

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
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .orb-cyan-3d {
          background: radial-gradient(circle at 35% 35%, #38bdf8 0%, #0284c7 45%, #1e3a8a 85%, #0f172a 100%);
          box-shadow: inset -8px -8px 16px rgba(0, 0, 0, 0.4), inset 6px 6px 12px rgba(255, 255, 255, 0.7), 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .orb-purple-3d {
          background: radial-gradient(circle at 35% 35%, #e879f9 0%, #a21caf 45%, #4c1d95 85%, #1e1b4b 100%);
          box-shadow: inset -8px -8px 16px rgba(0, 0, 0, 0.4), inset 6px 6px 12px rgba(255, 255, 255, 0.7), 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .orb-pink-3d {
          background: radial-gradient(circle at 35% 35%, #f472b6 0%, #be185d 45%, #701a75 85%, #31103f 100%);
          box-shadow: inset -6px -6px 12px rgba(0, 0, 0, 0.4), inset 5px 5px 10px rgba(255, 255, 255, 0.7), 0 15px 30px rgba(0, 0, 0, 0.35);
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(4deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(14px) rotate(-4deg); }
        }
        .animate-float-slow {
          animation: float-slow 7s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 9s ease-in-out infinite;
        }
      `}</style>

      {theme === 'classic' ? (
        /* Theme 1: Giao diện Cổ điển (Standard Clean White as in sample image) */
        <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col relative">
          <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex justify-center items-center text-white font-extrabold text-base shadow-sm shrink-0">
                {currentUser.fullName?.charAt(0) || 'C'}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight truncate">
                  {currentUser.fullName}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate">
                  SBD: {currentUser.username}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Switcher Button */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-full border border-slate-200">
                <button
                  type="button"
                  onClick={() => changeTheme('classic')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${theme === 'classic'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <AppstoreOutlined /> Cổ điển
                </button>
                <button
                  type="button"
                  onClick={() => changeTheme('glass')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${(theme as string) === 'glass'
                    ? 'bg-gradient-to-r from-amber-400 to-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <StarOutlined className="text-amber-400" /> Glass 3D
                </button>
              </div>

              <Button
                onClick={onLogout}
                icon={<LogoutOutlined />}
                type="text"
                className="text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full px-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1"
              >
                Đăng xuất
              </Button>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl sm:text-3xl font-black text-[#2563eb] tracking-tight mb-2">
                KỲ THI TRỰC TUYẾN
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium">
                Vui lòng chọn bài thi bên dưới để bắt đầu
              </p>
            </div>

            {subjects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto w-full shadow-sm">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOutlined className="text-3xl text-blue-500" />
                </div>
                <h3 className="text-slate-800 font-bold text-lg mb-2">Chưa có bài thi nào</h3>
                <p className="text-slate-500 text-xs sm:text-sm">
                  Hiện tại bạn chưa được phân công môn thi nào hoặc các kỳ thi chưa đến giờ mở cửa.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {subjects.map((sub, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md"
                  >
                    {/* Top Accent Stripe */}
                    <div
                      className={`h-1.5 w-full ${sub.status === 'submitted'
                        ? 'bg-[#10b981]'
                        : sub.status === 'in_progress'
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                        }`}
                    ></div>

                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      {/* Icon & Status Pill */}
                      <div className="flex justify-between items-start mb-4">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${sub.status === 'submitted'
                            ? 'bg-emerald-50 text-emerald-600'
                            : sub.status === 'in_progress'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-blue-50 text-blue-600'
                            }`}
                        >
                          <BookOutlined />
                        </div>

                        {sub.status === 'submitted' && (
                          <div className="bg-emerald-50 text-emerald-600 border border-emerald-200/60 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                            <CheckCircleOutlined /> Đã nộp
                          </div>
                        )}
                        {sub.status === 'in_progress' && (
                          <div className="bg-amber-50 text-amber-700 border border-amber-200/60 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Đang làm
                          </div>
                        )}
                        {sub.status === 'available' && (
                          <div className="bg-blue-50 text-blue-600 border border-blue-200/60 px-3 py-1 rounded-full text-xs font-semibold">
                            Sẵn sàng
                          </div>
                        )}
                      </div>

                      {/* Subject Name & Info */}
                      <div className="flex-1">
                        <h3 className="text-slate-900 font-bold text-lg mb-4 leading-snug line-clamp-2" title={sub.subject}>
                          {sub.subject}
                        </h3>

                        <div className="mb-6">
                          {sub.status === 'in_progress' && sub.started_at && sub.duration ? (
                            <>
                              <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                                THỜI GIAN CÒN LẠI
                              </div>
                              <div className="text-2xl font-black text-amber-600">
                                <CountdownTimer startedAt={sub.started_at} duration={sub.duration} />
                              </div>
                            </>
                          ) : sub.status === 'submitted' && sub.score !== undefined ? (
                            <>
                              <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                                ĐIỂM ĐẠT ĐƯỢC
                              </div>
                              <div className="text-2xl font-black text-[#10b981]">
                                {sub.score} <span className="text-xs font-bold text-slate-500">điểm</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                                THỜI GIAN LÀM BÀI
                              </div>
                              <div className="text-slate-800 font-bold text-lg">
                                {sub.duration ? `${sub.duration} phút` : '--'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-auto pt-2">
                        {sub.status === 'submitted' ? (
                          <button
                            disabled
                            className="w-full py-2.5 bg-slate-100 text-slate-400 font-medium rounded-xl text-xs sm:text-sm cursor-not-allowed border-none"
                          >
                            Đã hoàn thành
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStart(sub.subject)}
                            disabled={startingSubject === sub.subject}
                            className={`w-full py-2.5 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer border-none flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${sub.status === 'in_progress'
                              ? 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20'
                              : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20'
                              }`}
                          >
                            <PlayCircleOutlined />
                            {startingSubject === sub.subject
                              ? 'ĐANG TẢI...'
                              : sub.status === 'in_progress'
                                ? 'TIẾP TỤC THI'
                                : 'VÀO THI'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      ) : (
        /* Theme 2: Giao diện Liquid Glassmorphism 3D (New Modern Theme) */
        <div className="min-h-screen font-sans flex flex-col relative overflow-hidden bg-gradient-to-br from-[#d91b8a] via-[#5c1c99] to-[#1a084c]">
          {/* Background SVG Ornaments */}
          <svg className="absolute top-10 left-10 w-48 h-48 opacity-15 text-white pointer-events-none" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
          </svg>
          <svg className="absolute top-12 right-12 w-64 h-64 opacity-15 text-white pointer-events-none" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 2" />
          </svg>

          {/* Organic Blobs */}
          <div className="absolute top-[15%] left-[15%] w-96 h-96 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 rounded-full opacity-60 blur-3xl animate-float-slow pointer-events-none"></div>
          <div className="absolute bottom-[10%] right-[15%] w-96 h-96 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 rounded-full opacity-60 blur-3xl animate-float-reverse pointer-events-none"></div>

          {/* 3D Glossy Orbs */}
          <div className="absolute top-[8%] left-[40%] w-16 h-16 rounded-full orb-cyan-3d animate-float-slow pointer-events-none z-0"></div>
          <div className="absolute top-[20%] right-[12%] w-14 h-14 rounded-full orb-purple-3d animate-float-reverse pointer-events-none z-0"></div>
          <div className="absolute bottom-[15%] left-[10%] w-16 h-16 rounded-full orb-pink-3d animate-float-slow pointer-events-none z-0"></div>

          {/* Glass Header */}
          <header className="backdrop-blur-2xl bg-white/[0.12] border-b border-white/20 px-4 sm:px-8 py-3.5 flex justify-between items-center sticky top-0 z-50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md border border-white/40 rounded-full flex justify-center items-center text-white font-extrabold text-base shadow-inner shrink-0">
                {currentUser.fullName?.charAt(0) || 'C'}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-white text-sm sm:text-base leading-tight truncate drop-shadow-sm">
                  {currentUser.fullName}
                </div>
                <div className="text-xs text-white/70 font-medium truncate">
                  SBD: {currentUser.username}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Switcher Button */}
              <div className="flex items-center gap-1 p-1 bg-black/20 backdrop-blur-md rounded-full border border-white/20">
                <button
                  type="button"
                  onClick={() => changeTheme('classic')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${(theme as string) === 'classic'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-white/70 hover:text-white'
                    }`}
                >
                  <AppstoreOutlined /> Cổ điển
                </button>
                <button
                  type="button"
                  onClick={() => changeTheme('glass')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${theme === 'glass'
                    ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/30'
                    : 'text-white/70 hover:text-white'
                    }`}
                >
                  <StarOutlined className="text-amber-300" /> Glass 3D
                </button>
              </div>

              <Button
                onClick={onLogout}
                icon={<LogoutOutlined />}
                type="text"
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full px-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1"
              >
                Đăng xuất
              </Button>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8 z-10">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">
                KỲ THI TRỰC TUYẾN
              </h1>
              <p className="text-white/80 text-xs sm:text-sm font-medium drop-shadow-sm">
                Vui lòng chọn bài thi bên dưới để bắt đầu
              </p>
            </div>

            {subjects.length === 0 ? (
              <div className="backdrop-blur-2xl bg-white/[0.14] rounded-3xl border border-white/30 p-8 sm:p-12 text-center max-w-xl mx-auto w-full shadow-2xl">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">
                  <BookOutlined className="text-3xl text-white" />
                </div>
                <h3 className="text-white font-extrabold text-xl mb-2 drop-shadow">Chưa có bài thi nào</h3>
                <p className="text-white/70 text-xs sm:text-sm">
                  Hiện tại bạn chưa được phân công môn thi nào hoặc các kỳ thi chưa đến giờ mở cửa.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {subjects.map((sub, idx) => (
                  <div
                    key={idx}
                    className="backdrop-blur-2xl bg-white/[0.15] rounded-[28px] border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] overflow-hidden flex flex-col transition-all hover:-translate-y-1 hover:bg-white/[0.2]"
                  >
                    {/* Top Glow Accent Stripe */}
                    <div
                      className={`h-1.5 w-full ${sub.status === 'submitted'
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                        : sub.status === 'in_progress'
                          ? 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(56,189,248,0.8)]'
                        }`}
                    ></div>

                    <div className="p-6 flex flex-col flex-1">
                      {/* Icon & Status Pill */}
                      <div className="flex justify-between items-start mb-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl backdrop-blur-md border shadow-inner ${sub.status === 'submitted'
                            ? 'bg-emerald-400/20 text-emerald-300 border-emerald-300/40'
                            : sub.status === 'in_progress'
                              ? 'bg-amber-400/20 text-amber-300 border-amber-300/40'
                              : 'bg-cyan-400/20 text-cyan-300 border-cyan-300/40'
                            }`}
                        >
                          <BookOutlined />
                        </div>

                        {sub.status === 'submitted' && (
                          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <CheckCircleOutlined /> Đã nộp
                          </div>
                        )}
                        {sub.status === 'in_progress' && (
                          <div className="bg-amber-500/20 text-amber-300 border border-amber-400/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Đang làm
                          </div>
                        )}
                        {sub.status === 'available' && (
                          <div className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
                            Sẵn sàng
                          </div>
                        )}
                      </div>

                      {/* Subject Name & Info */}
                      <div className="flex-1">
                        <h3 className="text-white font-extrabold text-xl mb-4 leading-snug line-clamp-2 drop-shadow" title={sub.subject}>
                          {sub.subject}
                        </h3>

                        <div className="mb-6">
                          {sub.status === 'in_progress' && sub.started_at && sub.duration ? (
                            <>
                              <div className="text-[11px] font-extrabold text-amber-300/90 tracking-wider uppercase mb-1 drop-shadow-sm">
                                THỜI GIAN CÒN LẠI
                              </div>
                              <div className="text-2xl font-black text-amber-300 drop-shadow">
                                <CountdownTimer startedAt={sub.started_at} duration={sub.duration} />
                              </div>
                            </>
                          ) : sub.status === 'submitted' && sub.score !== undefined ? (
                            <>
                              <div className="text-[11px] font-extrabold text-emerald-300/90 tracking-wider uppercase mb-1 drop-shadow-sm">
                                ĐIỂM ĐẠT ĐƯỢC
                              </div>
                              <div className="text-2xl font-black text-emerald-300 drop-shadow">
                                {sub.score} <span className="text-xs font-bold text-white/80">điểm</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-[11px] font-extrabold text-white/70 tracking-wider uppercase mb-1">
                                THỜI GIAN LÀM BÀI
                              </div>
                              <div className="text-white font-extrabold text-lg">
                                {sub.duration ? `${sub.duration} phút` : '--'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-auto pt-2">
                        {sub.status === 'submitted' ? (
                          <button
                            disabled
                            className="w-full py-3 bg-white/10 text-white/40 font-bold rounded-xl text-xs sm:text-sm cursor-not-allowed border border-white/10"
                          >
                            Đã hoàn thành
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStart(sub.subject)}
                            disabled={startingSubject === sub.subject}
                            className={`w-full py-3 text-slate-950 font-black rounded-xl text-xs sm:text-sm cursor-pointer border-none flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${sub.status === 'in_progress'
                              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-[0_10px_20px_rgba(245,158,11,0.4)]'
                              : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_10px_20px_rgba(56,189,248,0.4)]'
                              }`}
                          >
                            <PlayCircleOutlined />
                            {startingSubject === sub.subject
                              ? 'ĐANG TẢI...'
                              : sub.status === 'in_progress'
                                ? 'TIẾP TỤC THI'
                                : 'VÀO THI'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      )}
    </>
  );
}
