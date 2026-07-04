import { useState } from 'react';
import { message } from 'antd';
import { Question, MatrixConfig, AuditLog } from '../types';
import { INITIAL_MATRICES, MOCK_AUDIT_LOGS } from '../data';

export const useAppState = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [matrices, setMatrices] = useState<MatrixConfig[]>(INITIAL_MATRICES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);

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

  const handleUpdateQuestion = (q: Question) => {
    setQuestions(prev => prev.map(item => item.id === q.id ? q : item));
    message.success(`Đã cập nhật câu hỏi ${q.code}.`);
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
    message.success('Đã gỡ bỏ cấu hình ma trận đề khỏi hệ thống.');
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
  };
};
