import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Space, Typography, Tag, Radio, Upload, message, Empty } from 'antd';
import { EditOutlined, DownloadOutlined, SwapOutlined, SearchOutlined, InboxOutlined, SaveOutlined } from '@ant-design/icons';
import ExamContentDisplay from './ExamContentDisplay';
import { INITIAL_QUESTIONS } from '../../../data';

interface ModalDeRiengLeProps {
  open: boolean;
  exam: any;
  onCancel: () => void;
  onSuccess: () => void;
  typeEditGoc?: number;
  typeAdd?: boolean;
}

const { Title, Text } = Typography;

export default function ModalDeRiengLe({
  open,
  exam,
  onCancel,
  onSuccess,
  typeEditGoc = 1,
  typeAdd = false,
}: ModalDeRiengLeProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [swapCounts, setSwapCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  // Similar questions sub-modal state
  const [isSimilarModalOpen, setIsSimilarModalOpen] = useState(false);
  const [currentReplaceIndex, setCurrentReplaceIndex] = useState<number | null>(null);
  const [similarQuestionsPool, setSimilarQuestionsPool] = useState<any[]>([]);

  // Manual import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importCorrectAnswer, setImportCorrectAnswer] = useState('A');
  const [importOptions, setImportOptions] = useState<string[]>(['Option 1', 'Option 2', 'Option 3', 'Option 4']);

  useEffect(() => {
    if (open && exam) {
      setQuestions(exam.questions || []);
      setSwapCounts({});
    }
  }, [open, exam]);

  // Handle auto-swapping/replacing a question
  const handleReplaceQuestion = (index: number, currentQuestion: any) => {
    const currentSwaps = swapCounts[index] || 0;
    if (currentSwaps >= 3) {
      // Over limit, prompt for import
      setCurrentReplaceIndex(index);
      setIsImportModalOpen(true);
      return;
    }

    // Call API or swap locally from similar subjects/levels
    // Let's find a question in INITIAL_QUESTIONS that is NOT in the current exam
    const currentIds = questions.map((q) => q.id);
    const pool = INITIAL_QUESTIONS.filter(
      (q) =>
        q.subject === exam.subject &&
        q.level === currentQuestion.level &&
        !currentIds.includes(q.id)
    );

    if (pool.length === 0) {
      message.warning('Không tìm thấy câu hỏi tương tự khác trong ngân hàng câu hỏi.');
      return;
    }

    const randomQ = pool[Math.floor(Math.random() * pool.length)];
    const updated = [...questions];
    updated[index] = {
      ...randomQ,
      options: Array.isArray(randomQ.options) ? randomQ.options : ['A', 'B', 'C', 'D'],
    };

    setQuestions(updated);
    setSwapCounts({
      ...swapCounts,
      [index]: currentSwaps + 1,
    });
    message.success(`Đã tự động hoán vị đổi nhanh Câu ${index + 1}.`);
  };

  // Handle opening search for similar questions
  const handleFindSimilar = (index: number, currentQuestion: any) => {
    setCurrentReplaceIndex(index);
    const currentIds = questions.map((q) => q.id);
    
    // Find all questions matching subject and difficulty
    const pool = INITIAL_QUESTIONS.filter(
      (q) => q.subject === exam.subject && !currentIds.includes(q.id)
    );

    setSimilarQuestionsPool(pool);
    setIsSimilarModalOpen(true);
  };

  const handleSelectSimilar = (selectedQ: any) => {
    if (currentReplaceIndex !== null) {
      const updated = [...questions];
      updated[currentReplaceIndex] = {
        ...selectedQ,
        options: Array.isArray(selectedQ.options) ? selectedQ.options : ['A', 'B', 'C', 'D'],
      };
      setQuestions(updated);
      setIsSimilarModalOpen(false);
      message.success(`Đã thay thế Câu ${currentReplaceIndex + 1} bằng câu hỏi tương tự được chọn.`);
    }
  };

  // Handle manual question import when swaps run out
  const handleApplyImportedQuestion = () => {
    if (!importText.trim()) {
      message.error('Vui lòng nhập nội dung câu hỏi!');
      return;
    }

    if (currentReplaceIndex !== null) {
      const updated = [...questions];
      updated[currentReplaceIndex] = {
        id: `q-imported-${Date.now()}`,
        text: importText,
        type: 'single',
        level: questions[currentReplaceIndex].level,
        options: [...importOptions],
        correctAnswer: importCorrectAnswer,
      };
      setQuestions(updated);
      setIsImportModalOpen(false);
      setImportText('');
      message.success(`Đã import và cập nhật thành công câu hỏi vào vị trí Câu ${currentReplaceIndex + 1}.`);
    }
  };

  const handleShuffleExam = () => {
    // Permute/shuffle questions
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    message.success('Đã hoán vị ngẫu nhiên thứ tự các câu hỏi trong đề.');
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/exams/${exam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questions.map((q) => ({
            text: q.text,
            type: q.type || 'single',
            level: q.level || 'medium',
            options: q.options || [],
            correctAnswer: q.correctAnswer,
          })),
        }),
      });

      const json = await response.json();
      if (json.success) {
        message.success('Đã lưu các chỉnh sửa của đề thi thành công.');
        onSuccess();
      } else {
        message.error(json.error || 'Lỗi khi lưu.');
      }
    } catch {
      message.error('Lỗi kết nối khi lưu đề.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="border-b pb-2 flex items-center gap-1.5">
          <EditOutlined className="text-[#1a3c8b]" />
          <span className="font-bold text-sm text-[#1a3c8b] italic">
            {typeAdd ? 'Khởi tạo đề thi riêng lẻ mới' : `Chỉnh sửa chi tiết đề thi: ${exam?.name}`}
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="shuffle" type="dashed" onClick={handleShuffleExam} className="rounded font-semibold text-xs">
          Hoán vị đề (Trộn câu)
        </Button>,
        <Button key="cancel" onClick={onCancel} className="rounded font-semibold text-xs">
          Hủy bỏ
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSaveChanges}
          className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]"
        >
          Lưu thay đổi
        </Button>,
      ]}
      centered
      width={800}
    >
      <div className="space-y-4 pt-3">
        {exam && (
          <div className="bg-slate-50 border p-3 rounded-lg flex justify-between items-center text-xs">
            <Space direction="vertical" size={1}>
              <span>
                Đề thi: <strong className="text-slate-700">{exam.name}</strong>
              </span>
              <span>
                Môn: <strong className="text-slate-700">{exam.subject}</strong> | Khối:{' '}
                <strong className="text-slate-700">{exam.grade}</strong>
              </span>
            </Space>
            <span className="font-mono font-bold text-slate-650 bg-white border px-2 py-0.5 rounded">
              {exam.code}
            </span>
          </div>
        )}

        <Alert
          message={
            <span className="font-bold uppercase text-[10px] text-slate-700">
              Chế độ chỉnh sửa đề thi
            </span>
          }
          description={
            <span className="text-[11px] text-slate-500 font-medium">
              Bạn có thể xem trước nội dung câu hỏi, hoán vị/đổi nhanh câu hỏi từ ngân hàng (tối đa 3 lần) hoặc tìm kiếm câu tương đồng.
            </span>
          }
          type="info"
          showIcon
          className="rounded-lg"
        />

        <ExamContentDisplay
          questions={questions}
          allowEdit={true}
          swapCounts={swapCounts}
          maxSwaps={3}
          onReplaceQuestion={handleReplaceQuestion}
          onFindSimilar={handleFindSimilar}
        />

        {/* SUB-MODAL 1: Similar Questions Search */}
        <Modal
          title={
            <span className="font-bold text-sm text-[#1a3c8b] italic">
              Danh sách câu hỏi tương đồng trong ngân hàng
            </span>
          }
          open={isSimilarModalOpen}
          onCancel={() => setIsSimilarModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsSimilarModalOpen(false)} className="rounded font-semibold text-xs">
              Đóng
            </Button>,
          ]}
          width={650}
          centered
        >
          <div className="space-y-3 pt-3 max-h-96 overflow-y-auto pr-1">
            {similarQuestionsPool.length === 0 ? (
              <Empty description="Không có câu hỏi tương tự khác trong ngân hàng." />
            ) : (
              similarQuestionsPool.map((q) => (
                <div
                  key={q.id}
                  className="bg-slate-50 hover:bg-slate-100/70 border rounded-lg p-4 cursor-pointer transition-colors space-y-2"
                  onClick={() => handleSelectSimilar(q)}
                >
                  <div className="flex justify-between items-start">
                    <strong className="text-slate-800 text-xs">{q.text}</strong>
                    <Tag color="blue" className="rounded-md font-bold text-[8px] uppercase m-0">
                      {q.level === 'nhan_biet' ? 'Nhận biết' : 'Thông hiểu'}
                    </Tag>
                  </div>
                  {Array.isArray(q.options) && (
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 font-medium">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx}>
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 font-bold text-right">
                    Đáp án: <span className="text-emerald-600">{q.correctAnswer}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>

        {/* SUB-MODAL 2: Manual Import Question */}
        <Modal
          title={
            <span className="font-bold text-sm text-[#1a3c8b] italic">
              Vượt quá giới hạn! Nhập/Import câu hỏi thủ công
            </span>
          }
          open={isImportModalOpen}
          onCancel={() => setIsImportModalOpen(false)}
          onOk={handleApplyImportedQuestion}
          okText="Chèn câu hỏi"
          cancelText="Hủy bỏ"
          okButtonProps={{ className: 'bg-[#2c3e9e] hover:bg-[#243590] rounded text-xs font-semibold' }}
          cancelButtonProps={{ className: 'rounded text-xs font-semibold' }}
          width={600}
          centered
        >
          <div className="space-y-4 pt-3 text-xs">
            <Alert
              message="Đã hết lượt đổi câu hỏi tự động (Tối đa 3 lần)."
              description="Để đảm bảo tính độc lập và học thuật, vui lòng tự soạn thảo nội dung câu hỏi mới để thay thế tại vị trí này."
              type="warning"
              showIcon
              className="rounded-lg"
            />

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">Nội dung câu hỏi mới</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={3}
                placeholder="Nhập đề bài câu hỏi..."
                className="w-full border rounded p-2.5 font-semibold text-xs text-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {importOptions.map((opt, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Đáp án {String.fromCharCode(65 + idx)}</label>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...importOptions];
                      updated[idx] = e.target.value;
                      setImportOptions(updated);
                    }}
                    className="w-full border rounded px-2.5 py-1.5 font-semibold text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">Đáp án chính xác</label>
              <Radio.Group value={importCorrectAnswer} onChange={(e) => setImportCorrectAnswer(e.target.value)}>
                <Radio value="A">A</Radio>
                <Radio value="B">B</Radio>
                <Radio value="C">C</Radio>
                <Radio value="D">D</Radio>
              </Radio.Group>
            </div>
          </div>
        </Modal>
      </div>
    </Modal>
  );
}
