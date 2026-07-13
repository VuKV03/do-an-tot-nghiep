import React, { useState } from 'react';
import { Form, Input, Button, Tabs, Alert, message, Card, ConfigProvider, theme } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  GlobalOutlined,
  ArrowRightOutlined,
  KeyOutlined,
  TeamOutlined,
  SolutionOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { SystemUser } from '../../types';

interface LoginProps {
  onLoginSuccess: (user: SystemUser) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [activeTab, setActiveTab] = useState<string>('login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  // Test accounts list for quick access
  const demoAccounts = [
    { username: 'admin', display: 'Quản trị viên (admin)', pass: 'admin123', role: 'admin' },
    { username: 'teacher01', display: 'Giáo viên (dungnv)', pass: 'teacher123', role: 'teacher' },
    { username: 'trangpt', display: 'Thẩm định viên (trangpt)', pass: 'admin123', role: 'reviewer' },
  ];

  const handleDemoClick = (account: typeof demoAccounts[0]) => {
    loginForm.setFieldsValue({
      username: account.username,
      password: account.pass
    });
    message.info(`Đã điền tài khoản mẫu: ${account.display}`);
  };

  const onFinishLogin = async (values: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Save to localStorage
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user_info', JSON.stringify(data.user));

        message.success(`Chào mừng ${data.user.fullName} quay trở lại!`);
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.detail || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const onFinishRegister = async (values: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          fullName: values.fullName,
          password: values.password,
          role: values.role || 'teacher',
        }),
      });

      const data = await response.json();

      if (response.status === 201 && data.success) {
        message.success('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
        // Automatically switch to login tab and prefill
        setActiveTab('login');
        loginForm.setFieldsValue({
          username: values.username,
          password: values.password,
        });
        registerForm.resetFields();
      } else {
        setErrorMsg(data.detail || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-stretch bg-slate-950 font-sans overflow-hidden">
      {/* Left side panel - decorative and brand overview */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden select-none border-r border-slate-800 flex-col justify-between p-12">
        {/* Abstract animated/colorful grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

        {/* Floating blurred light spheres */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        {/* Top brand signature */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <GlobalOutlined className="text-slate-950 text-xl font-bold" />
          </div>
          <div>
            <h1 className="text-white text-sm font-black tracking-widest uppercase my-0 leading-none">NHCH</h1>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1 block">Hệ thống Quản lý đề thi Quốc gia</span>
          </div>
        </div>

        {/* Middle text blocks and visual bullet points */}
        <div className="relative z-10 max-w-lg my-auto space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              Phiên bản v2.0 • Trí tuệ Nhân tạo hỗ trợ
            </div>
            <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
              Quản lý Ngân hàng Câu hỏi và Tự động hóa Sinh đề thi
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Giải pháp tích hợp đồng bộ giúp các tổ chức giáo dục chuẩn hóa quy trình biên soạn câu hỏi, đánh giá chất lượng và lắp ghép đề thi theo ma trận kiến thức khoa học.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4">
            <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-blue-500/30 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 text-blue-400 text-lg">
                <SafetyCertificateOutlined />
              </div>
              <div>
                <h4 className="text-white text-xs font-bold my-0">Quy trình Thẩm định 2 cấp</h4>
                <p className="text-slate-400 text-[11px] mt-1 leading-normal">Hỗ trợ các cấp phê duyệt, gửi ý kiến đánh giá trực tiếp trên giao diện tương tác trực quan.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/30 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400 text-lg">
                <KeyOutlined />
              </div>
              <div>
                <h4 className="text-white text-xs font-bold my-0">Sinh đề thi tự động bằng AI</h4>
                <p className="text-slate-400 text-[11px] mt-1 leading-normal">Thiết lập ma trận phân bố kiến thức và mức độ tư duy, hệ thống tự động sinh cấu trúc đề chuẩn.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-500">
          <span>© 2026 NHCH THI THPT.</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Hệ thống đang hoạt động ổn định
          </span>
        </div>
      </div>

      {/* Right side form card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto">
        {/* Glowing background circles for mobile */}
        <div className="absolute top-10 right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl lg:hidden pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl lg:hidden pointer-events-none" />

        <div className="w-full max-w-md space-y-6 z-10">
          {/* Mobile brand presentation */}
          <div className="lg:hidden text-center space-y-2 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <GlobalOutlined className="text-slate-950 text-2xl font-bold" />
            </div>
            <div>
              <h1 className="text-white text-lg font-black tracking-widest uppercase my-0 leading-none">PM QUẢN LÝ NHCH</h1>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1.5 block">Hệ thống Quản lý đề thi Quốc gia</span>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="text-white font-extrabold text-xl tracking-tight">
                {activeTab === 'login' ? 'Đăng nhập hệ thống' : 'Đăng ký tài khoản'}
              </h3>
              <p className="text-xs text-slate-400">
                {activeTab === 'login'
                  ? 'Vui lòng điền thông tin xác thực để bắt đầu phiên làm việc.'
                  : 'Tạo tài khoản mới để trải nghiệm các phân hệ nghiệp vụ.'}
              </p>
            </div>

            {errorMsg && (
              <Alert
                message={errorMsg}
                type="error"
                showIcon
                closable
                onClose={() => setErrorMsg(null)}
                className="bg-red-950/30 border-red-900/50 text-red-200 text-xs rounded-xl"
              />
            )}

            <ConfigProvider theme={{ components: { Tabs: { itemColor: '#94a3b8', itemSelectedColor: '#3b82f6', itemHoverColor: '#60a5fa' } } }}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                centered
                items={[
                  {
                    key: 'login',
                    label: <span className="font-bold text-xs select-none">ĐĂNG NHẬP</span>,
                    children: (
                      <Form
                        form={loginForm}
                        name="login_form"
                        layout="vertical"
                        onFinish={onFinishLogin}
                        requiredMark={false}
                        className="pt-4 space-y-4"
                      >
                        <Form.Item
                          name="username"
                          rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
                        >
                          <Input
                            prefix={<UserOutlined className="text-slate-500" />}
                            placeholder="Tên đăng nhập (ví dụ: admin, teacher01)"
                            className="h-11 bg-slate-950/80 border-slate-800 text-white rounded-xl placeholder-slate-500 hover:border-slate-700 focus:border-blue-500 text-xs focus:bg-slate-950"
                          />
                        </Form.Item>

                        <Form.Item
                          name="password"
                          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                        >
                          <Input.Password
                            prefix={<LockOutlined className="text-slate-500" />}
                            placeholder="Mật khẩu bảo mật"
                            className="h-11 bg-slate-950/80 border-slate-800 text-white rounded-xl placeholder-slate-500 hover:border-slate-700 focus:border-blue-500 text-xs focus:bg-slate-950"
                          />
                        </Form.Item>

                        <Form.Item className="pt-2">
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            className="w-full h-11 bg-blue-600 hover:bg-blue-500 border-none text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
                          >
                            XÁC NHẬN VÀO HỆ THỐNG <ArrowRightOutlined />
                          </Button>
                        </Form.Item>
                      </Form>
                    )
                  },
                  {
                    key: 'register',
                    label: <span className="font-bold text-xs select-none">ĐĂNG KÝ MỚI</span>,
                    children: (
                      <Form
                        form={registerForm}
                        name="register_form"
                        layout="vertical"
                        onFinish={onFinishRegister}
                        requiredMark={false}
                        initialValues={{ role: 'teacher' }}
                        className="pt-4 space-y-4"
                      >
                        <Form.Item
                          name="username"
                          rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập mong muốn!' }]}
                        >
                          <Input
                            prefix={<UserOutlined className="text-slate-500" />}
                            placeholder="Tên đăng nhập viết liền không dấu"
                            className="h-11 bg-slate-950/80 border-slate-800 text-white rounded-xl placeholder-slate-500 hover:border-slate-700 focus:border-blue-500 text-xs focus:bg-slate-950"
                          />
                        </Form.Item>

                        <Form.Item
                          name="fullName"
                          rules={[{ required: true, message: 'Vui lòng nhập họ và tên của bạn!' }]}
                        >
                          <Input
                            prefix={<SolutionOutlined className="text-slate-500" />}
                            placeholder="Họ và tên đầy đủ"
                            className="h-11 bg-slate-950/80 border-slate-800 text-white rounded-xl placeholder-slate-500 hover:border-slate-700 focus:border-blue-500 text-xs focus:bg-slate-950"
                          />
                        </Form.Item>

                        <Form.Item
                          name="email"
                          rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' }
                          ]}
                        >
                          <Input
                            prefix={<MailOutlined className="text-slate-500" />}
                            placeholder="Địa chỉ Email nhận tin"
                            className="h-11 bg-slate-950/80 border-slate-800 text-white rounded-xl placeholder-slate-500 hover:border-slate-700 focus:border-blue-500 text-xs focus:bg-slate-950"
                          />
                        </Form.Item>

                        <Form.Item
                          name="password"
                          rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu đăng ký!' },
                            { min: 6, message: 'Mật khẩu phải chứa ít nhất 6 ký tự!' }
                          ]}
                        >
                          <Input.Password
                            prefix={<LockOutlined className="text-slate-500" />}
                            placeholder="Mật khẩu tối thiểu 6 ký tự"
                            className="h-11 bg-slate-950/80 border-slate-800 text-white rounded-xl placeholder-slate-500 hover:border-slate-700 focus:border-blue-500 text-xs focus:bg-slate-950"
                          />
                        </Form.Item>

                        <Form.Item
                          name="role"
                          label={<span className="text-slate-300 text-[10px] font-bold uppercase">Vai trò tác vụ của tài khoản</span>}
                          rules={[{ required: true }]}
                        >
                          <select
                            className="w-full h-11 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 hover:border-slate-700 focus:border-blue-500 text-xs font-semibold outline-none cursor-pointer"
                          >
                            <option value="teacher">Giáo viên bộ môn (Soạn câu hỏi, đề thi)</option>
                            <option value="reviewer">Chuyên gia giám định (Thẩm định câu hỏi)</option>
                            <option value="admin">Quản trị viên (Quản trị hệ thống)</option>
                          </select>
                        </Form.Item>

                        <Form.Item className="pt-2">
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 border-none text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
                          >
                            ĐĂNG KÝ TÀI KHOẢN MỚI <ArrowRightOutlined />
                          </Button>
                        </Form.Item>
                      </Form>
                    )
                  }
                ]}
              />
            </ConfigProvider>
          </div>

          {/* Quick Demo Access Bar */}
          {activeTab === 'login' && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <TeamOutlined className="text-blue-400" />
                <span>Trợ lý đăng nhập nhanh cho Kiểm thử</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.username}
                    onClick={() => handleDemoClick(account)}
                    className="flex-1 min-w-[120px] text-left p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all duration-150 cursor-pointer"
                  >
                    <div className="text-white text-[10px] font-extrabold truncate">{account.username}</div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">{account.role === 'admin' ? 'Quản trị' : account.role === 'teacher' ? 'Giáo viên' : 'Thẩm định'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
