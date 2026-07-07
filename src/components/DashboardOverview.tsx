import React, { useState, useEffect } from 'react';
import { Badge, Tooltip, Avatar, Tag, Timeline, Button, Spin, Empty } from 'antd';
import {
  BookOutlined,
  FileDoneOutlined,
  AuditOutlined,
  TeamOutlined,
  BellOutlined,
  ArrowUpOutlined,
  GroupOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Question, MatrixConfig, AuditLog } from '../types';

interface DashboardOverviewProps {
  questions: Question[];
  matrices: MatrixConfig[];
  auditLogs: AuditLog[];
  onNavigate: (tab: 'question-bank' | 'matrix-config' | 'quan-ly-de-thi-goi-de') => void;
}

export default function DashboardOverview({ questions, matrices, auditLogs, onNavigate }: DashboardOverviewProps) {
  // Compute metrics from actual questions data
  const totalQuestionsFormatted = questions.length.toLocaleString();
  const pendingCount = questions.filter(q => q.status === 'pending').length;
  const pendingApprovalsFormatted = pendingCount.toLocaleString();

  // Estimate active teachers based on unique creators
  const activeTeachers = new Set(questions.map(q => q.creator)).size;
  const activeTeachersFormatted = activeTeachers.toLocaleString();

  // Compute subject data for the bar chart
  const subjectMap = questions.reduce((acc, q) => {
    if (!acc[q.subject]) {
      acc[q.subject] = { name: q.subject, 'Đã duyệt': 0, 'Chờ duyệt': 0 };
    }
    if (q.status === 'approved') acc[q.subject]['Đã duyệt']++;
    if (q.status === 'pending') acc[q.subject]['Chờ duyệt']++;
    return acc;
  }, {} as Record<string, { name: string; 'Đã duyệt': number; 'Chờ duyệt': number }>);
  const subjectData = Object.values(subjectMap);

  // Compute cognitive level data for the pie chart
  const levelCounts = {
    'nhan_biet': { name: 'Nhận biết', value: 0, color: '#0f172a' },
    'thong_hieu': { name: 'Thông hiểu', value: 0, color: '#1890ff' },
    'van_dung': { name: 'Vận dụng', value: 0, color: '#722ed1' },
    'van_dung_cao': { name: 'Vận dụng cao', value: 0, color: '#f5222d' },
  };
  questions.forEach(q => {
    if (levelCounts[q.level as keyof typeof levelCounts]) {
      levelCounts[q.level as keyof typeof levelCounts].value++;
    }
  });
  const levelData = Object.values(levelCounts).filter(l => l.value > 0);

  // Generate recent matrices and questions for the recent activities section
  const recentMatrices = [...matrices].reverse().slice(0, 5);
  const totalMatricesCount = matrices.length;

  const recentQuestions = [...questions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const loading = false;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newQuestionsThisWeek = questions.filter(q => new Date(q.createdAt) >= oneWeekAgo).length;

  return (
    <div className="space-y-6 pt-2" id="dashboard-container">
      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

        {/* Card 1: Total Questions */}
        <div
          id="metric-card-total-questions"
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('question-bank')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0f172a] transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Tổng câu hỏi hệ thống</span>
              <span className="text-xl font-black text-slate-900 tracking-tight block mt-1">{totalQuestionsFormatted}</span>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg text-[#0f172a] transition-all group-hover:bg-[#0f172a] group-hover:text-white">
              <BookOutlined className="transition-all" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <ArrowUpOutlined className="text-[9px]" />
            <span>+{newQuestionsThisWeek} câu mới tuần này</span>
          </div>
        </div>

        {/* Card 2: Total Matrices */}
        <div
          id="metric-card-total-matrices"
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('matrix-config')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Cấu hình Ma trận</span>
              <span className="text-xl font-black text-slate-900 tracking-tight block mt-1">{totalMatricesCount} Ma trận</span>
            </div>
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-lg text-sky-600 transition-all group-hover:bg-sky-500 group-hover:text-white">
              <FileDoneOutlined className="transition-all" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[11px] text-sky-600 font-medium select-none">
            <span>Sẵn sàng sinh đề từ AI</span>
          </div>
        </div>

        {/* Card 3: Approved Questions */}
        <div
          id="metric-card-approved-questions"
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('question-bank')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Câu hỏi đã duyệt</span>
              <span className="text-xl font-black text-slate-900 tracking-tight block mt-1">{questions.filter(q => q.status === 'approved').length.toLocaleString()} Câu</span>
            </div>
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-lg text-violet-600 transition-all group-hover:bg-violet-500 group-hover:text-white">
              <AuditOutlined className="transition-all" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[11px] text-violet-600 font-semibold select-none">
            <span>Chất lượng đạt chuẩn</span>
          </div>
        </div>

        {/* Card 4: Pending Approvals */}
        <div
          id="metric-card-pending-approvals"
          className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('question-bank')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-amber-700/80 font-bold uppercase text-[9px] tracking-wider block">Chờ thẩm định</span>
              <span className="text-xl font-black text-amber-700 tracking-tight block mt-1">{pendingApprovalsFormatted}</span>
            </div>
            <div className="w-10 h-10 bg-amber-100/80 rounded-xl flex items-center justify-center text-lg text-amber-600 transition-all group-hover:bg-amber-500 group-hover:text-white">
              <AuditOutlined className="transition-all animate-pulse" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold uppercase tracking-wider text-[9px]">
            <span>⚠️ Thẩm định khẩn cấp</span>
          </div>
        </div>

        {/* Card 5: Active Teachers */}
        <div
          id="metric-card-active-teachers"
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Chuyên gia đang hoạt động</span>
              <span className="text-xl font-black text-slate-900 tracking-tight block mt-1">{activeTeachersFormatted} ThS/TS</span>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg text-indigo-500 transition-all group-hover:bg-indigo-500 group-hover:text-white">
              <TeamOutlined className="transition-all" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <span>● Đang sẵn sàng</span>
          </div>
        </div>

      </div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-charts-layout">

        {/* Left Side: Recharts Bar Chart & Metrics (8 cols) */}
        <div
          id="questions-by-subject-chart-card"
          className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-[#0f172a] rounded-full inline-block" />
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900">Phân bố câu hỏi theo Môn học và Trạng thái</span>
            </div>
            <Tag color="blue" className="text-[10px] font-bold uppercase m-0">Năm học 2025 - 2026</Tag>
          </div>
          <div className="p-5 flex-1 select-none">
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={subjectData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 500 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <ChartTooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Đã duyệt" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Chờ duyệt" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Side: Recharts Pie Chart of Cognitive Levels (4 cols) */}
        <div
          id="cognitive-levels-pie-chart-card"
          className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col overflow-hidden"
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <span className="w-1 h-4 bg-purple-600 rounded-full inline-block" />
            <span className="font-extrabold text-xs uppercase tracking-wider text-[#0f172a]">Cấp độ tư duy</span>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-between select-none">
            <div className="h-[180px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={levelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {levelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
              {levelData.map((lvl) => (
                <div key={lvl.name} className="flex flex-col items-start p-1.5 hover:bg-slate-50 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lvl.color }} />
                    {lvl.name}
                  </span>
                  <span className="text-xs font-black text-slate-800 pl-3">{lvl.value.toLocaleString()} câu</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* NEW INTERACTIVE SEGMENT: RECENT MATRICES & QUESTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-new-features-row">
        {/* Dynamic Matrices List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <FileTextOutlined className="text-[#0f172a] text-sm" />
              <span className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">Ma trận đề thi gần đây</span>
            </div>
            <Button
              size="small"
              type="link"
              onClick={() => onNavigate('matrix-config')}
              className="text-[#0f172a] font-bold text-xs p-0 flex items-center gap-0.5 hover:text-sky-600"
            >
              Xem tất cả →
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center"><Spin size="small" /></div>
          ) : recentMatrices.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Empty description={<span className="text-xs text-slate-400 font-medium">Chưa có ma trận đề thi nào.</span>}>
                <Button
                  size="small"
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={() => onNavigate('matrix-config')}
                  className="bg-[#0f172a] border-transparent text-white rounded-lg font-bold text-xs"
                >
                  Tạo Ma trận
                </Button>
              </Empty>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMatrices.map((m) => {
                const totalQuestions = m.rows?.reduce((sum, row) => sum + (row.cells?.nhanBiet || 0) + (row.cells?.thongHieu || 0) + (row.cells?.vanDung || 0) + (row.cells?.vanDungCao || 0), 0) || 0;
                return (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-800 text-xs font-black">{m.name}</strong>
                        <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 border font-mono font-bold">{m.code}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                        <span>Môn: <strong className="text-indigo-600 font-extrabold">{m.subject}</strong></span>
                        <span>•</span>
                        <span>Lớp: <strong className="text-purple-600 font-extrabold">{m.grade}</strong></span>
                        <span>•</span>
                        <span>{totalQuestions} câu</span>
                      </div>
                    </div>
                    <Tag color="success" className="rounded-md font-extrabold text-[9px] uppercase m-0 border-transparent">Hoạt động</Tag>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Questions List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <BookOutlined className="text-indigo-600 text-sm" />
              <span className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">Câu hỏi mới thêm</span>
            </div>
            <Button
              size="small"
              type="link"
              onClick={() => onNavigate('question-bank')}
              className="text-indigo-600 font-bold text-xs p-0 flex items-center gap-0.5 hover:text-indigo-500"
            >
              Ngân hàng câu hỏi →
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center"><Spin size="small" /></div>
          ) : recentQuestions.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Empty description={<span className="text-xs text-slate-400 font-medium">Chưa có câu hỏi nào.</span>}>
                <Button
                  size="small"
                  onClick={() => onNavigate('question-bank')}
                  className="rounded-lg font-bold text-xs border-indigo-200 text-indigo-700 bg-transparent hover:bg-indigo-50"
                >
                  Tạo Câu hỏi Mới
                </Button>
              </Empty>
            </div>
          ) : (
            <div className="space-y-3">
              {recentQuestions.map((q) => {
                const statusColor = q.status === 'approved' ? 'success' : q.status === 'pending' ? 'processing' : q.status === 'rejected' ? 'error' : 'default';
                const statusText = q.status === 'approved' ? 'Đã duyệt' : q.status === 'pending' ? 'Chờ duyệt' : q.status === 'rejected' ? 'Từ chối' : 'Bản nháp';
                return (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-800 text-xs font-black truncate max-w-[200px]">{q.text || 'Câu hỏi chưa có nội dung'}</strong>
                        <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 border font-mono font-bold">{q.code}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                        <span>Môn: <strong className="text-indigo-600 font-extrabold">{q.subject}</strong></span>
                        <span>•</span>
                        <span>Người tạo: <strong className="text-amber-600 font-extrabold">{q.creator}</strong></span>
                      </div>
                    </div>
                    <Tag color={statusColor} className="rounded-md font-extrabold text-[9px] uppercase m-0 border-transparent">{statusText}</Tag>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
