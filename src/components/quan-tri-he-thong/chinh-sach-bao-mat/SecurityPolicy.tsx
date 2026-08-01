import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api';
import { 
  Button, 
  Switch, 
  Slider, 
  Select, 
  Input, 
  Badge,
  Empty
} from 'antd';
import { toast } from '../../../utils/toast';
import {
  SafetyCertificateOutlined,
  AuditOutlined,
  ExportOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { AuditLog } from '../../../types';

interface SecurityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  level: string;
  ip: string;
  details: string;
}

interface SecurityPolicyProps {
  securityLogs: SecurityLog[];
  setSecurityLogs: React.Dispatch<React.SetStateAction<SecurityLog[]>>;
  onAddAuditLog: (log: AuditLog) => void;
}

export default function SecurityPolicy({
  securityLogs,
  setSecurityLogs,
  onAddAuditLog
}: SecurityPolicyProps) {
  // STATE FOR SECURITY POLICIES
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireUpperCase, setRequireUpperCase] = useState(true);
  const [requireSpecialChar, setRequireSpecialChar] = useState(true);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState(90);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [maxLoginFailures, setMaxLoginFailures] = useState(5);
  const [enableCaptchaOnFail, setEnableCaptchaOnFail] = useState(true);
  const [enable2FAForAdmin, setEnable2FAForAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Security Audit Logs filter
  const [securitySearchKey, setSecuritySearchKey] = useState('');
  const [securityFilterLevel, setSecurityFilterLevel] = useState<string>('all');

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/security/policy`);
        if (res.data.success && res.data.data) {
          const policy = res.data.data;
          setMinPasswordLength(policy.minPasswordLength ?? 8);
          setRequireUpperCase(policy.requireUpperCase ?? true);
          setRequireSpecialChar(policy.requireSpecialChar ?? true);
          setPasswordExpiryDays(policy.passwordExpiryDays ?? 90);
          setSessionTimeoutMinutes(policy.sessionTimeoutMinutes ?? 30);
          setMaxLoginFailures(policy.maxLoginFailures ?? 5);
          setEnableCaptchaOnFail(policy.enableCaptchaOnFail ?? true);
          setEnable2FAForAdmin(policy.enable2FAForAdmin ?? false);
        }
      } catch (err) {
        console.error('Error fetching security policy:', err);
      }
    };
    fetchPolicy();
  }, []);

  const handleSaveSecurityPolicies = async () => {
    setLoading(true);
    try {
      // 1. Gửi cấu hình thật lên BE
      await axios.put(`${API_URL}/auth/security/policy`, {
        minPasswordLength,
        requireUpperCase,
        requireSpecialChar,
        passwordExpiryDays,
        sessionTimeoutMinutes,
        maxLoginFailures,
        enableCaptchaOnFail,
        enable2FAForAdmin
      });

      toast.success('Đã áp dụng các quy chuẩn chính sách bảo mật thế hệ mới lên toàn phân hệ!');
      
      const details = `Độ dài tối thiểu MK: ${minPasswordLength}; 2FA cho quản trị viên: ${enable2FAForAdmin ? 'BẬT' : 'TẮT'}`;

      // 2. Gửi API ghi log bảo mật (BE sẽ tự động bắt IP thật của thiết bị)
      const logRes = await axios.post(`${API_URL}/auth/audit-logs`, {
        user: 'Quản trị viên',
        action: 'Cập nhật an ninh hệ thống',
        level: 'info',
        ip: '', // Để trống để BE tự gán ip thực tế
        details: details
      });

      if (logRes.data.success && logRes.data.data) {
        setSecurityLogs(prev => [logRes.data.data, ...prev]);
      }
      
      // General app audit log if needed
      onAddAuditLog({
        id: `log-sec-${Date.now()}`,
        user: 'Quản trị viên',
        action: 'Thay đổi an ninh lõi',
        timestamp: new Date().toISOString(),
        details: details
      });

    } catch (error: any) {
      console.error('Error saving security policy:', error);
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra khi lưu thay đổi.');
    } finally {
      setLoading(false);
    }
  };

  // Filter Security logs
  const filteredSecurityLogs = useMemo(() => {
    const kw = securitySearchKey.trim().toLowerCase();
    return securityLogs.filter(log => {
      const matchSearch = log.user.toLowerCase().includes(kw) ||
                          log.action.toLowerCase().includes(kw) ||
                          (log.details && log.details.toLowerCase().includes(kw));
      const matchLevel = securityFilterLevel === 'all' || log.level === securityFilterLevel;
      return matchSearch && matchLevel;
    });
  }, [securityLogs, securitySearchKey, securityFilterLevel]);

  const handleSimulateExportLogs = () => {
    toast.loading({ content: 'Đang kết xuất tệp nhật ký bảo mật dạng CSV...', key: 'exportLogs' });
    setTimeout(() => {
      toast.success({ content: 'Kết xuất thành công tệp logs_system_security_2026.csv! Trình duyệt đang tải xuống.', key: 'exportLogs', duration: 3 });
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom duration-300">
      
      {/* Security policy sliders */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-6">
        <div className="flex items-center gap-2 border-b border-dashed pb-3">
          <SafetyCertificateOutlined className="text-blue-900" />
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 my-0">THIẾT LẬP CHÍNH SÁCH BẢO MẬT TÀI KHOẢN</h3>
        </div>

        {/* Sliders and switches */}
        <div className="space-y-4">
          
          <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest select-none">YÊU CẦU ĐỘ PHỨC TẠP MẬT KHẨU</span>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Độ dài mật khẩu tối thiểu:</span>
                <strong className="text-blue-900">{minPasswordLength} ký tự</strong>
              </div>
              <Slider 
                min={6} 
                max={20} 
                value={minPasswordLength} 
                onChange={setMinPasswordLength}
                className="m-1 pb-1"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/55 pt-3 select-none">
              <div className="space-y-0.5">
                <strong className="text-slate-700 text-xs font-bold block">Bắt buộc sử dụng chữ HOA và chữ thường:</strong>
                <span className="text-[10px] text-slate-400 block font-medium">Bảo vệ chống lại tấn công brute-force cơ bản.</span>
              </div>
              <Switch checked={requireUpperCase} onChange={setRequireUpperCase} className="bg-slate-300" />
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/55 pt-3 select-none">
              <div className="space-y-0.5">
                <strong className="text-slate-700 text-xs font-bold block">Bắt buộc chứa chữ số và ký tự đặc biệt (!@#...):</strong>
                <span className="text-[10px] text-slate-400 block font-medium">Gia tăng độ mạnh mật khẩu lên mức an ninh quốc tế.</span>
              </div>
              <Switch checked={requireSpecialChar} onChange={setRequireSpecialChar} className="bg-slate-300" />
            </div>

            <div className="space-y-1 border-t border-slate-200/55 pt-3">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Thời hạn mật khẩu tự động hết hạn (ngày):</span>
                <strong className="text-blue-900">{passwordExpiryDays} ngày</strong>
              </div>
              <Slider 
                min={30} 
                max={180} 
                step={10}
                value={passwordExpiryDays} 
                onChange={setPasswordExpiryDays}
                className="m-1 pb-1"
              />
            </div>
          </div>

          <div className="bg-slate-50 border rounded-xl p-4 space-y-3.5">
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest select-none">KIỂM SOÁT PHIÊN VÀ ĐĂNG NHẬP SAU THẤT BẠI</span>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Thời gian tự động ngắt phiên kết nối tĩnh (Phút):</span>
                <strong className="text-blue-900">{sessionTimeoutMinutes} phút</strong>
              </div>
              <Slider 
                min={5} 
                max={120} 
                step={5}
                value={sessionTimeoutMinutes} 
                onChange={setSessionTimeoutMinutes}
                className="m-1 pb-1"
              />
            </div>

            <div className="space-y-1 border-t border-slate-200/55 pt-3">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Số lần tối đa đăng nhập sai liên tiếp:</span>
                <strong className="text-rose-700 font-extrabold">{maxLoginFailures} lần</strong>
              </div>
              <Slider 
                min={3} 
                max={10} 
                value={maxLoginFailures} 
                onChange={setMaxLoginFailures}
                className="m-1 pb-1"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/55 pt-3 select-none">
              <div className="space-y-0.5">
                <strong className="text-slate-700 text-xs font-bold block">Yêu cầu nhập Google CAPTCHA khi sai vượt hạn mức:</strong>
                <span className="text-[10px] text-slate-400 block font-medium">Chặn đứng tấn công quét dọn mật khẩu bằng botnet.</span>
              </div>
              <Switch checked={enableCaptchaOnFail} onChange={setEnableCaptchaOnFail} className="bg-slate-300" />
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/55 pt-3 select-none">
              <div className="space-y-0.5">
                <strong className="text-slate-700 text-xs font-bold block">Bắt buộc xác thực song hành 2 yếu tố (2FA / OTP):</strong>
                <span className="text-[10px] text-slate-400 block font-medium">Khuyên dùng đối với các tài khoản gán quyền Quản trị viên tối cao.</span>
              </div>
              <Switch checked={enable2FAForAdmin} onChange={setEnable2FAForAdmin} className="bg-slate-300" />
            </div>
          </div>

        </div>

        <Button
          type="primary"
          block
          loading={loading}
          icon={<SafetyCertificateOutlined />}
          onClick={handleSaveSecurityPolicies}
          className="bg-[#002147] border-transparent text-white font-extrabold text-xs rounded-xl hover:opacity-90 py-4 cursor-pointer select-none"
        >
          Cập nhật cấu hình & Áp dụng chính sách an toàn
        </Button>
      </div>

      {/* Real-time security activities logs */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-dashed pb-3 select-none">
          <div className="flex items-center gap-2">
            <AuditOutlined className="text-indigo-900" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 my-0">NHẬT KÝ BẢO MẬT HỆ THỐNG</h3>
          </div>
          
          <Button
            type="text"
            size="small"
            icon={<ExportOutlined />}
            onClick={handleSimulateExportLogs}
            className="text-[10px] uppercase font-bold text-blue-900 bg-blue-50 border-none hover:bg-blue-100 rounded-lg cursor-pointer"
          >
            Xuất file log (CSV)
          </Button>
        </div>

        {/* Log Searching & Filtering bar */}
        <div className="flex gap-2 my-4 items-center select-none" id="log-filters-container">
          <Input
            placeholder="Tìm nhật ký..."
            size="small"
            prefix={<SearchOutlined className="text-slate-400 text-xs" />}
            className="rounded-lg border-slate-250 text-[11px] font-semibold flex-1"
            value={securitySearchKey}
            onChange={e => setSecuritySearchKey(e.target.value)}
            allowClear
          />

          <Select
            value={securityFilterLevel}
            onChange={setSecurityFilterLevel}
            size="small"
            className="w-28 text-[11px] font-bold"
            options={[
              { value: 'all', label: 'Tất cả log' },
              { value: 'success', label: '🟢 Thành công' },
              { value: 'info', label: '🔵 Thông tin' },
              { value: 'warning', label: '🟡 Cảnh báo' },
              { value: 'danger', label: '🔴 Nguy hiểm' }
            ]}
          />
        </div>

        {/* Real Security logs scrolling list */}
        <div className="flex-1 overflow-y-auto max-h-[520px] pr-1.5 space-y-3.5" id="security-scrolling-timeline-pane">
          {filteredSecurityLogs.length === 0 ? (
            <Empty description="Không có dòng nhật ký bảo vệ nào khớp với từ khóa tìm kiếm." />
          ) : (
            filteredSecurityLogs.map(log => (
              <div key={log.id} className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs font-semibold relative">
                <div className="flex items-center justify-between mb-1.5 select-none">
                  <span className="font-mono font-black text-slate-800 bg-slate-200/80 px-1.5 py-0.5 rounded text-[9.5px]">
                    {log.action}
                  </span>
                  <small className="text-[10px] text-slate-400 font-bold block">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </small>
                </div>

                <p className="text-slate-600 font-medium leading-relaxed my-1 text-[11px]">
                  {log.details}
                </p>

                <div className="flex items-center justify-between mt-2 select-none border-t border-slate-100 pt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Tác nhân:</span>
                    <strong className="text-slate-800 text-[10.5px]">@{log.user}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 text-[9.5px] font-bold bg-slate-150 px-1 rounded">{log.ip || "N/A"}</span>
                    {log.level === 'success' && <Badge color="green" />}
                    {log.level === 'info' && <Badge color="blue" />}
                    {log.level === 'warning' && <Badge color="gold" />}
                    {log.level === 'danger' && <Badge color="red" />}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}
