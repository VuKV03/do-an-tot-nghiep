/** Thứ tự 3 Phần trong đề thi tốt nghiệp THPT (Thông tư 22/2024) — PHẢI khớp đúng PART_META ở
 * ExamContentDisplay.tsx (thứ tự header hiển thị "Phần I/II/III"). Loại không nằm trong danh sách
 * (vd 'multiple' — câu hỏi nhóm) coi như đứng sau cùng, khớp bucket "Câu hỏi khác" ở cuối cùng bên đó.
 *
 * Dùng để sort câu hỏi CÙNG LOẠI đứng liền nhau đúng thứ tự Phần khi đọc lại `lineNumber` — cột này
 * đánh số lại từ 1 ở MỖI PHẦN (đúng cách "Câu N" hiển thị/xuất Word: Phần I câu 1..12, Phần II câu
 * 1..4,...), không phải 1 chỉ số tăng dần suốt toàn đề. Nếu chỉ sort thẳng theo `lineNumber` mà không
 * ưu tiên theo Phần trước, các câu Phần I/II/III cùng mang số 1 (hoặc 2, 3...) sẽ bị xáo lẫn vào nhau.
 */
const PART_ORDER: string[] = ['single', 'true_false', 'short'];

export function getPartOrder(type: string | undefined): number {
  const idx = PART_ORDER.indexOf(type || '');
  return idx === -1 ? PART_ORDER.length : idx;
}

/** Mô tả cách làm bài theo từng loại câu hỏi (KHÔNG kèm số thứ tự câu) — khớp đúng nội dung
 * ExamPortal.tsx hiển thị cho thí sinh lúc thi thật. Dùng chung cho ModalDeRiengLe.tsx (đánh số câu
 * LIÊN TỤC qua các Phần — xem getPartLabel ở đó, đúng cách getQuestionGlobalIndex/ExamPortal.tsx tính
 * số câu thật) và PART_META bên dưới (đánh số RESET lại từ 1 ở mỗi Phần — dùng cho preview quản trị/
 * xuất Word, xem comment ở compareByPartAndLineNumber). 2 nơi đánh số khác nhau nhưng PHẦN MÔ TẢ cách
 * làm bài phải giống hệt nhau — tách riêng ra đây để tránh lệch nội dung khi sửa. */
export const PART_DESCRIPTIONS: Record<string, string> = {
  single: 'Mỗi câu hỏi thí sinh chỉ chọn một phương án.',
  true_false: 'Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.',
  short: 'Thí sinh trả lời bằng cách nhập đáp án vào ô trống.',
};

/** Tiêu đề + hướng dẫn làm bài (đánh số RESET lại từ 1 ở mỗi Phần) — dùng cho UI xem trước quản trị
 * (ExamContentDisplay.tsx) và file Word xuất ra (examWordExport.ts). "N" trong `instruction` là
 * placeholder, thay bằng đúng số câu thật của Phần đó trước khi hiển thị. */
export const PART_META: { type: string; header: string; instruction: string }[] = [
  { type: 'single', header: 'Phần I: Trắc nghiệm 1 lựa chọn' },
  { type: 'true_false', header: 'Phần II: Trắc nghiệm Đúng/Sai' },
  { type: 'short', header: 'Phần III: Trắc nghiệm trả lời ngắn' },
].map(p => ({ ...p, instruction: `Thí sinh trả lời từ câu 1 đến câu N. ${PART_DESCRIPTIONS[p.type]}` }));

/** So sánh 2 câu hỏi để sort đúng thứ tự hiển thị: trước hết theo Phần (getPartOrder), sau đó theo
 * `lineNumber` trong phạm vi Phần đó (câu chưa có lineNumber coi như 1, đứng đầu Phần của nó). */
export function compareByPartAndLineNumber(
  a: { type?: string; lineNumber?: number },
  b: { type?: string; lineNumber?: number },
): number {
  const partDiff = getPartOrder(a.type) - getPartOrder(b.type);
  if (partDiff !== 0) return partDiff;
  return (a.lineNumber || 1) - (b.lineNumber || 1);
}
