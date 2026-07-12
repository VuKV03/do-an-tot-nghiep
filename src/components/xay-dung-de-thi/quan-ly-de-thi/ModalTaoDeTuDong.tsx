import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Select, Input, Steps, Tree, Spin, message, Tooltip, Empty, Tag, Segmented, Radio, Switch } from 'antd';
import { SearchOutlined, ThunderboltOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd';
import { Question, CognitiveLevel } from '../../../types';
import {
  subjectCategoryApi, gradeLevelApi, topicsApi, bankQuestionApi, subjectConfigApi, questionTypeApi, questionApi,
  type SubjectCategoryAPI, type GradeLevelAPI, type TopicAPI, type RandomSelectCellAPI, type RandomSelectResultAPI,
  type SubjectConfigAPI, type QuestionTypeAPI,
} from '../../../services/danhMucApi';
import { apiGetMatrixConfigDetail, type MaTranData } from '../quan-ly-ma-tran-de/mockData';
import ExamContentDisplay from './ExamContentDisplay';

interface ModalTaoDeTuDongProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

type SourceMode = 'matrix' | 'ai_config';

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

// Tỉ lệ độ khó gửi cho AI service ứng với 1 mức độ tư duy cụ thể (ép 100% về đúng mức đó,
// giống cách "Ngân hàng câu hỏi" > Sinh bằng AI đang làm — không dựa vào field `level` AI tự trả về).
const LEVEL_PERCENT: Record<CognitiveLevel, { easyPercent: number; mediumPercent: number; hardPercent: number }> = {
  nhan_biet: { easyPercent: 100, mediumPercent: 0, hardPercent: 0 },
  thong_hieu: { easyPercent: 0, mediumPercent: 100, hardPercent: 0 },
  van_dung: { easyPercent: 0, mediumPercent: 0, hardPercent: 100 },
  van_dung_cao: { easyPercent: 0, mediumPercent: 0, hardPercent: 100 },
};

/** Map 1 bản ghi question_types về loại mà AI service hỗ trợ sinh (khớp backend/ai_service/routes/generate.py) */
function resolveAiSupportedType(qt: QuestionTypeAPI | undefined): 'single' | 'true_false' | 'short' | null {
  if (!qt) return null;
  const code = (qt.code || '').toUpperCase().trim();
  const name = (qt.name || '').toLowerCase();
  if (['SINGLE', 'TN'].includes(code) || name.includes('một đáp án') || name.includes('trắc nghiệm')) return 'single';
  if (['TRUEFALSE', 'DS', 'ĐS'].includes(code) || (name.includes('đúng') && name.includes('sai'))) return 'true_false';
  if (['SHORT', 'TLN', 'ESSAY'].includes(code) || name.includes('ngắn') || name.includes('tự luận')) return 'short';
  return null;
}

interface ConfigPart {
  key: 'p1' | 'p2' | 'p3';
  typeId: string;
  content: string;
  count: number;
  aiType: 'single' | 'true_false' | 'short';
}

export default function ModalTaoDeTuDong({ open, onCancel, onSuccess }: ModalTaoDeTuDongProps) {
  const [step, setStep] = useState(0);
  const [sourceMode, setSourceMode] = useState<SourceMode>('matrix');

  // Môn học + Khối lớp (dùng chung cho cả 2 nguồn sinh đề)
  const [subjects, setSubjects] = useState<SubjectCategoryAPI[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [grades, setGrades] = useState<GradeLevelAPI[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);

  // Nguồn "Ma trận đề": Chủ đề & Tiểu mục
  const [topicTree, setTopicTree] = useState<ChuDeTreeNode[]>([]);
  const [checkedTopicKeys, setCheckedTopicKeys] = useState<React.Key[]>([]);
  const [searchTopic, setSearchTopic] = useState('');
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Nguồn "Ma trận đề": chọn ma trận
  const [matrices, setMatrices] = useState<any[]>([]);
  const [loadingMatrices, setLoadingMatrices] = useState(false);
  const [selectedMatrixId, setSelectedMatrixId] = useState<string | null>(null);
  const [matrixRows, setMatrixRows] = useState<MaTranData[]>([]);
  const [loadingMatrixDetail, setLoadingMatrixDetail] = useState(false);

  // Nguồn "Cấu hình môn học": cấu hình Phần I/II/III + danh mục loại câu hỏi để quy đổi
  const [subjectConfig, setSubjectConfig] = useState<SubjectConfigAPI | null>(null);
  const [loadingSubjectConfig, setLoadingSubjectConfig] = useState(false);
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeAPI[]>([]);

  // Bước cuối: Sinh đề tự động (dùng chung cho cả 2 nguồn)
  const [generating, setGenerating] = useState(false);
  const [genResults, setGenResults] = useState<RandomSelectResultAPI[]>([]);
  const [genQuestions, setGenQuestions] = useState<Question[]>([]);
  const [examName, setExamName] = useState('');
  const [examCode, setExamCode] = useState('');
  const [saving, setSaving] = useState(false);

  // Sửa/sinh lại từng câu hỏi đơn lẻ trong bảng xem trước (dùng chung cho cả 2 nguồn sinh đề) —
  // không giới hạn số lượt sinh lại.
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<Question | null>(null);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || null;
  const selectedGrade = grades.find(g => g.id === selectedGradeId) || null;
  const selectedMatrix = matrices.find(m => m.id === selectedMatrixId) || null;

  const finalStepIndex = sourceMode === 'matrix' ? 2 : 1;

  // Reset toàn bộ khi mở modal
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSourceMode('matrix');
    setSelectedSubjectId(null); setSelectedGradeId(null);
    setTopicTree([]); setCheckedTopicKeys([]); setSearchTopic('');
    setMatrices([]); setSelectedMatrixId(null); setMatrixRows([]);
    setSubjectConfig(null);
    setGenResults([]); setGenQuestions([]); setExamName(''); setExamCode('');
    setRegeneratingIndex(null); setEditingIndex(null); setEditingDraft(null);
    subjectCategoryApi.list().then(res => setSubjects((res.data || []).filter(s => s.is_active))).catch(() => message.error('Không tải được danh sách môn học.'));
    gradeLevelApi.list().then(res => setGrades((res.data || []).filter(g => g.is_active))).catch(() => message.error('Không tải được danh sách khối lớp.'));
    questionTypeApi.list().then(res => setQuestionTypes(res.data || [])).catch(() => setQuestionTypes([]));
  }, [open]);

  // Đổi nguồn sinh đề: quay về bước 0 và dọn sạch state của luồng còn lại để tránh lẫn dữ liệu.
  const handleChangeSourceMode = (mode: SourceMode) => {
    setSourceMode(mode);
    setStep(0);
    setCheckedTopicKeys([]); setSelectedMatrixId(null); setMatrixRows([]);
    setSubjectConfig(null);
    setGenResults([]); setGenQuestions([]); setExamName(''); setExamCode('');
    setRegeneratingIndex(null); setEditingIndex(null); setEditingDraft(null);
  };

  // Tải chủ đề theo môn đã chọn (chỉ dùng cho nguồn "Ma trận đề").
  // Lưu ý 1: CHỈ lọc theo subject_id, không lọc theo grade_id — ma trận đề (CreateMatrixForm.tsx)
  // cũng chỉ lọc chủ đề theo môn khi gán don_vi_id, nên nếu lọc thêm theo khối ở đây (grade_id
  // trên topic là nullable/không bắt buộc) có thể loại bỏ đúng chủ đề mà ma trận đang tham chiếu,
  // khiến checkedTopicKeys không bao giờ khớp don_vi_id dù người dùng tick đúng chủ đề.
  // Lưu ý 2: KHÔNG được phụ thuộc vào `step` ở đây — nếu gate theo `step === 0`, hiệu ứng này sẽ
  // chạy lại (và rơi vào nhánh reset) ngay khi người dùng bấm "Tiếp tục" sang Bước 1, xoá sạch
  // checkedTopicKeys vừa tick trước khi kịp so khớp với ma trận (đã từng gây bug tiểu mục không khớp).
  useEffect(() => {
    if (!open || sourceMode !== 'matrix' || !selectedSubjectId || !selectedGradeId) {
      setTopicTree([]); setCheckedTopicKeys([]);
      return;
    }
    setLoadingTopics(true);
    topicsApi.list()
      .then(res => {
        const flat = (res.data || []).filter(t => t.subject_id === selectedSubjectId);
        setTopicTree(buildChuDeTree(flat));
        setCheckedTopicKeys([]);
      })
      .catch(() => message.error('Không tải được danh sách chủ đề.'))
      .finally(() => setLoadingTopics(false));
  }, [open, sourceMode, selectedSubjectId, selectedGradeId]);

  // Nguồn "Ma trận đề" — Bước 1: tải ma trận đề tương ứng môn đã chọn
  useEffect(() => {
    if (!open || sourceMode !== 'matrix' || step !== 1 || !selectedSubject) return;
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
  }, [open, sourceMode, step, selectedSubjectId]);

  // Nguồn "Cấu hình môn học" — tải Cấu hình môn học (Phần I/II/III) ngay khi chọn môn.
  useEffect(() => {
    if (!open || sourceMode !== 'ai_config' || !selectedSubjectId) {
      setSubjectConfig(null);
      return;
    }
    setLoadingSubjectConfig(true);
    subjectConfigApi.getBySubjectId(selectedSubjectId)
      .then(res => setSubjectConfig(res.success ? res.data : null))
      .catch(() => { setSubjectConfig(null); message.error('Không tải được Cấu hình môn học.'); })
      .finally(() => setLoadingSubjectConfig(false));
  }, [open, sourceMode, selectedSubjectId]);

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

  // Chỉ giữ các hàng của ma trận thuộc tiểu mục đã tick ở Bước 0
  const scopedRows = useMemo(
    () => matrixRows.filter(r => checkedTopicKeys.includes(r.don_vi_id)),
    [matrixRows, checkedTopicKeys],
  );

  // Tên các tiểu mục mà ma trận yêu cầu (dùng để hiển thị chẩn đoán khi scopedRows rỗng —
  // nếu tên trùng với tiểu mục đã tick nhưng vẫn không khớp, khả năng cao don_vi_id trong
  // ma trận đang trỏ đến 1 tiểu mục đã bị xoá/tạo lại với id mới, cùng tên cũ)
  const expectedTopicNames = useMemo(
    () => Array.from(new Set(matrixRows.map(r => r.don_vi_kien_thuc))),
    [matrixRows],
  );

  // Quy đổi Cấu hình môn học (Phần I/II/III) thành các phần hợp lệ để sinh đề bằng AI — chỉ giữ
  // phần có loại câu hỏi + khoảng số câu hợp lệ, và loại câu đó AI service hỗ trợ sinh được.
  const configParts: ConfigPart[] = useMemo(() => {
    if (!subjectConfig) return [];
    const raw: { key: 'p1' | 'p2' | 'p3'; typeId: string | null | undefined; content: string | null | undefined; from: number | null | undefined; to: number | null | undefined }[] = [
      { key: 'p1', typeId: subjectConfig.type_id_p1, content: subjectConfig.content_p1, from: subjectConfig.p1_from, to: subjectConfig.p1_to },
      { key: 'p2', typeId: subjectConfig.type_id_p2, content: subjectConfig.content_p2, from: subjectConfig.p2_from, to: subjectConfig.p2_to },
      { key: 'p3', typeId: subjectConfig.type_id_p3, content: subjectConfig.content_p3, from: subjectConfig.p3_from, to: subjectConfig.p3_to },
    ];
    const parts: ConfigPart[] = [];
    raw.forEach(p => {
      if (!p.typeId || p.from == null || p.to == null || p.to < p.from) return;
      const aiType = resolveAiSupportedType(questionTypes.find(qt => qt.id === p.typeId));
      if (!aiType) return;
      parts.push({ key: p.key, typeId: p.typeId, content: p.content || '', count: p.to - p.from + 1, aiType });
    });
    return parts;
  }, [subjectConfig, questionTypes]);

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

  // Nguồn "Ma trận đề": random chọn câu có sẵn trong ngân hàng khớp cấu trúc ma trận (không dùng AI)
  const handleGenerateFromMatrix = async () => {
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

  // AI trả level dạng 'easy'/'medium'/'hard' (tiếng Anh, theo prompt cố định ở ai_service/generate.py)
  // — quy về đúng 3 mức độ tư duy thật đang có trong danh mục cognitive_levels (chưa có "Vận dụng cao").
  const mapAiLevelToCognitive = (level: string): CognitiveLevel => {
    const l = (level || '').toLowerCase();
    if (l.includes('easy')) return 'nhan_biet';
    if (l.includes('hard')) return 'van_dung';
    return 'thong_hieu';
  };

  // Nguồn "Cấu hình môn học": gọi AI (Gemini, qua /api/generate-questions) sinh câu hỏi HOÀN TOÀN
  // MỚI cho từng Phần I/II/III. Tối ưu số lần gọi AI (đỡ tốn token/quota):
  // - Gộp 1 lần gọi/phần thay vì 1 lần/mức độ (để AI tự trộn độ khó qua easyPercent/mediumPercent/
  //   hardPercent có sẵn ở schema, thay vì ép 100% một mức rồi gọi riêng 4 lần).
  // - Chia batch tối đa 15 câu/lần gọi (đúng giới hạn cứng của ai_service/routes/generate.py) thay vì 12.
  // - Dừng NGAY khi 1 lần gọi thất bại (vd hết quota) thay vì cố gọi tiếp các phần còn lại — tránh
  //   đốt thêm quota vô ích (mỗi lần gọi thất bại backend còn tự retry 2 model x 3 lần).
  const handleGenerateFromSubjectConfig = async () => {
    if (!selectedSubject || !selectedGrade) return;
    if (configParts.length === 0) {
      message.warning('Môn học này chưa có Cấu hình môn học hợp lệ (Phần I/II/III) — vui lòng cấu hình ở "Danh mục môn học" trước khi sinh đề bằng AI.');
      setGenQuestions([]);
      return;
    }
    setGenerating(true);
    const allGenerated: Question[] = [];
    let aborted = false;
    try {
      for (const part of configParts) {
        if (aborted) break;
        let remaining = part.count;
        while (remaining > 0) {
          const batch = Math.min(remaining, 15);
          try {
            const res = await fetch('/api/generate-questions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subject: selectedSubject.name,
                grade: selectedGrade.name,
                topic: part.content || 'Kiến thức tổng hợp',
                count: batch,
                type: part.aiType,
              }),
            });
            const data = await res.json();
            if (!data.success || !data.questions?.length) {
              message.error(data.error || data.detail || `AI không sinh được câu hỏi cho ${part.content || 'phần'}.`);
              aborted = true;
              break;
            }
            (data.questions as any[]).forEach((aiQ) => {
              const idx = allGenerated.length;
              const level = mapAiLevelToCognitive(aiQ.level);
              const base: Question = {
                id: `ai-gen-${Date.now()}-${idx}`,
                code: `AI-${idx + 1}`,
                text: aiQ.text,
                type: part.aiType,
                level,
                status: 'pending',
                subject: selectedSubject.name,
                grade: selectedGrade.name,
                topicId: '',
                topicName: part.content || '',
                creator: 'SmartTest AI Generator',
                createdAt: new Date().toISOString(),
              };
              if (part.aiType === 'true_false') {
                const rawStatements: { content: string; isCorrect: boolean }[] = aiQ.statements || [];
                const statements = rawStatements.map((st, i) => ({
                  id: i + 1, topicId: '', topicName: part.content || '', level, nangLuc: '',
                  content: st.content, isCorrect: st.isCorrect,
                }));
                allGenerated.push({
                  ...base,
                  options: statements.map(s => s.content),
                  correctAnswer: statements.map(s => `${s.id}. ${s.isCorrect ? 'Đúng' : 'Sai'}`).join(', '),
                  statements,
                });
              } else if (part.aiType === 'short') {
                allGenerated.push({ ...base, correctAnswer: aiQ.correctAnswer || '' });
              } else {
                const letterIdx = ['A', 'B', 'C', 'D'].indexOf(String(aiQ.correctAnswer || '').toUpperCase().trim());
                const correctText = letterIdx >= 0 ? aiQ.options?.[letterIdx] : aiQ.correctAnswer;
                allGenerated.push({ ...base, options: aiQ.options || [], correctAnswer: correctText || aiQ.correctAnswer || '' });
              }
            });
          } catch {
            message.error(`Lỗi kết nối AI khi sinh câu hỏi cho ${part.content || 'phần'}.`);
            aborted = true;
            break;
          }
          remaining -= batch;
        }
      }
      setGenQuestions(allGenerated);
      if (allGenerated.length > 0) {
        message.success(
          aborted
            ? `AI đã sinh được ${allGenerated.length} câu trước khi gặp lỗi — có thể lưu tạm hoặc bấm Sinh lại.`
            : `AI đã sinh ${allGenerated.length} câu hỏi theo Cấu hình môn học.`
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  // Nguồn "Ma trận đề": sinh lại 1 câu — đổi sang câu khác cùng loại/mức độ, còn trong ngân hàng,
  // chưa được dùng ở các câu khác trong đề đang xem trước.
  const handleReplaceQuestionMatrix = async (index: number, current: Question) => {
    setRegeneratingIndex(index);
    try {
      const res = await bankQuestionApi.list();
      if (!res.success || !res.data) { message.error('Không tải được Ngân hàng câu hỏi.'); return; }
      const usedIds = new Set(genQuestions.map(q => q.id));
      const candidates = res.data.filter(q =>
        q.id !== current.id && !usedIds.has(q.id) && q.type === current.type && q.level === current.level
      );
      if (candidates.length === 0) {
        message.warning('Không tìm thấy câu hỏi khác cùng loại/mức độ còn trống trong Ngân hàng câu hỏi.');
        return;
      }
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const replacement: Question = {
        id: picked.id, code: picked.code, text: picked.text, type: picked.type, level: picked.level,
        status: picked.status, subject: picked.subject, grade: picked.grade,
        topicId: picked.topicId || '', topicName: picked.topicName || 'Chưa phân loại', subTopicName: picked.subTopicName || '',
        options: picked.options, correctAnswer: picked.correctAnswer, creator: picked.creator, createdAt: picked.createdAt,
      };
      setGenQuestions(prev => prev.map((q, i) => (i === index ? replacement : q)));
    } catch {
      message.error('Lỗi kết nối khi sinh lại câu hỏi.');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Nguồn "Cấu hình môn học": sinh lại 1 câu bằng AI, giữ nguyên loại câu hỏi/mức độ tư duy/phần
  // của câu đang thay, chỉ đổi nội dung.
  const handleReplaceQuestionAiConfig = async (index: number, current: Question) => {
    if (!selectedSubject || !selectedGrade) return;
    setRegeneratingIndex(index);
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject.name,
          grade: selectedGrade.name,
          topic: current.topicName || 'Kiến thức tổng hợp',
          count: 1,
          type: current.type,
          ...LEVEL_PERCENT[current.level],
        }),
      });
      const data = await res.json();
      if (!data.success || !data.questions?.length) {
        message.warning(data.error || data.detail || 'AI không sinh được câu hỏi thay thế, vui lòng thử lại.');
        return;
      }
      const aiQ = data.questions[0];
      const base: Question = { ...current, id: `ai-gen-${Date.now()}-${index}`, text: aiQ.text };
      let replacement: Question;
      if (current.type === 'true_false') {
        const rawStatements: { content: string; isCorrect: boolean }[] = aiQ.statements || [];
        const statements = rawStatements.map((st, i) => ({
          id: i + 1, topicId: '', topicName: current.topicName || '', level: current.level, nangLuc: '',
          content: st.content, isCorrect: st.isCorrect,
        }));
        replacement = {
          ...base,
          options: statements.map(s => s.content),
          correctAnswer: statements.map(s => `${s.id}. ${s.isCorrect ? 'Đúng' : 'Sai'}`).join(', '),
          statements,
        };
      } else if (current.type === 'short') {
        replacement = { ...base, correctAnswer: aiQ.correctAnswer || '' };
      } else {
        const letterIdx = ['A', 'B', 'C', 'D'].indexOf(String(aiQ.correctAnswer || '').toUpperCase().trim());
        const correctText = letterIdx >= 0 ? aiQ.options?.[letterIdx] : aiQ.correctAnswer;
        replacement = { ...base, options: aiQ.options || [], correctAnswer: correctText || aiQ.correctAnswer || '' };
      }
      setGenQuestions(prev => prev.map((q, i) => (i === index ? replacement : q)));
      message.success('AI đã sinh lại câu hỏi này.');
    } catch {
      message.error('Lỗi kết nối AI khi sinh lại câu hỏi.');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleReplaceQuestion = (index: number, question: Question) => {
    if (regeneratingIndex !== null) return; // tránh bấm "Sinh lại" dồn dập khi 1 câu đang xử lý
    void (sourceMode === 'matrix' ? handleReplaceQuestionMatrix(index, question) : handleReplaceQuestionAiConfig(index, question));
  };

  // Sửa nội dung 1 câu hỏi trực tiếp trong bảng xem trước
  const handleEditQuestion = (index: number, question: Question) => {
    setEditingIndex(index);
    setEditingDraft({
      ...question,
      options: question.options ? [...question.options] : question.options,
      statements: question.statements ? question.statements.map(s => ({ ...s })) : question.statements,
    });
  };

  const handleCancelEditQuestion = () => {
    setEditingIndex(null);
    setEditingDraft(null);
  };

  const handleSaveEditedQuestion = () => {
    if (editingIndex === null || !editingDraft) return;
    setGenQuestions(prev => prev.map((q, i) => (i === editingIndex ? editingDraft : q)));
    setEditingIndex(null);
    setEditingDraft(null);
  };

  const runGenerate = () => (sourceMode === 'matrix' ? handleGenerateFromMatrix() : handleGenerateFromSubjectConfig());

  // Tự động sinh ngay khi vào bước cuối
  useEffect(() => {
    if (!open || step !== finalStepIndex) return;
    void runGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, sourceMode]);

  const totalRequested = sourceMode === 'matrix'
    ? genResults.reduce((s, r) => s + r.requested, 0)
    : configParts.reduce((s, p) => s + p.count, 0);
  const totalFound = sourceMode === 'matrix' ? genResults.reduce((s, r) => s + r.found, 0) : genQuestions.length;
  const underfilledCount = sourceMode === 'matrix' ? genResults.filter(r => r.found < r.requested).length : 0;
  const isUnderfilled = sourceMode === 'matrix' ? underfilledCount > 0 : totalFound < totalRequested;

  const handleSaveMatrixExam = async () => {
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
          matrix_id: selectedMatrixId,
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

  // Nguồn "Cấu hình môn học": câu hỏi do AI sinh CHƯA tồn tại trong Ngân hàng câu hỏi, nên phải
  // tạo đề trống trước rồi tạo từng câu hỏi mới gắn thẳng vào đề (examId) qua POST /questions/ —
  // endpoint này fuzzy-match môn/khối/mức độ/loại theo TÊN nên không cần tự resolve id ở FE.
  const handleSaveAiConfigExam = async () => {
    if (!examName.trim()) { message.error('Vui lòng nhập tên đề thi!'); return; }
    if (genQuestions.length === 0) { message.error('Chưa có câu hỏi nào được AI sinh để lưu.'); return; }
    if (!selectedSubject || !selectedGrade) return;
    setSaving(true);
    try {
      const examRes = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: examName,
          code: examCode || undefined,
          subject: selectedSubject.name,
          grade: selectedGrade.name,
          duration: subjectConfig?.time || 90,
          source: 'ai',
        }),
      });
      const examJson = await examRes.json();
      if (!examJson.success) {
        message.error(examJson.error || examJson.message || 'Lỗi khi tạo đề thi.');
        return;
      }
      const newExamId = examJson.data.id;
      for (const q of genQuestions) {
        await questionApi.create({
          text: q.text,
          type: q.type,
          level: q.level,
          subject: selectedSubject.name,
          grade: selectedGrade.name,
          options: q.options,
          correctAnswer: q.correctAnswer,
          statements: q.statements,
          status: 'pending',
          examId: newExamId,
        });
      }
      message.success('AI đã sinh và lưu đề thi thành công!');
      onSuccess();
    } catch {
      message.error('Lỗi kết nối khi lưu đề thi.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExam = () => (sourceMode === 'matrix' ? handleSaveMatrixExam() : handleSaveAiConfigExam());

  const canNextStep0 = !!selectedSubjectId && !!selectedGradeId && checkedTopicKeys.length > 0;
  const canNextStep1 = !!selectedMatrixId && scopedRows.length > 0;
  const canNextAiStep0 = !!selectedSubjectId && !!selectedGradeId;

  const footer = (() => {
    if (sourceMode === 'ai_config') {
      if (step === 0) {
        return [
          <Button key="cancel" onClick={onCancel} className="rounded font-semibold text-xs">Hủy bỏ</Button>,
          <Button key="next" type="primary" disabled={!canNextAiStep0} onClick={() => setStep(1)}
            className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]">
            Tiếp tục
          </Button>,
        ];
      }
      return [
        <Button key="back" onClick={() => setStep(0)} disabled={saving} className="rounded font-semibold text-xs">Quay lại</Button>,
        <Button key="regen" icon={<ReloadOutlined />} onClick={runGenerate} loading={generating} disabled={saving}
          className="rounded font-semibold text-xs">
          Sinh lại
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} loading={saving} disabled={generating || genQuestions.length === 0}
          onClick={handleSaveExam}
          className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]">
          Lưu đề thi
        </Button>,
      ];
    }
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
    return [
      <Button key="back" onClick={() => setStep(1)} disabled={saving} className="rounded font-semibold text-xs">Quay lại</Button>,
      <Button key="regen" icon={<ReloadOutlined />} onClick={runGenerate} loading={generating} disabled={saving}
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

  const stepsItems = sourceMode === 'matrix'
    ? [{ title: 'Môn học, Chủ đề & Tiểu mục' }, { title: 'Ma trận đề' }, { title: 'Đề tự động' }]
    : [{ title: 'Môn học & Khối lớp' }, { title: 'Đề tự động (AI sinh)' }];

  return (
    <>
    <Modal
      title={
        <div className="border-b pb-2 flex items-center gap-1.5">
          <ThunderboltOutlined className="text-[#1a3c8b]" />
          <span className="font-bold text-sm text-[#1a3c8b] italic">Thêm mới tự động</span>
        </div>
      }
      open={open}
      onCancel={() => { if (!generating && !saving) onCancel(); }}
      footer={footer}
      centered
      width={860}
    >
      <div className="pt-3">
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-700 mb-1">Nguồn sinh đề</label>
          <Segmented
            block
            value={sourceMode}
            onChange={(v) => handleChangeSourceMode(v as SourceMode)}
            options={[
              { label: 'Theo ma trận đề', value: 'matrix' },
              { label: 'Theo cấu hình môn học (AI)', value: 'ai_config' },
            ]}
          />
        </div>

        <Steps
          current={step}
          size="small"
          className="mb-6 font-semibold text-xs"
          items={stepsItems}
        />

        <div style={{ minHeight: 520 }}>
        {sourceMode === 'matrix' && step === 0 && (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-4 mb-4">
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

            {selectedSubjectId && selectedGradeId && (
              <>
                <div className="mb-2 text-xs text-slate-500">
                  Chủ đề & tiểu mục của môn <strong>{selectedSubject?.name}</strong> — tick để chọn phạm vi sinh đề (cấu trúc phân cấp cha/con).
                </div>
                <Input size="small" placeholder="Tìm kiếm chủ đề..." prefix={<SearchOutlined className="text-slate-400" />}
                  className="text-xs mb-2" value={searchTopic} onChange={e => setSearchTopic(e.target.value)} allowClear />
                <div className="border border-slate-200 rounded p-2 overflow-y-auto" style={{ maxHeight: 420 }}>
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
                    <Empty description="Môn học này chưa có chủ đề nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {sourceMode === 'matrix' && step === 1 && (
          <div className="animate-in fade-in duration-300">
            <div className="mb-2 text-xs text-slate-500">
              Ma trận đề của môn <strong>{selectedSubject?.name}</strong> — chỉ những tiểu mục đã tick ở Bước 1 sẽ được dùng để sinh đề.
            </div>
            {loadingMatrices ? (
              <div className="py-8 text-center"><Spin /></div>
            ) : matrices.length === 0 ? (
              <Empty description="Chưa có ma trận đề nào cho môn này — vui lòng tạo ma trận trước." />
            ) : (
              <div className="border border-slate-200 rounded divide-y divide-slate-100 overflow-y-auto" style={{ maxHeight: 420 }}>
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
                <div>
                  Ma trận này không có tiểu mục nào trùng với chủ đề đã chọn ở Bước 1 — vui lòng chọn ma trận khác hoặc quay lại Bước 1 để tick thêm tiểu mục.
                </div>
                {expectedTopicNames.length > 0 && (
                  <div className="mt-1.5 text-slate-600">
                    Ma trận này yêu cầu các tiểu mục: <strong>{expectedTopicNames.join(', ')}</strong>.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {sourceMode === 'ai_config' && step === 0 && (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-4 mb-4">
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

            {selectedSubjectId && (
              loadingSubjectConfig ? (
                <div className="py-8 text-center"><Spin /></div>
              ) : configParts.length === 0 ? (
                <Empty description={`Môn ${selectedSubject?.name} chưa có Cấu hình môn học hợp lệ (Phần I/II/III) — vui lòng cấu hình ở "Danh mục môn học" trước.`} />
              ) : (
                <div className="border border-slate-200 rounded divide-y divide-slate-100">
                  {configParts.map(p => (
                    <div key={p.key} className="p-3 text-xs flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{p.content}</span>
                      <Tag color="blue" className="rounded-md font-bold text-[10px] m-0 border-transparent">{p.count} câu</Tag>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {step === finalStepIndex && (
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
                <p className="text-xs text-slate-400 font-semibold mt-2">
                  {sourceMode === 'matrix'
                    ? 'Đang chọn ngẫu nhiên câu hỏi từ Ngân hàng câu hỏi...'
                    : 'Đang sinh câu hỏi mới bằng AI theo Cấu hình môn học...'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Tag color={isUnderfilled ? 'warning' : 'success'} className="rounded-full font-bold text-[11px] px-3 py-1 border-transparent">
                    {sourceMode === 'matrix'
                      ? `Đã chọn ${totalFound}/${totalRequested} câu theo ma trận`
                      : `AI đã sinh ${totalFound}/${totalRequested} câu theo Cấu hình môn học`}
                  </Tag>
                  {sourceMode === 'matrix' && underfilledCount > 0 && (
                    <Tooltip title="Ngân hàng câu hỏi chưa đủ số câu cho một số ô của ma trận (chủ đề/mức độ/loại câu hỏi tương ứng) — có thể bấm Sinh lại hoặc bổ sung thêm câu hỏi vào ngân hàng.">
                      <span className="text-[11px] text-amber-600 font-semibold cursor-help">
                        ⚠ {underfilledCount} ô chưa đủ số câu yêu cầu
                      </span>
                    </Tooltip>
                  )}
                </div>
                <ExamContentDisplay
                  questions={genQuestions}
                  allowEdit
                  regeneratingIndex={regeneratingIndex}
                  onReplaceQuestion={handleReplaceQuestion}
                  onEditQuestion={handleEditQuestion}
                />
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </Modal>

    <Modal
      title="Sửa nội dung câu hỏi"
      open={editingIndex !== null}
      onCancel={handleCancelEditQuestion}
      onOk={handleSaveEditedQuestion}
      okText="Lưu"
      cancelText="Hủy"
      width={640}
      centered
      destroyOnHidden
    >
      {editingDraft && (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Nội dung câu hỏi</label>
            <Input.TextArea
              rows={3}
              value={editingDraft.text}
              onChange={e => setEditingDraft(prev => (prev ? { ...prev, text: e.target.value } : prev))}
            />
          </div>

          {editingDraft.type === 'single' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">Các phương án (chọn đáp án đúng)</label>
              <Radio.Group
                value={editingDraft.correctAnswer as string}
                onChange={e => setEditingDraft(prev => (prev ? { ...prev, correctAnswer: e.target.value } : prev))}
                className="w-full"
              >
                <div className="space-y-2">
                  {(editingDraft.options || []).map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Radio value={opt} />
                      <Input
                        value={opt}
                        onChange={e => setEditingDraft(prev => {
                          if (!prev) return prev;
                          const options = [...(prev.options || [])];
                          const wasCorrect = prev.correctAnswer === options[idx];
                          options[idx] = e.target.value;
                          return { ...prev, options, correctAnswer: wasCorrect ? e.target.value : prev.correctAnswer };
                        })}
                      />
                    </div>
                  ))}
                </div>
              </Radio.Group>
            </div>
          )}

          {editingDraft.type === 'true_false' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">Các ý nhận định (a, b, c, d)</label>
              <div className="space-y-2">
                {(editingDraft.statements || []).map((st, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-slate-400 font-bold">{String.fromCharCode(97 + idx)})</span>
                    <Input
                      value={st.content}
                      onChange={e => setEditingDraft(prev => {
                        if (!prev || !prev.statements) return prev;
                        const statements = prev.statements.map((s, i) => (i === idx ? { ...s, content: e.target.value } : s));
                        return {
                          ...prev,
                          statements,
                          options: statements.map(s => s.content),
                          correctAnswer: statements.map(s => `${s.id}. ${s.isCorrect ? 'Đúng' : 'Sai'}`).join(', '),
                        };
                      })}
                    />
                    <Switch
                      checked={st.isCorrect}
                      checkedChildren="Đúng"
                      unCheckedChildren="Sai"
                      onChange={checked => setEditingDraft(prev => {
                        if (!prev || !prev.statements) return prev;
                        const statements = prev.statements.map((s, i) => (i === idx ? { ...s, isCorrect: checked } : s));
                        return {
                          ...prev,
                          statements,
                          correctAnswer: statements.map(s => `${s.id}. ${s.isCorrect ? 'Đúng' : 'Sai'}`).join(', '),
                        };
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {editingDraft.type === 'short' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">Đáp án / từ khóa chấm điểm</label>
              <Input.TextArea
                rows={2}
                value={editingDraft.correctAnswer as string}
                onChange={e => setEditingDraft(prev => (prev ? { ...prev, correctAnswer: e.target.value } : prev))}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
    </>
  );
}
