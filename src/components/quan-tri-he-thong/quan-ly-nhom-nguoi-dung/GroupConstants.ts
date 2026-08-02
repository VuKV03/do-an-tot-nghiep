// Cấu trúc menu phân cấp của hệ thống, được sử dụng để phân quyền truy cập
export const MENU_STRUCTURE = [
  {
    key: 'xay-dung-de',
    label: 'Xây dựng đề thi',
    children: [
      {
        key: 'quan-ly-ma-tran-de',
        label: 'Quản lý ma trận đề',
        children: [
          { key: 'tab-ma-tran-de', label: 'Ma trận đề' },
          { key: 'tab-tham-dinh-ma-tran-de', label: 'Thẩm định ma trận đề' }
        ]
      },
      {
        key: 'quan-ly-de-thi-goi-de',
        label: 'Quản lý đề gốc',
        children: [
          { key: 'tab-de-goc', label: 'Đề gốc' },
          { key: 'tab-tham-dinh-de-goc', label: 'Thẩm định đề gốc' }
        ]
      },
      {
        key: 'quan-ly-goi-de',
        label: 'Quản lý gói đề',
        children: [
          { key: 'tab-goi-de', label: 'Gói đề' },
          { key: 'tab-tham-dinh-goi-de', label: 'Thẩm định gói đề' }
        ]
      }
    ]
  },
  {
    key: 'to-chuc-thi',
    label: 'Tổ chức thi',
    children: [
      { key: 'quan-ly-thi-sinh', label: 'Quản lý thí sinh' },
      { key: 'quan-ly-ket-qua-thi', label: 'Quản lý kết quả thi' }
    ]
  },
  {
    key: 'quan-ly-nhch',
    label: 'Quản lý ngân hàng câu hỏi',
    children: [
      {
        key: 'chu-de-cau-hoi',
        label: 'Chủ đề câu hỏi',
        children: [
          { key: 'tab-chu-de-cau-hoi', label: 'Chủ đề câu hỏi' },
          { key: 'tab-tham-dinh-chu-de', label: 'Thẩm định chủ đề' }
        ]
      },
      {
        key: 'ngan-hang-cau-hoi',
        label: 'Ngân hàng câu hỏi',
        children: [
          { key: 'tab-ngan-hang-cau-hoi', label: 'Ngân hàng câu hỏi' },
          { key: 'tab-tham-dinh-cau-hoi', label: 'Thẩm định câu hỏi' }
        ]
      },
      { key: 'thong-ke-nhch', label: 'Thống kê NHCH' }
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
      { key: 'thanh-phan-nang-luc', label: 'Thành phần năng lực' }
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
  }
];

// Bản đồ ánh xạ giữa các module trong hệ thống và danh sách quyền (permissions) cần thiết để truy cập
export const PERMISSION_MAP: Record<string, string[]> = {
  'xay-dung-de': ['matrices.manage', 'matrices.submit', 'matrices.approve', 'exams.manage', 'exams.submit', 'exams.approve', 'exams.generate_variants', 'exams.export', 'exams.test_run'],
  'quan-ly-ma-tran-de': ['matrices.manage', 'matrices.submit', 'matrices.approve'],
  'tab-ma-tran-de': ['matrices.manage', 'matrices.submit'],
  'tab-tham-dinh-ma-tran-de': ['matrices.approve'],

  'quan-ly-de-thi-goi-de': ['exams.manage', 'exams.submit', 'exams.approve', 'exams.generate_variants', 'exams.export', 'exams.test_run'],
  'tab-de-goc': ['exams.manage', 'exams.submit', 'exams.generate_variants', 'exams.export', 'exams.test_run'],
  'tab-tham-dinh-de-goc': ['exams.approve'],

  'quan-ly-goi-de': ['exams.manage', 'exams.submit', 'exams.approve', 'exams.generate_variants', 'exams.export', 'exams.test_run'],
  'tab-goi-de': ['exams.manage', 'exams.submit', 'exams.generate_variants', 'exams.export', 'exams.test_run'],
  'tab-tham-dinh-goi-de': ['exams.approve'],

  'to-chuc-thi': ['sessions.manage', 'sessions.monitor', 'results.view'],
  'quan-ly-thi-sinh': ['sessions.manage', 'sessions.monitor'],
  'quan-ly-ket-qua-thi': ['results.view'],

  'quan-ly-nhch': ['topics.manage', 'topics.submit', 'topics.approve', 'questions.manage', 'questions.submit', 'questions.approve', 'questions.delete', 'questions.export'],
  'chu-de-cau-hoi': ['topics.manage', 'topics.submit', 'topics.approve'],
  'tab-chu-de-cau-hoi': ['topics.manage', 'topics.submit'],
  'tab-tham-dinh-chu-de': ['topics.approve'],

  'ngan-hang-cau-hoi': ['questions.manage', 'questions.submit', 'questions.approve', 'questions.delete', 'questions.export'],
  'tab-ngan-hang-cau-hoi': ['questions.manage', 'questions.submit', 'questions.delete', 'questions.export'],
  'tab-tham-dinh-cau-hoi': ['questions.approve'],

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
  'thanh-phan-nang-luc': ['system.categories']
};
