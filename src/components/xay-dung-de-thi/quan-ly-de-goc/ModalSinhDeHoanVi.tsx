import { API_ORIGIN } from '../../../config/apiBase';
import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Input, InputNumber, Tabs, Spin, Empty, Tag, Checkbox } from 'antd';
import { toast } from '../../../utils/toast';
import { ThunderboltOutlined, DownloadOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import JSZip from 'jszip';
import { Question } from '../../../types';
import {
  bankQuestionApi, questionApi,
} from '../../../services/danhMucApi';
import { apiGetMatrixConfigDetail } from '../quan-ly-ma-tran-de/mockData';
import { buildExamDocxBlob, triggerBlobDownload } from '../../../utils/examWordExport';
import { compareByPartAndLineNumber } from '../../../utils/examParts';
import ExamContentDisplay from './ExamContentDisplay';
import ExportAnswerChoiceModal from '../../ExportAnswerChoiceModal';

// Backend chỉ mở tối đa pool_size(1) + max_overflow(5) = 6 connection DB/service (xem
// backend/shared/database.py) — sinh nhiều đề hoán vị cùng lúc qua Promise.all không giới hạn
// (mỗi đề tốn 2 request: tạo đề + tạo câu hỏi hàng loạt) rất dễ bắn vượt quá 6 connection này khi số
// lượng đủ lớn, khiến 1 vài request thất bại NGẪU NHIÊN (lỗi kết nối DB) — và vì nguyên nhân là giới
// hạn hạ tầng chứ không phải dữ liệu sai, bấm lưu lại y hệt vẫn gặp lại chứ không tự hết. Giới hạn số
// đề xử lý song song cùng lúc để tránh vượt ngưỡng này.
const VARIANT_SAVE_CONCURRENCY = 3;

async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// Thử lại tối đa `retries` lần (có nghỉ tăng dần) khi gặp lỗi TẠM THỜI (vd mất kết nối CSDL giữa
// chừng lúc backend đang bận xử lý nhiều đề hoán vị cùng lúc — xem 503 mới thêm ở
// routes/questions.py::create_questions_bulk) — trước đây 1 lần lỗi là bỏ luôn, khiến đề vừa tạo
// xong (request riêng, đã thành công) bị rỗng câu hỏi vĩnh viễn dù chỉ là trục trặc thoáng qua.
async function retryAsync<T>(fn: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

interface ModalSinhDeHoanViProps {
  open: boolean;
  exam: any | null; // đề gốc — dòng đang chọn ở bảng "Đề gốc"
  onCancel: () => void;
  onSuccess: () => void;
}

// Xáo ngẫu nhiên (Fisher-Yates) — dùng cho phương án của câu trắc nghiệm 1 đáp án.
// correctAnswer lưu nguyên văn nội dung đáp án đúng (không phải chữ cái A/B/C/D — xem
// manual-create.tsx), nên xáo lại vị trí trong mảng options không cần tính lại correctAnswer.
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Mỗi mã đề hoán vị xáo CẢ thứ tự câu hỏi (trong phạm vi từng loại/phần — không trộn câu Phần I
// sang vị trí Phần II/III, giữ đúng số câu mỗi phần) LẪN thứ tự phương án của câu trắc nghiệm 1
// đáp án (Phần I). Trước đây chỉ xáo phương án nên với đề nhiều câu Phần II (Đúng/Sai)/Phần III
// (tự luận ngắn) — vốn không có options để xáo — gần như không thấy khác biệt gì giữa các mã đề.
function buildVariantQuestions(source: Question[]): Question[] {
  const slotsByType = new Map<string, number[]>();
  source.forEach((q, i) => {
    const key = q.type || 'other';
    if (!slotsByType.has(key)) slotsByType.set(key, []);
    slotsByType.get(key)!.push(i);
  });

  const result: Question[] = new Array(source.length);
  slotsByType.forEach((slots, type) => {
    const shuffledOrder = shuffleArray(slots);
    slots.forEach((targetSlot, k) => {
      const q = source[shuffledOrder[k]];
      // correctAnswer lưu nguyên văn nội dung đáp án đúng (không phải chữ cái A/B/C/D — xem
      // manual-create.tsx), nên xáo lại vị trí trong mảng options không cần tính lại correctAnswer.
      if (type === 'single' && Array.isArray(q.options) && q.options.length > 1) {
        result[targetSlot] = { ...q, options: shuffleArray(q.options) };
      } else {
        result[targetSlot] = { ...q };
      }
    });
  });
  return result;
}

// Dữ liệu thật không đồng nhất — có câu Phần I lưu correctAnswer là mảng thay vì chuỗi (xem
// GET /bank-questions/ ở backend, parse JSON trả về list nếu correct_answer là JSON array), nên
// so sánh "===" đơn thuần bỏ sót các trường hợp này (giống cách update.tsx của Ngân hàng câu hỏi
// đã phải xử lý). So khớp bằng cả 2 dạng để chắc chắn nhận diện đúng phương án đang đúng.
function isSingleOptionCorrect(correctAnswer: string | string[] | undefined, opt: string): boolean {
  if (Array.isArray(correctAnswer)) return correctAnswer.includes(opt);
  return correctAnswer === opt;
}

// Câu Phần II (Đúng/Sai) cũ có thể không có mảng `statements` đầy đủ (dữ liệu tạo trước khi cột
// này tồn tại, hoặc tạo qua luồng cũ không lưu statements) — khi đó suy ra đúng/sai từng ý bằng
// cách parse lại chuỗi tóm tắt "1. Đúng, 2. Sai, ..." đã lưu trong correctAnswer, để bảng sửa vẫn
// luôn có nội dung/đúng-sai hợp lý thay vì hiện trống hoặc luôn sai.
function parseTrueFalseCorrectness(correctAnswer: string | string[] | undefined, count: number): boolean[] {
  const str = Array.isArray(correctAnswer) ? correctAnswer.join(', ') : (correctAnswer || '');
  const result = new Array(count).fill(false);
  str.split(',').forEach(part => {
    const m = part.trim().match(/^(\d+)\.\s*(Đúng|Sai)/i);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < count) result[idx] = /đúng/i.test(m[2]);
    }
  });
  return result;
}

export default function ModalSinhDeHoanVi({ open, exam, onCancel, onSuccess }: ModalSinhDeHoanViProps) {
  // Ma trận đề gắn sẵn với đề gốc (exam.matrix_id) — chỉ có ở đề sinh từ luồng "Theo ma trận đề"
  // của ModalTaoDeTuDong. null = đề tự chọn/thủ công/AI-config, không có ma trận nào để map.
  const [sourceMatrixInfo, setSourceMatrixInfo] = useState<{ id: string; name: string; code: string } | null>(null);

  const [packageCode, setPackageCode] = useState('');
  const [packageName, setPackageName] = useState('');
  const [startCode, setStartCode] = useState<number>(1);
  const [permutationCount, setPermutationCount] = useState<number>(3);
  const [note, setNote] = useState('');

  const [sourceQuestions, setSourceQuestions] = useState<Question[]>([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<Question[][]>([]);
  const [saving, setSaving] = useState(false);

  // Sửa nội dung 1 câu hỏi trực tiếp trong 1 đề hoán vị cụ thể đang xem trước (không đụng tới
  // đề gốc/các đề hoán vị khác) — editingTarget xác định biến thể + vị trí câu đang sửa.
  // Dùng state dạng bảng tách rời (content/isCorrect theo từng dòng) thay vì so sánh trực tiếp
  // editingDraft.correctAnswer === option — dữ liệu thật không đồng nhất (correctAnswer có thể là
  // mảng, statements có thể thiếu ở câu cũ) khiến so sánh "===" im lặng không khớp được gì.
  const [editingTarget, setEditingTarget] = useState<{ variantIndex: number; questionIndex: number } | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<Question | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingAnswers, setEditingAnswers] = useState<{ content: string; isCorrect: boolean }[]>([]);
  const [editingStatements, setEditingStatements] = useState<{ content: string; isCorrect: boolean }[]>([]);
  const [editingShortAnswer, setEditingShortAnswer] = useState('');

  // Reset + tải dữ liệu khi mở modal cho 1 đề gốc cụ thể
  useEffect(() => {
    if (!open || !exam) return;
    setPackageCode(exam.code || '');
    setPackageName(exam.name || '');
    setStartCode(1);
    setPermutationCount(3);
    setNote('');
    setVariants([]);
    setSourceMatrixInfo(null);
    setEditingTarget(null);
    setEditingOriginal(null);

    setLoadingSource(true);
    bankQuestionApi.list()
      .then(res => {
        const qs = (res.data || [])
          .filter(q => q.examId === exam.id)
          .map((q): Question => ({
            id: q.id, code: q.code, text: q.text, type: q.type, level: q.level, status: q.status,
            subject: q.subject, grade: q.grade, topicId: q.topicId || '', topicName: q.topicName || 'Chưa phân loại',
            subTopicName: q.subTopicName || '', options: q.options, correctAnswer: q.correctAnswer,
            statements: q.statements, creator: q.creator, createdAt: q.createdAt, nangLucId: q.nangLucId,
            lineNumber: q.lineNumber,
          }))
          // Sort theo (Phần, lineNumber trong Phần) — không chỉ lineNumber thô, vì lineNumber đánh số
          // lại từ 1 ở MỖI Phần nên nhiều câu khác Phần có thể trùng số (vd Phần I câu 1 và Phần II
          // câu 1 đều lineNumber=1). Câu hỏi cũ tạo trước khi có lineNumber (hoặc bị mất do bug trước
          // đây) đều có giá trị mặc định 1 — sort ổn định (Array.sort giữ nguyên thứ tự tương đối khi
          // bằng nhau) nên các câu đó vẫn giữ đúng thứ tự trả về từ API trong phạm vi Phần của nó.
          .sort(compareByPartAndLineNumber);
        setSourceQuestions(qs);
      })
      .catch(() => toast.error('Không tải được nội dung đề gốc.'))
      .finally(() => setLoadingSource(false));

    // Ma trận đề: map thẳng theo exam.matrix_id (đề sinh từ luồng "Theo ma trận đề" mới có).
    // Đề tự chọn/thủ công/AI-config không có matrix_id — không có gì để map nên ẩn hẳn field này.
    if (exam.matrix_id) {
      apiGetMatrixConfigDetail(exam.matrix_id)
        .then(res => {
          if (res.success && res.data) {
            setSourceMatrixInfo({ id: exam.matrix_id, name: res.data.name, code: res.data.code });
          } else {
            setSourceMatrixInfo({ id: exam.matrix_id, name: 'Ma trận đề', code: exam.matrix_id });
          }
        })
        .catch(() => setSourceMatrixInfo({ id: exam.matrix_id, name: 'Ma trận đề', code: exam.matrix_id }));
    }
  }, [open, exam]);

  const selectedMatrixId = sourceMatrixInfo?.id ?? null;

  const handleGenerate = () => {
    if (sourceQuestions.length === 0) {
      toast.error('Đề gốc chưa có câu hỏi nào để sinh đề hoán vị.');
      return;
    }
    if (!permutationCount || permutationCount < 1) {
      toast.error('Vui lòng nhập số lượng đề hoán vị cần sinh (tối thiểu 1).');
      return;
    }
    setGenerating(true);
    try {
      const generated: Question[][] = Array.from({ length: permutationCount }, () => buildVariantQuestions(sourceQuestions));
      setVariants(generated);
      toast.success(`Đã sinh xem trước ${permutationCount} đề hoán vị.`);
    } finally {
      setGenerating(false);
    }
  };

  const handleClearVariants = () => {
    setVariants([]);
  };

  // Sửa nội dung 1 câu hỏi trong 1 đề hoán vị đang xem trước (chỉ preview — chưa lưu DB, sẽ theo
  // đúng nội dung đã sửa khi bấm "Lưu gói đề" phía dưới).
  const handleEditQuestion = (variantIndex: number, questionIndex: number, question: Question) => {
    setEditingTarget({ variantIndex, questionIndex });
    setEditingOriginal(question);
    setEditingText(question.text);

    if (question.type === 'single') {
      setEditingAnswers((question.options || []).map(opt => ({
        content: opt,
        isCorrect: isSingleOptionCorrect(question.correctAnswer, opt),
      })));
    } else {
      setEditingAnswers([]);
    }

    if (question.type === 'true_false') {
      const options = question.options || [];
      const hasStatements = Array.isArray(question.statements) && question.statements.length > 0;
      if (hasStatements) {
        setEditingStatements(question.statements!.map(s => ({ content: s.content, isCorrect: s.isCorrect })));
      } else {
        // Câu Đúng/Sai cũ thiếu mảng statements — suy ra nội dung/đúng-sai từ options + correctAnswer
        // (mirror của statements, xem quy ước ở buildQuestion trong manual-create.tsx).
        const correctness = parseTrueFalseCorrectness(question.correctAnswer, options.length);
        setEditingStatements(options.map((content, i) => ({ content, isCorrect: correctness[i] })));
      }
    } else {
      setEditingStatements([]);
    }

    setEditingShortAnswer(question.type === 'short' ? (Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : (question.correctAnswer || '')) : '');
  };

  const handleCancelEditQuestion = () => {
    setEditingTarget(null);
    setEditingOriginal(null);
    setEditingAnswers([]);
    setEditingStatements([]);
    setEditingShortAnswer('');
    setEditingText('');
  };

  const updateEditingAnswerContent = (idx: number, content: string) =>
    setEditingAnswers(prev => prev.map((a, i) => (i === idx ? { ...a, content } : a)));

  const setEditingAnswerCorrect = (idx: number) =>
    setEditingAnswers(prev => prev.map((a, i) => ({ ...a, isCorrect: i === idx })));

  const updateEditingStatementContent = (idx: number, content: string) =>
    setEditingStatements(prev => prev.map((s, i) => (i === idx ? { ...s, content } : s)));

  const setEditingStatementCorrect = (idx: number, checked: boolean) =>
    setEditingStatements(prev => prev.map((s, i) => (i === idx ? { ...s, isCorrect: checked } : s)));

  const handleSaveEditedQuestion = () => {
    if (!editingTarget || !editingOriginal) return;
    const { variantIndex, questionIndex } = editingTarget;

    let updated: Question = { ...editingOriginal, text: editingText };
    if (editingOriginal.type === 'single') {
      updated = {
        ...updated,
        options: editingAnswers.map(a => a.content),
        correctAnswer: editingAnswers.find(a => a.isCorrect)?.content ?? editingAnswers[0]?.content ?? '',
      };
    } else if (editingOriginal.type === 'true_false') {
      // Giữ lại topicId/level/nangLuc gốc của từng ý (không hiển thị/sửa ở đây) — chỉ ghi đè
      // content/isCorrect; nếu statements gốc thiếu, đặt id tuần tự 1..n theo đúng quy ước.
      const baseStatements = editingOriginal.statements && editingOriginal.statements.length === editingStatements.length
        ? editingOriginal.statements
        : editingStatements.map((_, i) => ({
          id: i + 1, topicId: editingOriginal.topicId || '', topicName: editingOriginal.topicName || '',
          level: editingOriginal.level, nangLuc: editingOriginal.nangLuc, content: '', isCorrect: false,
        }));
      const statements = baseStatements.map((s, i) => ({
        ...s,
        content: editingStatements[i]?.content ?? s.content,
        isCorrect: editingStatements[i]?.isCorrect ?? s.isCorrect,
      }));
      updated = {
        ...updated,
        statements,
        options: statements.map(s => s.content),
        correctAnswer: statements.map(s => `${s.id}. ${s.isCorrect ? 'Đúng' : 'Sai'}`).join(', '),
      };
    } else if (editingOriginal.type === 'short') {
      updated = { ...updated, correctAnswer: editingShortAnswer };
    }

    setVariants(prev => prev.map((qs, vi) => (
      vi !== variantIndex ? qs : qs.map((q, qi) => (qi === questionIndex ? updated : q))
    )));
    handleCancelEditQuestion();
  };

  // Mỗi nút "Tải xuống" mở modal hỏi Có/Không đáp án trước khi thực sự xuất — pendingExport giữ tên
  // hiện trong modal + hàm thực thi thật (nhận includeAnswers từ lựa chọn của người dùng).
  const [pendingExport, setPendingExport] = useState<{ label: string; run: (includeAnswers: boolean) => void } | null>(null);

  const doDownloadSource = async (includeAnswers: boolean) => {
    if (!exam) return;
    const blob = await buildExamDocxBlob(exam.name, exam.subject, exam.grade, sourceQuestions, exam.duration || 90, includeAnswers);
    triggerBlobDownload(blob, `${exam.code}_DeGoc`, 'docx');
  };
  const handleDownloadSource = () => setPendingExport({ label: 'đề gốc', run: doDownloadSource });

  const doDownloadVariant = async (index: number, includeAnswers: boolean) => {
    if (!exam) return;
    const code = String((startCode || 1) + index);
    const blob = await buildExamDocxBlob(`${packageName || exam.name} - Mã đề ${code}`, exam.subject, exam.grade, variants[index], exam.duration || 90, includeAnswers);
    triggerBlobDownload(blob, `${exam.code}-${code}_DeHoanVi${index + 1}`, 'docx');
  };
  const handleDownloadVariant = (index: number) =>
    setPendingExport({ label: `đề hoán vị ${index + 1}`, run: (includeAnswers) => doDownloadVariant(index, includeAnswers) });

  const doDownloadAll = async (includeAnswers: boolean) => {
    if (!exam || variants.length === 0) return;
    const zip = new JSZip();
    zip.file(`${exam.code}_DeGoc.docx`, await buildExamDocxBlob(exam.name, exam.subject, exam.grade, sourceQuestions, exam.duration || 90, includeAnswers));
    await Promise.all(variants.map(async (qs, idx) => {
      const code = String((startCode || 1) + idx);
      const variantBlob = await buildExamDocxBlob(`${packageName || exam.name} - Mã đề ${code}`, exam.subject, exam.grade, qs, exam.duration || 90, includeAnswers);
      zip.file(`${exam.code}-${code}_DeHoanVi${idx + 1}.docx`, variantBlob);
    }));
    const blob = await zip.generateAsync({ type: 'blob' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = `${packageCode || exam.code}_GoiDeHoanVi.zip`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };
  const handleDownloadAll = () => setPendingExport({ label: 'tất cả đề (đề gốc + hoán vị)', run: doDownloadAll });

  const handleSavePackage = async () => {
    if (!exam) return;
    if (variants.length === 0) {
      toast.error('Vui lòng bấm "Sinh đề hoán vị" trước khi lưu.');
      return;
    }
    if (!packageCode.trim() || !packageName.trim()) {
      toast.error('Vui lòng nhập Mã gói đề thi và Tên gói đề thi.');
      return;
    }
    setSaving(true);
    try {
      // Né trùng mã đề TRƯỚC khi tạo: lấy toàn bộ mã đề đang có, rồi gán mỗi đề hoán vị 1 mã còn
      // trống — tự động nhảy qua mã đã dùng thay vì cứ bám đúng "Mã đề thi bắt đầu từ" rồi để
      // backend từ chối do trùng UNIQUE constraint (lỗi rất hay gặp khi sinh hoán vị nhiều lần cho
      // cùng 1 đề gốc mà không đổi lại số bắt đầu giữa các lần, hoặc trùng đề đã tạo từ trước).
      const [existingExamsRes, existingPackagesRes] = await Promise.all([
        fetch(`${API_ORIGIN}/api/exams`).then(r => r.json()).catch(() => null),
        fetch(`${API_ORIGIN}/api/exams/packages`).then(r => r.json()).catch(() => null),
      ]);
      const takenCodes = new Set<string>(
        (existingExamsRes?.data || []).map((e: any) => String(e.code || '').toLowerCase())
      );

      // Né trùng mã GÓI đề tương tự mã đề — trước đây cứ gửi thẳng packageCode người dùng gõ, nếu
      // trùng (vd bấm lại "Sinh đề hoán vị" cho cùng đề gốc mà quên đổi mã gói) thì backend trả lỗi,
      // NHƯNG các đề hoán vị (exam) đã tạo xong ở bước trên vẫn giữ nguyên — không cần tạo lại, đề gốc
      // càng không đụng tới (đã lưu sẵn từ trước) — nên chỉ cần tự động né trùng ở BƯỚC LƯU GÓI, không
      // phải yêu cầu người dùng thoát ra gõ lại mã rồi làm lại từ đầu.
      const takenPkgCodes = new Set<string>(
        (existingPackagesRes?.data || []).map((p: any) => String(p.code || '').toLowerCase())
      );
      let finalPackageCode = packageCode.trim();
      if (takenPkgCodes.has(finalPackageCode.toLowerCase())) {
        let suffix = 2;
        let candidate = `${finalPackageCode}-${suffix}`;
        while (takenPkgCodes.has(candidate.toLowerCase())) {
          suffix += 1;
          candidate = `${finalPackageCode}-${suffix}`;
        }
        // Tự động né trùng mã gói — đã xử lý xong hoàn toàn, không cần cảnh báo người dùng.
        finalPackageCode = candidate;
      }
      let nextNumber = startCode || 1;
      const assignedCodes: string[] = variants.map(() => {
        let candidate = String(nextNumber);
        let fullCode = `${exam.code}-${candidate}`.toLowerCase();
        while (takenCodes.has(fullCode)) {
          nextNumber += 1;
          candidate = String(nextNumber);
          fullCode = `${exam.code}-${candidate}`.toLowerCase();
        }
        takenCodes.add(fullCode);
        nextNumber += 1;
        return candidate;
      });
      // Tự động né trùng mã đề bắt đầu (nếu "Mã đề thi bắt đầu từ" đã tồn tại) — đã xử lý xong hoàn
      // toàn, không cần cảnh báo người dùng.

      // Mỗi đề hoán vị (đề + toàn bộ câu hỏi của nó) độc lập với các đề khác nên chạy song song —
      // nhưng GIỚI HẠN số lượng cùng lúc (VARIANT_SAVE_CONCURRENCY) thay vì bắn hết toàn bộ 1 lần
      // qua Promise.all như trước đây, để không vượt quá connection pool của backend (xem comment ở
      // VARIANT_SAVE_CONCURRENCY phía trên) — vẫn nhanh hơn hẳn chạy tuần tự hoàn toàn.
      const results = await mapWithConcurrencyLimit(variants, VARIANT_SAVE_CONCURRENCY, async (variantQuestions, i) => {
        const code = assignedCodes[i];
        try {
          const examRes = await fetch(`${API_ORIGIN}/api/exams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${packageName} - Mã đề ${code}`,
              code: `${exam.code}-${code}`,
              subject: exam.subject,
              grade: exam.grade,
              duration: exam.duration || 90,
              description: note,
              source: 'ai',
            }),
          });
          // Lỗi 500 chưa được backend bắt (vd trùng mã đề) trả về text thuần, không phải JSON —
          // .json() sẽ throw nếu parse thất bại, nên bắt riêng từng mã đề thay vì để crash cả vòng lặp.
          const examJson = await examRes.json().catch(() => null);
          if (!examRes.ok || !examJson?.success) {
            return { code, examId: null as string | null };
          }
          const newExamId = examJson.data.id;
          // grade PHẢI lấy từ chính câu hỏi (q.grade — khối lớp thật, vd "Lớp 12"), KHÔNG dùng
          // exam.grade — đó chỉ là nhãn "THPT" cố định gắn cho đề (đề trải cả 3 khối 10/11/12, xem
          // EXAM_GRADE_LABEL ở ModalDeRiengLe.tsx/ModalTaoDeTuDong.tsx), không phải khối lớp thật.
          // Backend fuzzy-match grade theo danh mục GradeLevel thật ("Lớp 10/11/12"), "THPT" không
          // khớp bất kỳ khối nào nên trước đây MỌI câu hỏi đều bị 400 khi lưu đề hoán vị.
          // Phải forward đủ topicId/topicName/competencyComponentId/creator từ câu hỏi GỐC — trước
          // đây bị bỏ sót nên mọi đề hoán vị lưu xong đều mất Chủ đề/Thành phần năng lực/Người tạo
          // dù câu hỏi gốc trong Ngân hàng câu hỏi đã có đủ các thông tin này.
          // lineNumber = vị trí (1-based) TRONG PHẠM VI PHẦN của câu hỏi — đánh số lại từ 1 ở MỖI
          // Phần (đúng cách "Câu N" hiển thị/xuất Word: Phần I câu 1..12, Phần II câu 1..4,... — xem
          // PART_META ở ExamContentDisplay.tsx), KHÔNG phải 1 chỉ số tăng dần suốt toàn đề (bug cũ:
          // đề 22 câu lưu thẳng 1..22 bất kể Phần). Mỗi câu hỏi chỉ thuộc 1 đề (exam_id 1-N, không
          // dùng chung giữa nhiều đề) nên lưu thẳng lên chính câu hỏi là đủ, không cần bảng join
          // riêng. Đọc lại (ModalSinhDeHoanVi/ExamManagementModule/PackageManagementModule) đều sort
          // theo (Phần, lineNumber) — xem compareByPartAndLineNumber ở utils/examParts.ts — để không
          // bị lẫn lộn theo id ngẫu nhiên hay xáo giữa các Phần khi nhiều câu cùng mang số 1, 2,...
          const partCounters = new Map<string, number>();
          const lineNumbers = variantQuestions.map((q) => {
            const key = q.type || 'other';
            const next = (partCounters.get(key) || 0) + 1;
            partCounters.set(key, next);
            return next;
          });
          // 1 request duy nhất cho toàn bộ câu hỏi của đề này thay vì N request riêng (mỗi request
          // trước đây tự tra lại subject/grade/level/type/topic bằng SELECT riêng — rất chậm với DB
          // cloud có độ trễ mạng cao) — xem questionApi.createBulk / routes/questions.py::create_questions_bulk.
          // Thử lại tối đa 2 lần nếu lỗi TẠM THỜI (mất kết nối CSDL) — xem retryAsync phía trên.
          try {
            await retryAsync(() => questionApi.createBulk(variantQuestions.map((q, qi) => ({
              text: q.text,
              type: q.type,
              level: q.level,
              subject: exam.subject,
              grade: q.grade || exam.grade,
              topicId: q.topicId || undefined,
              topicName: q.topicName || undefined,
              subTopicName: q.subTopicName || undefined,
              options: q.options,
              correctAnswer: q.correctAnswer,
              statements: q.statements,
              status: 'approved',
              examId: newExamId,
              creator: q.creator,
              competencyComponentId: q.nangLucId,
              lineNumber: lineNumbers[qi],
              // 'ai_exam' — đề hoán vị coi như 1 dạng "sinh cả đề bằng AI", ẩn khỏi Ngân hàng câu
              // hỏi/Thẩm định/picker chọn câu hỏi giống đề sinh bằng AI trực tiếp.
              source: 'ai_exam',
            } as any))), 2, 1000);
          } catch {
            // Vẫn thất bại sau khi đã thử lại — đề vừa tạo (newExamId) giờ rỗng câu hỏi, không còn
            // giá trị gì, xóa luôn thay vì để mồ côi tồn đọng trong "Đề gốc" (không thuộc gói nào,
            // không câu hỏi nào — đúng kiểu rác đã thấy trước đây khi debug lỗi này).
            await fetch(`/api/exams/${newExamId}`, { method: 'DELETE' }).catch(() => {});
            return { code, examId: null as string | null };
          }
          return { code, examId: newExamId as string | null };
        } catch {
          return { code, examId: null as string | null };
        }
      });

      const newExamIds = results.filter(r => r.examId).map(r => r.examId as string);
      const failedCodes = results.filter(r => !r.examId).map(r => r.code);

      if (failedCodes.length > 0) {
      }

      if (newExamIds.length === 0) {
        toast.error('Không tạo được đề hoán vị nào — vui lòng thử lại.');
        return;
      }

      const pkgRes = await fetch(`${API_ORIGIN}/api/exams/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: packageName,
          code: finalPackageCode,
          subject: exam.subject,
          grade: exam.grade,
          accessType: 'standard',
          description: note,
          examIds: [exam.id, ...newExamIds],
          matrix_id: selectedMatrixId,
        }),
      });
      const pkgJson = await pkgRes.json().catch(() => null);
      if (!pkgRes.ok || !pkgJson?.success) {
        toast.error(
          `Lỗi khi lưu gói đề thi (mã "${finalPackageCode}") — ${pkgJson?.detail || 'vui lòng thử lại'}. ` +
          `${newExamIds.length} đề hoán vị đã được tạo (mã ${exam.code}-${startCode}...) nhưng CHƯA được gắn vào gói nào — vào "Ngân hàng câu hỏi/Danh sách đề" để xử lý thủ công nếu cần.`
        );
        return;
      }
      toast.success(`Đã lưu gói đề thi với ${newExamIds.length} đề hoán vị!`);
      onSuccess();
    } catch {
      toast.error('Lỗi kết nối khi lưu gói đề thi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-1.5">
            <ThunderboltOutlined className="text-[#1a3c8b]" />
            <span className="font-bold text-sm text-[#1a3c8b] italic">Sinh hoán vị và tải</span>
          </div>
        }
        open={open}
        onCancel={() => { if (!generating && !saving) onCancel(); }}
        footer={[
          <Button key="cancel" onClick={onCancel} disabled={saving} className="rounded font-semibold text-xs">Hủy</Button>,
          <Button key="save" type="primary" icon={<SaveOutlined />} loading={saving} disabled={variants.length === 0}
            onClick={handleSavePackage}
            className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]">
            Lưu gói đề
          </Button>,
        ]}
        centered
        width={900}
      >
        <div className="pt-2 text-xs">
          <div className="text-slate-500 mb-3">Tự động sinh đề thi hoán vị theo đề gốc: <strong>{exam?.name}</strong> ({exam?.code})</div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Môn học</label>
              <Select
                disabled className="w-full" value={exam?.subject}
                options={exam?.subject ? [{ value: exam.subject, label: exam.subject }] : []}
              />
            </div>
            {sourceMatrixInfo && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Ma trận đề</label>
                <Select
                  disabled className="w-full" value={sourceMatrixInfo.id}
                  options={[{ value: sourceMatrixInfo.id, label: `${sourceMatrixInfo.name} (${sourceMatrixInfo.code})` }]}
                />
              </div>
            )}
            <div>
              <label className="block font-medium text-slate-700 mb-1">Mã gói đề thi <span className="text-red-500">*</span></label>
              <Input value={packageCode} onChange={e => setPackageCode(e.target.value)} />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tên gói đề thi <span className="text-red-500">*</span></label>
              <Input value={packageName} onChange={e => setPackageName(e.target.value)} />
            </div>
            <div />
            <div>
              <label className="block font-medium text-slate-700 mb-1">Mã đề thi bắt đầu từ</label>
              <InputNumber min={1} className="w-full" value={startCode} onChange={v => setStartCode(v || 1)} />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Số lượng đề hoán vị cần sinh</label>
              <InputNumber min={1} max={50} className="w-full" value={permutationCount} onChange={v => setPermutationCount(v || 1)} />
            </div>
            <div />
            <div className="col-span-3">
              <label className="block font-medium text-slate-700 mb-1">Ghi chú</label>
              <Input.TextArea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Nhập" />
            </div>
          </div>

          <div className="flex justify-center mb-4">
            <Button type="primary" icon={<ThunderboltOutlined />} loading={generating} disabled={loadingSource || sourceQuestions.length === 0}
              onClick={handleGenerate}
              className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590] px-8">
              Sinh đề hoán vị
            </Button>
          </div>

          <div className="mb-1 flex items-center justify-between">
            <span className="font-bold text-[#1a3c8b] italic">Đề gốc</span>
            <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadSource} disabled={sourceQuestions.length === 0} className="rounded text-xs">
              Tải xuống
            </Button>
          </div>
          <div className="border border-slate-200 rounded p-2 mb-4">
            {loadingSource ? (
              <div className="py-8 text-center"><Spin /></div>
            ) : (
              <ExamContentDisplay questions={sourceQuestions} allowEdit={false} />
            )}
          </div>

          {variants.length > 0 && (
            <>
              <div className="mb-1 font-bold text-[#1a3c8b] italic">Danh sách đề hoán vị</div>
              <Tabs
                size="small"
                items={variants.map((qs, idx) => ({
                  key: String(idx),
                  label: `Đề hoán vị ${idx + 1}`,
                  children: (
                    <div>
                      <div className="flex justify-end mb-2">
                        <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadVariant(idx)} className="rounded text-xs">
                          Tải xuống
                        </Button>
                      </div>
                      <div className="border border-slate-200 rounded p-2">
                        <ExamContentDisplay
                          questions={qs}
                          allowEdit
                          onEditQuestion={(questionIndex, question) => handleEditQuestion(idx, questionIndex, question)}
                        />
                      </div>
                    </div>
                  ),
                }))}
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <Button icon={<DownloadOutlined />} onClick={handleDownloadAll} className="rounded font-semibold text-xs">
                  Tải xuống tất cả đề
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleClearVariants} className="rounded font-semibold text-xs">
                  Xóa
                </Button>
              </div>
            </>
          )}
          {variants.length === 0 && !generating && (
            <Empty description="Chưa sinh đề hoán vị nào — bấm &quot;Sinh đề hoán vị&quot; để xem trước." className="py-6" />
          )}
        </div>
      </Modal>

      <Modal
        title="Sửa nội dung câu hỏi"
        open={editingTarget !== null}
        onCancel={handleCancelEditQuestion}
        onOk={handleSaveEditedQuestion}
        okText="Lưu"
        cancelText="Hủy"
        width={640}
        centered
        destroyOnHidden
      >
        {editingOriginal && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nội dung câu hỏi</label>
              <Input.TextArea
                rows={3}
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
              />
            </div>

            {editingOriginal.type === 'single' && (
              <div>
                <div className="font-bold text-[#1a3c8b] mb-1.5">Thông tin câu trả lời</div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="text-left py-1.5 px-2 text-slate-600 font-bold w-8">STT</th>
                      <th className="text-left py-1.5 px-2 text-slate-600 font-bold">Nội dung trả lời</th>
                      <th className="text-center py-1.5 px-2 text-slate-600 font-bold w-20">Đáp án đúng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingAnswers.map((ans, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-1.5 px-2 text-slate-400 font-mono align-middle">{idx + 1}</td>
                        <td className="py-1.5 px-2 align-middle">
                          <Input value={ans.content} onChange={e => updateEditingAnswerContent(idx, e.target.value)} />
                        </td>
                        <td className="py-1.5 px-2 text-center align-middle">
                          <Checkbox checked={ans.isCorrect} onChange={() => setEditingAnswerCorrect(idx)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {editingOriginal.type === 'true_false' && (
              <div>
                <div className="font-bold text-[#1a3c8b] mb-1.5">Thông tin câu trả lời Đúng / Sai</div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="text-left py-1.5 px-2 text-slate-600 font-bold w-8">STT</th>
                      <th className="text-left py-1.5 px-2 text-slate-600 font-bold">Nội dung trả lời</th>
                      <th className="text-center py-1.5 px-2 text-slate-600 font-bold w-20">Đáp án đúng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingStatements.map((st, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-1.5 px-2 text-slate-400 font-mono align-middle">{idx + 1}</td>
                        <td className="py-1.5 px-2 align-middle">
                          <Input value={st.content} onChange={e => updateEditingStatementContent(idx, e.target.value)} />
                        </td>
                        <td className="py-1.5 px-2 text-center align-middle">
                          <Checkbox checked={st.isCorrect} onChange={e => setEditingStatementCorrect(idx, e.target.checked)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {editingOriginal.type === 'short' && (
              <div>
                <div className="font-bold text-[#1a3c8b] mb-1.5">Đáp án tự luận</div>
                <label className="block font-medium text-slate-700 mb-1">Đáp án</label>
                <Input.TextArea
                  rows={3}
                  value={editingShortAnswer}
                  onChange={e => setEditingShortAnswer(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      <ExportAnswerChoiceModal
        open={pendingExport !== null}
        onCancel={() => setPendingExport(null)}
        onConfirm={(includeAnswers) => {
          const action = pendingExport;
          setPendingExport(null);
          action?.run(includeAnswers);
        }}
        targetLabel={pendingExport?.label}
      />
    </>
  );
}
