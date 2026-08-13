import { API_ORIGIN } from '../../../config/apiBase';
import React, { useState } from 'react';
import { Form, Input, Button, Alert, message } from 'antd';
import { UserOutlined, LockOutlined, ArrowRightOutlined, StarOutlined, AppstoreOutlined } from '@ant-design/icons';
import { SystemUser } from '../../../types';

interface CandidateLoginProps {
  onLoginSuccess: (user: SystemUser) => void;
}

export default function CandidateLogin({ onLoginSuccess }: CandidateLoginProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<'classic' | 'glass'>(() => {
    return (localStorage.getItem('candidate_login_theme') as 'classic' | 'glass') || 'classic';
  });

  const changeTheme = (newTheme: 'classic' | 'glass') => {
    setTheme(newTheme);
    localStorage.setItem('candidate_login_theme', newTheme);
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_ORIGIN}/api/exam/portal/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username, // SBD
          password: values.password, // DOB
        }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        localStorage.setItem('auth_token', data.access_token);
        const candidateUser: SystemUser = {
          id: data.candidate.id,
          username: data.candidate.username,
          fullName: data.candidate.fullName,
          email: '',
          role: 'candidate',
          status: 'active',
          dob: data.candidate.dob,
          gender: data.candidate.gender
        };
        localStorage.setItem('user_info', JSON.stringify(candidateUser));

        message.success(`Chào mừng thí sinh ${data.candidate.fullName}!`);
        onLoginSuccess(candidateUser);
      } else {
        setErrorMsg(data.detail || 'Số báo danh hoặc ngày sinh không chính xác.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .glass-input.ant-input-affix-wrapper,
        .glass-input.ant-input {
          background-color: rgba(255, 255, 255, 0.16) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          color: #ffffff !important;
          border-radius: 0.75rem !important;
          backdrop-filter: blur(12px);
          transition: all 0.3s ease;
        }
        .glass-input.ant-input-affix-wrapper:hover,
        .glass-input.ant-input:hover {
          background-color: rgba(255, 255, 255, 0.24) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
        }
        .glass-input.ant-input-affix-wrapper-focused,
        .glass-input.ant-input-affix-wrapper:focus-within,
        .glass-input.ant-input:focus {
          background-color: rgba(255, 255, 255, 0.28) !important;
          border-color: #f59e0b !important;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.35) !important;
        }
        .glass-input input {
          color: #ffffff !important;
        }
        .glass-input input::placeholder {
          color: rgba(255, 255, 255, 0.65) !important;
        }
        .glass-input .ant-input-prefix,
        .glass-input .ant-input-suffix,
        .glass-input .ant-input-password-icon {
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .glass-input .ant-input-password-icon:hover {
          color: #ffffff !important;
        }
        
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

      {/* Floating Theme Switcher */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1 p-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full shadow-xl border border-slate-200/80 dark:border-slate-700/80 transition-all">
        <button
          type="button"
          onClick={() => changeTheme('classic')}
          className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
            theme === 'classic'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Giao diện Cổ điển (Xanh dương)"
        >
          <AppstoreOutlined />
          Cổ điển
        </button>

        <button
          type="button"
          onClick={() => changeTheme('glass')}
          className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
            theme === 'glass'
              ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/30 scale-105'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Giao diện Liquid Glass 3D (Hiện đại)"
        >
          <StarOutlined className="text-amber-300" />
          Glass 3D
        </button>
      </div>

      {theme === 'classic' ? (
        /* Theme 1: Giao diện Cổ điển (Original Theme) */
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 font-sans relative overflow-hidden p-4 sm:p-6">
          {/* Decorative background */}
          <div className="absolute top-0 left-0 w-full h-[45vh] sm:h-1/2 bg-gradient-to-b from-blue-600 to-indigo-700 rounded-b-[40px] sm:rounded-b-[100px] shadow-lg"></div>

          {/* Abstract circles */}
          <div className="absolute top-6 left-6 w-36 h-36 sm:w-48 sm:h-48 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute top-16 right-10 w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full blur-3xl"></div>

          <div className="w-full max-w-md z-10 py-4 sm:py-6">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white flex items-center justify-center mx-auto shadow-xl shadow-blue-900/20 mb-3 sm:mb-4 p-2 overflow-hidden">
                <img src="/PTIT.png" alt="PTIT Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-white text-xl sm:text-2xl font-black tracking-tight mb-1">CỔNG THI TRỰC TUYẾN</h1>
              <p className="text-blue-100 text-xs sm:text-sm">Hệ thống đánh giá năng lực quốc gia</p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl space-y-5 sm:space-y-6 border border-slate-100">
              <div className="text-center space-y-1">
                <h3 className="text-slate-800 font-extrabold text-base sm:text-lg">Thí sinh Đăng nhập</h3>
                <p className="text-xs text-slate-500">Vui lòng nhập chính xác Số báo danh và Ngày sinh</p>
              </div>

              {errorMsg && (
                <Alert
                  title={errorMsg}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setErrorMsg(null)}
                  className="text-xs rounded-xl"
                />
              )}

              <Form
                name="candidate_login_classic"
                layout="vertical"
                onFinish={onFinish}
                requiredMark={false}
                className="space-y-4"
              >
                <Form.Item
                  name="username"
                  rules={[{ required: true, message: 'Vui lòng nhập Số báo danh!' }]}
                  className="mb-3 sm:mb-4"
                >
                  <Input
                    prefix={<UserOutlined className="text-slate-400" />}
                    placeholder="Số báo danh (VD: NVC30092003)"
                    autoComplete="username"
                    className="h-11 sm:h-12 bg-slate-50 border-slate-200 text-slate-800 rounded-xl hover:border-blue-400 focus:border-blue-500 text-sm"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[{ required: true, message: 'Vui lòng nhập Ngày sinh!' }]}
                  className="mb-3 sm:mb-4"
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-slate-400" />}
                    placeholder="Ngày sinh (VD: 30092003)"
                    autoComplete="current-password"
                    className="h-11 sm:h-12 bg-slate-50 border-slate-200 text-slate-800 rounded-xl hover:border-blue-400 focus:border-blue-500 text-sm"
                  />
                </Form.Item>

                <Form.Item className="pt-1 sm:pt-2 mb-0">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-500 border-none text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    VÀO PHÒNG THI <ArrowRightOutlined />
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </div>
      ) : (
        /* Theme 2: Giao diện Liquid Glassmorphism 3D (New Theme as sample image) */
        <div className="min-h-screen w-full flex items-center justify-center font-sans relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-[#d91b8a] via-[#5c1c99] to-[#1a084c]">
          {/* Abstract SVG Background Stripe Ornaments (as reference image) */}
          <svg className="absolute top-10 left-10 w-48 h-48 opacity-15 text-white pointer-events-none" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
          </svg>

          <svg className="absolute top-12 right-12 w-64 h-64 opacity-15 text-white pointer-events-none" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 2" />
            <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 2" />
            <circle cx="50" cy="50" r="26" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 2" />
          </svg>

          <svg className="absolute bottom-8 right-20 w-52 h-52 opacity-15 text-white pointer-events-none" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3" />
            <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3" />
          </svg>

          {/* Organic Liquid Gradient Blobs behind Card */}
          <div className="absolute top-[15%] left-[18%] w-80 h-80 sm:w-96 sm:h-96 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] opacity-80 blur-xl animate-float-slow"></div>
          <div className="absolute bottom-[10%] left-[25%] w-72 h-72 sm:w-80 sm:h-80 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 rounded-[60%_40%_30%_70%/50%_60%_40%_50%] opacity-75 blur-xl animate-float-reverse"></div>

          {/* 3D Glossy Spheres / Orbs */}
          <div className="absolute top-[8%] left-[45%] w-16 h-16 sm:w-20 sm:h-20 rounded-full orb-cyan-3d animate-float-slow z-0"></div>
          <div className="absolute top-[12%] right-[16%] w-12 h-12 sm:w-14 sm:h-14 rounded-full orb-purple-3d animate-float-reverse z-0"></div>
          <div className="absolute top-[40%] right-[10%] w-24 h-24 sm:w-32 sm:h-32 rounded-full orb-cyan-3d animate-float-slow z-0"></div>
          <div className="absolute bottom-[20%] left-[12%] w-14 h-14 sm:w-16 sm:h-16 rounded-full orb-purple-3d animate-float-reverse z-0"></div>
          <div className="absolute bottom-[12%] right-[32%] w-14 h-14 sm:w-16 sm:h-16 rounded-full orb-cyan-3d animate-float-slow z-0"></div>
          <div className="absolute bottom-[35%] left-[36%] w-10 h-10 rounded-full orb-pink-3d animate-float-reverse z-0"></div>

          {/* Frosted Glassmorphism Container */}
          <div className="w-full max-w-md z-10 py-4 sm:py-6">
            <div className="backdrop-blur-2xl bg-white/[0.14] p-6 sm:p-10 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border border-white/30 space-y-6 relative overflow-hidden">
              
              {/* Inner ambient light sheen */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>

              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto shadow-inner border border-white/30 mb-3 sm:mb-4 p-2 overflow-hidden">
                  <img src="/PTIT.png" alt="PTIT Logo" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md mb-1">CỔNG THI TRỰC TUYẾN</h1>
                <p className="text-white/80 text-xs sm:text-sm font-medium">Hệ thống đánh giá năng lực quốc gia</p>
              </div>

              <div className="text-center space-y-1 pt-1">
                <h3 className="text-white font-extrabold text-lg sm:text-xl drop-shadow">Thí sinh Đăng nhập</h3>
                <p className="text-xs text-white/70">Vui lòng nhập chính xác Số báo danh và Ngày sinh</p>
              </div>

              {errorMsg && (
                <Alert
                  title={errorMsg}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setErrorMsg(null)}
                  className="text-xs rounded-xl bg-rose-500/30 border border-rose-300/40 text-white backdrop-blur-md"
                />
              )}

              <Form
                name="candidate_login_glass"
                layout="vertical"
                onFinish={onFinish}
                requiredMark={false}
                className="space-y-4"
              >
                <Form.Item
                  name="username"
                  rules={[{ required: true, message: 'Vui lòng nhập Số báo danh!' }]}
                  className="mb-3 sm:mb-4"
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Số báo danh (VD: NVC30092003)"
                    autoComplete="username"
                    className="glass-input h-11 sm:h-12 text-sm"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[{ required: true, message: 'Vui lòng nhập Ngày sinh!' }]}
                  className="mb-3 sm:mb-4"
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Ngày sinh (VD: 30092003)"
                    autoComplete="current-password"
                    className="glass-input h-11 sm:h-12 text-sm"
                  />
                </Form.Item>

                <Form.Item className="pt-2 mb-0">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-[0_10px_25px_rgba(245,158,11,0.4)] cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98] border-none"
                  >
                    VÀO PHÒNG THI <ArrowRightOutlined />
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

