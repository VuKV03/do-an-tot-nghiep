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
