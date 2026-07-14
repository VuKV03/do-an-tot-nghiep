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
