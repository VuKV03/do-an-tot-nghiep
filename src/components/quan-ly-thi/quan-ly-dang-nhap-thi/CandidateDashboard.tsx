import React, { useEffect, useState } from 'react';
import { Card, Button, Typography, Spin, message, Badge } from 'antd';
import { BookOutlined, CheckCircleOutlined, PlayCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { SystemUser } from '../../../types';

const { Title, Text } = Typography;

interface SubjectInfo {
  subject: string;
  status: 'available' | 'in_progress' | 'submitted';
}

interface CandidateDashboardProps {
  currentUser: SystemUser;
  onLogout: () => void;
  onStartExam: (subject: string) => void;
}

export default function CandidateDashboard({ currentUser, onLogout, onStartExam }: CandidateDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [startingSubject, setStartingSubject] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableSubjects();
  }, []);

  const fetchAvailableSubjects = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/exam/portal/me/available-subjects?candidate_id=${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSubjects(data.available_subjects || []);
      } else {
        message.error(data.detail || 'Không thể lấy danh sách môn thi.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (subject: string) => {
    setStartingSubject(subject);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/exam/portal/me/start-exam?candidate_id=${currentUser.id}&subject=${encodeURIComponent(subject)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        onStartExam(subject);
      } else {
        message.error(data.detail || 'Không thể bắt đầu ca thi.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối đến máy chủ.');
    } finally {
      setStartingSubject(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex justify-center items-center text-white font-bold text-lg shadow-md">
            {currentUser.fullName?.charAt(0) || 'C'}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-base">{currentUser.fullName}</div>
            <div className="text-xs text-slate-500 font-medium">SBD: {currentUser.username}</div>
          </div>
        </div>
        <Button onClick={onLogout} icon={<LogoutOutlined />} type="text" className="text-slate-600 hover:text-red-600 hover:bg-red-50">
          Đăng xuất
        </Button>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col gap-8">
        <div>
          <Title level={2} className="text-slate-800 m-0">KỲ THI TRỰC TUYẾN</Title>
          <Text className="text-slate-500">Danh sách các bài thi dành cho bạn</Text>
        </div>

        {subjects.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
            <BookOutlined className="text-5xl text-slate-300 mb-4" />
            <Title level={4} className="text-slate-700 mt-0">Không có môn thi nào</Title>
            <Text className="text-slate-500">Hiện tại bạn chưa được gán môn thi nào hoặc các kỳ thi chưa mở.</Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((sub, idx) => (
              <Card
                key={idx}
                className="rounded-2xl shadow-sm hover:shadow-md transition-shadow border-slate-100 overflow-hidden"
                styles={{ body: { padding: 0 } }}
              >
                <div className={`h-2 ${sub.status === 'submitted' ? 'bg-green-500' : sub.status === 'in_progress' ? 'bg-orange-500' : 'bg-blue-600'}`}></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl shadow-sm">
                      <BookOutlined />
                    </div>
                    {sub.status === 'submitted' && <Badge status="success" text="Đã nộp bài" className="font-medium text-xs bg-green-50 px-2 py-1 rounded-full text-green-700" />}
                    {sub.status === 'in_progress' && <Badge status="warning" text="Đang làm bài" className="font-medium text-xs bg-orange-50 px-2 py-1 rounded-full text-orange-700" />}
                    {sub.status === 'available' && <Badge status="processing" text="Sẵn sàng" className="font-medium text-xs bg-blue-50 px-2 py-1 rounded-full text-blue-700" />}
                  </div>
                  <Title level={4} className="text-slate-800 m-0 mb-1">{sub.subject}</Title>
                  <Text className="text-slate-500 block mb-6 text-sm">THỜI GIAN LÀM BÀI:</Text>

                  {sub.status === 'submitted' ? (
                    <Button block disabled icon={<CheckCircleOutlined />} className="h-10 font-medium rounded-lg">
                      Đã hoàn thành
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      block
                      icon={<PlayCircleOutlined />}
                      className={`h-10 font-bold rounded-lg shadow-md hover:shadow-lg transition-all ${sub.status === 'in_progress' ? 'bg-orange-500 hover:bg-orange-400' : 'bg-blue-600 hover:bg-blue-500'}`}
                      loading={startingSubject === sub.subject}
                      onClick={() => handleStart(sub.subject)}
                    >
                      {sub.status === 'in_progress' ? 'TIẾP TỤC THI' : 'VÀO THI'}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
