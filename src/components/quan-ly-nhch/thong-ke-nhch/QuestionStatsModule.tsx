import React, { useState } from 'react';
import { Select } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';

import { Question } from '../../../types';
import { SUBJECTS } from '../../../data';

import StatsOverviewCards from './StatsOverviewCards';
import CognitivePieChart from './CognitivePieChart';
import FormatBarChart from './FormatBarChart';
import ContributorLeaderboard from './ContributorLeaderboard';

interface QuestionStatsModuleProps {
  questions: Question[];
}

export default function QuestionStatsModule({ questions }: QuestionStatsModuleProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('Tất cả');

  // Filter subject
  const currentQuestions = selectedSubject === 'Tất cả' 
    ? questions 
    : questions.filter(q => q.subject === selectedSubject);

  // Math helper for ratios
  const totalCount = currentQuestions.length;
  const approvedCount = currentQuestions.filter(q => q.status === 'approved').length;
  const pendingCount = currentQuestions.filter(q => q.status === 'pending').length;
  const draftCount = currentQuestions.filter(q => q.status === 'draft').length;

  const approvedPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const pendingPercent = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;
  const draftPercent = totalCount > 0 ? Math.round((draftCount / totalCount) * 100) : 0;

  // Breakdown of cognitive levels (base values with dynamic math overrides to reflect realistic state + user edits)
  const nhanBiet = currentQuestions.filter(q => q.level === 'nhan_biet').length;
  const thongHieu = currentQuestions.filter(q => q.level === 'thong_hieu').length;
  const vanDung = currentQuestions.filter(q => q.level === 'van_dung').length;
  const vanDungCao = currentQuestions.filter(q => q.level === 'van_dung_cao').length;

  const levelData = [
    { name: 'Nhận biết', value: nhanBiet, color: '#002147' },
    { name: 'Thông hiểu', value: thongHieu, color: '#1890ff' },
    { name: 'Vận dụng', value: vanDung, color: '#722ed1' },
    { name: 'Vận dụng cao', value: vanDungCao, color: '#f5222d' },
  ];

  // Breakdown of formats (single choice, multiple choice, true_false, short answer)
  const singleChoice = currentQuestions.filter(q => q.type === 'single').length;
  const multipleChoice = currentQuestions.filter(q => q.type === 'multiple').length;
  const trueFalse = currentQuestions.filter(q => q.type === 'true_false').length;
  const shortAnswer = currentQuestions.filter(q => q.type === 'short').length;

  const formatData = [
    { name: 'Trắc nghiệm 1 lựa chọn', count: singleChoice, fill: '#002147' },
    { name: 'Trắc nghiệm nhiều lựa chọn', count: multipleChoice, fill: '#1890ff' },
    { name: 'Trắc nghiệm Đúng/Sai', count: trueFalse, fill: '#13c2c2' },
    { name: 'Tự luận ngắn/Điền khuyết', count: shortAnswer, fill: '#fa8c16' }
  ];

  // Contributor leaderboard mock data reflecting local question authors
  const authors = Array.from(new Set(questions.map(q => q.creator)));
  const leaderboard = authors.map(author => {
    const total = questions.filter(q => q.creator === author).length;
    const approved = questions.filter(q => q.creator === author && q.status === 'approved').length;
    const progress = total > 0 ? Math.round((approved / total) * 100) : 0;
    return {
      key: author,
      author,
      total,
      approved,
      progress
    };
  }).sort((a, b) => b.total - a.total);

  const subjectOptions = [{ value: 'Tất cả', label: 'Tất cả môn học' }, ...SUBJECTS];

  return (
    <div className="space-y-6 pt-2 animate-in fade-in duration-300" id="question-stats-container">
      
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <PieChartOutlined className="text-[#002147] text-lg" />
          <div>
            <h3 className="text-slate-900 font-black text-xs uppercase tracking-wider my-0">Chẩn đoán và phân tích ngân hàng</h3>
            <span className="text-[10px] text-slate-400 font-bold block">Thống kê theo các chiều dữ liệu thực quản lý</span>
          </div>
        </div>

        {/* Filter Selection */}
        <Select
          id="select-stats-subject-picker"
          value={selectedSubject}
          onChange={(val) => setSelectedSubject(val)}
          style={{ width: 180 }}
          className="text-xs font-bold font-sans"
          options={subjectOptions}
          size="middle"
        />
      </div>

      <StatsOverviewCards 
        totalCount={totalCount}
        approvedCount={approvedCount}
        pendingCount={pendingCount}
        draftCount={draftCount}
        approvedPercent={approvedPercent}
        pendingPercent={pendingPercent}
        draftPercent={draftPercent}
      />

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CognitivePieChart levelData={levelData} />
        <FormatBarChart formatData={formatData} />
      </div>

      <ContributorLeaderboard leaderboard={leaderboard} />
    </div>
  );
}
