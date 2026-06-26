// ============================================================
// Mock data simulating API responses per full_flow_spec.md
// Will be replaced by real API calls later
// ============================================================

// ------------------------------------------
// 2.1 GET /api/cau-hoi/chu-de/selectDM?other=mon_hoc
// ------------------------------------------
export interface MonHocOption {
  id: string;
  ten: string;
}

export const MOCK_MON_HOC: MonHocOption[] = [
  { id: 'mh-toan', ten: 'Toán học' },
  { id: 'mh-ly', ten: 'Vật lí' },
  { id: 'mh-anh', ten: 'Tiếng Anh' },
];

// ------------------------------------------
// 2.2 GET /api/cau-hoi/ma-tran/cai-dat-ma-tran/{mon_hoc_id}
// ------------------------------------------
export interface DmMucDo {
  id: string;
  ma: string;
  ten: string;
}

export interface DmThanhPhanNangLuc {
  id: string;
  ten: string;
}

export interface LoaiCauHoi {
  loai_cau_hoi_id: string;
  so_luong_cau: number;
  noi_dung_phan: string;
  dm_loai_cau_hoi: { id: string; ma: string; ten: string };
  diem: number;
}

export interface CaiDatMaTran {
  ds_dm_muc_do: DmMucDo[];
  ds_dm_thanh_phan_nang_luc: DmThanhPhanNangLuc[];
  ds_loai_cau_hoi: LoaiCauHoi[];
}

const MOCK_CAI_DAT_TOAN: CaiDatMaTran = {
  ds_dm_muc_do: [
    { id: 'md-1', ma: '1', ten: 'Nhận biết' },
    { id: 'md-2', ma: '2', ten: 'Thông hiểu' },
    { id: 'md-3', ma: '3', ten: 'Vận dụng' },
    { id: 'md-4', ma: '4', ten: 'Vận dụng cao' },
  ],
  ds_dm_thanh_phan_nang_luc: [
    { id: 'nl-1', ten: 'Tư duy và lập luận toán học' },
    // { id: 'nl-2', ten: 'Giải quyết vấn đề toán học' },
    // { id: 'nl-3', ten: 'Mô hình hóa toán học' },
  ],
  ds_loai_cau_hoi: [
    {
      loai_cau_hoi_id: 'lch-tn',
      so_luong_cau: 12, // Đã sửa từ 24 về 12
      noi_dung_phan: 'Phần I: Trắc nghiệm nhiều lựa chọn',
      dm_loai_cau_hoi: { id: 'lch-tn', ma: 'TN', ten: 'Trắc nghiệm nhiều lựa chọn' },
      diem: 0.25,
    },
    {
      loai_cau_hoi_id: 'lch-tln',
      so_luong_cau: 4,
      noi_dung_phan: 'Phần II: Trắc nghiệm Đúng/Sai',
      dm_loai_cau_hoi: { id: 'lch-tln', ma: 'TLN', ten: 'Trắc nghiệm Đúng/Sai' },
      diem: 1.0, // Điểm tối đa cho 1 câu lớn (4 ý)
    },
    {
      loai_cau_hoi_id: 'lch-ds',
      so_luong_cau: 6,
      noi_dung_phan: 'Phần III: Trả lời ngắn',
      dm_loai_cau_hoi: { id: 'lch-ds', ma: 'DS', ten: 'Trả lời ngắn' },
      diem: 0.5, // Đã sửa từ 0.25 lên 0.5
    },
  ],
};

const MOCK_CAI_DAT_VAT_LY: CaiDatMaTran = {
  // Mức độ nhận thức (giữ nguyên theo chuẩn 4 mức)
  ds_dm_muc_do: [
    { id: 'md-1', ma: '1', ten: 'Nhận biết' },
    { id: 'md-2', ma: '2', ten: 'Thông hiểu' },
    { id: 'md-3', ma: '3', ten: 'Vận dụng' },
    { id: 'md-4', ma: '4', ten: 'Vận dụng cao' },
  ],
  ds_dm_thanh_phan_nang_luc: [
    { id: 'nl-vl1', ten: 'Nhận thức vật lí' },
    { id: 'nl-vl2', ten: 'Tìm hiểu thế giới tự nhiên dưới góc độ vật lí' },
    { id: 'nl-vl3', ten: 'Vận dụng kiến thức, kĩ năng đã học' },
  ],
  ds_loai_cau_hoi: [
    {
      loai_cau_hoi_id: 'lch-tn',
      so_luong_cau: 18, // 18 câu trắc nghiệm
      noi_dung_phan: 'Phần I: Trắc nghiệm nhiều lựa chọn',
      dm_loai_cau_hoi: { id: 'lch-tn', ma: 'TN', ten: 'Trắc nghiệm' },
      diem: 0.25,
    },
    {
      loai_cau_hoi_id: 'lch-tln',
      so_luong_cau: 4, // 4 câu hỏi lớn
      noi_dung_phan: 'Phần II: Trắc nghiệm Đúng/Sai',
      dm_loai_cau_hoi: { id: 'lch-tln', ma: 'TLN', ten: 'Đúng/Sai' },
      diem: 1.0, // Điểm tối đa cho 4 ý
    },
    {
      loai_cau_hoi_id: 'lch-ds',
      so_luong_cau: 6, // 6 câu trả lời ngắn
      noi_dung_phan: 'Phần III: Trả lời ngắn',
      dm_loai_cau_hoi: { id: 'lch-ds', ma: 'DS', ten: 'Trả lời ngắn' },
      diem: 0.25, // Thường là 0.25 hoặc 0.5 tùy barem từng năm
    },
  ],
};

const MOCK_CAI_DAT_TIENG_ANH: CaiDatMaTran = {
  ds_dm_muc_do: [
    { id: 'md-1', ma: '1', ten: 'Nhận biết' },
    { id: 'md-2', ma: '2', ten: 'Thông hiểu' },
    { id: 'md-3', ma: '3', ten: 'Vận dụng' },
    { id: 'md-4', ma: '4', ten: 'Vận dụng cao' },
  ],
  ds_dm_thanh_phan_nang_luc: [
    { id: 'nl-ta1', ten: 'Năng lực ngôn ngữ' },
    { id: 'nl-ta2', ten: 'Năng lực giao tiếp' },
  ],
  ds_loai_cau_hoi: [
    {
      loai_cau_hoi_id: 'lch-dien-tu-ngan',
      so_luong_cau: 12,
      noi_dung_phan: 'Điền từ/cụm từ ngắn',
      dm_loai_cau_hoi: { id: 'lch-dt-ngan', ma: 'DTN', ten: 'Trắc nghiệm' },
      diem: 0.25,
    },
    {
      loai_cau_hoi_id: 'lch-sap-xep',
      so_luong_cau: 5,
      noi_dung_phan: 'Sắp xếp câu đúng thứ tự',
      dm_loai_cau_hoi: { id: 'lch-sx', ma: 'SX', ten: 'Trắc nghiệm' },
      diem: 0.25,
    },
    {
      loai_cau_hoi_id: 'lch-dien-tu-dai',
      so_luong_cau: 5,
      noi_dung_phan: 'Điền câu/cụm từ dài',
      dm_loai_cau_hoi: { id: 'lch-dtd', ma: 'DTD', ten: 'Trắc nghiệm' },
      diem: 0.25,
    },
    {
      loai_cau_hoi_id: 'lch-doc-hieu',
      so_luong_cau: 18, // Chia làm 2 bài đọc (8 câu + 10 câu)
      noi_dung_phan: 'Đọc hiểu',
      dm_loai_cau_hoi: { id: 'lch-dh', ma: 'DH', ten: 'Trắc nghiệm' },
      diem: 0.25,
    },
  ],
};

export const MOCK_CAI_DAT_MAP: Record<string, CaiDatMaTran> = {
  'mh-toan': MOCK_CAI_DAT_TOAN,
  'mh-anh': MOCK_CAI_DAT_TIENG_ANH,
  'mh-ly': MOCK_CAI_DAT_VAT_LY,
};

// ------------------------------------------
// 2.3 GET /api/cau-hoi/chu-de?mon_hoc_id={id}
// Topic tree (cha-con)
// ------------------------------------------
export interface ChuDeNode {
  id: string;
  ma: string;
  ten: string;
  so_tiet?: number;
  ten_khoi_lop?: string;
  is_dung_sai?: boolean;
  ds_cau_hoi?: {
    muc_do_id: string;
    loai_cau_hoi_id: string;
    nang_luc_id: string;
    so_luong: number;
  }[];
  children: ChuDeNode[];
}

const MOCK_CHU_DE_TOAN: ChuDeNode[] = [
  {
    id: 'cd-t1', ma: 'CD01', ten: 'Khảo sát & Vẽ đồ thị hàm số', so_tiet: 12, is_dung_sai: false,
    children: [
      {
        id: 'cd-t1-1', ma: 'CD01.1', ten: 'Tính đơn điệu của hàm số', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 8 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 5 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 3 },
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-1', so_luong: 4 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-2', so_luong: 2 },
        ],
        children: [],
      },
      {
        id: 'cd-t1-2', ma: 'CD01.2', ten: 'Cực trị và giá trị lớn nhất, nhỏ nhất', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 6 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 4 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 5 },
          { muc_do_id: 'md-4', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 2 },
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-1', so_luong: 3 },
        ],
        children: [],
      },
      {
        id: 'cd-t1-3', ma: 'CD01.3', ten: 'Tiệm cận đứng/ngang', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 5 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 3 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-1', so_luong: 2 },
        ],
        children: [],
      },
    ],
  },
  {
    id: 'cd-t2', ma: 'CD02', ten: 'Nguyên hàm, Tích phân & Ứng dụng', so_tiet: 15, is_dung_sai: false,
    children: [
      {
        id: 'cd-t2-1', ma: 'CD02.1', ten: 'Định nghĩa và tính chất nguyên hàm', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 7 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 5 },
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tln', nang_luc_id: 'nl-1', so_luong: 3 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tln', nang_luc_id: 'nl-2', so_luong: 2 },
        ],
        children: [],
      },
      {
        id: 'cd-t2-2', ma: 'CD02.2', ten: 'Đổi biến số & tích phân từng phần', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 4 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 6 },
          { muc_do_id: 'md-4', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 3 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-1', so_luong: 2 },
        ],
        children: [],
      },
      {
        id: 'cd-t2-3', ma: 'CD02.3', ten: 'Diện tích hình phẳng & thể tích vật tròn xoay', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 5 },
          { muc_do_id: 'md-4', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 4 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-2', so_luong: 2 },
        ],
        children: [],
      },
    ],
  },
  {
    id: 'cd-t3', ma: 'CD03', ten: 'Phương pháp tọa độ trong không gian Oxyz', so_tiet: 18, is_dung_sai: false,
    children: [
      {
        id: 'cd-t3-1', ma: 'CD03.1', ten: 'Hệ tọa độ Descartes, tích vô hướng', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 6 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 4 },
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-1', so_luong: 3 },
        ],
        children: [],
      },
      {
        id: 'cd-t3-2', ma: 'CD03.2', ten: 'Phương trình tổng quát mặt phẳng', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 5 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 5 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 3 },
          { muc_do_id: 'md-4', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-2', so_luong: 1 },
        ],
        children: [],
      },
      {
        id: 'cd-t3-3', ma: 'CD03.3', ten: 'Phương trình đường thẳng & mặt cầu', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-1', so_luong: 4 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 6 },
          { muc_do_id: 'md-4', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-2', so_luong: 3 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-2', so_luong: 2 },
        ],
        children: [],
      },
    ],
  },
];

const MOCK_CHU_DE_VAN: ChuDeNode[] = [
  {
    id: 'cd-v1', ma: 'CDV01', ten: 'Nghị luận văn học hiện đại', so_tiet: 20, is_dung_sai: false,
    children: [
      {
        id: 'cd-v1-1', ma: 'CDV01.1', ten: 'Vợ chồng A Phủ (Tô Hoài)', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-v1', so_luong: 5 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-v2', so_luong: 4 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-tl', nang_luc_id: 'nl-v2', so_luong: 2 },
        ],
        children: [],
      },
      {
        id: 'cd-v1-2', ma: 'CDV01.2', ten: 'Chiếc thuyền ngoài xa (NMC)', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-v1', so_luong: 4 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-v2', so_luong: 3 },
          { muc_do_id: 'md-4', loai_cau_hoi_id: 'lch-tl', nang_luc_id: 'nl-v2', so_luong: 1 },
        ],
        children: [],
      },
    ],
  },
  {
    id: 'cd-v2', ma: 'CDV02', ten: 'Đọc hiểu văn bản xã hội & Thơ', so_tiet: 14, is_dung_sai: false,
    children: [
      {
        id: 'cd-v2-1', ma: 'CDV02.1', ten: 'Phân tích kết cấu văn bản nhật dụng', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-v1', so_luong: 6 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-v1', so_luong: 3 },
        ],
        children: [],
      },
      {
        id: 'cd-v2-2', ma: 'CDV02.2', ten: 'Biện pháp tu từ & Phong cách ngôn ngữ', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-v1', so_luong: 5 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-tl', nang_luc_id: 'nl-v2', so_luong: 2 },
        ],
        children: [],
      },
    ],
  },
];

const MOCK_CHU_DE_VAT_LY: ChuDeNode[] = [
  {
    id: 'cd-l1', ma: 'CDL01', ten: 'Vật lí nhiệt', so_tiet: 10, is_dung_sai: false,
    children: [
      {
        id: 'cd-l1-1', ma: 'CDL01.1', ten: 'Thuyết động học phân tử chất khí', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-vl1', so_luong: 6 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-vl1', so_luong: 4 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-vl2', so_luong: 2 },
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-vl1', so_luong: 4 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tln', nang_luc_id: 'nl-vl2', so_luong: 2 },
        ],
        children: [],
      },
      {
        id: 'cd-l1-2', ma: 'CDL01.2', ten: 'Định luật Boyle và định luật Charles', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-vl1', so_luong: 5 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-tn', nang_luc_id: 'nl-vl2', so_luong: 4 },
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-vl1', so_luong: 3 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-ds', nang_luc_id: 'nl-vl2', so_luong: 2 },
        ],
        children: [],
      }
    ]
  }
];

const MOCK_CHU_DE_TIENG_ANH: ChuDeNode[] = [
  {
    id: 'cd-a1', ma: 'CDA01', ten: 'Vocabulary & Grammar', so_tiet: 12, is_dung_sai: false,
    children: [
      {
        id: 'cd-a1-1', ma: 'CDA01.1', ten: 'Tenses and Agreement', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-1', loai_cau_hoi_id: 'lch-dien-tu-ngan', nang_luc_id: 'nl-ta1', so_luong: 10 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-dien-tu-ngan', nang_luc_id: 'nl-ta1', so_luong: 8 },
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-sap-xep', nang_luc_id: 'nl-ta1', so_luong: 5 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-dien-tu-dai', nang_luc_id: 'nl-ta2', so_luong: 4 },
        ],
        children: [],
      },
      {
        id: 'cd-a1-2', ma: 'CDA01.2', ten: 'Reading Comprehension - General Topics', ten_khoi_lop: 'Khối 12',
        ds_cau_hoi: [
          { muc_do_id: 'md-2', loai_cau_hoi_id: 'lch-doc-hieu', nang_luc_id: 'nl-ta2', so_luong: 12 },
          { muc_do_id: 'md-3', loai_cau_hoi_id: 'lch-doc-hieu', nang_luc_id: 'nl-ta2', so_luong: 10 },
          { muc_do_id: 'md-4', loai_cau_hoi_id: 'lch-doc-hieu', nang_luc_id: 'nl-ta2', so_luong: 5 },
        ],
        children: [],
      }
    ]
  }
];

export const MOCK_CHU_DE_MAP: Record<string, ChuDeNode[]> = {
  'mh-toan': MOCK_CHU_DE_TOAN,
  'mh-van': MOCK_CHU_DE_VAN,
  'mh-anh': MOCK_CHU_DE_TIENG_ANH,
  'mh-ly': MOCK_CHU_DE_VAT_LY,
  'mh-hoa': MOCK_CHU_DE_TOAN,
  'mh-sinh': MOCK_CHU_DE_TOAN,
};

// ------------------------------------------
// Interfaces matching spec section 3
// ------------------------------------------
export interface ItemMaTranData {
  id?: string;
  muc_do_id: string | null;
  loai_cau_hoi_id: string | null;
  nang_luc_id?: any;
  so_cau: number | null;
  tong_so_cau?: number | null;
  diem?: number | null;
}

export interface MaTranData {
  id?: string;
  noi_dung_kien_thuc: string | null;
  noi_dung_id: string | null;
  ma_noi_dung?: string;
  don_vi_kien_thuc: string;
  don_vi_id: string;
  ma_don_vi?: string;
  so_tiet: number;
  is_dung_sai: boolean;
  ds_loai_cau_hoi: ItemMaTranData[];
  ti_le?: string;
}

// ------------------------------------------
// Helper: simulate API delay
// ------------------------------------------
export function fakeDelay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------------------------------------------
// Simulated API functions
// ------------------------------------------

/** 2.1 Lấy danh sách Môn học */
export async function apiGetMonHoc(): Promise<MonHocOption[]> {
  await fakeDelay(300);
  return MOCK_MON_HOC;
}

/** 2.2 Lấy Cài đặt Ma trận theo Môn */
export async function apiGetCaiDatMaTran(monHocId: string): Promise<CaiDatMaTran> {
  await fakeDelay(500);
  return MOCK_CAI_DAT_MAP[monHocId] || MOCK_CAI_DAT_MAP['mh-toan'];
}

/** 2.3 Lấy Chủ đề theo Môn (cây cha-con) */
export async function apiGetChuDe(monHocId: string): Promise<ChuDeNode[]> {
  await fakeDelay(600);
  return MOCK_CHU_DE_MAP[monHocId] || MOCK_CHU_DE_MAP['mh-toan'];
}

/** 2.5 Lưu ma trận */
export async function apiSaveMaTran(payload: any): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/matrix-configs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { success: false, message: 'Lỗi kết nối API khi lưu ma trận.' };
  }
}
