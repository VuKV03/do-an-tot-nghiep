import React from 'react';
import { PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

interface CognitivePieChartProps {
  levelData: {
    name: string;
    value: number;
    color: string;
  }[];
}

export default function CognitivePieChart({ levelData }: CognitivePieChartProps) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <span className="w-1.5 h-4 bg-purple-600 rounded-full inline-block" />
        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 my-0">Phân bố Câu hỏi theo Cấp độ Nhận thức</h4>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="h-[200px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={levelData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
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
        
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          {levelData.map((lvl) => (
            <div key={lvl.name} className="flex flex-col items-start p-2 hover:bg-slate-50 rounded-lg">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lvl.color }} />
                {lvl.name}
              </span>
              <span className="text-xs font-black text-slate-800 pl-3 mt-0.5">{lvl.value.toLocaleString()} câu</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
