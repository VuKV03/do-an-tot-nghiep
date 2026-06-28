import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api';
import {
  SafetyCertificateOutlined,
  UserOutlined,
  TeamOutlined,
  LockOutlined
} from '@ant-design/icons';
import { AuditLog } from '../../types';

import UserManagement from './quan-ly-nguoi-dung/UserManagement';
import GroupManagement from './quan-ly-nhom-nguoi-dung/GroupManagement';
import SecurityPolicy from './chinh-sach-bao-mat/SecurityPolicy';

interface SystemAdminModuleProps {
  currentTabKey: string;
  onNavigateTab: (key: string) => void;
  auditLogs: AuditLog[];
  onAddAuditLog: (log: AuditLog) => void;
}

export default function SystemAdminModule({
  currentTabKey,
  onNavigateTab,
  auditLogs,
  onAddAuditLog
}: SystemAdminModuleProps) {
  // Fetch real security logs from backend
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/audit-logs`);
        if (res.data.success && res.data.data.length > 0) {
          setSecurityLogs(res.data.data);
        } else {
          // Fallback initial state if empty
          setSecurityLogs([
            { id: 'sec-1', user: 'system_daemon', action: 'Bật tính năng TLS 256-bit', timestamp: '2026-06-17T12:00:00Z', level: 'info', ip: '10.0.4.15', details: 'Hệ thống tự động kích hoạt bảo mật kênh truyền HTTPS.' }
          ]);
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      }
    };
    if (currentTabKey === 'chinh-sach-bao-mat') {
      fetchLogs();
    }
  }, [currentTabKey]);

  return (
    <div className="space-y-6" id="system-admin-overall-module">
      
      {/* Header section with Dynamic Titles corresponding to active key */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs shrink-0 select-none">
        <div className="space-y-1">
          <h2 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
            <SafetyCertificateOutlined className="text-[#002147] animate-pulse" />
            VÙNG AN NINH & QUẢN TRỊ HỆ THỐNG
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Quản trị thông tin cán bộ, chuẩn hóa ma trận phân lớp vai trò và giám sát các chuẩn mã hóa bảo mật thời gian thực.
          </p>
        </div>
        
        {/* Sub Navigation tabs buttons to navigate */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <Button
            type={currentTabKey === 'quan-ly-nguoi-dung' ? 'primary' : 'text'}
            size="small"
            icon={<UserOutlined />}
            onClick={() => onNavigateTab('quan-ly-nguoi-dung')}
            className={`text-xs font-black rounded-lg py-1 px-3 border-transparent ${
              currentTabKey === 'quan-ly-nguoi-dung' ? 'bg-[#002147] text-white shadow-none' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Người dùng
          </Button>
          <Button
            type={currentTabKey === 'quan-ly-nhom-nguoi-dung' ? 'primary' : 'text'}
            size="small"
            icon={<TeamOutlined />}
            onClick={() => onNavigateTab('quan-ly-nhom-nguoi-dung')}
            className={`text-xs font-black rounded-lg py-1 px-3 border-transparent ${
              currentTabKey === 'quan-ly-nhom-nguoi-dung' ? 'bg-[#002147] text-white shadow-none' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Nhóm & Phân quyền
          </Button>
          <Button
            type={currentTabKey === 'chinh-sach-bao-mat' ? 'primary' : 'text'}
            size="small"
            icon={<LockOutlined />}
            onClick={() => onNavigateTab('chinh-sach-bao-mat')}
            className={`text-xs font-black rounded-lg py-1 px-3 border-transparent ${
              currentTabKey === 'chinh-sach-bao-mat' ? 'bg-[#002147] text-white shadow-none' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            An toàn bảo mật
          </Button>
        </div>
      </div>

      {currentTabKey === 'quan-ly-nguoi-dung' && (
        <UserManagement onAddAuditLog={onAddAuditLog} setSecurityLogs={setSecurityLogs} />
      )}

      {currentTabKey === 'quan-ly-nhom-nguoi-dung' && (
        <GroupManagement onAddAuditLog={onAddAuditLog} setSecurityLogs={setSecurityLogs} />
      )}

      {currentTabKey === 'chinh-sach-bao-mat' && (
        <SecurityPolicy 
          securityLogs={securityLogs} 
          setSecurityLogs={setSecurityLogs} 
          onAddAuditLog={onAddAuditLog} 
        />
      )}

    </div>
  );
}
