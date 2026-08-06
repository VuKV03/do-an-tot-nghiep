import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import axios from 'axios';

import { API_BASE_URL as API_URL } from '../../config/apiConfig';
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
