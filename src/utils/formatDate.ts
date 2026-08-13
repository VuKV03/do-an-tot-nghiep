/**
 * Định dạng chuỗi ngày giờ ISO 8601 UTC trả về từ backend (vd: "2026-07-14T08:30:00Z")
 * sang dạng hiển thị tiếng Việt. Dùng chung cho mọi bảng/màn hình chi tiết thay vì
 * hiển thị thẳng chuỗi ISO thô.
 */
export const formatDateTime = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('vi-VN');
};

export const formatDateOnly = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('vi-VN');
};

/**
 * Định dạng "dd-mm-yyyy" (có số 0 đứng trước, dùng dấu gạch ngang) — dùng cho các cột/bộ lọc "Ngày
 * tạo" cần đúng dạng này thay vì để thô "yyyy-mm-dd" (ISO) như trước, hoặc "dd/mm/yyyy" (dấu gạch
 * chéo) mặc định của formatDateOnly()/toLocaleDateString. Thao tác trực tiếp trên chuỗi (không dựng
 * `new Date()`) để tránh lệch ngày do múi giờ khi input chỉ là phần ngày "yyyy-mm-dd" không có giờ.
 */
export const formatDateDMY = (value?: string | null): string => {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return String(value);
  const [, yyyy, mm, dd] = match;
  return `${dd}-${mm}-${yyyy}`;
};
