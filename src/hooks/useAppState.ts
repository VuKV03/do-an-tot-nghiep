import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { Question, MatrixConfig, AuditLog } from '../types';
import { INITIAL_QUESTIONS, INITIAL_MATRICES } from '../data';
import { bankQuestionApi } from '../services/danhMucApi';

export const useAppState = () => {
  const [questions, setQuestions] = useState<Question[]>([]); // Khởi tạo rỗng, sẽ fetch từ DB
  const [matrices, setMatrices] = useState<MatrixConfig[]>([]); // Khởi tạo rỗng, fetch từ API
  const [exams, setExams] = useState<any[]>([]); // Thêm list đề thi
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await bankQuestionApi.list();
        if (res.success && res.data) {
          const mappedQuestions: Question[] = res.data.map((q: any) => ({
            id: q.id,
            code: q.code,
            text: q.text,
            type: q.type,
            level: q.level,
            subject: q.subject,
            grade: q.grade,
            topicId: q.topicId || '',
            topicName: q.topicName || '',
            subTopicName: q.subTopicName || '',
            nangLucId: q.nangLucId || '',
            nangLuc: q.nangLuc || '',
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            creator: q.creator || 'Hệ thống',
            createdAt: q.createdAt || new Date().toISOString(),
            status: q.status,
            feedback: q.feedback
          }));
          
          setQuestions(mappedQuestions);

          // Tạo logs từ dữ liệu thật
          const logs: AuditLog[] = [];


          mappedQuestions.forEach(q => {
            logs.push({
              id: `log-q-${q.id}`,
              user: q.creator,
              action: 'Khởi tạo câu hỏi',
              timestamp: q.createdAt,
              details: `Thêm mới câu hỏi ${q.type === 'single' ? 'trắc nghiệm' : 'tự luận'}: ${q.code} thuộc môn ${q.subject}`
            });

            if (q.status === 'approved') {
              logs.push({
                id: `log-q-app-${q.id}`,
                user: 'Ban giám định chuyên môn',
                action: 'Duyệt câu hỏi',
                timestamp: new Date(new Date(q.createdAt).getTime() + 3600000).toISOString(),
                details: `Phê duyệt thành công câu hỏi ${q.code} đưa vào ngân hàng chính thức.`
              });
            }
          });

          setAuditLogs(logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else {
          toast.error('Không thể tải dữ liệu câu hỏi');
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu câu hỏi:', error);
        toast.error('Lỗi kết nối đến máy chủ');
      }
    };

    const fetchMatrices = async () => {
      try {
        const res = await fetch('https://api.quanlythi.site/api/matrix-configs?page=1&pageSize=1000');
        const data = await res.json();
        if (data.data) {
          const mappedMatrices = data.data.map((m: any) => ({
            id: m._id || m.id,
            code: m.code,
            name: m.name,
            subject: m.subject_id?.name || m.subject || 'N/A',
            grade: m.grade_id?.name || m.grade || 'N/A',
            duration: m.duration || 45,
            totalQuestions: m.total_questions || 0,
            status: m.status || 'draft',
            createdAt: m.createdAt || new Date().toISOString(),
            creator: m.created_by?.username || 'Hệ thống',
            structure: []
          }));
          setMatrices(mappedMatrices);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu ma trận:', error);
      }
    };

    const fetchExams = async () => {
      try {
        const res = await fetch('https://api.quanlythi.site/api/exams');
        const data = await res.json();
        if (data.data) {
          setExams(data.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu đề thi:', error);
      }
    };

    fetchQuestions();
    fetchMatrices();
    fetchExams();
  }, []);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedReviewQuestion, setSelectedReviewQuestion] = useState<Question | null>(null);

  const handleAddQuestion = (q: Question) => {
    setQuestions(prev => [q, ...prev]);
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: 'Hội đồng Khảo thí',
      action: q.creator.includes('AI') ? 'SmartTest AI' : 'Thêm mới câu hỏi',
      timestamp: new Date().toISOString(),
      details: `Đã khởi tạo thành công câu hỏi ${q.code} thuộc môn ${q.subject}.`
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // `silent` — dùng khi nơi gọi đã tự hiện 1 toast cụ thể hơn cho đúng hành động vừa làm (vd "Đã
  // gửi câu hỏi X đi thẩm định!") — tránh bắn thêm toast "Cập nhật thành công" chung chung chồng
  // lên, ra 2 toast cho cùng 1 lần thao tác.
  const handleUpdateQuestion = (q: Question, options?: { silent?: boolean }) => {
    setQuestions(prev => prev.map(item => item.id === q.id ? q : item));
    if (!options?.silent) {
      toast.success(`Cập nhật thành công câu hỏi ${q.code}!`);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleDeleteMatrix = (id: string) => {
    setMatrices(prev => prev.filter(m => m.id !== id));
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: 'Ban chuyên môn',
      action: 'Xóa ma trận đề',
      timestamp: new Date().toISOString(),
      details: `Đã xóa ma trận cấu hình khỏi danh sách.`
    };
    setAuditLogs(prev => [newLog, ...prev]);
    toast.success('Đã gỡ bỏ cấu hình ma trận đề khỏi hệ thống.');
  };

  const handleSaveMatrix = (matrix: MatrixConfig) => {
    setMatrices(prev => {
      const exists = prev.some(m => m.id === matrix.id || m.code === matrix.code);
      if (exists) {
        return prev.map(m => (m.id === matrix.id || m.code === matrix.code) ? matrix : m);
      }
      return [matrix, ...prev];
    });

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: 'Ban chuyên môn',
      action: 'Lưu ma trận đề',
      timestamp: new Date().toISOString(),
      details: `Đã cập nhật thành công cấu hình ma trận đề: ${matrix.name}`
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleOpenReview = (q: Question) => {
    setSelectedReviewQuestion(q);
    setIsReviewOpen(true);
  };

  const handleApproveQuestion = (id: string, feedback: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, status: 'approved', feedback };
      }
      return q;
    }));

    const qItem = questions.find(item => item.id === id);
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: 'Ban giám định chuyên môn',
      action: 'Thẩm định Đạt',
      timestamp: new Date().toISOString(),
      details: `Phê duyệt thành công câu hỏi ${qItem?.code || ''} đưa vào ngân hàng chính thức.`
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleRejectQuestion = (id: string, feedback: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, status: 'draft', feedback };
      }
      return q;
    }));

    const qItem = questions.find(item => item.id === id);
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: 'Ban giám định chuyên môn',
      action: 'Thẩm định Không đạt',
      timestamp: new Date().toISOString(),
      details: `Đã từ chối câu hỏi ${qItem?.code || ''} với nhận xét: "${feedback}"`
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  return {
    questions,
    matrices,
    auditLogs,
    setAuditLogs,
    isReviewOpen,
    setIsReviewOpen,
    selectedReviewQuestion,
    setSelectedReviewQuestion,
    handleAddQuestion,
    handleUpdateQuestion,
    handleDeleteQuestion,
    handleDeleteMatrix,
    handleSaveMatrix,
    handleOpenReview,
    handleApproveQuestion,
    handleRejectQuestion,
    exams,
  };
};
