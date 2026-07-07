import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Cell, ResponsiveContainer } from 'recharts';

interface FormatBarChartProps {
  formatData: {
    name: string;
    count: number;
    fill: string;
  }[];
}

export default function FormatBarChart({ formatData }: FormatBarChartProps) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col overflow-hidden animate-in fade-in">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <span className="w-1.5 h-4 bg-orange-500 rounded-full inline-block" />
        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 my-0">Phân loại theo Mô hình & Loại hình câu hỏi</h4>
      </div>
      <div className="p-5 flex-1 select-none flex flex-col justify-between">
        <div className="h-[220px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formatData}
              layout="vertical"
              margin={{ top: 10, right: 10, left: 30, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 9, fontWeight: 500 }} width={120} />
              <ChartTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {formatData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-slate-400 font-medium leading-normal italic text-center mt-2">
          💡 Thể thức Đúng/Sai cấu trúc mới của Bộ Giáo dục hiện đang tăng trưởng nhanh nhất ở kho dữ liệu.
        </p>
      </div>
    </div>
  );
}
