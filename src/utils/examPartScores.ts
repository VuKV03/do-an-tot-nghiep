import { subjectCategoryApi, subjectConfigApi, questionTypeApi } from '../services/danhMucApi';

/** Suy ra loại câu hỏi nội bộ (single/true_false/short) từ 1 bản ghi danh mục "Loại câu hỏi" — bản
 * sao của resolveAiSupportedType (ModalTaoDeTuDong.tsx), tách riêng ra đây vì cần dùng lại ở cả màn
 * xem chi tiết Đề gốc/Gói đề, không thuộc phạm vi luồng sinh đề bằng AI. */
function resolveQuestionKind(code?: string | null, name?: string | null): 'single' | 'true_false' | 'short' | null {
  const c = (code || '').toUpperCase().trim();
  const n = (name || '').toLowerCase();
  if (['SINGLE', 'TN'].includes(c) || n.includes('một đáp án') || n.includes('trắc nghiệm')) return 'single';
  if (['TRUEFALSE', 'DS', 'ĐS'].includes(c) || (n.includes('đúng') && n.includes('sai'))) return 'true_false';
  if (['SHORT', 'TLN', 'ESSAY'].includes(c) || n.includes('ngắn') || n.includes('tự luận')) return 'short';
  return null;
}

/** Điểm theo số ý đúng (1/2/3/4 ý) — chỉ có ở Phần dạng Đúng/Sai, khớp đúng khái niệm
 * `diem_theo_y` đã dùng ở CreateMatrixForm.tsx (Ma trận đề). */
export interface DiemTheoY {
  y1: number;
  y2: number;
  y3: number;
  y4: number;
}

/** 1 dòng cấu hình điểm/phần — cố định theo Cấu hình môn học, KHÔNG phụ thuộc đề cụ thể nào (dùng
 * lại được cho nhiều đề/mã đề cùng môn, ví dụ nhiều tab trong 1 Gói đề). */
export interface PartScoreConfig {
  key: string;               // 'p1' | 'p2' | 'p3'
  header: string;            // "Phần I: Nội dung phần (Trắc nghiệm)"
  kind: 'single' | 'true_false' | 'short';
  // Điểm cho 1 câu đúng TRỌN VẸN của phần này — với Đúng/Sai là mức đúng cả 4 ý (diemTheoY.y4), dùng
  // để tính "Tổng điểm" (applyPartScores/sumPartScores), khớp đúng cách matrix tự tính diem cho DS.
  diemMoiCau: number;
  // Chỉ có ở phần dạng Đúng/Sai — 4 mức điểm theo số ý đúng, để hiện đủ "(0,1đ/1ý, 0,25đ/2ý,...)"
  // ngay cạnh tiêu đề Phần thay vì chỉ 1 con số duy nhất (không phản ánh đúng cách chấm thật).
  diemTheoY?: DiemTheoY;
}

/** 1 dòng kết quả điểm/phần — gắn với 1 đề CỤ THỂ (phụ thuộc số câu thật đề đó đang có). */
export interface PartScoreRow extends PartScoreConfig {
  soCau: number;
  tongDiem: number;
}

const PART_LABELS = ['Phần I', 'Phần II', 'Phần III'];

/** Tải cấu hình điểm/phần (Phần I/II/III) của 1 môn học từ Cấu hình môn học (subject_configs) — gọi
 * 1 LẦN cho mỗi môn, dùng lại được cho nhiều đề/mã đề cùng môn (xem applyPartScores bên dưới) thay vì
 * phải gọi lại API cho từng đề. Trả về null nếu môn chưa có Cấu hình môn học (không có gì để hiện). */
export async function fetchPartScoreConfig(subjectName: string): Promise<PartScoreConfig[] | null> {
  if (!subjectName) return null;
  try {
    const [subjectsRes, typesRes] = await Promise.all([
      subjectCategoryApi.list(),
      questionTypeApi.list(),
    ]);
    const subject = (subjectsRes.data || []).find(s => s.name === subjectName);
    if (!subject) return null;

    const cfgRes = await subjectConfigApi.getBySubjectId(subject.id).catch(() => null);
    const cfg = cfgRes?.data;
    if (!cfg) return null;

    const typeMap = new Map((typesRes.data || []).map(t => [t.id, t]));
    const toNum = (v: unknown): number => (v === null || v === undefined || v === '' ? 0 : Number(v) || 0);
    const parts = [
      {
        typeId: cfg.type_id_p1, ptsNormal: cfg.points_for_a_correct_answers_p1, content: cfg.content_p1,
        ideaPoints: [cfg.points_for_1_correct_idea_p1, cfg.points_for_2_correct_idea_p1, cfg.points_for_3_correct_idea_p1, cfg.points_for_4_correct_idea_p1],
      },
      {
        typeId: cfg.type_id_p2, ptsNormal: cfg.points_for_a_correct_answers_p2, content: cfg.content_p2,
        ideaPoints: [cfg.points_for_1_correct_idea_p2, cfg.points_for_2_correct_idea_p2, cfg.points_for_3_correct_idea_p2, cfg.points_for_4_correct_idea_p2],
      },
      {
        typeId: cfg.type_id_p3, ptsNormal: cfg.points_for_a_correct_answers_p3, content: cfg.content_p3,
        ideaPoints: [cfg.points_for_1_correct_idea_p3, cfg.points_for_2_correct_idea_p3, cfg.points_for_3_correct_idea_p3, cfg.points_for_4_correct_idea_p3],
      },
    ];

    const rows: PartScoreConfig[] = [];
    parts.forEach((p, idx) => {
      if (!p.typeId) return;
      const t = typeMap.get(p.typeId);
      if (!t) return;
      const kind = resolveQuestionKind(t.code, t.name);
      if (!kind) return;
      // Đúng/Sai: điểm chấm theo TỪNG SỐ Ý ĐÚNG (1/2/3/4 ý), không phải 1 mức cố định/câu — lấy đủ cả
      // 4 mức, dùng mức đúng cả 4 ý (y4) làm "diemMoiCau" để tính Tổng điểm, khớp cách matrix tự tính.
      const diemTheoY: DiemTheoY | undefined = kind === 'true_false'
        ? { y1: toNum(p.ideaPoints[0]), y2: toNum(p.ideaPoints[1]), y3: toNum(p.ideaPoints[2]), y4: toNum(p.ideaPoints[3]) }
        : undefined;
      const diemMoiCau = kind === 'true_false' ? (diemTheoY?.y4 || 0) : toNum(p.ptsNormal);
      rows.push({
        key: `p${idx + 1}`,
        header: `${PART_LABELS[idx]}${p.content ? `: ${p.content}` : ''} (${t.name})`,
        kind,
        diemMoiCau,
        diemTheoY,
      });
    });
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

/** Áp dụng cấu hình điểm/phần (đã tải sẵn) lên danh sách câu hỏi THẬT của 1 đề cụ thể — thuần tính
 * toán (không gọi API), nên dùng lại được nhiều lần cho nhiều mã đề/tab khác nhau trong cùng 1 môn. */
export function applyPartScores(config: PartScoreConfig[] | null, questions: { type?: string }[]): PartScoreRow[] {
  if (!config) return [];
  return config.map(p => {
    const soCau = questions.filter(q => q.type === p.kind).length;
    return { ...p, soCau, tongDiem: Math.round(soCau * p.diemMoiCau * 100) / 100 };
  });
}

/** Tổng điểm toàn đề, cộng dồn từ các dòng điểm/phần — dùng để đối chiếu với "Tổng điểm" đã hiện sẵn
 * ở thông tin chung, không phải nguồn tính điểm chính (nguồn chính vẫn là backend, xem exams.py). */
export function sumPartScores(rows: PartScoreRow[]): number {
  return Math.round(rows.reduce((s, r) => s + r.tongDiem, 0) * 100) / 100;
}

/** 1 mục điểm hiện cạnh tiêu đề Phần — `perQuestion` dùng cho single/short (1 con số/câu), `perIdea`
 * dùng cho true_false (4 mức điểm theo số ý đúng, KHÔNG rút gọn về 1 con số vì sẽ sai với cách chấm
 * thật — 1 câu Đúng/Sai không phải "đúng hết hoặc 0 điểm" mà chấm riêng từng mức 1/2/3/4 ý đúng). */
export interface PartPointsInfo {
  perQuestion?: number;
  perIdea?: DiemTheoY;
}

/** Rút gọn PartScoreConfig thành map { type → điểm hiện cạnh tiêu đề } — khớp đúng field `type` của
 * PART_META (utils/examParts.ts) để ExamContentDisplay hiện thẳng vào tiêu đề mỗi Phần, thay vì phải
 * hiện 1 bảng riêng. */
export function toPartPointsMap(config: PartScoreConfig[] | null): Partial<Record<'single' | 'true_false' | 'short', PartPointsInfo>> {
  const map: Partial<Record<'single' | 'true_false' | 'short', PartPointsInfo>> = {};
  (config || []).forEach(p => {
    map[p.kind] = p.diemTheoY ? { perIdea: p.diemTheoY } : { perQuestion: p.diemMoiCau };
  });
  return map;
}
