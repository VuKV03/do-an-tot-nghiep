/**
 * Ánh xạ 1 bản ghi "Loại hình câu hỏi" thật (danh mục `question_types`, quản trị tại
 * quan-ly-danh-muc/loai-hinh-cau-hoi) về đúng 1 giá trị `QuestionType` nội bộ
 * (`single | multiple | true_false | short`) mà phần còn lại của hệ thống dùng.
 *
 * Dữ liệu thật hiện có trong danh mục (đã kiểm tra trực tiếp trên DB):
 *   ('TN', 'Trắc nghiệm'), ('TLN', 'Trả lời ngắn'), ('DS', 'Đúng sai')
 * — KHÔNG có bản ghi nào cho "Trắc nghiệm nhiều lựa chọn" (multiple/Câu hỏi nhóm). Các bộ lọc
 * "Loại câu hỏi" ở `tab-ngan-hang-cau-hoi/index.tsx` và `tham-dinh-cau-hoi/index.tsx` trước đây
 * fix cứng 4 lựa chọn (single/multiple/true_false/short) — thừa hẳn 1 lựa chọn ("multiple") không
 * hề tồn tại trong danh mục thật. Dùng `buildQuestionTypeFilterOptions` để build đúng theo dữ liệu
 * động thay vì hard-code.
 */
import type { QuestionType } from '../types';
import type { QuestionTypeAPI } from '../services/danhMucApi';

/** Map một bản ghi thật trong danh mục "Loại hình câu hỏi" (question_types) về QuestionType nội bộ. */
export function resolveInternalQuestionType(item: QuestionTypeAPI): QuestionType {
  const code = (item.code || '').toUpperCase().trim();
  const name = (item.name || '').toLowerCase();

  if (['SINGLE', 'TN'].includes(code) || name.includes('một đáp án') || name.includes('mot dap an')) {
    return 'single';
  }
  if (['MULTI', 'MULTIPLE', 'CHN'].includes(code) || name.includes('nhiều đáp án') || name.includes('nhom') || name.includes('nhóm')) {
    return 'multiple';
  }
  if (['TRUEFALSE', 'DS'].includes(code) || (name.includes('đúng') && name.includes('sai'))) {
    return 'true_false';
  }
  if (['SHORT', 'ESSAY', 'TLN'].includes(code) || name.includes('ngắn') || name.includes('ngan') || name.includes('tự luận') || name.includes('tu luan')) {
    return 'short';
  }
  return 'single';
}

/** Dựng options cho dropdown lọc "Loại câu hỏi" từ danh mục thật — loại trùng theo value đã ánh xạ
 * (giữ bản ghi xuất hiện trước). Không tự thêm option "Tất cả" — gọi nơi dùng tự thêm nếu cần. */
export function buildQuestionTypeFilterOptions(records: QuestionTypeAPI[]): { value: QuestionType; label: string }[] {
  const seen = new Set<QuestionType>();
  const options: { value: QuestionType; label: string }[] = [];
  records.forEach((r) => {
    const value = resolveInternalQuestionType(r);
    if (!seen.has(value)) {
      seen.add(value);
      options.push({ value, label: r.name });
    }
  });
  return options;
}
