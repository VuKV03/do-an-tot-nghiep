import { Question, MatrixConfig, TopicNode, SubjectOption, GradeOption, SystemUser, AuditLog } from './types';

export const SUBJECTS: SubjectOption[] = [
  { value: 'Toán học', label: 'Toán học' },
  { value: 'Vật lí', label: 'Vật lí' },
  { value: 'Tiếng Anh', label: 'Tiếng Anh' },
];

export const GRADES: GradeOption[] = [
  { value: 'Khối 10', label: 'Khối 10' },
  { value: 'Khối 11', label: 'Khối 11' },
  { value: 'Khối 12', label: 'Khối 12' }
];

export const TOPICS_TREE: { [key: string]: TopicNode[] } = {
  'Toán học': [
    {
      key: 'math-tp1',
      title: '1. Khảo sát & Vẽ đồ thị hàm số',
      children: [
        { key: 'math-sub1.1', title: '1.1. Tính đơn điệu của hàm số' },
        { key: 'math-sub1.2', title: '1.2. Cực trị và giá trị cực đại/cực tiểu' },
        { key: 'math-sub1.3', title: '1.3. Tiệm cận và khảo sát tiệm cận đứng/ngang' },
      ]
    },
    {
      key: 'math-tp2',
      title: '2. Nguyên hàm, Tích phân & Ứng dụng',
      children: [
        { key: 'math-sub2.1', title: '2.1. Định nghĩa và tính chất nguyên hàm' },
        { key: 'math-sub2.2', title: '2.2. Phương pháp đổi biến số & tích phân từng phần' },
        { key: 'math-sub2.3', title: '2.3. Tính diện tích hình phẳng & thể tích vật thể tròn xoay' },
      ]
    },
    {
      key: 'math-tp3',
      title: '3. Phương pháp tọa độ trong không gian Oxyz',
      children: [
        { key: 'math-sub3.1', title: '3.1. Hệ tọa độ Descartes không gian, tích vô hướng' },
        { key: 'math-sub3.2', title: '3.2. Phương trình tổng quát của mặt phẳng' },
        { key: 'math-sub3.3', title: '3.3. Phương trình tham số đường thẳng & mặt cầu' },
      ]
    }
  ],
  'Ngữ văn': [
    {
      key: 'lit-tp1',
      title: '1. Nghị luận văn học hiện đại',
      children: [
        { key: 'lit-sub1.1', title: '1.1. Tác phẩm Vợ chồng A Phủ (Tô Hoài)' },
        { key: 'lit-sub1.2', title: '1.2. Tác phẩm Chiếc thuyền ngoài xa (Nguyễn Minh Châu)' },
        { key: 'lit-sub1.3', title: '1.3. Tùy bút Người lái đò Sông Đà (Nguyễn Tuân)' },
      ]
    },
    {
      key: 'lit-tp2',
      title: '2. Đọc hiểu văn bản xã hội & Thơ nghệ thuật',
      children: [
        { key: 'lit-sub2.1', title: '2.1. Phân tích kết cấu văn bản nhật dụng' },
        { key: 'lit-sub2.2', title: '2.2. Biện pháp tu từ & Phong cách ngôn ngữ sinh hoạt' },
      ]
    }
  ],
  'Tiếng Anh': [
    {
      key: 'eng-tp1',
      title: '1. Grammar & Vocabulary structure',
      children: [
        { key: 'eng-sub1.1', title: '1.1. Tenses & Passive voices' },
        { key: 'eng-sub1.2', title: '1.2. Relative clauses & Conditionals' },
        { key: 'eng-sub1.3', title: '1.3. Collocations & Idioms in context' },
      ]
    },
    {
      key: 'eng-tp2',
      title: '2. Reading comprehension',
      children: [
        { key: 'eng-sub2.1', title: '2.1. Main idea & Detail matching questions' },
        { key: 'eng-sub2.2', title: '2.2. Pronoun reference & Vocabulary in context' },
      ]
    }
  ]
};

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q-math-1',
    code: 'MATH12-001',
    text: 'Đồng biến nghịch biến: Cho hàm số y = f(x) có đạo hàm f\'(x) = x*(x - 2)^2. Hàm số nghịch biến trên khoảng nào sau đây?',
    type: 'single',
    level: 'nhan_biet',
    status: 'approved',
    subject: 'Toán học',
    grade: 'Khối 12',
    topicId: 'math-sub1.1',
    topicName: '1. Khảo sát & Vẽ đồ thị hàm số',
    subTopicName: '1.1. Tính đơn điệu của hàm số',
    options: [
      'A. (0; 2)',
      'B. (-∞; 0)',
      'C. (2; +∞)',
      'D. (0; +∞)'
    ],
    correctAnswer: 'B. (-∞; 0)',
    creator: 'Nguyễn Tiến Dũng (GV Toán)',
    createdAt: '2026-06-01T14:30:00Z'
  },
  {
    id: 'q-math-2',
    code: 'MATH12-002',
    text: 'Cực trị bậc 3: Tìm tất cả các giá trị thực của tham số m để đồ thị hàm số y = x^3 - 3mx^2 + 4m^3 có hai điểm cực trị đối xứng nhau qua đường thẳng d: y = x.',
    type: 'single',
    level: 'van_dung_cao',
    status: 'approved',
    subject: 'Toán học',
    grade: 'Khối 12',
    topicId: 'math-sub1.2',
    topicName: '1. Khảo sát & Vẽ đồ thị hàm số',
    subTopicName: '1.2. Cực trị và giá trị cực đại/cực tiểu',
    options: [
      'A. m = 1 hoặc m = -1',
      'B. m = ±1/√2',
      'C. m = 0',
      'D. Không tồn tại m thỏa mãn'
    ],
    correctAnswer: 'B. m = ±1/√2',
    creator: 'Trần Minh Đức (GV Toán)',
    createdAt: '2026-06-03T10:15:00Z'
  },
  {
    id: 'q-math-3',
    code: 'MATH12-003',
    text: 'Tiệm cận ngang: Xác định tiệm cận ngang của đường cong đại số có phương trình y = (2x - 3) / (x + 1).',
    type: 'short',
    level: 'nhan_biet',
    status: 'approved',
    subject: 'Toán học',
    grade: 'Khối 12',
    topicId: 'math-sub1.3',
    topicName: '1. Khảo sát & Vẽ đồ thị hàm số',
    subTopicName: '1.3. Tiệm cận và khảo sát tiệm cận đứng/ngang',
    correctAnswer: 'y = 2',
    creator: 'Lê Hoàng Hải (Tổ trưởng Toán)',
    createdAt: '2026-06-08T08:00:00Z'
  },
  {
    id: 'q-math-4',
    code: 'MATH12-004',
    text: 'Nguyên hàm cơ bản: Họ tất cả các nguyên hàm của hàm số f(x) = cos(2x) là:',
    type: 'single',
    level: 'thong_hieu',
    status: 'pending',
    subject: 'Toán học',
    grade: 'Khối 12',
    topicId: 'math-sub2.1',
    topicName: '2. Nguyên hàm, Tích phân & Ứng dụng',
    subTopicName: '2.1. Định nghĩa và tính chất nguyên hàm',
    options: [
      'A. 2.sin(2x) + C',
      'B. -2.sin(2x) + C',
      'C. 0.5.sin(2x) + C',
      'D. -0.5.sin(2x) + C'
    ],
    correctAnswer: 'C. 0.5.sin(2x) + C',
    creator: 'Nguyễn Tiến Dũng (GV Toán)',
    createdAt: '2026-06-12T16:45:00Z'
  },
  {
    id: 'q-math-5',
    code: 'MATH12-005',
    text: 'Tích phân từng phần: Tính tích phân I = ∫ (từ 0 đến π/2) x*sin(x)dx.',
    type: 'single',
    level: 'van_dung',
    status: 'pending',
    subject: 'Toán học',
    grade: 'Khối 12',
    topicId: 'math-sub2.2',
    topicName: '2. Nguyên hàm, Tích phân & Ứng dụng',
    subTopicName: '2.2. Phương pháp đổi biến số & tích phân từng phần',
    options: [
      'A. I = 1',
      'B. I = π/2',
      'C. I = -1',
      'D. I = 0'
    ],
    correctAnswer: 'A. I = 1',
    creator: 'Vũ Thị Minh (GV Toán)',
    createdAt: '2026-06-13T09:30:00Z'
  },
  {
    id: 'q-math-6',
    code: 'MATH12-006',
    text: 'Không gian Oxyz: Trong không gian Oxyz, tìm tọa độ tâm I và bán kính R của mặt cầu (S): x^2 + y^2 + z^2 - 2x + 4y - 6z - 2 = 0.',
    type: 'short',
    level: 'thong_hieu',
    status: 'approved',
    subject: 'Toán học',
    grade: 'Khối 12',
    topicId: 'math-sub3.3',
    topicName: '3. Phương pháp tọa độ trong không gian Oxyz',
    subTopicName: '3.3. Phương trình tham số đường thẳng & mặt cầu',
    correctAnswer: 'I(1, -2, 3) và R = 4',
    creator: 'Lê Hoàng Hải (Tổ trưởng Toán)',
    createdAt: '2026-06-02T11:20:00Z'
  },
  {
    id: 'q-lit-1',
    code: 'LIT12-001',
    text: 'Ý nghĩa triết lý: Trong truyện ngắn "Chiếc thuyền ngoài xa" của Nguyễn Minh Châu, phát hiện thứ hai của nghệ sĩ Phùng ở bãi xe tăng hỏng mang ý nghĩa nghệ thuật gì?',
    type: 'single',
    level: 'van_dung',
    status: 'approved',
    subject: 'Ngữ văn',
    grade: 'Khối 12',
    topicId: 'lit-sub1.2',
    topicName: '1. Nghị luận văn học hiện đại',
    subTopicName: '1.2. Tác phẩm Chiếc thuyền ngoài xa (Nguyễn Minh Châu)',
    options: [
      'A. Bi kịch gia đình hàng chài đằng sau vẻ đẹp thơ mộng của ngoại cảnh thiên nhiên',
      'B. Tài năng phát hiện góc độ chụp ảnh quý giá bất ngờ',
      'C. Sự nghèo khổ túng quẫn làm biến đổi con người nghệ sĩ',
      'D. Lòng thù hận sâu sắc giữa các thế hệ'
    ],
    correctAnswer: 'A. Bi kịch gia đình hàng chài đằng sau vẻ đẹp thơ mộng của ngoại cảnh thiên nhiên',
    creator: 'Phan Thu Trang (GV Ngữ văn)',
    createdAt: '2026-05-20T10:00:00Z'
  },
  {
    id: 'q-lit-2',
    code: 'LIT12-002',
    text: 'Phân tích "Vợ chồng A Phủ": Hãy nêu giá trị hiện thực và giá trị nhân đạo của phân cảnh đêm tình mùa xuân ở Hồng Ngài.',
    type: 'short',
    level: 'van_dung_cao',
    status: 'draft',
    subject: 'Ngữ văn',
    grade: 'Khối 12',
    topicId: 'lit-sub1.1',
    topicName: '1. Nghị luận văn học hiện đại',
    subTopicName: '1.1. Tác phẩm Vợ chồng A Phủ (Tô Hoài)',
    correctAnswer: 'Tự luận phân tích sức sống tiềm tàng cứu rỗi nhân phẩm của Mị và tình lý giai cấp thống trị bóc lột.',
    creator: 'Phan Thu Trang (GV Ngữ văn)',
    createdAt: '2026-06-11T15:20:00Z'
  },
  {
    id: 'q-eng-1',
    code: 'ENG12-001',
    text: 'Sentence completion: If the weather _________ fine tomorrow, we will arrange an outdoor workshop for the students.',
    type: 'single',
    level: 'nhan_biet',
    status: 'approved',
    subject: 'Tiếng Anh',
    grade: 'Khối 12',
    topicId: 'eng-sub1.2',
    topicName: '1. Grammar & Vocabulary structure',
    subTopicName: '1.2. Relative clauses & Conditionals',
    options: [
      'A. is',
      'B. will be',
      'C. were',
      'D. would be'
    ],
    correctAnswer: 'A. is',
    creator: 'Bùi Thị Tuyết (GV Anh)',
    createdAt: '2026-06-10T09:00:00Z'
  },
  {
    id: 'q-eng-2',
    code: 'ENG12-002',
    text: 'True/False Grammatical structures checking on English conditionals and passive elements.',
    type: 'true_false',
    level: 'thong_hieu',
    status: 'pending',
    subject: 'Tiếng Anh',
    grade: 'Khối 12',
    topicId: 'eng-sub1.1',
    topicName: '1. Grammar & Vocabulary structure',
    subTopicName: '1.1. Tenses & Passive voices',
    options: [
      '1. "I wish I had gone to bed earlier last night" is a past regret.',
      '2. "They are being built a new house" is grammatically flawless.',
      '3. Both "Since" and "For" specify static durations in the present continuous.'
    ],
    correctAnswer: '1. True, 2. False, 3. False',
    creator: 'Bùi Thị Tuyết (GV Anh)',
    createdAt: '2026-06-13T11:00:00Z'
  }
];

export const INITIAL_MATRICES: MatrixConfig[] = [
  {
    id: 'mtr-1',
    code: 'MTR-MATH12-HK2',
    name: 'Ma trận đề kiểm tra học kỳ II - Môn Toán 12',
    subject: 'Toán học',
    grade: 'Khối 12',
    originalExamsCount: 4,
    rows: [
      {
        topicId: 'math-sub1.1',
        topicName: '1.1. Tính đơn điệu của hàm số',
        cells: { nhanBiet: 5, thongHieu: 3, vanDung: 2, vanDungCao: 1 }
      },
      {
        topicId: 'math-sub1.2',
        topicName: '1.2. Cực trị và giá trị cực đại/cực tiểu',
        cells: { nhanBiet: 4, thongHieu: 4, vanDung: 3, vanDungCao: 1 }
      },
      {
        topicId: 'math-sub2.1',
        topicName: '2.1. Định nghĩa và tính chất nguyên hàm',
        cells: { nhanBiet: 6, thongHieu: 4, vanDung: 2, vanDungCao: 0 }
      },
      {
        topicId: 'math-sub3.3',
        topicName: '3.3. Phương trình tham số đường thẳng & mặt cầu',
        cells: { nhanBiet: 5, thongHieu: 5, vanDung: 3, vanDungCao: 1 }
      }
    ]
  },
  {
    id: 'mtr-2',
    code: 'MTR-ENG12-GK2',
    name: 'Ma trận khảo sát năng lực Tiếng Anh ôn thi tốt nghiệp',
    subject: 'Tiếng Anh',
    grade: 'Khối 12',
    originalExamsCount: 3,
    rows: [
      {
        topicId: 'eng-sub1.1',
        topicName: '1.1. Tenses & Passive voices',
        cells: { nhanBiet: 8, thongHieu: 6, vanDung: 4, vanDungCao: 1 }
      },
      {
        topicId: 'eng-sub1.2',
        topicName: '1.2. Relative clauses & Conditionals',
        cells: { nhanBiet: 7, thongHieu: 5, vanDung: 3, vanDungCao: 2 }
      },
      {
        topicId: 'eng-sub2.1',
        topicName: '2.1. Main idea & Detail matching questions',
        cells: { nhanBiet: 4, thongHieu: 4, vanDung: 4, vanDungCao: 2 }
      }
    ]
  }
];

export const SYSTEM_USERS: SystemUser[] = [
  { id: 'u-1', username: 'dungnt', fullName: 'Nguyễn Tiến Dũng', email: 'dungnt@school.edu.vn', role: 'admin', status: 'active' },
  { id: 'u-2', username: 'hai_lh', fullName: 'Lê Hoàng Hải', email: 'hai.lh@school.edu.vn', role: 'teacher', status: 'active' },
  { id: 'u-3', username: 'trangpt', fullName: 'Phan Thu Trang', email: 'trangpt@school.edu.vn', role: 'reviewer', status: 'active' },
  { id: 'u-4', username: 'tuyetbt', fullName: 'Bùi Thị Tuyết', email: 'tuyetbt@school.edu.vn', role: 'teacher', status: 'active' }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-1', user: 'Phan Thu Trang', action: 'Duyệt câu hỏi', timestamp: '2026-06-14T08:12:00Z', details: 'Đã thẩm định thành công câu hỏi trắc nghiệm MATH12-001 thuộc môn Toán 12' },
  { id: 'log-2', user: 'Nguyễn Tiến Dũng', action: 'Tẩy dữ liệu ma trận', timestamp: '2026-06-14T07:55:00Z', details: 'Sửa cấu hình ma trận đề khảo sát năng lực Tiếng Anh ôn thi tốt nghiệp' },
  { id: 'log-3', user: 'Lê Hoàng Hải', action: 'Khởi tạo câu hỏi', timestamp: '2026-06-14T05:22:00Z', details: 'Thêm mới câu hỏi tự luận ngắn: MATH12-006' },
  { id: 'log-4', user: 'Nguyễn học sinh', action: 'Tải tài liệu và in ấn', timestamp: '2026-06-13T16:30:00Z', details: 'Tải gói đề thi gốc sinh từ Ma trận đề kiểm tra học kỳ II' }
];
