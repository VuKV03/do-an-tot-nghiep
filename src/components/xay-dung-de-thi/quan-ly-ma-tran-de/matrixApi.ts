import { API_ORIGIN } from '../../../config/apiBase';
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

// API calls will now dynamically fetch this data.

// ------------------------------------------
// 2.2 GET /api/cau-hoi/ma-tran/cai-dat-ma-tran/{mon_hoc_id}
// ------------------------------------------
export interface DmMucDo {
  id: string;
  ma: string;
  ten: string;
}

export interface CompetencyComponent {
  id: string;
  ten: string;
}

export interface LoaiCauHoi {
  loai_cau_hoi_id: string;
  so_luong_cau: number;
  noi_dung_phan: string;
  dm_loai_cau_hoi: { id: string; ma: string; ten: string };
  diem: number;
  /** Điểm theo số ý đúng (1/2/3/4) — chỉ có ở Phần II (Đúng/Sai) lấy từ "Cấu hình môn học" */
  diem_theo_y?: { y1: number; y2: number; y3: number; y4: number };
}

export interface CaiDatMaTran {
  ds_dm_muc_do: DmMucDo[];
  ds_dm_thanh_phan_nang_luc: CompetencyComponent[];
  ds_loai_cau_hoi: LoaiCauHoi[];
}

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

// Hard-coded mock data has been removed.

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
// Real API calls
// ------------------------------------------

// ------------------------------------------
// Simulated API functions
// ------------------------------------------

/** 2.1 Lấy danh sách Môn học */
export async function apiGetMonHoc(): Promise<MonHocOption[]> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/exams/subject-categories`);
    const json = await res.json();
    if (json.success && json.data) {
      return json.data.map((item: any) => ({
        id: item.id,
        ten: item.name
      }));
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch subjects', err);
    return [];
  }
}

/** 2.3 Lấy Chủ đề theo Môn (cây cha-con) */
export async function apiGetChuDe(monHocId: string): Promise<ChuDeNode[]> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/exams/topics`);
    const json = await res.json();
    if (json.success && json.data) {
      // Filter by monHocId
      const topics = json.data.filter((t: any) => t.subject_id === monHocId);
      
      // Build tree
      const topicMap = new Map<string, ChuDeNode>();
      const roots: ChuDeNode[] = [];
      
      // First pass: create nodes
      for (const t of topics) {
        topicMap.set(t.id, {
          id: t.id,
          ma: t.code,
          ten: t.name,
          ten_khoi_lop: t.grade_name,
          children: [],
          ds_cau_hoi: [],
        });
      }
      
      // Second pass: build tree structure
      for (const t of topics) {
        const node = topicMap.get(t.id)!;
        if (t.parent_id && topicMap.has(t.parent_id)) {
          topicMap.get(t.parent_id)!.children.push(node);
        } else {
          roots.push(node);
        }
      }
      return roots;
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch topics', err);
    return [];
  }
}

/** 2.5 Lưu ma trận */
export async function apiSaveMaTran(payload: any): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/matrix-configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      // Backend returns {"detail": "..."} on error
      return { success: false, message: json.detail || json.message || `Lỗi server (${res.status})` };
    }
    return json;
  } catch (err) {
    console.error('apiSaveMaTran error:', err);
    return { success: false, message: 'Lỗi kết nối API khi lưu ma trận.' };
  }
}

/** Lấy chi tiết ma trận để sửa */
export async function apiGetMatrixConfigDetail(id: string): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/matrix-configs/${id}`);
    return await res.json();
  } catch (err) {
    return { success: false, message: 'Lỗi kết nối API khi lấy chi tiết ma trận.' };
  }
}

/** Cập nhật ma trận */
export async function apiUpdateMaTran(id: string, payload: any): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/matrix-configs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.detail || json.message || `Lỗi server (${res.status})` };
    }
    return json;
  } catch (err) {
    console.error('apiUpdateMaTran error:', err);
    return { success: false, message: 'Lỗi kết nối API khi cập nhật ma trận.' };
  }
}

// ------------------------------------------
// Lịch sử chỉnh sửa/thẩm định ma trận (matrix_histories) — khớp shape BankQuestionHistoryAPI
// (danhMucApi.ts) nhưng có thêm `comment` (nhận xét thật của người thẩm định khi Đồng ý/Từ chối,
// tách riêng khỏi `note` mô tả hành động — xem backend/exam_service/models.py::MatrixHistory).
export interface MatrixHistoryAPI {
  id: string;
  matrix_id: string;
  action: string;
  actor: string | null;
  timestamp: string;
  note: string;
  comment: string | null;
}

/** Lấy lịch sử chỉnh sửa/thẩm định thật của 1 ma trận đề */
export async function apiGetMatrixHistory(id: string): Promise<{ success: boolean; count?: number; data?: MatrixHistoryAPI[]; message?: string }> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/matrix-configs/${id}/history`);
    return await res.json();
  } catch (err) {
    console.error('apiGetMatrixHistory error:', err);
    return { success: false, message: 'Lỗi kết nối API khi lấy lịch sử ma trận.' };
  }
}

