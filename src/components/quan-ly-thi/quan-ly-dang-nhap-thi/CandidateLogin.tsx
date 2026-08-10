import { API_ORIGIN } from '../../../config/apiBase';
import React, { useState } from 'react';
import { Form, Input, Button, Alert, message } from 'antd';
import { UserOutlined, LockOutlined, ArrowRightOutlined, GlobalOutlined } from '@ant-design/icons';
import { SystemUser } from '../../../types';

interface CandidateLoginProps {
  onLoginSuccess: (user: SystemUser) => void;
}

export default function CandidateLogin({ onLoginSuccess }: CandidateLoginProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 font-sans relative overflow-hidden p-4 sm:p-6">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-[45vh] sm:h-1/2 bg-gradient-to-b from-blue-600 to-indigo-700 rounded-b-[40px] sm:rounded-b-[100px] shadow-lg"></div>

      {/* Abstract circles */}
      <div className="absolute top-6 left-6 w-36 h-36 sm:w-48 sm:h-48 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute top-16 right-10 w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md z-10 py-4 sm:py-6">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white flex items-center justify-center mx-auto shadow-xl shadow-blue-900/20 mb-3 sm:mb-4">
            <GlobalOutlined className="text-blue-600 text-2xl sm:text-3xl font-bold" />
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
            name="candidate_login"
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
  );
}
