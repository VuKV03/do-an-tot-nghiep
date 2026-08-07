import React, { useState } from 'react';
import { Modal, Input, Upload, Button, Tag, Divider } from 'antd';
import { toast } from '../utils/toast';
import { InboxOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { Question } from '../types';
import { RichTextView } from '../utils/htmlContent';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  question: Question | null;
  onApprove: (id: string, feedback: string) => void | Promise<void>;
  onReject: (id: string, feedback: string) => void | Promise<void>;
}

export default function ReviewModal({ visible, onClose, question, onApprove, onReject }: ReviewModalProps) {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);

  if (!question) return null;

  const handleApproveAction = async () => {
    setSubmitting('approve');
    try {
      await onApprove(question.id, feedback);
      toast.success('Đã duyệt câu hỏi thành công!');
      setFeedback('');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Không thể duyệt câu hỏi!');
    } finally {
      setSubmitting(null);
    }
  };

  const handleRejectAction = async () => {
    if (!feedback.trim()) {
      return;
    }
    setSubmitting('reject');
    try {
      await onReject(question.id, feedback);
      toast.error('Đã từ chối duyệt câu hỏi và gửi phản hồi.');
      setFeedback('');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Không thể từ chối câu hỏi!');
    } finally {
      setSubmitting(null);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'approved':
        return <Tag color="success">Đã thẩm định</Tag>;
      case 'pending':
        return <Tag color="warning">Chờ thẩm định</Tag>;
      case 'rejected':
        return <Tag color="error">Từ chối</Tag>;
      case 'draft':
      default:
        return <Tag color="default">Tạo mới</Tag>;
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3" id="modal-header-container">
          <FileTextOutlined className="text-blue-900 text-lg" />
          <span className="text-slate-900 font-extrabold text-base tracking-tight uppercase">Thẩm định thông tin câu hỏi / đề thi</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
      className="p-0 rounded-2xl"
    >
      <div className="space-y-5 pt-3" id="review-modal-body">
        {/* Metadata Info Grid: 2x2 table/grid */}
        <div className="bg-slate-50 border border-slate-150 rounded-xl p-4">
          <h4 className="text-slate-900 font-bold text-xs uppercase mb-3 tracking-wider">Thông tin hồ sơ yêu cầu</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Mã bản ghi:</span>
              <strong className="text-slate-800 font-mono text-[13px] bg-slate-200/60 px-1.5 py-0.5 rounded">{question.code}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Người tạo:</span>
              <strong className="text-slate-800">{question.creator}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Ngày gửi:</span>
              <strong className="text-slate-800">
                {new Date(question.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Trạng thái hiện tại:</span>
              <div>{getStatusTag(question.status)}</div>
            </div>
          </div>
        </div>

        {/* Content Preview Box */}
        <div>
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Nội dung câu hỏi mô phỏng</label>
          <div className="bg-white border border-slate-200 rounded-xl p-4 min-h-[140px] max-h-[220px] overflow-y-auto shadow-inner text-slate-800 text-[13px] leading-relaxed font-sans space-y-4">
            <RichTextView html={question.text} className="font-semibold" />
            
            {/* Options display */}
            {question.options && question.options.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                {question.options.map((opt, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2.5 rounded-lg border text-xs font-medium ${
                      opt === question.correctAnswer || (Array.isArray(question.correctAnswer) && (question.correctAnswer as string[]).includes(opt))
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <RichTextView html={opt} />
                  </div>
                ))}
              </div>
            )}

            {/* Correct answer preview */}
            <div className="border-t border-dashed border-slate-100 pt-3">
              <span className="text-slate-400 text-xs font-medium">Đáp án thẩm định chính thức:</span>
              <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded">
                {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(' | ') : String(question.correctAnswer)}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Field */}
        <div>
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Nhận xét / Đánh giá chất lượng của Hội đồng Thẩm định</label>
          <Input.TextArea
            id="evaluator-feedback-textarea"
            className="rounded-xl border-slate-200 hover:border-slate-300 focus:border-blue-900 focus:shadow-xs text-xs font-medium"
            rows={3}
            placeholder="Ghi nhận xét cụ thể để hỗ trợ người viết câu hỏi cải tiến (bắt buộc nếu từ chối phê duyệt)..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>

        {/* Attachment Dropzone */}
        <div>
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Đính kèm biên bản phê duyệt chính thức / Chữ ký số</label>
          <Upload.Dragger
            id="review-attachment-dropzone"
            name="file"
            multiple={false}
            action="/api/mock-upload"
            onChange={(info) => {
              const { status } = info.file;
              if (status === 'done') {
                toast.success(`${info.file.name} đã được đính kèm thành công vào hồ sơ thẩm định.`);
              }
            }}
            className="bg-slate-50 border-dashed border-slate-250 rounded-xl py-4"
          >
            <p className="ant-upload-drag-icon my-1">
              <InboxOutlined className="text-slate-400 text-3xl" />
            </p>
            <p className="ant-upload-text text-slate-700 font-bold text-xs">Kéo thả file văn bản phê duyệt (.pdf, .docx, .xml) vào đây</p>
            <p className="ant-upload-hint text-slate-400 text-[10px]">Hỗ trợ đính kèm biên bản thẩm định chính thức có chữ ký số của tổ trưởng chuyên môn.</p>
          </Upload.Dragger>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 mt-6" id="modal-footer-container">
          <Button
            className="rounded-lg text-xs font-extrabold bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 cursor-pointer"
            onClick={onClose}
            disabled={submitting !== null}
          >
            Đóng
          </Button>
          <Button
            danger
            className="rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer"
            icon={<CloseCircleOutlined />}
            onClick={handleRejectAction}
            loading={submitting === 'reject'}
            disabled={submitting === 'approve'}
          >
            Chưa đạt yêu cầu / Từ chối
          </Button>
          <Button
            className="rounded-lg text-xs font-extrabold bg-emerald-700 text-white border-transparent hover:bg-emerald-800 flex items-center gap-1 cursor-pointer"
            icon={<CheckCircleOutlined />}
            onClick={handleApproveAction}
            loading={submitting === 'approve'}
            disabled={submitting === 'reject'}
          >
            Đạt yêu cầu / Phê duyệt
          </Button>
        </div>
      </div>
    </Modal>
  );
}
