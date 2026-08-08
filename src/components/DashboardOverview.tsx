import React, { useState, useEffect } from 'react';
import { Question, MatrixConfig, AuditLog } from '../types';
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

const renderCognitivePieLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, value, name, fill } = props;
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  const sx = cx + (outerRadius + 2) * cos;
  const sy = cy + (outerRadius + 2) * sin;
  const mx = cx + (outerRadius + 10) * cos;
  const my = cy + (outerRadius + 10) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 12;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';
  const xOffset = cos >= 0 ? 3 : -3;

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.2} />
      <text
        x={ex + xOffset}
        y={ey - 3}
        textAnchor={textAnchor}
        fill="#0f172a"
        fontSize={11}
        fontWeight="600"
      >
        {name}
      </text>
      <text
        x={ex + xOffset}
        y={ey + 10}
        textAnchor={textAnchor}
        fill="#334155"
        fontSize={11}
        fontWeight="400"
      >
        {value.toLocaleString()} câu
      </text>
    </g>
  );
};

interface DashboardOverviewProps {
  questions: Question[];
  matrices: MatrixConfig[];
  auditLogs: AuditLog[];
  exams?: any[];
  onNavigate: (tab: 'question-bank' | 'matrix-config' | 'quan-ly-de-thi-goi-de', subTab?: string) => void;
}

export default function DashboardOverview({ questions, matrices, auditLogs, exams = [], onNavigate }: DashboardOverviewProps) {
  // Compute metrics from actual questions data
  const totalQuestionsFormatted = questions.length.toLocaleString();
  const pendingCount = questions.filter(q => q.status === 'pending').length;
  const pendingApprovalsFormatted = pendingCount.toLocaleString();

  const pendingMatrixCount = matrices.filter(m => m.status === 'pending').length;
  const pendingMatrixFormatted = pendingMatrixCount.toLocaleString();

  const totalExamsCount = exams.length;

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
  // Cấp độ tư duy là thang có THỨ TỰ (Nhận biết < Thông hiểu < Vận dụng < Vận dụng cao — độ khó
  // tăng dần), không phải 4 phạm trù độc lập — nên dùng 1 dải màu tăng dần (sequential ramp, cùng
  // tông xanh dương thương hiệu #002147/#1d4ed8) thay vì 4 màu rời rạc không liên quan. Nhạt = dễ,
  // đậm = khó, người xem đọc được ngay ý nghĩa thứ bậc chỉ qua sắc độ.
  const levelCounts = {
    'nhan_biet': { name: 'Nhận biết', value: 0, color: '#93c5fd' },
    'thong_hieu': { name: 'Thông hiểu', value: 0, color: '#3b82f6' },
    'van_dung': { name: 'Vận dụng', value: 0, color: '#1d4ed8' },
    'van_dung_cao': { name: 'Vận dụng cao', value: 0, color: '#1e3a8a' },
  };
  questions.forEach(q => {
    if (levelCounts[q.level as keyof typeof levelCounts]) {
      levelCounts[q.level as keyof typeof levelCounts].value++;
    }
  });
  const levelData = Object.values(levelCounts).filter(l => l.value > 0);
  const totalCognitiveQuestions = levelData.reduce((acc, curr) => acc + curr.value, 0);

  // Generate recent matrices and questions for the recent activities section
  const recentMatrices = [...matrices].reverse().slice(0, 5);
  const totalMatricesCount = matrices.length;

  const recentQuestions = [...questions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const loading = false;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newQuestionsThisWeek = questions.filter(q => new Date(q.createdAt) >= oneWeekAgo).length;

  return (
    <div className="space-y-3.5 select-none relative" id="dashboard-container">
      {/* Background Ambient Orbs for Glassmorphism Depth */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-60 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-xl border border-white/10 text-white px-5 py-3.5 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 backdrop-blur-md">
              Thời gian
            </span>
            <span className="text-[11px] text-slate-300 font-medium">• {now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            BẢNG TỔNG QUAN ĐIỀU KHIỂN
          </h1>
          <p className="text-[11px] text-slate-300 mt-0.5 max-w-xl font-normal leading-tight">
            Giám sát thời gian thực số lượng câu hỏi, cấu hình ma trận đề và tiến độ thẩm định trên toàn hệ thống.
          </p>
        </div>
      </div>

      {/* Dynamic Metric Cards Grid - Glassmorphism style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">

        {/* Card 1: Tổng câu hỏi hệ thống */}
        <div
          id="metric-card-total-questions"
          className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:bg-white/80 transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('question-bank')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Tổng câu hỏi hệ thống</span>
              <span className="text-xl font-black text-slate-900 tracking-tight block mt-0.5">{totalQuestionsFormatted}</span>
            </div>
            <div className="w-9 h-9 bg-slate-900/10 backdrop-blur-md rounded-xl flex items-center justify-center text-base text-slate-900 transition-all group-hover:bg-slate-900 group-hover:text-white shadow-sm border border-slate-900/10">
              <BookOutlined />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold">
            <ArrowUpOutlined className="text-[9px]" />
            <span>+{newQuestionsThisWeek} câu mới tuần này</span>
          </div>
        </div>

        {/* Card 2: Câu hỏi đã duyệt — dùng lục/emerald (thành công) xuyên suốt trang: đây là màu
            DUY NHẤT mang nghĩa "đã thẩm định/đạt", khớp với cột "Đã duyệt" ở biểu đồ cột bên dưới. */}
        <div
          id="metric-card-approved-questions"
          className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:bg-white/80 transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('question-bank')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Câu hỏi đã duyệt</span>
              <span className="text-xl font-black text-slate-900 tracking-tight block mt-0.5">{questions.filter(q => q.status === 'approved').length.toLocaleString()}</span>
            </div>
            <div className="w-9 h-9 bg-emerald-500/10 backdrop-blur-md rounded-xl flex items-center justify-center text-base text-emerald-600 transition-all group-hover:bg-emerald-600 group-hover:text-white shadow-sm border border-emerald-500/20">
              <AuditOutlined />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Chất lượng đạt chuẩn</span>
          </div>
        </div>

        {/* Card 3: Cấu hình Ma trận — cùng họ xanh dương thương hiệu (#002147/#1d4ed8) với Card 1 &
            4: cả 3 đều là số liệu TỔNG/trung tính, không phải trạng thái duyệt — sky là sắc nhạt hơn
            trong cùng họ blue, không lẫn với lục (đã duyệt)/hổ phách (chờ thẩm định). */}
        <div
          id="metric-card-total-matrices"
          className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:bg-white/80 transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('matrix-config')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Cấu hình Ma trận</span>
              <span className="text-xl font-black text-slate-900 tracking-tight block mt-0.5">{totalMatricesCount} <span className="text-xs font-bold text-slate-500">Ma trận</span></span>
            </div>
            <div className="w-9 h-9 bg-sky-500/10 backdrop-blur-md rounded-xl flex items-center justify-center text-base text-sky-600 transition-all group-hover:bg-sky-500 group-hover:text-white shadow-sm border border-sky-500/20">
              <FileDoneOutlined />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-sky-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
            <span>Sẵn sàng sinh đề AI</span>
          </div>
        </div>

        {/* Card 4: Tổng số đề đã tạo — cũng là số liệu tổng/trung tính, nên đổi từ lục (dễ hiểu
            nhầm là "đã duyệt", trùng nghĩa Card 2) sang chàm/indigo — vẫn họ xanh dương thương hiệu,
            khác sắc rõ với Card 1 (navy đậm) và Card 3 (sky nhạt) để phân biệt 3 ô tổng với nhau. */}
        <div
          id="metric-card-total-exams"
          className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:bg-white/80 transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('quan-ly-de-thi-goi-de')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Tổng số đề đã tạo</span>
              <span className="text-xl font-black text-slate-900 tracking-tight block mt-0.5">{totalExamsCount.toLocaleString()} <span className="text-xs font-bold text-slate-500">Đề</span></span>
            </div>
            <div className="w-9 h-9 bg-indigo-500/10 backdrop-blur-md rounded-xl flex items-center justify-center text-base text-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white shadow-sm border border-indigo-500/20">
              <GroupOutlined />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-indigo-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
            <span>Đã đóng gói đề thi</span>
          </div>
        </div>

        {/* Card 5: Chờ thẩm định (Câu hỏi) */}
        <div
          id="metric-card-pending-questions"
          className="bg-amber-500/10 backdrop-blur-xl border border-amber-300/40 rounded-xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:bg-amber-500/15 transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('question-bank', 'review')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-amber-900/80 font-bold uppercase text-[9px] tracking-wider block">Chờ thẩm định (Câu hỏi)</span>
              <span className="text-xl font-black text-amber-950 tracking-tight block mt-0.5">{pendingApprovalsFormatted}</span>
            </div>
            <div className="w-9 h-9 bg-amber-500/20 backdrop-blur-md rounded-xl flex items-center justify-center text-base text-amber-600 transition-all group-hover:bg-amber-500 group-hover:text-white shadow-sm border border-amber-500/30">
              <FileTextOutlined className="animate-pulse" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-700 font-bold">
            <span className="px-1.5 py-0.5 rounded-md bg-amber-200/70 text-amber-900 text-[9px]">⚠️ Cần duyệt</span>
          </div>
        </div>

        {/* Card 6: Chờ thẩm định (Ma trận) — cùng nghĩa "chờ duyệt" như Card 5 nên PHẢI cùng họ màu
            hổ phách/amber (trước đây dùng đỏ hồng/rose — vốn mang nghĩa "lỗi/từ chối", khiến người
            xem hiểu nhầm ma trận đang bị từ chối thay vì đang chờ xử lý). Đổi sang orange — vẫn
            trong dải ấm/cảnh báo như amber, chỉ đậm/lệch tông hơn để phân biệt "Câu hỏi" và "Ma
            trận" mà không phá vỡ ý nghĩa "đang chờ" chung của cả 2 thẻ. */}
        <div
          id="metric-card-pending-matrices"
          className="bg-orange-500/10 backdrop-blur-xl border border-orange-300/40 rounded-xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:bg-orange-500/15 transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('matrix-config', 'evaluation')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-orange-900/80 font-bold uppercase text-[9px] tracking-wider block">Chờ thẩm định (Ma trận)</span>
              <span className="text-xl font-black text-orange-950 tracking-tight block mt-0.5">{pendingMatrixFormatted}</span>
            </div>
            <div className="w-9 h-9 bg-orange-500/20 backdrop-blur-md rounded-xl flex items-center justify-center text-base text-orange-600 transition-all group-hover:bg-orange-500 group-hover:text-white shadow-sm border border-orange-500/30">
              <AuditOutlined className="animate-pulse" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-orange-700 font-bold">
            <span className="px-1.5 py-0.5 rounded-md bg-orange-200/70 text-orange-900 text-[9px]">⚠️ Cần duyệt</span>
          </div>
        </div>

      </div>

      {/* Main Charts Section - Glassmorphism cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5" id="dashboard-charts-layout">

        {/* Left Side: Recharts Bar Chart (8 cols) */}
        <div
          id="questions-by-subject-chart-card"
          className="lg:col-span-8 rounded-xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 bg-white/40">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                Phân bố câu hỏi theo Môn học và Trạng thái
              </h3>
            </div>
            <Badge count={`${subjectData.length} Môn học`} style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '10px' }} />
          </div>

          <div className="p-3 flex-1 select-none">
            <div className="h-[210px] w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart
                  data={subjectData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.8)',
                      boxShadow: '0 8px 20px -5px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                  />
                  {/* Màu 2 cột khớp đúng ngữ nghĩa "đã duyệt"/"chờ duyệt" đang dùng ở thẻ số liệu
                      phía trên (lục = đã duyệt, hổ phách = chờ duyệt) — trước đây dùng xanh dương
                      cho "Đã duyệt" trong khi thẻ Card 2 lại dùng tím, hai nơi cùng 1 ý nghĩa nhưng
                      lệch màu nhau. */}
                  <Bar
                    dataKey="Đã duyệt"
                    fill="#059669"
                    radius={[5, 5, 0, 0]}
                    barSize={32}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="Chờ duyệt"
                    fill="#f59e0b"
                    radius={[5, 5, 0, 0]}
                    barSize={32}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Side: Recharts Pie Chart of Cognitive Levels (4 cols) */}
        <div
          id="cognitive-levels-pie-chart-card"
          className="lg:col-span-4 rounded-xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 bg-white/40">
            <div className="flex items-center gap-2">
              {/* Chấm tiêu đề đổi từ tím sang xanh dương để khớp dải màu sequential mới của pie
                  chart bên dưới (trước đây tím nhưng biểu đồ lại không có lát cắt nào màu tím). */}
              <span className="w-1.5 h-4 bg-blue-700 rounded-full inline-block" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                Cấp độ tư duy
              </h3>
            </div>
          </div>

          <div className="p-2 flex-1 flex items-center justify-center select-none min-h-[210px]">
            <div className="h-[200px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                  <Pie
                    data={levelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    label={renderCognitivePieLabel}
                    labelLine={false}
                    isAnimationActive={true}
                  >
                    {levelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <ChartTooltip contentStyle={{ fontSize: 11, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)' }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Total count displayed inside center of donut chart */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {totalCognitiveQuestions.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Câu hỏi</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

