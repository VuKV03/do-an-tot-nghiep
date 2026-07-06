import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Select, Input, Steps, Tree, Spin, message, Tooltip, Empty, Tag } from 'antd';
import { SearchOutlined, ThunderboltOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd';
import { Question } from '../../../types';
import {
  subjectCategoryApi, gradeLevelApi, topicsApi, bankQuestionApi,
  type SubjectCategoryAPI, type GradeLevelAPI, type TopicAPI, type RandomSelectCellAPI, type RandomSelectResultAPI,
} from '../../../services/danhMucApi';
import { apiGetMatrixConfigDetail, type MaTranData } from '../quan-ly-ma-tran-de/mockData';
import ExamContentDisplay from './ExamContentDisplay';

interface ModalTaoDeTuDongProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

interface ChuDeTreeNode {
  id: string;
  ma: string;
  ten: string;
  children: ChuDeTreeNode[];
}

const buildChuDeTree = (flat: TopicAPI[]): ChuDeTreeNode[] => {
  const map: Record<string, ChuDeTreeNode> = {};
  flat.forEach(t => { map[t.id] = { id: t.id, ma: t.code, ten: t.name, children: [] }; });
  const roots: ChuDeTreeNode[] = [];
  flat.forEach(t => {
    const node = map[t.id];
    if (t.parent_id && map[t.parent_id]) map[t.parent_id].children.push(node);
    else roots.push(node);
  });
  return roots;
};

export default function ModalTaoDeTuDong({ open, onCancel, onSuccess }: ModalTaoDeTuDongProps) {
  const [step, setStep] = useState(0);

  // Bước 1: Môn học + Khối lớp
  const [subjects, setSubjects] = useState<SubjectCategoryAPI[]>([]);
  const [grades, setGrades] = useState<GradeLevelAPI[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);

  // Bước 2: Chủ đề + Tiểu mục
  const [topicTree, setTopicTree] = useState<ChuDeTreeNode[]>([]);
  const [checkedTopicKeys, setCheckedTopicKeys] = useState<React.Key[]>([]);
  const [searchTopic, setSearchTopic] = useState('');
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Bước 3: Ma trận đề
  const [matrices, setMatrices] = useState<any[]>([]);
  const [loadingMatrices, setLoadingMatrices] = useState(false);
  const [selectedMatrixId, setSelectedMatrixId] = useState<string | null>(null);
  const [matrixRows, setMatrixRows] = useState<MaTranData[]>([]);
  const [loadingMatrixDetail, setLoadingMatrixDetail] = useState(false);

  // Bước 4: Sinh đề tự động
  const [generating, setGenerating] = useState(false);
  const [genResults, setGenResults] = useState<RandomSelectResultAPI[]>([]);
  const [genQuestions, setGenQuestions] = useState<Question[]>([]);
  const [examName, setExamName] = useState('');
  const [examCode, setExamCode] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || null;
  const selectedGrade = grades.find(g => g.id === selectedGradeId) || null;
  const selectedMatrix = matrices.find(m => m.id === selectedMatrixId) || null;

  // Reset toàn bộ khi mở modal
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSelectedSubjectId(null); setSelectedGradeId(null);
    setTopicTree([]); setCheckedTopicKeys([]); setSearchTopic('');
    setMatrices([]); setSelectedMatrixId(null); setMatrixRows([]);
    setGenResults([]); setGenQuestions([]); setExamName(''); setExamCode('');
    subjectCategoryApi.list().then(res => setSubjects((res.data || []).filter(s => s.is_active))).catch(() => message.error('Không tải được danh sách môn học.'));
    gradeLevelApi.list().then(res => setGrades((res.data || []).filter(g => g.is_active))).catch(() => message.error('Không tải được danh sách khối lớp.'));
  }, [open]);

  // Bước 2: tải chủ đề theo môn + lớp đã chọn
  useEffect(() => {
    if (!open || step !== 1 || !selectedSubjectId || !selectedGradeId) return;
    setLoadingTopics(true);
    topicsApi.list()
      .then(res => {
        const flat = (res.data || []).filter(t => t.subject_id === selectedSubjectId && t.grade_id === selectedGradeId);
        setTopicTree(buildChuDeTree(flat));
      })
      .catch(() => message.error('Không tải được danh sách chủ đề.'))
      .finally(() => setLoadingTopics(false));
  }, [open, step, selectedSubjectId, selectedGradeId]);

  // Bước 3: tải ma trận đề tương ứng môn đã chọn
  useEffect(() => {
    if (!open || step !== 2 || !selectedSubject) return;
    setLoadingMatrices(true);
    fetch('/api/matrix-configs?page=1&pageSize=200')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const filtered = (json.data || []).filter((m: any) =>
            m.subject === selectedSubject.code || m.subject === selectedSubject.name
          );
          setMatrices(filtered);
        }
      })
      .catch(() => message.error('Không tải được danh sách ma trận đề.'))
      .finally(() => setLoadingMatrices(false));
  }, [open, step, selectedSubjectId]);

  const antTreeData: TreeDataNode[] = useMemo(() => {
    const conv = (nodes: ChuDeTreeNode[]): TreeDataNode[] => nodes.map(n => ({
      key: n.id,
      title: `${n.ma ? n.ma + '. ' : ''}${n.ten}`,
      children: n.children.length ? conv(n.children) : undefined,
    }));
    return conv(topicTree);
  }, [topicTree]);

  const filteredTreeData = useMemo(() => {
    if (!searchTopic.trim()) return antTreeData;
    const q = searchTopic.trim().toLowerCase();
    const filterNodes = (nodes: TreeDataNode[]): TreeDataNode[] => {
      const out: TreeDataNode[] = [];
      nodes.forEach(n => {
        const children = n.children ? filterNodes(n.children) : undefined;
        const match = String(n.title).toLowerCase().includes(q);
        if (match || (children && children.length > 0)) out.push({ ...n, children });
      });
      return out;
    };
    return filterNodes(antTreeData);
  }, [antTreeData, searchTopic]);

  const handleSelectMatrix = async (id: string) => {
    setSelectedMatrixId(id);
    setLoadingMatrixDetail(true);
    try {
      const res = await apiGetMatrixConfigDetail(id);
      if (res.success && res.data) {
        setMatrixRows(res.data.ds_cau_truc || []);
      } else {
        message.error(res.message || 'Không tải được chi tiết ma trận.');
        setMatrixRows([]);
      }
    } finally {
      setLoadingMatrixDetail(false);
    }
  };

  // Chỉ giữ các hàng của ma trận thuộc tiểu mục đã tick ở Bước 2
  const scopedRows = useMemo(
    () => matrixRows.filter(r => checkedTopicKeys.includes(r.don_vi_id)),
    [matrixRows, checkedTopicKeys],
  );

  const mapBankQuestions = async (ids: Set<string>): Promise<Question[]> => {
    const res = await bankQuestionApi.list();
    if (!res.success || !res.data) return [];
    return res.data
      .filter(q => ids.has(q.id))
      .map((q): Question => ({
        id: q.id,
        code: q.code,
        text: q.text,
        type: q.type,
        level: q.level,
        status: q.status,
        subject: q.subject,
        grade: q.grade,
        topicId: q.topicId || '',
        topicName: q.topicName || 'Chưa phân loại',
        subTopicName: q.subTopicName || '',
        options: q.options,
        correctAnswer: q.correctAnswer,
        creator: q.creator,
        createdAt: q.createdAt,
      }));
  };

  const handleGenerate = async () => {
    if (scopedRows.length === 0) return;
    setGenerating(true);
    try {
      const cells: RandomSelectCellAPI[] = scopedRows.flatMap(r =>
        r.ds_loai_cau_hoi
          .filter(c => (c.so_cau || 0) > 0)
          .map(c => ({
            don_vi_id: r.don_vi_id,
            muc_do_id: c.muc_do_id,
            loai_cau_hoi_id: c.loai_cau_hoi_id,
            nang_luc_id: c.nang_luc_id ?? null,
            so_cau: c.so_cau || 0,
          }))
      );
      if (cells.length === 0) {
        message.warning('Ma trận đã chọn không có ô nào yêu cầu số câu trong phạm vi chủ đề đã tick.');
        setGenResults([]); setGenQuestions([]);
        return;
      }
      const res = await bankQuestionApi.randomSelect(cells, selectedGradeId || undefined);
      if (!res.success) { message.error('Lỗi khi sinh câu hỏi tự động.'); return; }
      setGenResults(res.data);
      const ids = new Set(res.data.flatMap(r => r.questionIds));
      if (ids.size === 0) {
        setGenQuestions([]);
        message.warning('Không tìm được câu hỏi nào phù hợp trong Ngân hàng câu hỏi.');
        return;
      }
      setGenQuestions(await mapBankQuestions(ids));
    } catch {
      message.error('Lỗi kết nối khi sinh câu hỏi tự động.');
    } finally {
      setGenerating(false);
    }
  };

  // Tự động sinh ngay khi vào Bước 4
  useEffect(() => {
    if (!open || step !== 3) return;
    void handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const totalRequested = genResults.reduce((s, r) => s + r.requested, 0);
  const totalFound = genResults.reduce((s, r) => s + r.found, 0);
  const underfilledCount = genResults.filter(r => r.found < r.requested).length;

  const handleSaveExam = async () => {
    if (!examName.trim()) { message.error('Vui lòng nhập tên đề thi!'); return; }
    if (genQuestions.length === 0) { message.error('Chưa có câu hỏi nào được sinh để lưu.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: examName,
          code: examCode || undefined,
          subject: selectedSubject?.name,
          grade: selectedGrade?.name,
          duration: selectedMatrix?.duration || 90,
          source: 'manual',
          questionIds: genQuestions.map(q => q.id),
        }),
      });
      const json = await res.json();
      if (json.success) {
        message.success('Đã tạo đề thi tự động thành công!');
        onSuccess();
      } else {
        message.error(json.error || json.message || 'Lỗi khi lưu đề thi.');
      }
    } catch {
      message.error('Lỗi kết nối khi lưu đề thi.');
    } finally {
      setSaving(false);
    }
  };

  const canNextStep0 = !!selectedSubjectId && !!selectedGradeId;
  const canNextStep1 = checkedTopicKeys.length > 0;
  const canNextStep2 = !!selectedMatrixId && scopedRows.length > 0;

  const footer = (() => {
    if (step === 0) {
      return [
        <Button key="cancel" onClick={onCancel} className="rounded font-semibold text-xs">Hủy bỏ</Button>,
        <Button key="next" type="primary" disabled={!canNextStep0} onClick={() => setStep(1)}
          className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]">
          Tiếp tục
        </Button>,
      ];
    }
    if (step === 1) {
      return [
        <Button key="back" onClick={() => setStep(0)} className="rounded font-semibold text-xs">Quay lại</Button>,
        <Button key="next" type="primary" disabled={!canNextStep1} onClick={() => setStep(2)}
          className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]">
          Tiếp tục
        </Button>,
      ];
    }
    if (step === 2) {
      return [
        <Button key="back" onClick={() => setStep(1)} className="rounded font-semibold text-xs">Quay lại</Button>,
        <Button key="next" type="primary" disabled={!canNextStep2} onClick={() => setStep(3)}
          className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]">
          Tiếp tục
        </Button>,
      ];
    }
    return [
      <Button key="back" onClick={() => setStep(2)} disabled={saving} className="rounded font-semibold text-xs">Quay lại</Button>,
      <Button key="regen" icon={<ReloadOutlined />} onClick={handleGenerate} loading={generating} disabled={saving}
        className="rounded font-semibold text-xs">
        Sinh lại
      </Button>,
      <Button key="save" type="primary" icon={<SaveOutlined />} loading={saving} disabled={generating || genQuestions.length === 0}
        onClick={handleSaveExam}
        className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]">
        Lưu đề thi
      </Button>,
    ];
  })();

  return (
    <Modal
      title={
        <div className="border-b pb-2 flex items-center gap-1.5">
          <ThunderboltOutlined className="text-[#1a3c8b]" />
          <span className="font-bold text-sm text-[#1a3c8b] italic">Thêm mới tự động theo ma trận đề</span>
        </div>
      }
      open={open}
      onCancel={() => { if (!generating && !saving) onCancel(); }}
      footer={footer}
      centered
      width={860}
    >
      <div className="pt-3">
        <Steps
          current={step}
          size="small"
          className="mb-6 font-semibold text-xs"
          items={[
            { title: 'Môn học & Khối lớp' },
            { title: 'Chủ đề & Tiểu mục' },
            { title: 'Ma trận đề' },
            { title: 'Đề tự động' },
          ]}
        />

        {step === 0 && (
          <div className="space-y-4 animate-in fade-in duration-300 max-w-md mx-auto py-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Môn học <span className="text-red-500">*</span></label>
              <Select
                placeholder="Chọn môn học" className="w-full text-xs"
                value={selectedSubjectId} onChange={setSelectedSubjectId}
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Khối lớp <span className="text-red-500">*</span></label>
              <Select
                placeholder="Chọn khối lớp" className="w-full text-xs"
                value={selectedGradeId} onChange={setSelectedGradeId}
                options={grades.map(g => ({ value: g.id, label: g.name }))}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <div className="mb-2 text-xs text-slate-500">
              Chủ đề của môn <strong>{selectedSubject?.name}</strong> — khối <strong>{selectedGrade?.name}</strong>
            </div>
            <Input size="small" placeholder="Tìm kiếm chủ đề..." prefix={<SearchOutlined className="text-slate-400" />}
              className="text-xs mb-2" value={searchTopic} onChange={e => setSearchTopic(e.target.value)} allowClear />
            <div className="border border-slate-200 rounded p-2 overflow-y-auto" style={{ maxHeight: 360 }}>
              {loadingTopics ? (
                <div className="py-8 text-center"><Spin /></div>
              ) : antTreeData.length > 0 ? (
                <Tree
                  checkable blockNode
                  treeData={filteredTreeData}
                  checkedKeys={checkedTopicKeys}
                  onCheck={(keys) => setCheckedTopicKeys(Array.isArray(keys) ? keys : keys.checked)}
                  className="text-xs"
                />
              ) : (
                <Empty description="Môn/khối lớp này chưa có chủ đề nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in duration-300">
            <div className="mb-2 text-xs text-slate-500">
              Ma trận đề của môn <strong>{selectedSubject?.name}</strong> — chỉ những tiểu mục đã tick ở Bước 2 sẽ được dùng để sinh đề.
            </div>
            {loadingMatrices ? (
              <div className="py-8 text-center"><Spin /></div>
            ) : matrices.length === 0 ? (
              <Empty description="Chưa có ma trận đề nào cho môn này — vui lòng tạo ma trận trước." />
            ) : (
              <div className="border border-slate-200 rounded divide-y divide-slate-100 overflow-y-auto" style={{ maxHeight: 320 }}>
                {matrices.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMatrix(m.id)}
                    className={`p-3 cursor-pointer text-xs flex items-center justify-between hover:bg-slate-50 ${selectedMatrixId === m.id ? 'bg-blue-50/60' : ''}`}
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{m.name} <span className="text-slate-400 font-mono ml-1">({m.code})</span></div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Tổng {m.totalQuestions || 0} câu · {m.totalScore || 0} điểm · {m.duration || 90} phút</div>
                    </div>
                    <input type="radio" readOnly checked={selectedMatrixId === m.id} className="accent-[#2c3e9e]" />
                  </div>
                ))}
              </div>
            )}
            {loadingMatrixDetail && <div className="py-3 text-center"><Spin size="small" /></div>}
            {selectedMatrixId && !loadingMatrixDetail && scopedRows.length === 0 && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
                Ma trận này không có tiểu mục nào trùng với chủ đề đã chọn ở Bước 2 — vui lòng chọn ma trận khác hoặc quay lại Bước 2 để tick thêm tiểu mục.
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tên đề thi <span className="text-red-500">*</span></label>
                <Input placeholder="Nhập tên đề thi" className="text-xs" value={examName} onChange={e => setExamName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mã đề (tuỳ chọn)</label>
                <Input placeholder="Tự sinh nếu để trống" className="text-xs" value={examCode} onChange={e => setExamCode(e.target.value)} />
              </div>
            </div>

            {generating ? (
              <div className="py-16 text-center">
                <Spin />
                <p className="text-xs text-slate-400 font-semibold mt-2">Đang chọn ngẫu nhiên câu hỏi từ Ngân hàng câu hỏi...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Tag color={underfilledCount > 0 ? 'warning' : 'success'} className="rounded-full font-bold text-[11px] px-3 py-1 border-transparent">
                    Đã chọn {totalFound}/{totalRequested} câu theo ma trận
                  </Tag>
                  {underfilledCount > 0 && (
                    <Tooltip title="Ngân hàng câu hỏi chưa đủ số câu cho một số ô của ma trận (chủ đề/mức độ/loại câu hỏi tương ứng) — có thể bấm Sinh lại hoặc bổ sung thêm câu hỏi vào ngân hàng.">
                      <span className="text-[11px] text-amber-600 font-semibold cursor-help">
                        ⚠ {underfilledCount} ô chưa đủ số câu yêu cầu
                      </span>
                    </Tooltip>
                  )}
                </div>
                <ExamContentDisplay questions={genQuestions} allowEdit={false} />
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
