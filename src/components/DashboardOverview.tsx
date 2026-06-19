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
  // Analytical distributions
  const pendingCount = questions.filter(q => q.status === 'pending').length + 18; // base addition for styling
  
  // Real-time fetched exams and packages
  const [exams, setExams] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchLatestData = async () => {
      try {
        const [resExams, resPackages] = await Promise.all([
          fetch('/api/exams'),
          fetch('/api/exams/packages')
        ]);
        const examsData = await resExams.json();
        const packagesData = await resPackages.json();
        if (active) {
          if (examsData.success) {
            setExams(examsData.data);
          }
          if (packagesData.success) {
            setPackages(packagesData.data);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard extended data:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchLatestData();
    return () => {
      active = false;
    };
  }, []);

  const totalQuestionsFormatted = '12,450';
  const totalExamsCount = 340 + exams.length;
  const totalPackagesCount = 24 + packages.length;
  const pendingApprovalsFormatted = String(pendingCount);
  const activeTeachersFormatted = '85';

  // Questions by subject chart
  const subjectData = [
    { name: 'Toán học', 'Đã duyệt': 340, 'Chờ duyệt': 42 },
    { name: 'Ngữ văn', 'Đã duyệt': 190, 'Chờ duyệt': 12 },
    { name: 'Tiếng Anh', 'Đã duyệt': 280, 'Chờ duyệt': 25 },
    { name: 'Vật lí', 'Đã duyệt': 210, 'Chờ duyệt': 19 },
    { name: 'Hóa học', 'Đã duyệt': 180, 'Chờ duyệt': 11 },
    { name: 'Sinh học', 'Đã duyệt': 150, 'Chờ duyệt': 8 },
    { name: 'Lịch sử', 'Đã duyệt': 120, 'Chờ duyệt': 4 },
  ];

  const levelData = [
    { name: 'Nhận biết', value: 3820, color: '#0f172a' },
    { name: 'Thông hiểu', value: 4510, color: '#1890ff' },
    { name: 'Vận dụng', value: 2980, color: '#722ed1' },
    { name: 'Vận dụng cao', value: 1140, color: '#f5222d' },
  ];

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
            <span>+150 câu mới tuần này</span>
          </div>
        </div>

        {/* Card 2: Total Exams Created */}
        <div 
          id="metric-card-total-exams"
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('quan-ly-de-thi-goi-de')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Tuyển đề thi đề xuất</span>
              <span className="text-xl font-black text-slate-900 tracking-tight block mt-1">{totalExamsCount} Đề mẫu</span>
            </div>
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-lg text-sky-600 transition-all group-hover:bg-sky-500 group-hover:text-white">
              <FileDoneOutlined className="transition-all" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[11px] text-sky-600 font-medium select-none">
            <span>Gồm <strong>{exams.length}</strong> đề sinh mẫu từ AI/Ma trận</span>
          </div>
        </div>

        {/* Card 3: New Exam Packages Card */}
        <div 
          id="metric-card-total-packages"
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('quan-ly-de-thi-goi-de')}
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500 transition-all duration-300 group-hover:w-2" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Gói tuyển chọn liên kết</span>
              <span className="text-xl font-black text-slate-900 tracking-tight block mt-1">{totalPackagesCount} Ấn phẩm</span>
            </div>
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-lg text-violet-600 transition-all group-hover:bg-violet-500 group-hover:text-white">
              <GroupOutlined className="transition-all" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[11px] text-violet-600 font-semibold select-none">
            <span>Quản lý dán nhãn & cấp tài nguyên</span>
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
            <span>● 12 Chuyên gia trực tuyến</span>
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

      {/* NEW INTERACTIVE SEGMENT: RECENT EXAMS & PACKAGES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-new-features-row">
        {/* Dynamic Exams List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <FileTextOutlined className="text-[#0f172a] text-sm" />
              <span className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">Mẫu Đề thi mới sinh (Gemini AI)</span>
            </div>
            <Button 
              size="small" 
              type="link" 
              onClick={() => onNavigate('quan-ly-de-thi-goi-de')}
              className="text-[#0f172a] font-bold text-xs p-0 flex items-center gap-0.5 hover:text-sky-600"
            >
              Xem tất cả →
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center"><Spin size="small" /></div>
          ) : exams.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Empty description={<span className="text-xs text-slate-400 font-medium">Chưa có đề thi được tạo đặc tuyển. Hãy dùng Gemini AI để sinh mẫu tự động!</span>}>
                <Button 
                  size="small" 
                  type="primary" 
                  icon={<ThunderboltOutlined />} 
                  onClick={() => onNavigate('quan-ly-de-thi-goi-de')}
                  className="bg-[#0f172a] border-transparent text-white rounded-lg font-bold text-xs"
                >
                  Sinh Đề Ngay
                </Button>
              </Empty>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.slice(0, 3).map((ex) => (
                <div key={ex.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-800 text-xs font-black">{ex.name}</strong>
                      <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 border font-mono font-bold">{ex.code}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                      <span>Môn: <strong className="text-indigo-600 font-extrabold">{ex.subject}</strong></span>
                      <span>•</span>
                      <span>Cấp: <strong className="text-purple-600 font-extrabold">{ex.grade}</strong></span>
                      <span>•</span>
                      <span>{ex.totalQuestions} câu</span>
                      <span>•</span>
                      <span>{ex.duration} phút</span>
                    </div>
                  </div>
                  <Tag color={ex.status === 'active' ? 'success' : 'warning'} className="rounded-md font-extrabold text-[9px] uppercase m-0 border-transparent">{ex.status}</Tag>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Packages List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <GroupOutlined className="text-indigo-600 text-sm" />
              <span className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">Gói Tuyển tập đề mới đóng nhận</span>
            </div>
            <Button 
              size="small" 
              type="link" 
              onClick={() => onNavigate('quan-ly-de-thi-goi-de')}
              className="text-indigo-600 font-bold text-xs p-0 flex items-center gap-0.5 hover:text-indigo-500"
            >
              Kiểm dịch →
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center"><Spin size="small" /></div>
          ) : packages.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Empty description={<span className="text-xs text-slate-400 font-medium">Chưa đóng gói tuyển tập ấn bản đề kiểm tra thử nào.</span>}>
                <Button 
                  size="small" 
                  onClick={() => onNavigate('quan-ly-de-thi-goi-de')}
                  className="rounded-lg font-bold text-xs border-indigo-200 text-indigo-700 bg-transparent hover:bg-indigo-50"
                >
                  Tạo Gói Mới
                </Button>
              </Empty>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.slice(0, 3).map((pkg) => (
                <div key={pkg.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-800 text-xs font-black">{pkg.name}</strong>
                      <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 border font-mono font-bold">{pkg.code}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                      <span>Môn: <strong className="text-indigo-600 font-extrabold">{pkg.subject}</strong></span>
                      <span>•</span>
                      <span>Lớp: <strong className="text-amber-600 font-extrabold">{pkg.grade}</strong></span>
                      <span>•</span>
                      <span>{pkg.examsCount} Đề liên kết</span>
                    </div>
                  </div>
                  <Tag color={pkg.accessType === 'premium' ? 'gold' : 'blue'} className="rounded-md font-extrabold text-[9px] uppercase m-0 border-transparent">{pkg.accessType}</Tag>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Timeline & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-timeline-and-info">
        
        {/* Left: Audit Log (8 cols) */}
        <div 
          id="audit-log-card"
          className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col overflow-hidden"
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <span className="w-1 h-4 bg-[#0f172a] rounded-full inline-block" />
            <div className="flex flex-col">
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900">Nhật ký hoạt động hệ thống</span>
              <span className="text-[10px] text-slate-400 font-medium">Báo cáo theo thời gian thực (Real-time updates)</span>
            </div>
          </div>
          <div className="p-5 flex-1">
            <Timeline 
              mode="start" 
              className="pt-2 pl-3"
              items={auditLogs.map((log) => ({
                color: log.action.includes('Duyệt') ? 'green' : (log.action.includes('Khởi tạo') ? 'blue' : 'gray'),
                content: (
                  <div key={log.id} id={`timeline-item-${log.id}`} className="-mt-1 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-[13px]">{log.user}</span>
                      <Tag color={log.action.includes('Duyệt') ? 'success' : 'processing'} className="text-[10px] px-1.5 py-0 border-transparent">
                        {log.action}
                      </Tag>
                      <span className="text-slate-400 font-medium text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium mt-1 leading-relaxed text-xs">{log.details}</p>
                  </div>
                )
              }))}
            />
          </div>
        </div>

        {/* Right: Quick system notices & AI Assist prompt (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div 
            id="system-notices-card"
            className="rounded-2xl border border-slate-150 shadow-xs bg-gradient-to-br from-indigo-950 to-[#0f172a] text-white p-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-lg mt-0.5">
                <ThunderboltOutlined className="text-yellow-300 animate-bounce" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-extrabold text-[13px] uppercase tracking-wider text-white">SmartTest AI Assist</h4>
                <p className="text-[11px] text-indigo-100 leading-relaxed font-semibold">
                  Hệ thống AI đã nạp đầy đủ cấu hình. Giờ đây bạn có thể sinh đề thi thử chất lượng cao bằng Gemini AI chỉ với vài lựa chọn thông minh.
                </p>
                <button 
                  className="mt-3 bg-white text-[#0f172a] font-black text-[11px] px-3 py-1.5 rounded-lg active:scale-95 transition-all text-center block w-full hover:bg-slate-100 cursor-pointer border-none"
                  onClick={() => onNavigate('quan-ly-de-thi-goi-de')}
                >
                  Vào mô đun Sinh Đề Thi AI →
                </button>
              </div>
            </div>
          </div>

          <div
            id="quick-instruction-card"
            className="rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-1.5 px-5 py-4 border-b border-slate-100">
              <BellOutlined className="text-[#0f172a]" />
              <span className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">Thông báo văn bản</span>
            </div>
            <div className="p-5 text-slate-650 space-y-3 text-xs leading-relaxed font-sans">
              <div className="border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 block">Lịch thanh tra Đề thi học kỳ 2:</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Đăng lúc 09:30 - Ngày 14/06/2026</span>
                <span className="text-[11px] font-medium block mt-1">Toàn bộ ngân hàng đề Toán, Lý, Hóa khối 12 phải hoàn thành thẩm định phê duyệt trước ngày 20/06/2026.</span>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Cập nhật Quy chế Bộ Giáo dục:</span>
                <span className="text-[11px] font-medium block mt-1">Phương pháp cấu trúc ma trận kiểm tra mới bắt đầu áp dụng từ học kỳ 2 năm học này.</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
