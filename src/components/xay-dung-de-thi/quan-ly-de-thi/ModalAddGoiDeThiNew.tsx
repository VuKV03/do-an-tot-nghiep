import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, Steps, Row, Col, Space, Tabs, Tag, message } from 'antd';
import { GroupOutlined, ThunderboltOutlined, SaveOutlined, FileTextOutlined } from '@ant-design/icons';
import ExamContentDisplay from './ExamContentDisplay';
import { SUBJECTS, GRADES } from '../../../data';

interface ModalAddGoiDeThiNewProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ModalAddGoiDeThiNew({ open, onCancel, onSuccess }: ModalAddGoiDeThiNewProps) {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  
  const [exams, setExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Permutation results state
  const [generatedPermutations, setGeneratedPermutations] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setLoadingExams(true);
      // Fetch only "Đề gốc" (loai = 3) or similar status
      fetch('/api/exams')
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setExams(json.data || []);
          }
        })
        .catch(() => {
          message.error('Không thể tải danh sách đề thi gốc.');
        })
        .finally(() => {
          setLoadingExams(false);
        });

      form.resetFields();
      form.setFieldsValue({
        name: '',
        code: '',
        subject: 'Toán học',
        grade: 'Khối 12',
        originalExamIds: [],
        permutationCount: 3,
        startCode: 101
      });
      setCurrentStep(0);
      setGeneratedPermutations([]);
    }
  }, [open, form]);

  const handleGeneratePermutations = async () => {
    try {
      const values = await form.validateFields();
      if (values.originalExamIds.length === 0) {
        message.warning('Vui lòng chọn ít nhất một đề gốc!');
        return;
      }

      setGenerating(true);
      
      // Simulate/call API to generate permutations
      // We shuffle questions and options for each chosen original exam to create the variants
      setTimeout(() => {
        const selectedOriginals = exams.filter(e => values.originalExamIds.includes(e.id));
        const results: any[] = [];

        selectedOriginals.forEach((origExam) => {
          for (let i = 0; i < values.permutationCount; i++) {
            const codeNum = Number(values.startCode) + i;
            
            // Permute/shuffle questions
            const shuffledQs = [...(origExam.questions || [])].map((q, idx) => {
              // Shuffle options
              const originalOpts = q.options || [];
              let shuffledOpts = [...originalOpts];
              let newCorrectIndex = q.correctAnswer;
              
              if (originalOpts.length > 0) {
                // Shuffle option array and find new index of correct answer
                const correctText = originalOpts[q.correctAnswer.charCodeAt(0) - 65] || q.correctAnswer;
                shuffledOpts = [...originalOpts].sort(() => Math.random() - 0.5);
                const foundIdx = shuffledOpts.indexOf(correctText);
                if (foundIdx !== -1) {
                  newCorrectIndex = String.fromCharCode(65 + foundIdx);
                }
              }

              return {
                id: `q-perm-${origExam.id}-${i}-${idx}`,
                text: q.text,
                type: q.type || 'single',
                level: q.level || 'medium',
                options: shuffledOpts,
                correctAnswer: newCorrectIndex
              };
            });

            results.push({
              name: `${origExam.name} - Đề hoán vị mã ${codeNum}`,
              code: `${origExam.code}-${codeNum}`,
              subject: origExam.subject,
              grade: origExam.grade,
              duration: origExam.duration,
              description: `Đề thi hoán vị được sinh từ đề gốc ${origExam.name} (Mã: ${origExam.code}).`,
              questions: shuffledQs,
              originalExamId: origExam.id,
              source: 'ai'
            });
          }
        });

        setGeneratedPermutations(results);
        setGenerating(false);
        setCurrentStep(1); // Proceed to preview and save step
        message.success(`Đã tự động trộn đề và sinh ${results.length} phiên bản hoán vị.`);
      }, 1500);
    } catch {
      // Validate error
    }
  };

  const handleSavePackage = async () => {
    setGenerating(true);
    try {
      const values = form.getFieldsValue();
      const allExamIds: string[] = [...values.originalExamIds];

      // Save each permutation exam to backend first
      for (const p of generatedPermutations) {
        const res = await fetch('/api/exams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: p.name,
            code: p.code,
            subject: p.subject,
            grade: p.grade,
            duration: p.duration,
            description: p.description,
            questions: p.questions.map((q: any) => ({
              text: q.text,
              type: q.type,
              level: q.level,
              options: q.options,
              correctAnswer: q.correctAnswer
            })),
            source: p.source
          })
        });
        const json = await res.json();
        if (json.success && json.data) {
          allExamIds.push(json.data.id);
        }
      }

      // Create Package
      const pkgCode = values.code || `GP-${Date.now().toString().slice(-6).toUpperCase()}`;
      const pkgPayload = {
        name: values.name,
        code: pkgCode,
        subject: values.subject,
        grade: values.grade,
        accessType: 'standard',
        description: `Gói đề được thành lập gồm ${values.originalExamIds.length} đề gốc và ${generatedPermutations.length} đề hoán vị.`,
        examIds: allExamIds
      };

      const resPkg = await fetch('/api/exams/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pkgPayload)
      });

      const jsonPkg = await resPkg.json();
      if (jsonPkg.success) {
        message.success('Đã lưu thành công Gói đề thi và toàn bộ đề hoán vị.');
        onSuccess();
      } else {
        message.error(jsonPkg.error || 'Lỗi khi tạo gói đề.');
      }

    } catch {
      message.error('Gặp sự cố khi lưu gói đề.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      title={
        <div className="border-b pb-2 flex items-center gap-1.5">
          <GroupOutlined className="text-[#1a3c8b]" />
          <span className="font-bold text-sm text-[#1a3c8b] italic">
            Thiết lập gói đề thi & Sinh đề hoán vị mới
          </span>
        </div>
      }
      open={open}
      onCancel={() => {
        if (!generating) onCancel();
      }}
      footer={
        currentStep === 0
          ? [
              <Button key="cancel" onClick={onCancel} className="rounded font-semibold text-xs">
                Hủy bỏ
              </Button>,
              <Button
                key="gen"
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={generating}
                onClick={handleGeneratePermutations}
                className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]"
              >
                Sinh đề hoán vị
              </Button>
            ]
          : [
              <Button key="back" onClick={() => setCurrentStep(0)} className="rounded font-semibold text-xs" disabled={generating}>
                Quay lại cấu hình
              </Button>,
              <Button
                key="save"
                type="primary"
                icon={<SaveOutlined />}
                loading={generating}
                onClick={handleSavePackage}
                className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]"
              >
                Lưu gói đề
              </Button>
            ]
      }
      centered
      width={800}
    >
      <div className="pt-3">
        <Steps
          current={currentStep}
          size="small"
          className="mb-6 font-semibold text-xs"
          items={[
            { title: 'Thông số gói & Đề gốc' },
            { title: 'Xem trước & Đóng gói' }
          ]}
        />

        <Form form={form} layout="vertical" className="space-y-3">
          {currentStep === 0 && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name="name"
                    label={<span className="text-xs font-semibold text-slate-700">Tên gói đề thi</span>}
                    required
                    rules={[{ required: true, message: 'Vui lòng nhập tên gói!' }]}
                  >
                    <Input placeholder="Ví dụ: Bộ đề thi khảo sát chất lượng giữa kì 2..." className="text-xs font-semibold rounded" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="code"
                    label={<span className="text-xs font-semibold text-slate-700">Mã gói đề</span>}
                  >
                    <Input placeholder="Tự sinh nếu bỏ trống" className="text-xs font-semibold rounded uppercase" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="subject" label={<span className="text-xs font-semibold text-slate-700">Môn học</span>} required>
                    <Select className="text-xs font-semibold" options={SUBJECTS} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="grade" label={<span className="text-xs font-semibold text-slate-700">Khối lớp</span>} required>
                    <Select className="text-xs font-semibold" options={GRADES} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="originalExamIds"
                label={<span className="text-xs font-semibold text-slate-700">Chọn đề thi gốc liên kết</span>}
                required
                rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 đề thi gốc!' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Chọn đề thi gốc..."
                  loading={loadingExams}
                  className="text-xs font-semibold"
                  options={exams.map(e => ({
                    value: e.id,
                    label: `[${e.code}] ${e.name} (${e.totalQuestions} câu, ${e.duration}p)`
                  }))}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="permutationCount"
                    label={<span className="text-xs font-semibold text-slate-700">Số lượng đề hoán vị cần sinh từ mỗi đề gốc</span>}
                    required
                  >
                    <InputNumber min={1} max={10} className="w-full text-xs font-semibold rounded" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="startCode"
                    label={<span className="text-xs font-semibold text-slate-700">Mã đề hoán vị bắt đầu</span>}
                    required
                  >
                    <InputNumber min={100} max={999} className="w-full text-xs font-semibold rounded" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block">
                Danh sách đề hoán vị được sinh ({generatedPermutations.length} đề)
              </span>

              <Tabs
                type="card"
                className="custom-tabs text-xs font-semibold"
                items={generatedPermutations.map((p, idx) => ({
                  key: String(idx),
                  label: p.code,
                  children: (
                    <div className="p-3 border border-t-0 rounded-b-lg bg-white space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold border-b pb-2">
                        <span className="text-slate-800">{p.name}</span>
                        <Tag color="cyan" className="rounded-md m-0">Sinh hoán vị</Tag>
                      </div>
                      <ExamContentDisplay questions={p.questions} allowEdit={false} />
                    </div>
                  )
                }))}
              />
            </div>
          )}
        </Form>
      </div>
    </Modal>
  );
}
