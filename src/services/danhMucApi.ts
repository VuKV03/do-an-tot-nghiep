/**
 * danhMucApi.ts
 * Centralized API service for all 5 category tables.
 * Base URL: http://localhost:8001
 */

const BASE_URL = "http://localhost:8001";

// ─── Generic helpers ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Lỗi không xác định từ server.");
  }
  return res.json();
}

// ─── Types ─────────────────────────────────────────────────────────────────

/** DmMonThi — subject_categories */
export interface DmMonThiAPI {
  id: string;
  code: string;       // Ma
  name: string;       // Ten
  is_active: boolean; // IsActive
  note: string;       // GhiChu
  created_at: string;
  updated_at?: string | null;
}

/** DmCapDoTuDuy — cognitive_levels */
export interface DmCapDoTuDuyAPI {
  id: string;
  code: string;
  name: string;
  note: string;
  created_at: string;
  updated_at?: string | null;
}

/** DmLoaiHinhCauHoi — question_types */
export interface DmLoaiHinhCauHoiAPI {
  id: string;
  code: string;
  name: string;
  note: string;
  created_at: string;
  updated_at?: string | null;
}

/** DmThanhPhanNangLuc — competency_components */
export interface DmThanhPhanNangLucAPI {
  id: string;
  code: string;
  name: string;
  subject_id: string | null; // IdMonThi
  is_active: boolean;
  note: string;
  created_at: string;
  updated_at?: string | null;
}

/** DmKhoiLop — grade_levels */
export interface DmKhoiLopAPI {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  note: string;
  created_at: string;
  updated_at?: string | null;
}

// ─── DmMonThi API ─────────────────────────────────────────────────────────

export const dmMonThiApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: DmMonThiAPI[] }>(
      "/dm-mon-thi/"
    ),
  create: (body: Omit<DmMonThiAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: DmMonThiAPI }>(
      "/dm-mon-thi/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<DmMonThiAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: DmMonThiAPI }>(
      `/dm-mon-thi/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/dm-mon-thi/${id}`, {
      method: "DELETE",
    }),
};

// ─── DmCapDoTuDuy API ─────────────────────────────────────────────────────

export const dmCapDoTuDuyApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: DmCapDoTuDuyAPI[] }>(
      "/dm-cap-do-tu-duy/"
    ),
  create: (body: Omit<DmCapDoTuDuyAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: DmCapDoTuDuyAPI }>(
      "/dm-cap-do-tu-duy/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<DmCapDoTuDuyAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: DmCapDoTuDuyAPI }>(
      `/dm-cap-do-tu-duy/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/dm-cap-do-tu-duy/${id}`, {
      method: "DELETE",
    }),
};

// ─── DmLoaiHinhCauHoi API ─────────────────────────────────────────────────

export const dmLoaiHinhCauHoiApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: DmLoaiHinhCauHoiAPI[] }>(
      "/dm-loai-hinh-cau-hoi/"
    ),
  create: (body: Omit<DmLoaiHinhCauHoiAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: DmLoaiHinhCauHoiAPI }>(
      "/dm-loai-hinh-cau-hoi/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<DmLoaiHinhCauHoiAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: DmLoaiHinhCauHoiAPI }>(
      `/dm-loai-hinh-cau-hoi/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/dm-loai-hinh-cau-hoi/${id}`, {
      method: "DELETE",
    }),
};

// ─── DmThanhPhanNangLuc API ───────────────────────────────────────────────

export const dmThanhPhanNangLucApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: DmThanhPhanNangLucAPI[] }>(
      "/dm-thanh-phan-nang-luc/"
    ),
  create: (body: Omit<DmThanhPhanNangLucAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: DmThanhPhanNangLucAPI }>(
      "/dm-thanh-phan-nang-luc/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<DmThanhPhanNangLucAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: DmThanhPhanNangLucAPI }>(
      `/dm-thanh-phan-nang-luc/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/dm-thanh-phan-nang-luc/${id}`, {
      method: "DELETE",
    }),
};

// ─── DmKhoiLop API ────────────────────────────────────────────────────────

export const dmKhoiLopApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: DmKhoiLopAPI[] }>(
      "/dm-khoi-lop/"
    ),
  create: (body: Omit<DmKhoiLopAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: DmKhoiLopAPI }>(
      "/dm-khoi-lop/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<DmKhoiLopAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: DmKhoiLopAPI }>(
      `/dm-khoi-lop/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/dm-khoi-lop/${id}`, {
      method: "DELETE",
    }),
};

// ─── DmDotThi — exam_periods ───────────────────────────────────────────────
export interface DmDotThiAPI {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'HOAT_DONG' | 'KHONG_HOAT_DONG';
  is_active: boolean;
  note: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// ─── Topic — topics ────────────────────────────────────────────────────────
export interface TopicAPI {
  id: string;
  parent_id?: string | null;
  code: string;
  name: string;
  subject_id?: string | null;
  grade_id?: string | null;
  status: number;
  created_by?: string | null;
  created_at: string;
  submitted_by?: string | null;
  submitted_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_note: string;
  note: string;
  subject_name?: string;
  grade_name?: string;
}

// ─── DmDotThi API ──────────────────────────────────────────────────────────
export const dmDotThiApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: DmDotThiAPI[] }>(
      "/dm-dot-thi/"
    ),
  create: (body: Omit<DmDotThiAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: DmDotThiAPI }>(
      "/dm-dot-thi/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<DmDotThiAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: DmDotThiAPI }>(
      `/dm-dot-thi/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/dm-dot-thi/${id}`, {
      method: "DELETE",
    }),
};

// ─── Topics API ─────────────────────────────────────────────────────────────
export const topicsApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: TopicAPI[] }>(
      "/topics/"
    ),
  create: (body: Omit<TopicAPI, "id" | "created_at" | "submitted_at" | "approved_at" | "approval_note">) =>
    apiFetch<{ success: boolean; message: string; data: TopicAPI }>(
      "/topics/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<TopicAPI, "id" | "created_at" | "submitted_at" | "approved_at" | "approval_note">>) =>
    apiFetch<{ success: boolean; message: string; data: TopicAPI }>(
      `/topics/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/topics/${id}`, {
      method: "DELETE",
    }),
  submit: (id: string) =>
    apiFetch<{ success: boolean; message: string; data: TopicAPI }>(
      `/topics/${id}/submit`,
      { method: "POST" }
    ),
  approve: (id: string, comment: string) =>
    apiFetch<{ success: boolean; message: string; data: TopicAPI }>(
      `/topics/${id}/approve`,
      { method: "POST", body: JSON.stringify({ comment }) }
    ),
  reject: (id: string, comment: string) =>
    apiFetch<{ success: boolean; message: string; data: TopicAPI }>(
      `/topics/${id}/reject`,
      { method: "POST", body: JSON.stringify({ comment }) }
    ),
  getHistory: (id: string) =>
    apiFetch<{ success: boolean; count: number; data: any[] }>(
      `/topics/${id}/history`
    ),
};
