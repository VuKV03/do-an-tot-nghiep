import React from 'react';
import { Table, Progress } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

interface ContributorLeaderboardProps {
  leaderboard: {
    key: string;
    author: string;
    total: number;
    approved: number;
    progress: number;
  }[];
}

export default function ContributorLeaderboard({ leaderboard }: ContributorLeaderboardProps) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden" id="leaderboard-ranking-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <span className="w-1.5 h-4 bg-blue-900 rounded-full inline-block" />
        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 my-0">Bảng vàng Đóng góp & Thẩm định chất lượng</h4>
      </div>
      
      <Table
        id="stats-leaderboard-ranking-table"
        dataSource={leaderboard}
        pagination={false}
        size="middle"
        className="text-xs border-none"
        columns={[
          {
            title: <span className="font-bold text-[11px] uppercase tracking-wider">Họ và tên tác giả</span>,
            dataIndex: 'author',
            key: 'author',
            render: (text) => (
              <div className="flex items-center gap-2 py-0.5">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 uppercase premium-text text-[11px]">
                  {text.split(' ').pop()?.substring(0, 2)}
                </div>
                <div>
                  <span className="font-extrabold text-slate-800 block text-xs">{text}</span>
                  <span className="text-[10px] text-slate-400 block font-medium">Ban chuyên môn khảo thí</span>
                </div>
              </div>
            )
          },
          {
            title: <span className="font-bold text-[11px] uppercase tracking-wider">Tổng câu đã soạn</span>,
            dataIndex: 'total',
            key: 'total',
            render: (count) => <strong className="text-slate-800 font-extrabold text-xs">{count} câu</strong>
          },
          {
            title: <span className="font-bold text-[11px] uppercase tracking-wider">Câu được phê duyệt</span>,
            dataIndex: 'approved',
            key: 'approved',
            render: (count) => (
              <div className="flex items-center gap-1.5">
                <CheckCircleOutlined className="text-emerald-500" />
                <span className="font-bold text-slate-700 text-xs">{count} câu</span>
              </div>
            )
          },
          {
            title: <span className="font-bold text-[11px] uppercase tracking-wider">Tỉ lệ chất lượng</span>,
            dataIndex: 'progress',
            key: 'progress',
            render: (percent) => (
              <div className="flex items-center gap-2 w-full max-w-xs">
                <Progress percent={percent} strokeColor="#1890ff" railColor="#f3f4f6" size="small" style={{ margin: 0 }} />
              </div>
            )
          }
        ]}
      />
    </div>
  );
}
