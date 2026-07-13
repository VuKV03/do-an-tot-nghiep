// Cấu trúc menu phân cấp của hệ thống, được sử dụng để phân quyền truy cập
export const MENU_STRUCTURE = [
  {
    key: 'xay-dung-de',
    label: 'Xây dựng đề thi',
    children: [
      { key: 'quan-ly-ma-tran-de', label: 'Quản lý ma trận đề' },
      { key: 'quan-ly-de-thi-goi-de', label: 'Quản lý đề thi & gói đề' }
    ]
  },
  {
    key: 'quan-ly-nhch',
    label: 'Quản lý ngân hàng câu hỏi',
    children: [
      { key: 'chu-de-cau-hoi', label: 'Chủ đề câu hỏi' },
      { key: 'ngan-hang-cau-hoi', label: 'Ngân hàng câu hỏi' },
      { key: 'thong-ke-nhch', label: 'Thống kê NHCH' }
    ]
  },
  {
    key: 'quan-tri-he-thong',
    label: 'Quản trị hệ thống',
    children: [
      { key: 'quan-ly-nguoi-dung', label: 'Quản lý người dùng' },
      { key: 'quan-ly-nhom-nguoi-dung', label: 'Quản lý nhóm người dùng' },
      { key: 'chinh-sach-bao-mat', label: 'Chính sách bảo mật' }
    ]
  },
  {
    key: 'quan-tri-danh-muc',
    label: 'Quản trị danh mục',
    children: [
      { key: 'danh-muc-mon-hoc', label: 'Danh mục môn học' },
      { key: 'danh-muc-khoi-lop', label: 'Danh mục khối lớp' },
      { key: 'cap-do-tu-duy', label: 'Cấp độ tư duy' },
      { key: 'loai-hinh-cau-hoi', label: 'Loại hình câu hỏi' },
      { key: 'thanh-phan-nang-luc', label: 'Thành phần năng lực' },
      { key: 'danh-muc-dot-thi', label: 'Danh mục kỳ thi' }
    ]
  }
];

// Bản đồ ánh xạ giữa các module trong hệ thống và danh sách quyền (permissions) cần thiết để truy cập
export const PERMISSION_MAP: Record<string, string[]> = {
  'xay-dung-de': ['matrices.manage', 'matrices.submit', 'matrices.approve', 'exams.manage', 'exams.submit', 'exams.approve', 'exams.generate_variants', 'exams.export', 'exams.test_run'],
  'quan-ly-ma-tran-de': ['matrices.manage', 'matrices.submit', 'matrices.approve'],
  'quan-ly-de-thi-goi-de': ['exams.manage', 'exams.submit', 'exams.approve', 'exams.generate_variants', 'exams.export', 'exams.test_run'],

  'to-chuc-thi': ['sessions.manage', 'sessions.monitor', 'results.view'],
  'quan-ly-ky-thi': ['sessions.manage', 'sessions.monitor'],
  'quan-ly-thi-sinh': ['sessions.manage', 'sessions.monitor'],
  'quan-ly-de-thi': ['sessions.manage', 'exams.manage'],
  'quan-ly-ket-qua-thi': ['results.view'],

  'quan-ly-nhch': ['topics.manage', 'topics.submit', 'topics.approve', 'questions.manage', 'questions.submit', 'questions.approve'],
  'chu-de-cau-hoi': ['topics.manage', 'topics.submit', 'topics.approve'],
  'ngan-hang-cau-hoi': ['questions.manage', 'questions.submit', 'questions.approve'],
  'thong-ke-nhch': ['topics.manage', 'questions.manage', 'topics.approve', 'questions.approve'],

  'quan-tri-he-thong': ['system.users', 'system.groups'],
  'quan-ly-nguoi-dung': ['system.users'],
  'quan-ly-nhom-nguoi-dung': ['system.groups'],
  'chinh-sach-bao-mat': ['system.groups'],

  'quan-tri-danh-muc': ['system.categories'],
  'danh-muc-mon-hoc': ['system.categories'],
  'danh-muc-khoi-lop': ['system.categories'],
  'cap-do-tu-duy': ['system.categories'],
  'loai-hinh-cau-hoi': ['system.categories'],
  'thanh-phan-nang-luc': ['system.categories'],
  'danh-muc-dot-thi': ['system.categories']
};
