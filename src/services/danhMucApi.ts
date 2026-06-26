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

/** SubjectCategory — subject_categories */
export interface SubjectCategoryAPI {
  id: string;
  code: string;       // Ma
  name: string;       // Ten
  is_active: boolean; // IsActive
  note: string;       // GhiChu
  created_at: string;
  updated_at?: string | null;
}

/** CognitiveLevel — cognitive_levels */
export interface CognitiveLevelAPI {
  id: string;
  code: string;
  name: string;
  note: string;
  created_at: string;
  updated_at?: string | null;
}

/** QuestionType — question_types */
export interface QuestionTypeAPI {
  id: string;
  code: string;
  name: string;
  note: string;
  created_at: string;
  updated_at?: string | null;
}

/** CompetencyComponent — competency_components */
export interface CompetencyComponentAPI {
  id: string;
  code: string;
  name: string;
  subject_id: string | null; // IdMonHoc
  is_active: boolean;
  note: string;
  created_at: string;
  updated_at?: string | null;
}

/** GradeLevel — grade_levels */
export interface GradeLevelAPI {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  note: string;
  created_at: string;
  updated_at?: string | null;
}

// ─── SubjectCategory API ───────────────────────────────────────────────────

export const subjectCategoryApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: SubjectCategoryAPI[] }>(
      "/subject-categories/"
    ),
  create: (body: Omit<SubjectCategoryAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: SubjectCategoryAPI }>(
      "/subject-categories/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<SubjectCategoryAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: SubjectCategoryAPI }>(
      `/subject-categories/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/subject-categories/${id}`, {
      method: "DELETE",
    }),
};

// ─── CognitiveLevel API ───────────────────────────────────────────────────

export const cognitiveLevelApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: CognitiveLevelAPI[] }>(
      "/cognitive-levels/"
    ),
  create: (body: Omit<CognitiveLevelAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: CognitiveLevelAPI }>(
      "/cognitive-levels/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<CognitiveLevelAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: CognitiveLevelAPI }>(
      `/cognitive-levels/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/cognitive-levels/${id}`, {
      method: "DELETE",
    }),
};

// ─── QuestionType API ─────────────────────────────────────────────────────

export const questionTypeApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: QuestionTypeAPI[] }>(
      "/question-types/"
    ),
  create: (body: Omit<QuestionTypeAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: QuestionTypeAPI }>(
      "/question-types/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<QuestionTypeAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: QuestionTypeAPI }>(
      `/question-types/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/question-types/${id}`, {
      method: "DELETE",
    }),
};

// ─── CompetencyComponent API ──────────────────────────────────────────────

export const competencyComponentApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: CompetencyComponentAPI[] }>(
      "/competency-components/"
    ),
  create: (body: Omit<CompetencyComponentAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: CompetencyComponentAPI }>(
      "/competency-components/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<CompetencyComponentAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: CompetencyComponentAPI }>(
      `/competency-components/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/competency-components/${id}`, {
      method: "DELETE",
    }),
};

// ─── GradeLevel API ───────────────────────────────────────────────────────

export const gradeLevelApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: GradeLevelAPI[] }>(
      "/grade-levels/"
    ),
  create: (body: Omit<GradeLevelAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: GradeLevelAPI }>(
      "/grade-levels/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<GradeLevelAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: GradeLevelAPI }>(
      `/grade-levels/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/grade-levels/${id}`, {
      method: "DELETE",
    }),
};

// ─── ExamPeriod — exam_periods ──────────────────────────────────────────────
export interface ExamPeriodAPI {
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

// ─── ExamPeriod API ─────────────────────────────────────────────────────────
export const examPeriodApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: ExamPeriodAPI[] }>(
      "/exam-periods/"
    ),
  create: (body: Omit<ExamPeriodAPI, "id" | "created_at" | "updated_at">) =>
    apiFetch<{ success: boolean; message: string; data: ExamPeriodAPI }>(
      "/exam-periods/",
      { method: "POST", body: JSON.stringify(body) }
    ),
  update: (id: string, body: Partial<Omit<ExamPeriodAPI, "id" | "created_at" | "updated_at">>) =>
    apiFetch<{ success: boolean; message: string; data: ExamPeriodAPI }>(
      `/exam-periods/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/exam-periods/${id}`, {
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
