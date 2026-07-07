import React from 'react';
import { Tag, Progress } from 'antd';

interface StatsOverviewCardsProps {
  totalCount: number;
  approvedCount: number;
  pendingCount: number;
  draftCount: number;
  approvedPercent: number;
  pendingPercent: number;
  draftPercent: number;
}

export default function StatsOverviewCards({
  totalCount,
  approvedCount,
  pendingCount,
  draftCount,
  approvedPercent,
  pendingPercent,
  draftPercent,
}: StatsOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Approved Stats Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-emerald-700/80 font-bold uppercase text-[10px] tracking-wider block">Hoàn thành Thẩm định (Đã duyệt)</span>
          <Tag color="success" className="text-[10px] uppercase font-bold m-0 border-none shrink-0">Đạt chuẩn</Tag>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-black text-slate-900 tracking-tight">{approvedCount}</span>
          <span className="text-xs text-slate-400 font-semibold">/ {totalCount} câu gốc</span>
        </div>
        <Progress percent={approvedPercent} strokeColor="#52c41a" railColor="#f5f5f5" size="small" showInfo />
      </div>

      {/* Pending Stats Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-amber-700/80 font-bold uppercase text-[10px] tracking-wider block">Yêu cầu Thẩm định mới (Chờ duyệt)</span>
          <Tag color="warning" className="text-[10px] uppercase font-bold m-0 border-none shrink-0">Chờ duyệt</Tag>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-black text-slate-900 tracking-tight">{pendingCount}</span>
          <span className="text-xs text-slate-400 font-semibold">/ {totalCount} câu gốc</span>
        </div>
        <Progress percent={pendingPercent} strokeColor="#faad14" railColor="#f5f5f5" size="small" showInfo />
      </div>

      {/* Draft Stats Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">Bản nháp & Trả về chưa đạt</span>
          <Tag color="default" className="text-[10px] uppercase font-bold m-0 border-none shrink-0">Chờ bổ sung</Tag>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-black text-slate-900 tracking-tight">{draftCount}</span>
          <span className="text-xs text-slate-400 font-semibold">/ {totalCount} câu gốc</span>
        </div>
        <Progress percent={draftPercent} strokeColor="#bfbfbf" railColor="#f5f5f5" size="small" showInfo />
      </div>
    </div>
  );
}
