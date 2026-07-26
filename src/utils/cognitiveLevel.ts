/**
 * Ánh xạ 1 bản ghi "Cấp độ tư duy" thật (danh mục `cognitive_levels`, quản trị tại
 * quan-ly-danh-muc/cap-do-tu-duy) về đúng 1 trong 4 giá trị enum nội bộ cố định `CognitiveLevel`
 * (`nhan_biet | thong_hieu | van_dung | van_dung_cao`) mà phần còn lại của hệ thống dùng.
 *
 * Trước đây việc này khớp theo `code` — nhưng `code` là ô nhập tự do không theo chuẩn nào ("Mã cấp
 * độ" ở trang quản trị danh mục, không validate định dạng). Dữ liệu thật quan sát được:
 *   ('vv', 'Nhận biết'), ('TH', 'Thông hiểu'), ('xx', 'Vận dụng')
 * Danh sách code cứng cũ (`zz/l2/thong_hieu` cho Thông hiểu...) không khớp "TH", nên MỌI bản ghi
 * không khớp bị mặc định rơi về 'nhan_biet' — khiến "Thông hiểu" và "Vận dụng" (tuỳ dữ liệu) bị
 * lưu nhầm thành "Nhận biết" dù dropdown vẫn hiện đúng nhãn, và bị loại khỏi bộ lọc do trùng value
 * với "Nhận biết" sau khi dedupe. Sửa lại: khớp theo NAME (nhãn tiếng Việt do người quản trị nhập,
 * luôn mang đúng nghĩa) trước, code chỉ dùng làm phương án dự phòng tương thích ngược.
 */
import type { CognitiveLevel } from '../types';

interface CognitiveLevelLike {
  code: string;
  name: string;
}

function normalize(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

/** Khớp theo tên TRƯỚC (đáng tin cậy hơn mã tự do), mã chỉ dùng dự phòng. Kiểm tra "vận dụng cao"
 * trước "vận dụng" vì chuỗi sau là tập con của chuỗi trước. */
export function mapCognitiveLevelRecord(record: CognitiveLevelLike): CognitiveLevel {
  const name = normalize(record.name);
  const code = normalize(record.code);

  if (name.includes('van dung cao') || ['vdc', 'l4', 'van_dung_cao'].includes(code)) return 'van_dung_cao';
  if (name.includes('van dung') || ['vd', 'xx', 'l3', 'van_dung'].includes(code)) return 'van_dung';
  if (name.includes('thong hieu') || ['th', 'zz', 'l2', 'thong_hieu'].includes(code)) return 'thong_hieu';
  if (name.includes('nhan biet') || ['nb', 'vv', 'l1', 'nhan_biet'].includes(code)) return 'nhan_biet';

  // Không nhận diện được — không âm thầm mặc định về 'nhan_biet' như trước (gây trùng lẫn với bản
  // ghi khác đã khớp đúng), cảnh báo rõ ra console để biết mà sửa lại tên/mã trong danh mục.
  console.warn(
    `[cognitiveLevel] Không nhận diện được cấp độ tư duy "${record.name}" (mã "${record.code}") — tạm coi là "Nhận biết".`,
  );
  return 'nhan_biet';
}

/** Dựng options cho dropdown "Cấp độ tư duy" từ danh mục thật — loại trùng theo value đã ánh xạ
 * (giữ bản ghi xuất hiện trước), tránh 2 bản ghi khác nhau vô tình cùng rơi vào 1 giá trị. */
export function buildCognitiveLevelOptions<T extends CognitiveLevelLike>(
  records: T[],
): { value: CognitiveLevel; label: string }[] {
  const seen = new Set<CognitiveLevel>();
  const options: { value: CognitiveLevel; label: string }[] = [];
  records.forEach((r) => {
    const value = mapCognitiveLevelRecord(r);
    if (!seen.has(value)) {
      seen.add(value);
      options.push({ value, label: r.name });
    }
  });
  return options;
}
