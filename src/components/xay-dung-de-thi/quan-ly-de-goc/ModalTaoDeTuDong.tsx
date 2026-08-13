import { API_ORIGIN } from '../../../config/apiBase';
import { useState, useEffect } from 'react';
import { Modal, Button, Select, Input, Steps, Spin, Tooltip, Empty, Tag, Segmented, Radio, Switch } from 'antd';
import { toast } from '../../../utils/toast';
import { ThunderboltOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { Question, CognitiveLevel } from '../../../types';
import {
  subjectCategoryApi, topicsApi, bankQuestionApi, questionTypeApi, questionApi, cognitiveLevelApi,
  type SubjectCategoryAPI, type TopicAPI, type RandomSelectCellAPI, type RandomSelectResultAPI,
  type QuestionTypeAPI, type CognitiveLevelAPI,
} from '../../../services/danhMucApi';
import { mapCognitiveLevelRecord } from '../../../utils/cognitiveLevel';
import { apiGetMatrixConfigDetail, type MaTranData } from '../quan-ly-ma-tran-de/matrixApi';
import ExamContentDisplay from './ExamContentDisplay';
import RichTextEditor from '../../RichTextEditor';
import { RichTextGroupProvider, RichTextGroupToolbar, RichTextGroupCell } from '../../RichTextEditorGroup';
import { convertAiQuestionMath } from '../../../utils/mathFormula';

interface ModalTaoDeTuDongProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

type SourceMode = 'matrix' | 'ai_config';

// 3 loại câu hỏi AI service hỗ trợ sinh, ánh xạ đúng 1-1 với Phần I/II/III của đề thi tốt nghiệp
// THPT (Thông tư 22/2024) — dùng để chạy 3 phiên sinh câu ĐỘC LẬP song song (mỗi phiên tương ứng 1
// key API riêng ở backend, xem _KEY_INDEX_BY_TYPE trong ai_service/routes/generate.py), thay vì gọi
// tuần tự từng cell dồn hết vào 1 key — giảm hẳn tần suất lỗi 429 khi ma trận có nhiều tiểu mục.
type AiBucketType = 'single' | 'true_false' | 'short';

const bucketLabel = (t: AiBucketType): string =>
  (t === 'single' ? 'Phần I' : t === 'true_false' ? 'Phần II' : 'Phần III');

// 1 "việc cần làm": sinh `soCau` câu cho đúng 1 cell của ma trận (tiểu mục × mức độ × loại câu hỏi).
interface CellWork {
  donViId: string;
  donViKienThuc: string;
  grade: string;
  mucDoId: string | null;
  loaiCauHoiId: string | null;
  nangLucId: string | null;
  soCau: number;
  aiType: AiBucketType;
  levelSlug: CognitiveLevel | null;
}

const cellResultKey = (r: RandomSelectResultAPI): string =>
  `${r.don_vi_id}|${r.muc_do_id}|${r.loai_cau_hoi_id}|${r.nang_luc_id}`;

// Gộp kết quả sinh tiếp (resume) vào kết quả đã có — cộng dồn `found`/`questionIds` cho đúng cell
// thay vì thêm 1 dòng kết quả mới trùng lặp (tránh đếm 2 lần requested/found ở tổng hợp).
const mergeGenResults = (
  prev: RandomSelectResultAPI[],
  additions: RandomSelectResultAPI[],
): RandomSelectResultAPI[] => {
  const map = new Map(prev.map(r => [cellResultKey(r), r]));
  for (const add of additions) {
    const key = cellResultKey(add);
    const existing = map.get(key);
    map.set(key, existing
      ? { ...existing, found: existing.found + add.found, questionIds: [...existing.questionIds, ...add.questionIds] }
      : add);
  }
  return Array.from(map.values());
};

const cellWorkKey = (item: CellWork): string =>
  `${item.donViId}|${item.mucDoId}|${item.loaiCauHoiId}|${item.nangLucId}`;

const levelToApiString = (level: CognitiveLevel | null): 'easy' | 'medium' | 'hard' => {
  if (level === 'nhan_biet') return 'easy';
  if (level === 'thong_hieu') return 'medium';
  return 'hard'; // van_dung / van_dung_cao / không xác định (null) — mặc định mức khó nhất, an toàn hơn dễ.
};

// Tổng số câu tối đa gộp trong 1 lần gọi AI (nhiều cell khác tiểu mục/mức độ cùng lúc) — giới hạn
// thấp để AI không đếm sai/gán nhầm nhóm khi phải chia quá nhiều nhóm trong 1 phản hồi JSON.
const BATCH_CALL_CAP = 10;

// Chia nhỏ cell nào cần nhiều hơn cap thành nhiều "đơn vị" ≤ cap (giữ nguyên ngữ cảnh tiểu mục/mức
// độ), rồi gộp các đơn vị (có thể từ nhiều cell khác nhau) vào từng lần gọi sao cho tổng số câu mỗi
// lần gọi không vượt cap — giảm hẳn số lần gọi so với "1 API/cell" trước đây (vd 20 cell nhỏ có thể
// chỉ còn vài lần gọi thay vì 20).
const buildCallGroups = (items: CellWork[]): CellWork[][] => {
  const atoms: CellWork[] = [];
  for (const item of items) {
    let left = item.soCau;
    while (left > 0) {
      const chunk = Math.min(left, BATCH_CALL_CAP);
      atoms.push({ ...item, soCau: chunk });
      left -= chunk;
    }
  }

  const groups: CellWork[][] = [];
  let current: CellWork[] = [];
  let currentTotal = 0;
  for (const atom of atoms) {
    if (current.length > 0 && currentTotal + atom.soCau > BATCH_CALL_CAP) {
      groups.push(current);
      current = [];
      currentTotal = 0;
    }
    current.push(atom);
    currentTotal += atom.soCau;
  }
  if (current.length > 0) groups.push(current);
  return groups;
};

// Đề tốt nghiệp THPT sinh theo ma trận trải câu hỏi trên cả 3 khối 10/11/12 (mỗi tiểu mục của ma
// trận tự mang đúng khối của nó — xem topicGradeName), nên bản thân ĐỀ không gắn với 1 khối cụ thể
// nào để người dùng chọn nữa — dùng nhãn cố định này cho cột "grade" (bắt buộc, not null) của exams.
const EXAM_GRADE_LABEL = 'THPT';

// Mức độ tư duy cụ thể gửi cho AI service (khớp backend/ai_service/schemas.py::GenerateQuestionsRequest.level),
// để câu AI sinh khớp đúng ô mức-độ mà ma trận yêu cầu — giống cách "Ngân hàng câu hỏi" > Sinh bằng AI làm.
const LEVEL_TO_API: Record<CognitiveLevel, 'easy' | 'medium' | 'hard' | 'very_hard'> = {
  nhan_biet: 'easy',
  thong_hieu: 'medium',
  van_dung: 'hard',
  van_dung_cao: 'very_hard',
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

export default function ModalTaoDeTuDong({ open, onCancel, onSuccess }: ModalTaoDeTuDongProps) {
  const [step, setStep] = useState(0);
  const [sourceMode, setSourceMode] = useState<SourceMode>('matrix');

  // Bước 1 (dùng chung cho cả 2 nguồn): chỉ cần Môn học + Ma trận — ma trận đã tự mang đủ chủ đề/
  // tiểu mục/mức độ/loại câu hỏi/khối lớp (qua từng don_vi_id), không cần người dùng chọn lại.
  const [subjects, setSubjects] = useState<SubjectCategoryAPI[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [matrices, setMatrices] = useState<any[]>([]);
  const [loadingMatrices, setLoadingMatrices] = useState(false);
  const [selectedMatrixId, setSelectedMatrixId] = useState<string | null>(null);
  const [matrixRows, setMatrixRows] = useState<MaTranData[]>([]);
  const [loadingMatrixDetail, setLoadingMatrixDetail] = useState(false);

  // Chủ đề/tiểu mục của môn đã chọn — KHÔNG hiển thị cho người dùng tick, chỉ dùng ngầm để tra đúng
  // khối lớp thật của từng tiểu mục (topic.grade_name) khi nguồn "Theo AI" cần biết sinh theo khối nào.
  const [topicsOfSubject, setTopicsOfSubject] = useState<TopicAPI[]>([]);
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeAPI[]>([]);
  const [cognitiveLevels, setCognitiveLevels] = useState<CognitiveLevelAPI[]>([]);

  // Bước cuối: Sinh đề tự động (dùng chung cho cả 2 nguồn)
  const [generating, setGenerating] = useState(false);
  const [genResults, setGenResults] = useState<RandomSelectResultAPI[]>([]);
  const [genQuestions, setGenQuestions] = useState<Question[]>([]);
  const [examName, setExamName] = useState('');
  const [examCode, setExamCode] = useState('');
  const [saving, setSaving] = useState(false);

  // Nguồn "Theo AI": các cell chưa sinh đủ số câu của từng phần (Phần I/II/III) sau khi phiên riêng
  // của phần đó bị lỗi giữa chừng (hết quota mọi key) — cho phép bấm "Sinh tiếp" riêng phần đó, 2
  // phần còn lại không bị ảnh hưởng vì mỗi phần chạy độc lập trên 1 key riêng.
  const [pendingByType, setPendingByType] = useState<Record<AiBucketType, CellWork[]>>({
    single: [], true_false: [], short: [],
  });
  const [resumingType, setResumingType] = useState<AiBucketType | null>(null);

  // Sửa/sinh lại từng câu hỏi đơn lẻ trong bảng xem trước (dùng chung cho cả 2 nguồn sinh đề) —
  // không giới hạn số lượt sinh lại.
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<Question | null>(null);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || null;
  const selectedMatrix = matrices.find(m => m.id === selectedMatrixId) || null;

  const finalStepIndex = 1;

  // Reset toàn bộ khi mở modal
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSourceMode('matrix');
    setSelectedSubjectId(null);
    setMatrices([]); setSelectedMatrixId(null); setMatrixRows([]);
    setTopicsOfSubject([]);
    setGenResults([]); setGenQuestions([]); setExamName(''); setExamCode('');
    setRegeneratingIndex(null); setEditingIndex(null); setEditingDraft(null);
    setPendingByType({ single: [], true_false: [], short: [] }); setResumingType(null);
    subjectCategoryApi.list().then(res => setSubjects((res.data || []).filter(s => s.is_active))).catch(() => toast.error('Không tải được danh sách môn học.'));
    questionTypeApi.list().then(res => setQuestionTypes(res.data || [])).catch(() => setQuestionTypes([]));
    cognitiveLevelApi.list().then(res => setCognitiveLevels(res.data || [])).catch(() => setCognitiveLevels([]));
  }, [open]);

  // Đổi nguồn sinh đề: chỉ dọn dữ liệu ĐÃ sinh (2 nguồn giờ dùng chung đúng 1 Môn học + Ma trận đã
  // chọn ở Bước 1, không cần chọn lại) — bước cuối sẽ tự sinh lại theo nguồn mới (xem effect bên dưới).
  const handleChangeSourceMode = (mode: SourceMode) => {
    setSourceMode(mode);
    setGenResults([]); setGenQuestions([]);
    setRegeneratingIndex(null); setEditingIndex(null); setEditingDraft(null);
    setPendingByType({ single: [], true_false: [], short: [] }); setResumingType(null);
  };

  // Tải danh sách ma trận đề + chủ đề (để tra khối lớp thật) tương ứng môn đã chọn
  useEffect(() => {
    setSelectedMatrixId(null); setMatrixRows([]);
    if (!open || !selectedSubjectId || !selectedSubject) {
      setMatrices([]); setTopicsOfSubject([]);
      return;
    }
    setLoadingMatrices(true);
    // Chỉ lấy ma trận đã "Đã thẩm định" (status=approved) — ma trận "Tạo mới"/"Chờ thẩm định"/"Từ
    // chối" chưa được Hội đồng Chuyên môn chốt nội dung, không được phép dùng để sinh đề (dù sinh
    // theo Ngân hàng câu hỏi hay theo AI). Lọc ngay ở query BE thay vì lọc client-side để không lộ
    // ma trận chưa duyệt ra danh sách chọn dù chỉ trong giây lát.
    fetch(`${API_ORIGIN}/api/matrix-configs?page=1&pageSize=200&status=approved`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const filtered = (json.data || []).filter((m: any) =>
            m.subject === selectedSubject.code || m.subject === selectedSubject.name
          );
          setMatrices(filtered);
        }
      })
      .catch(() => toast.error('Không tải được danh sách ma trận đề.'))
      .finally(() => setLoadingMatrices(false));

    topicsApi.list()
      .then(res => setTopicsOfSubject((res.data || []).filter(t => t.subject_id === selectedSubjectId)))
      .catch(() => setTopicsOfSubject([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedSubjectId]);

  const handleSelectMatrix = async (id: string) => {
    setSelectedMatrixId(id);
    setLoadingMatrixDetail(true);
    try {
      const res = await apiGetMatrixConfigDetail(id);
      if (res.success && res.data) {
        setMatrixRows(res.data.ds_cau_truc || []);
      } else {
        toast.error(res.message || 'Không tải được chi tiết ma trận.');
        setMatrixRows([]);
      }
    } finally {
      setLoadingMatrixDetail(false);
    }
  };

  // Khối lớp THẬT của 1 tiểu mục (topic.grade_name, resolve sẵn từ backend) — dùng làm ngữ cảnh
  // "grade" khi gọi AI sinh câu cho tiểu mục đó, để nội dung sinh ra đúng chương trình của khối đó
  // thay vì trộn lẫn (1 ma trận có thể có tiểu mục thuộc cả khối 10/11/12).
  const topicGradeName = (topicId: string): string =>
    topicsOfSubject.find(t => t.id === topicId)?.grade_name || EXAM_GRADE_LABEL;

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

  // Nguồn "Theo ngân hàng câu hỏi": random chọn câu có sẵn khớp cấu trúc ma trận (không dùng AI)
  const handleGenerateFromMatrix = async () => {
    if (matrixRows.length === 0) return;
    setGenerating(true);
    try {
      const cells: RandomSelectCellAPI[] = matrixRows.flatMap(r =>
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
        setGenResults([]); setGenQuestions([]);
        return;
      }
      // Không lọc theo khối lớp — mỗi ô đã tự xác định đúng tiểu mục (và do đó đúng khối) qua
      // don_vi_id, lọc thêm 1 khối duy nhất sẽ loại nhầm câu hỏi hợp lệ của tiểu mục thuộc khối khác
      // trong cùng ma trận (đề tốt nghiệp THPT trải cả 3 khối 10/11/12).
      const res = await bankQuestionApi.randomSelect(cells);
      if (!res.success) { toast.error('Lỗi khi sinh câu hỏi tự động.'); return; }
      setGenResults(res.data);
      const ids = new Set(res.data.flatMap(r => r.questionIds));
      if (ids.size === 0) {
        setGenQuestions([]);
        return;
      }
      setGenQuestions(await mapBankQuestions(ids));
    } catch {
      toast.error('Lỗi kết nối khi sinh câu hỏi tự động.');
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

  // Dựng 1 Question từ 1 phần tử AI trả về, dùng chung cho mọi cell/nhóm gộp trong 1 lần gọi batch.
  const buildQuestionFromAi = (aiQ: any, ctx: {
    aiType: AiBucketType; level: CognitiveLevel; grade: string; donViId: string; donViKienThuc: string;
    nangLucId?: string | null; idx: number;
  }): Question => {
    const id = `ai-gen-${Date.now()}-${ctx.idx}-${Math.random().toString(36).slice(2, 7)}`;
    const base: Question = {
      id, code: `AI-${ctx.idx + 1}`, text: aiQ.text, type: ctx.aiType, level: ctx.level, status: 'pending',
      subject: selectedSubject!.name, grade: ctx.grade, topicId: ctx.donViId, topicName: ctx.donViKienThuc || '',
      nangLucId: ctx.nangLucId || undefined,
      creator: 'AI', createdAt: new Date().toISOString(),
    };
    if (ctx.aiType === 'true_false') {
      const rawStatements: { content: string; isCorrect: boolean }[] = aiQ.statements || [];
      const statements = rawStatements.map((st, i) => ({
        id: i + 1, topicId: ctx.donViId, topicName: ctx.donViKienThuc || '', level: ctx.level, nangLuc: '',
        content: st.content, isCorrect: st.isCorrect,
      }));
      return {
        ...base,
        options: statements.map(s => s.content),
        correctAnswer: statements.map(s => `${s.id}. ${s.isCorrect ? 'Đúng' : 'Sai'}`).join(', '),
        statements,
      };
    }
    if (ctx.aiType === 'short') {
      return { ...base, correctAnswer: aiQ.correctAnswer || '' };
    }
    const letterIdx = ['A', 'B', 'C', 'D'].indexOf(String(aiQ.correctAnswer || '').toUpperCase().trim());
    const correctText = letterIdx >= 0 ? aiQ.options?.[letterIdx] : aiQ.correctAnswer;
    return { ...base, options: aiQ.options || [], correctAnswer: correctText || aiQ.correctAnswer || '' };
  };

  // Sinh câu hỏi cho 1 danh sách CellWork CÙNG loại (single/true_false/short) — dùng cho cả lần sinh
  // đầu tiên (1 trong 3 phiên chạy song song) lẫn "Sinh tiếp" (chỉ resume các cell còn thiếu của
  // riêng phần đó). GỘP nhiều cell (khác tiểu mục/mức độ) vào 1 lần gọi /generate-questions-batch,
  // giới hạn tổng BATCH_CALL_CAP câu/lần — giảm hẳn số lần gọi so với "1 API/cell" trước đây (vd ma
  // trận rải 20 cell nhỏ giờ chỉ còn vài lần gọi). Dừng NGAY khi 1 lần gọi (1 nhóm) thất bại nhưng
  // CHỈ dừng các nhóm CHƯA gọi — nhóm đã gọi thành công trước đó vẫn giữ nguyên kết quả.
  const runBucketAI = async (
    items: CellWork[],
  ): Promise<{ results: RandomSelectResultAPI[]; generated: Question[]; remaining: CellWork[] }> => {
    if (items.length === 0) return { results: [], generated: [], remaining: [] };

    const generated: Question[] = [];
    const foundIdsByKey = new Map<string, string[]>();
    for (const item of items) foundIdsByKey.set(cellWorkKey(item), []);

    const callGroups = buildCallGroups(items);
    let aborted = false;

    for (const group of callGroups) {
      if (aborted) break;
      try {
        const res = await fetch(`${API_ORIGIN}/api/generate-questions-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: selectedSubject!.name,
            type: group[0].aiType,
            items: group.map(atom => ({
              topic: atom.donViKienThuc || 'Kiến thức tổng hợp',
              grade: atom.grade,
              level: levelToApiString(atom.levelSlug),
              count: atom.soCau,
              // Chỉ dùng khi AI Service quá 10s không phản hồi — bốc bù ĐÚNG chủ đề/mức độ/loại câu
              // hỏi/năng lực từ Ngân hàng câu hỏi thay vì chờ vô thời hạn (xem generate.py::_fallback_from_bank).
              topicId: atom.donViId,
              cognitiveLevelId: atom.mucDoId,
              questionTypeId: atom.loaiCauHoiId,
              competencyComponentId: atom.nangLucId,
            })),
          }),
        });
        const data = await res.json();
        if (!data.success || !data.questions?.length) {
          toast.error(data.error || data.detail || `AI không sinh được câu hỏi cho ${bucketLabel(group[0].aiType)}.`);
          aborted = true;
          break;
        }
        // AI Service quá _AI_TIMEOUT_SECONDS (10s) không phản hồi thì tự bốc bù từ Ngân hàng câu hỏi
        // (xem generate.py::_fallback_from_bank) — nhóm này không phải AI vừa sinh, phải hiện ĐÚNG
        // như màn "Theo ngân hàng câu hỏi" (id/code/trạng thái/người tạo thật), không gán id/code giả
        // kiểu 'AI-N' như buildQuestionFromAi bên dưới.
        if (data.source === 'bank_fallback') {
          (data.questions as any[]).forEach((bankQ) => {
            const atom = group[bankQ.groupIndex];
            if (!atom) return;
            const q: Question = {
              id: bankQ.id, code: bankQ.code, text: bankQ.text, type: bankQ.type, level: bankQ.level,
              status: bankQ.status, subject: bankQ.subject, grade: bankQ.grade,
              topicId: bankQ.topicId || atom.donViId, topicName: bankQ.topicName || atom.donViKienThuc || 'Chưa phân loại',
              subTopicName: bankQ.subTopicName || '',
              options: bankQ.options, correctAnswer: bankQ.correctAnswer, statements: bankQ.statements,
              creator: bankQ.creator, createdAt: bankQ.createdAt,
              nangLucId: atom.nangLucId || undefined,
            };
            generated.push(q);
            foundIdsByKey.get(cellWorkKey(atom))!.push(q.id);
          });
          continue;
        }

        (data.questions as any[]).forEach((rawAiQ) => {
          const atom = group[rawAiQ.groupIndex];
          if (!atom) return; // groupIndex lạ (AI trả sai) — bỏ qua thay vì gán nhầm cell.
          // AI đôi khi vẫn viết số mũ/chỉ số kiểu văn bản thuần "x^2" dù đã yêu cầu không dùng LaTeX
          // — chuyển thành công thức KaTeX thật ngay khi nhận, để không phải hiện "x^2" thô không
          // đọc được (xem convertAiQuestionMath).
          const aiQ = convertAiQuestionMath(rawAiQ);
          const level = atom.levelSlug ?? mapAiLevelToCognitive(aiQ.level);
          const q = buildQuestionFromAi(aiQ, {
            aiType: atom.aiType, level, grade: atom.grade,
            donViId: atom.donViId, donViKienThuc: atom.donViKienThuc, nangLucId: atom.nangLucId, idx: generated.length,
          });
          generated.push(q);
          foundIdsByKey.get(cellWorkKey(atom))!.push(q.id);
        });
      } catch {
        toast.error(`Lỗi kết nối AI khi sinh câu hỏi cho ${bucketLabel(group[0].aiType)}.`);
        aborted = true;
        break;
      }
    }

    const results: RandomSelectResultAPI[] = [];
    const remainingItems: CellWork[] = [];
    for (const item of items) {
      const idsForCell = foundIdsByKey.get(cellWorkKey(item)) || [];
      results.push({
        don_vi_id: item.donViId, muc_do_id: item.mucDoId, loai_cau_hoi_id: item.loaiCauHoiId,
        nang_luc_id: item.nangLucId ?? null, requested: item.soCau, found: idsForCell.length, questionIds: idsForCell,
      });
      if (idsForCell.length < item.soCau) {
        remainingItems.push({ ...item, soCau: item.soCau - idsForCell.length });
      }
    }

    return { results, generated, remaining: remainingItems };
  };

  // Nguồn "Theo AI": gọi AI (Gemini, qua /api/generate-questions) sinh câu hỏi HOÀN TOÀN MỚI theo
  // ĐÚNG cấu trúc ma trận đã chọn (mỗi ô: tiểu mục × mức độ × loại câu hỏi × số câu), thay cho "Cấu
  // hình môn học" (Phần I/II/III) trước đây — ma trận mới là nguồn cấu hình sinh đề duy nhất.
  // Tối ưu số lần gọi AI (đỡ tốn token/quota):
  // - Ép đúng 1 mức độ tư duy của ô đó qua field 'level' thay vì để AI tự trộn.
  // - Chia batch tối đa 15 câu/lần gọi (giới hạn cứng của ai_service/routes/generate.py).
  // - Chạy 3 phiên ĐỘC LẬP song song theo loại câu hỏi (Phần I/II/III), mỗi phiên khoá 1 key API
  //   riêng ở backend — 1 phiên hết quota không còn kéo sập cả 3 như trước, và tổng request/phút
  //   dồn vào 1 key giảm hẳn so với gọi tuần tự từng cell.
  const handleGenerateFromMatrixAI = async () => {
    if (!selectedSubject || matrixRows.length === 0) return;
    setGenerating(true);
    try {
      const buckets: Record<AiBucketType, CellWork[]> = { single: [], true_false: [], short: [] };
      const unsupportedResults: RandomSelectResultAPI[] = [];

      for (const row of matrixRows) {
        const grade = topicGradeName(row.don_vi_id);
        for (const cell of row.ds_loai_cau_hoi) {
          const soCau = cell.so_cau || 0;
          if (soCau <= 0) continue;

          const aiType = resolveAiSupportedType(questionTypes.find(qt => qt.id === cell.loai_cau_hoi_id));
          if (!aiType) {
            // Loại câu hỏi ô này AI service không hỗ trợ sinh — bỏ qua, không chặn các ô còn lại.
            unsupportedResults.push({
              don_vi_id: row.don_vi_id, muc_do_id: cell.muc_do_id, loai_cau_hoi_id: cell.loai_cau_hoi_id,
              nang_luc_id: cell.nang_luc_id ?? null, requested: soCau, found: 0, questionIds: [],
            });
            continue;
          }

          const levelRecord = cell.muc_do_id ? cognitiveLevels.find(l => l.id === cell.muc_do_id) : undefined;
          const levelSlug: CognitiveLevel | null = levelRecord ? mapCognitiveLevelRecord(levelRecord) : null;

          buckets[aiType].push({
            donViId: row.don_vi_id, donViKienThuc: row.don_vi_kien_thuc, grade,
            mucDoId: cell.muc_do_id, loaiCauHoiId: cell.loai_cau_hoi_id, nangLucId: cell.nang_luc_id,
            soCau, aiType, levelSlug,
          });
        }
      }

      const [singleRes, tfRes, shortRes] = await Promise.all([
        runBucketAI(buckets.single),
        runBucketAI(buckets.true_false),
        runBucketAI(buckets.short),
      ]);

      const merged = [...singleRes.generated, ...tfRes.generated, ...shortRes.generated]
        .map((q, i) => ({ ...q, code: `AI-${i + 1}` }));
      const results = [...unsupportedResults, ...singleRes.results, ...tfRes.results, ...shortRes.results];
      const pending: Record<AiBucketType, CellWork[]> = {
        single: singleRes.remaining, true_false: tfRes.remaining, short: shortRes.remaining,
      };

      setGenResults(results);
      setGenQuestions(merged);
      setPendingByType(pending);

      const missingParts = (['single', 'true_false', 'short'] as AiBucketType[]).filter(t => pending[t].length > 0);
      if (merged.length > 0) {
        toast.success(
          missingParts.length > 0
            ? `AI đã sinh được ${merged.length} câu — ${missingParts.map(bucketLabel).join(', ')} chưa đủ, có thể bấm "Sinh tiếp".`
            : `AI đã sinh ${merged.length} câu hỏi theo ma trận.`
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  // "Sinh tiếp Phần X còn thiếu": chỉ resume các cell còn thiếu của riêng phần đó (dùng lại đúng key
  // API của phần đó), gộp kết quả mới vào genQuestions/genResults hiện có — không đụng tới 2 phần kia.
  const handleResumeBucket = async (type: AiBucketType) => {
    const items = pendingByType[type];
    if (!items || items.length === 0) return;
    setResumingType(type);
    try {
      const res = await runBucketAI(items);
      if (res.generated.length > 0) {
        setGenQuestions(prev => [...prev, ...res.generated].map((q, i) => ({ ...q, code: `AI-${i + 1}` })));
      }
      setGenResults(prev => mergeGenResults(prev, res.results));
      setPendingByType(prev => ({ ...prev, [type]: res.remaining }));
      toast[res.generated.length > 0 ? 'success' : 'warning'](
        res.generated.length > 0
          ? `Đã sinh tiếp ${res.generated.length} câu cho ${bucketLabel(type)}.`
          : `${bucketLabel(type)} vẫn chưa sinh thêm được câu nào — vui lòng thử lại sau.`
      );
    } finally {
      setResumingType(null);
    }
  };

  // Nguồn "Theo ngân hàng câu hỏi": sinh lại 1 câu — đổi sang câu khác cùng loại/mức độ, còn trong
  // ngân hàng, chưa được dùng ở các câu khác trong đề đang xem trước.
  const handleReplaceQuestionMatrix = async (index: number, current: Question) => {
    setRegeneratingIndex(index);
    try {
      const res = await bankQuestionApi.list();
      if (!res.success || !res.data) { toast.error('Không tải được Ngân hàng câu hỏi.'); return; }
      const usedIds = new Set(genQuestions.map(q => q.id));
      const candidates = res.data.filter(q =>
        q.id !== current.id && !usedIds.has(q.id) && q.type === current.type && q.level === current.level
      );
      if (candidates.length === 0) {
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
      toast.error('Lỗi kết nối khi sinh lại câu hỏi.');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Nguồn "Theo AI": sinh lại 1 câu bằng AI, giữ nguyên môn/khối/chủ đề/mức độ tư duy/loại câu hỏi
  // của câu đang thay (đã lưu sẵn trên chính câu hỏi đó từ lúc sinh), chỉ đổi nội dung.
  const handleReplaceQuestionAiConfig = async (index: number, current: Question) => {
    if (!selectedSubject) return;
    setRegeneratingIndex(index);
    try {
      const res = await fetch(`${API_ORIGIN}/api/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject.name,
          grade: current.grade || EXAM_GRADE_LABEL,
          topic: current.topicName || 'Kiến thức tổng hợp',
          count: 1,
          type: current.type,
          level: LEVEL_TO_API[current.level],
        }),
      });
      const data = await res.json();
      if (!data.success || !data.questions?.length) {
        return;
      }
      const aiQ = convertAiQuestionMath(data.questions[0]);
      const base: Question = { ...current, id: `ai-gen-${Date.now()}-${index}`, text: aiQ.text };
      let replacement: Question;
      if (current.type === 'true_false') {
        const rawStatements: { content: string; isCorrect: boolean }[] = aiQ.statements || [];
        const statements = rawStatements.map((st, i) => ({
          id: i + 1, topicId: current.topicId || '', topicName: current.topicName || '', level: current.level, nangLuc: '',
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
      toast.success('AI đã sinh lại câu hỏi này.');
    } catch {
      toast.error('Lỗi kết nối AI khi sinh lại câu hỏi.');
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

  const runGenerate = () => (sourceMode === 'matrix' ? handleGenerateFromMatrix() : handleGenerateFromMatrixAI());

  // Tự động sinh ngay khi vào bước cuối (hoặc khi đổi nguồn sinh đề trong lúc đang ở bước cuối)
  useEffect(() => {
    if (!open || step !== finalStepIndex) return;
    void runGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, sourceMode]);

  const totalRequested = genResults.reduce((s, r) => s + r.requested, 0);
  const totalFound = genResults.reduce((s, r) => s + r.found, 0);
  const underfilledCount = genResults.filter(r => r.found < r.requested).length;
  const isUnderfilled = underfilledCount > 0;

  const handleSaveMatrixExam = async () => {
    if (!examName.trim()) { toast.error('Vui lòng nhập tên đề thi!'); return; }
    if (genQuestions.length === 0) { toast.error('Chưa có câu hỏi nào được sinh để lưu.'); return; }
    // Chặn lưu khi Ngân hàng câu hỏi không đủ câu cho ma trận (found < requested ở ≥1 ô) — trước đây
    // chỉ tô vàng cảnh báo mềm (Tag "⚠ N ô chưa đủ số câu yêu cầu") nhưng vẫn cho lưu đề thiếu câu so
    // với ma trận. Giờ chặn cứng ngay ở FE, và BE (create_exam) cũng tự đối chiếu lại tổng số câu với
    // matrix_id làm lớp chặn thứ 2 (phòng trường hợp NHCH thay đổi giữa lúc sinh và lúc bấm Lưu).
    if (isUnderfilled) {
      toast.error(
        `Ngân hàng câu hỏi không đủ câu cho ${underfilledCount} ô của ma trận (mới có ${totalFound}/${totalRequested} câu) — vui lòng bổ sung thêm câu hỏi vào Ngân hàng câu hỏi rồi bấm "Sinh lại".`
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: examName,
          code: examCode || undefined,
          subject: selectedSubject?.name,
          grade: EXAM_GRADE_LABEL,
          duration: selectedMatrix?.duration || 90,
          source: 'manual',
          questionIds: genQuestions.map(q => q.id),
          matrix_id: selectedMatrixId,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Đã tạo đề thi tự động thành công!');
        onSuccess();
      } else {
        // Lỗi 400 từ FastAPI HTTPException (vd _validate_matrix_question_count) trả về {"detail": "..."},
        // không có success/error/message — phải đọc cả detail thì mới hiện đúng lý do BE từ chối lưu.
        toast.error(json.detail || json.error || json.message || 'Lỗi khi lưu đề thi.');
      }
    } catch {
      toast.error('Lỗi kết nối khi lưu đề thi.');
    } finally {
      setSaving(false);
    }
  };

  // Nguồn "Theo AI": câu hỏi do AI sinh CHƯA tồn tại trong Ngân hàng câu hỏi, nên phải tạo đề trống
  // trước rồi tạo từng câu hỏi mới gắn thẳng vào đề (examId) qua POST /questions/ — endpoint này
  // fuzzy-match môn/khối/mức độ/loại theo TÊN nên không cần tự resolve id ở FE.
  const handleSaveAiConfigExam = async () => {
    if (!examName.trim()) { toast.error('Vui lòng nhập tên đề thi!'); return; }
    if (genQuestions.length === 0) { toast.error('Chưa có câu hỏi nào được AI sinh để lưu.'); return; }
    if (!selectedSubject) return;
    setSaving(true);
    try {
      const examRes = await fetch(`${API_ORIGIN}/api/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: examName,
          code: examCode || undefined,
          subject: selectedSubject.name,
          grade: EXAM_GRADE_LABEL,
          duration: selectedMatrix?.duration || 90,
          source: 'ai',
          // Trước đây KHÔNG gửi matrix_id ở nguồn "Theo AI" — đề sinh bằng AI vẫn dựa theo cấu trúc
          // ma trận (Bước 1 dùng chung cho cả 2 nguồn) nhưng không ghi lại liên kết, khiến BE không
          // chặn được việc dùng ma trận CHƯA thẩm định để sinh đề qua đường này (xem _get_approved_matrix_or_400
          // ở exams.py — chỉ áp dụng khi có matrix_id).
          matrix_id: selectedMatrixId,
        }),
      });
      const examJson = await examRes.json();
      if (!examJson.success) {
        toast.error(examJson.detail || examJson.error || examJson.message || 'Lỗi khi tạo đề thi.');
        return;
      }
      const newExamId = examJson.data.id;
      // Phải forward đủ topicId/topicName/competencyComponentId/creator — Question dựng từ AI
      // (buildQuestionFromAi) đã có sẵn các field này, nhưng trước đây bị bỏ sót khi gọi lưu, khiến
      // Chủ đề/Thành phần năng lực/Người tạo luôn trống dù đã chọn đúng ở ma trận.
      // lineNumber = vị trí (1-based) TRONG PHẠM VI PHẦN của câu hỏi — đánh số lại từ 1 ở MỖI Phần,
      // giống hệt cách ModalSinhDeHoanVi.tsx tính cho đề hoán vị (backend mặc định line_number=0 khi
      // không truyền, vi phạm bất biến "câu đã thuộc 1 đề phải >= 1" nếu bỏ trống ở đây).
      const partCounters = new Map<string, number>();
      const lineNumbers = genQuestions.map((q) => {
        const key = q.type || 'other';
        const next = (partCounters.get(key) || 0) + 1;
        partCounters.set(key, next);
        return next;
      });
      // 1 request duy nhất cho toàn bộ câu hỏi thay vì lặp `await` tuần tự từng câu (trước đây rất
      // chậm — mỗi câu 1 round-trip DB cloud riêng) — xem questionApi.createBulk.
      await questionApi.createBulk(genQuestions.map((q, qi) => ({
        text: q.text,
        type: q.type,
        level: q.level,
        subject: selectedSubject.name,
        grade: q.grade || EXAM_GRADE_LABEL,
        topicId: q.topicId || undefined,
        topicName: q.topicName || undefined,
        subTopicName: q.subTopicName || undefined,
        options: q.options,
        correctAnswer: q.correctAnswer,
        statements: q.statements,
        status: 'pending',
        examId: newExamId,
        creator: q.creator,
        competencyComponentId: q.nangLucId,
        lineNumber: lineNumbers[qi],
        // 'ai_exam' — sinh cả đề bằng AI, ẩn khỏi Ngân hàng câu hỏi/Thẩm định/picker chọn câu hỏi
        // (khác 'ai_bank' — sinh bằng AI ngay trong màn Ngân hàng câu hỏi, vẫn hiện bình thường).
        source: 'ai_exam',
      } as any)));
      toast.success('AI đã sinh và lưu đề thi thành công!');
      onSuccess();
    } catch {
      toast.error('Lỗi kết nối khi lưu đề thi.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExam = () => (sourceMode === 'matrix' ? handleSaveMatrixExam() : handleSaveAiConfigExam());

  const canNextStep0 = !!selectedSubjectId && !!selectedMatrixId && matrixRows.length > 0;

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
    return [
      <Button key="back" onClick={() => setStep(0)} disabled={saving} className="rounded font-semibold text-xs">Quay lại</Button>,
      <Button key="regen" icon={<ReloadOutlined />} onClick={runGenerate} loading={generating} disabled={saving || resumingType !== null}
        className="rounded font-semibold text-xs">
        Sinh lại
      </Button>,
      <Button key="save" type="primary" icon={<SaveOutlined />} loading={saving} disabled={generating || resumingType !== null || genQuestions.length === 0}
        onClick={handleSaveExam}
        className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]">
        Lưu đề thi
      </Button>,
    ];
  })();

  const stepsItems = [{ title: 'Môn học & Ma trận' }, { title: 'Đề tự động' }];

  return (
    <>
      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-1.5">
            <ThunderboltOutlined className="text-[#1a3c8b]" />
            <span className="font-bold text-sm text-[#1a3c8b] italic">Thêm mới tự động theo ma trận</span>
          </div>
        }
        open={open}
        // Chỉ chặn đóng khi đang LƯU (saving — đang ghi DB, đóng giữa chừng dễ gây dữ liệu dở dang).
        // Trước đây chặn luôn cả lúc đang sinh câu hỏi (generating) khiến bấm icon X không có tác
        // dụng gì suốt thời gian AI đang chạy — sinh AI theo ma trận có thể mất khá lâu, cần cho phép
        // đóng giữa chừng. Request AI đang chạy dở sẽ tự bị bỏ qua kết quả vì modal reset lại state
        // mỗi khi mở lại (xem effect theo [open]), không cần huỷ request thủ công.
        onCancel={() => { if (!saving) onCancel(); }}
        footer={footer}
        centered
        width={860}
      >
        <div className="pt-3">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">Cách nhặt câu hỏi</label>
            <Segmented
              block
              value={sourceMode}
              onChange={(v) => handleChangeSourceMode(v as SourceMode)}
              options={[
                { label: 'Theo ngân hàng câu hỏi', value: 'matrix' },
                { label: 'Theo AI', value: 'ai_config' },
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
            {step === 0 && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Môn học <span className="text-red-500">*</span></label>
                  <Select
                    placeholder="Chọn môn học" className="w-full text-xs"
                    value={selectedSubjectId} onChange={setSelectedSubjectId}
                    options={subjects.map(s => ({ value: s.id, label: s.name }))}
                  />
                </div>

                {selectedSubjectId && (
                  <>
                    <div className="mb-2 text-xs text-slate-500">
                      Ma trận đề của môn <strong>{selectedSubject?.name}</strong> — cấu trúc (chủ đề/tiểu mục/mức độ/loại câu hỏi/khối lớp) đã được cấu hình sẵn trong ma trận.
                    </div>
                    {loadingMatrices ? (
                      <div className="py-8 text-center"><Spin /></div>
                    ) : matrices.length === 0 ? (
                      <Empty description="Môn này chưa có ma trận đề nào đã được thẩm định — vui lòng tạo/gửi thẩm định ma trận trước." />
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
                    {selectedMatrixId && !loadingMatrixDetail && matrixRows.length === 0 && (
                      <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
                        Ma trận này chưa có cấu trúc câu hỏi nào — vui lòng chọn ma trận khác hoặc bổ sung cấu trúc ở "Quản lý ma trận đề".
                      </div>
                    )}
                  </>
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
                        : 'Đang sinh câu hỏi mới bằng AI theo ma trận...'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag color={isUnderfilled ? 'warning' : 'success'} className="rounded-full font-bold text-[11px] px-3 py-1 border-transparent">
                        {sourceMode === 'matrix'
                          ? `Đã chọn ${totalFound}/${totalRequested} câu theo ma trận`
                          : `AI đã sinh ${totalFound}/${totalRequested} câu theo ma trận`}
                      </Tag>
                      {underfilledCount > 0 && (
                        <Tooltip title={sourceMode === 'matrix'
                          ? 'Ngân hàng câu hỏi chưa đủ số câu cho một số ô của ma trận (chủ đề/mức độ/loại câu hỏi tương ứng) — có thể bấm Sinh lại hoặc bổ sung thêm câu hỏi vào ngân hàng.'
                          : 'AI chưa sinh đủ số câu cho một số ô của ma trận (loại câu hỏi không được hỗ trợ, hoặc gặp lỗi khi gọi AI) — có thể bấm Sinh lại.'}>
                          <span className="text-[11px] text-amber-600 font-semibold cursor-help">
                            ⚠ {underfilledCount} ô chưa đủ số câu yêu cầu
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    {sourceMode === 'ai_config' && (['single', 'true_false', 'short'] as AiBucketType[]).some(t => pendingByType[t].length > 0) && (
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {(['single', 'true_false', 'short'] as AiBucketType[])
                          .filter(t => pendingByType[t].length > 0)
                          .map(t => (
                            <Button
                              key={t}
                              size="small"
                              icon={<ReloadOutlined />}
                              loading={resumingType === t}
                              disabled={generating || (resumingType !== null && resumingType !== t)}
                              onClick={() => handleResumeBucket(t)}
                              className="rounded text-[11px] font-semibold"
                            >
                              Sinh tiếp {bucketLabel(t)} còn thiếu ({pendingByType[t].reduce((s, it) => s + it.soCau, 0)} câu)
                            </Button>
                          ))}
                      </div>
                    )}
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
              <RichTextEditor
                minHeight={70}
                value={editingDraft.text}
                onChange={(html) => setEditingDraft(prev => (prev ? { ...prev, text: html } : prev))}
              />
            </div>

            {editingDraft.type === 'single' && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Các phương án (chọn đáp án đúng)</label>
                <RichTextGroupProvider>
                  <RichTextGroupToolbar />
                  <Radio.Group
                    value={editingDraft.correctAnswer as string}
                    onChange={e => setEditingDraft(prev => (prev ? { ...prev, correctAnswer: e.target.value } : prev))}
                    className="w-full"
                  >
                    <div className="space-y-2 mt-2">
                      {(editingDraft.options || []).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Radio value={opt} />
                          <div className="flex-1 min-w-0">
                            <RichTextGroupCell
                              value={opt}
                              minHeight={36}
                              onChange={(html) => setEditingDraft(prev => {
                                if (!prev) return prev;
                                const options = [...(prev.options || [])];
                                const wasCorrect = prev.correctAnswer === options[idx];
                                options[idx] = html;
                                return { ...prev, options, correctAnswer: wasCorrect ? html : prev.correctAnswer };
                              })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Radio.Group>
                </RichTextGroupProvider>
              </div>
            )}

            {editingDraft.type === 'true_false' && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Các ý nhận định (a, b, c, d)</label>
                <RichTextGroupProvider>
                  <RichTextGroupToolbar />
                  <div className="space-y-2 mt-2">
                    {(editingDraft.statements || []).map((st, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 text-slate-400 font-bold">{String.fromCharCode(97 + idx)})</span>
                        <div className="flex-1 min-w-0">
                          <RichTextGroupCell
                            value={st.content}
                            minHeight={36}
                            onChange={(html) => setEditingDraft(prev => {
                              if (!prev || !prev.statements) return prev;
                              const statements = prev.statements.map((s, i) => (i === idx ? { ...s, content: html } : s));
                              return {
                                ...prev,
                                statements,
                                options: statements.map(s => s.content),
                                correctAnswer: statements.map(s => `${s.id}. ${s.isCorrect ? 'Đúng' : 'Sai'}`).join(', '),
                              };
                            })}
                          />
                        </div>
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
                </RichTextGroupProvider>
              </div>
            )}

            {editingDraft.type === 'short' && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Đáp án</label>
                <RichTextEditor
                  minHeight={50}
                  value={editingDraft.correctAnswer as string}
                  onChange={(html) => setEditingDraft(prev => (prev ? { ...prev, correctAnswer: html } : prev))}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
