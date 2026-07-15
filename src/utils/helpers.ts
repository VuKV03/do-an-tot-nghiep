export const getBreadcrumbTitle = (activeMenuKey: string) => {
  switch (activeMenuKey) {
    case 'dashboard': return 'Bảng tổng quan điều khiển';
    case 'quan-ly-ma-tran-de': return 'Xây dựng đề thi/ Quản lý ma trận đề';
    case 'quan-ly-de-thi-goi-de': return 'Xây dựng đề thi / Quản lý đề thi';
    case 'quan-ly-goi-de': return 'Xây dựng đề thi / Quản lý gói đề';
    case 'quan-ly-ky-thi': return 'Tổ chức thi / Quản lý kỳ thi';
    case 'quan-ly-thi-sinh': return 'Tổ chức thi / Quản lý thí sinh';
    case 'quan-ly-de-thi': return 'Tổ chức thi / Quản lý đề thi';
    case 'quan-ly-ket-qua-thi': return 'Tổ chức thi / Quản lý kết quả thi';
    case 'ngan-hang-cau-hoi': return 'Quản lý ngân hàng câu hỏi / Ngân hàng câu hỏi';
    case 'chu-de-cau-hoi': return 'Quản lý ngân hàng câu hỏi / Chủ đề câu hỏi';
    case 'thong-ke-nhch': return 'Quản lý ngân hàng câu hỏi / Thống kê NHCH';
    case 'quan-ly-nguoi-dung': return 'Quản trị hệ thống / Quản lý người dùng';
    case 'quan-ly-nhom-nguoi-dung': return 'Quản trị hệ thống / Quản lý nhóm người dùng';
    case 'chinh-sach-bao-mat': return 'Quản trị hệ thống / Chính sách bảo mật';
    case 'danh-muc-mon-hoc': return 'Quản trị danh mục / Danh mục môn học';
    case 'danh-muc-khoi-lop': return 'Quản trị danh mục / Danh mục khối lớp';
    case 'cap-do-tu-duy': return 'Quản trị danh mục / Cấp độ tư duy';
    case 'loai-hinh-cau-hoi': return 'Quản trị danh mục / Loại hình câu hỏi';
    case 'thanh-phan-nang-luc': return 'Quản trị danh mục / Thành phần năng lực';
    case 'danh-muc-dot-thi': return 'Quản trị danh mục / Danh mục kỳ thi';
    default: return `Phân hệ / ${activeMenuKey.replace(/-/g, ' ')}`;
  }
};

export const getUserInitials = (name?: string | null) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'admin': return 'Quản trị viên';
    case 'teacher': return 'Giáo viên bộ môn';
    case 'reviewer': return 'Chuyên gia giám định';
    default: return 'Người dùng hệ thống';
  }
};
