/**
 * danhMucApi.ts
 * Centralized API service for all 5 category tables.
 * Base URL: http://localhost:8001
 */

import type { Question, QuestionType, CognitiveLevel } from '../types';

const BASE_URL = 'http://localhost:8001';

// ─── Generic helpers ───────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'Lỗi không xác định từ server.');
  }
  return res.json();
}

// ─── Types ─────────────────────────────────────────────────────────────────

/** SubjectCategory — subject_categories */
export interface SubjectCategoryAPI {
  id: string;
  code: string; // Ma
  name: string; // Ten
  is_active: boolean; // IsActive
  note: string; // GhiChu
  created_at: string;
  updated_at?: string | null;
}

/** SubjectConfig — subject_configs */
export interface SubjectConfigAPI {
  id: string;
  type_id_p1?: string | null;
  type_id_p2?: string | null;
  type_id_p3?: string | null;
  subject_id?: string | null;
  content_p1?: string | null;
  content_p2?: string | null;
  content_p3?: string | null;
  p1_from?: number | null;
  p1_to?: number | null;
  p2_from?: number | null;
  p2_to?: number | null;
  p3_from?: number | null;
  p3_to?: number | null;
  points_for_a_correct_answers_p1?: number | string | null;
  points_for_1_correct_idea_p1?: number | string | null;
  points_for_2_correct_idea_p1?: number | string | null;
  points_for_3_correct_idea_p1?: number | string | null;
  points_for_4_correct_idea_p1?: number | string | null;
  points_for_a_correct_answers_p2?: number | string | null;
  points_for_1_correct_idea_p2?: number | string | null;
  points_for_2_correct_idea_p2?: number | string | null;
  points_for_3_correct_idea_p2?: number | string | null;
  points_for_4_correct_idea_p2?: number | string | null;
  points_for_a_correct_answers_p3?: number | string | null;
  points_for_1_correct_idea_p3?: number | string | null;
  points_for_2_correct_idea_p3?: number | string | null;
  points_for_3_correct_idea_p3?: number | string | null;
  points_for_4_correct_idea_p3?: number | string | null;
  questions_number?: number | null;
  number_to_create?: number | null;
  scale?: number | null;
  time?: number | null;
  created_by?: string | null;
  updated_by?: string | null;
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
      '/subject-categories/',
    ),
  create: (
    body: Omit<SubjectCategoryAPI, 'id' | 'created_at' | 'updated_at'>,
  ) =>
    apiFetch<{ success: boolean; message: string; data: SubjectCategoryAPI }>(
      '/subject-categories/',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  update: (
    id: string,
    body: Partial<Omit<SubjectCategoryAPI, 'id' | 'created_at' | 'updated_at'>>,
  ) =>
    apiFetch<{ success: boolean; message: string; data: SubjectCategoryAPI }>(
      `/subject-categories/${id}`,
      { method: 'PUT', body: JSON.stringify(body) },
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/subject-categories/${id}`,
      {
        method: 'DELETE',
      },
    ),
};

// ─── SubjectConfig API ────────────────────────────────────────────────────

export const subjectConfigApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: SubjectConfigAPI[] }>(
      '/subject-configs/',
    ),
  getBySubjectId: (subjectId: string) =>
    apiFetch<{ success: boolean; data: SubjectConfigAPI }>(
      `/subject-configs/by-subject/${subjectId}`,
    ),
  create: (body: Omit<SubjectConfigAPI, 'id' | 'created_at' | 'updated_at'>) =>
    apiFetch<{ success: boolean; message: string; data: SubjectConfigAPI }>(
      '/subject-configs/',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  update: (
    id: string,
    body: Partial<Omit<SubjectConfigAPI, 'id' | 'created_at' | 'updated_at'>>,
  ) =>
    apiFetch<{ success: boolean; message: string; data: SubjectConfigAPI }>(
      `/subject-configs/${id}`,
      { method: 'PUT', body: JSON.stringify(body) },
    ),
};

// ─── CognitiveLevel API ───────────────────────────────────────────────────

export const cognitiveLevelApi = {
  list: (params?: { subject_id?: string; grade_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.subject_id) query.append('subject_id', params.subject_id);
    if (params?.grade_id) query.append('grade_id', params.grade_id);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<{ success: boolean; count: number; data: CognitiveLevelAPI[] }>(
      `/cognitive-levels/${queryString}`,
    );
  },
  create: (body: Omit<CognitiveLevelAPI, 'id' | 'created_at' | 'updated_at'>) =>
    apiFetch<{ success: boolean; message: string; data: CognitiveLevelAPI }>(
      '/cognitive-levels/',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  update: (
    id: string,
    body: Partial<Omit<CognitiveLevelAPI, 'id' | 'created_at' | 'updated_at'>>,
  ) =>
    apiFetch<{ success: boolean; message: string; data: CognitiveLevelAPI }>(
      `/cognitive-levels/${id}`,
      { method: 'PUT', body: JSON.stringify(body) },
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/cognitive-levels/${id}`, {
      method: 'DELETE',
    }),
};

// ─── QuestionType API ─────────────────────────────────────────────────────

export const questionTypeApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: QuestionTypeAPI[] }>(
      '/question-types/',
    ),
  create: (body: Omit<QuestionTypeAPI, 'id' | 'created_at' | 'updated_at'>) =>
    apiFetch<{ success: boolean; message: string; data: QuestionTypeAPI }>(
      '/question-types/',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  update: (
    id: string,
    body: Partial<Omit<QuestionTypeAPI, 'id' | 'created_at' | 'updated_at'>>,
  ) =>
    apiFetch<{ success: boolean; message: string; data: QuestionTypeAPI }>(
      `/question-types/${id}`,
      { method: 'PUT', body: JSON.stringify(body) },
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/question-types/${id}`, {
      method: 'DELETE',
    }),
};

// ─── CompetencyComponent API ──────────────────────────────────────────────

export const competencyComponentApi = {
  list: (params?: { subject_id?: string; grade_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.subject_id) query.append('subject_id', params.subject_id);
    if (params?.grade_id) query.append('grade_id', params.grade_id);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<{
      success: boolean;
      count: number;
      data: CompetencyComponentAPI[];
    }>(`/competency-components/${queryString}`);
  },
  create: (
    body: Omit<CompetencyComponentAPI, 'id' | 'created_at' | 'updated_at'>,
  ) =>
    apiFetch<{
      success: boolean;
      message: string;
      data: CompetencyComponentAPI;
    }>('/competency-components/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (
    id: string,
    body: Partial<
      Omit<CompetencyComponentAPI, 'id' | 'created_at' | 'updated_at'>
    >,
  ) =>
    apiFetch<{
      success: boolean;
      message: string;
      data: CompetencyComponentAPI;
    }>(`/competency-components/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/competency-components/${id}`,
      {
        method: 'DELETE',
      },
    ),
};

// ─── GradeLevel API ───────────────────────────────────────────────────────

export const gradeLevelApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: GradeLevelAPI[] }>(
      '/grade-levels/',
    ),
  create: (body: Omit<GradeLevelAPI, 'id' | 'created_at' | 'updated_at'>) =>
    apiFetch<{ success: boolean; message: string; data: GradeLevelAPI }>(
      '/grade-levels/',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  update: (
    id: string,
    body: Partial<Omit<GradeLevelAPI, 'id' | 'created_at' | 'updated_at'>>,
  ) =>
    apiFetch<{ success: boolean; message: string; data: GradeLevelAPI }>(
      `/grade-levels/${id}`,
      { method: 'PUT', body: JSON.stringify(body) },
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/grade-levels/${id}`, {
      method: 'DELETE',
    }),
};

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

// ─── Topics API ─────────────────────────────────────────────────────────────
export const topicsApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: TopicAPI[] }>('/topics/'),
  create: (
    body: Omit<
      TopicAPI,
      'id' | 'created_at' | 'submitted_at' | 'approved_at' | 'approval_note'
    >,
  ) =>
    apiFetch<{ success: boolean; message: string; data: TopicAPI }>(
      '/topics/',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  update: (
    id: string,
    body: Partial<
      Omit<
        TopicAPI,
        'id' | 'created_at' | 'submitted_at' | 'approved_at' | 'approval_note'
      >
    > & { actor?: string },
  ) =>
    apiFetch<{ success: boolean; message: string; data: TopicAPI }>(
      `/topics/${id}`,
      { method: 'PUT', body: JSON.stringify(body) },
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/topics/${id}`, {
      method: 'DELETE',
    }),
  submit: (id: string, actor?: string) =>
    apiFetch<{ success: boolean; message: string; data: TopicAPI }>(
      `/topics/${id}/submit`,
      { method: 'POST', body: JSON.stringify({ actor }) },
    ),
  approve: (id: string, comment: string, actor?: string) =>
    apiFetch<{ success: boolean; message: string; data: TopicAPI }>(
      `/topics/${id}/approve`,
      { method: 'POST', body: JSON.stringify({ comment, actor }) },
    ),
  reject: (id: string, comment: string, actor?: string) =>
    apiFetch<{ success: boolean; message: string; data: TopicAPI }>(
      `/topics/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ comment, actor }) },
    ),
  getHistory: (id: string) =>
    apiFetch<{ success: boolean; count: number; data: any[] }>(
      `/topics/${id}/history`,
    ),
};

// ─── Questions API ────────────────────────────────────────────────────────

export interface QuestionCreateAPI {
  text: string;
  type: QuestionType;
  level: CognitiveLevel;
  subject: string;
  grade: string;
  topicId?: string | null;
  topicName?: string | null;
  subTopicName?: string | null;
  options?: string[];
  correctAnswer?: string | string[];
  statements?: unknown[];
  creator?: string;
  createdAt?: string;
  status?: 'draft' | 'pending' | 'approved';
  lineNumber?: number;
  examId?: string | null;
}

export const questionApi = {
  create: (body: Omit<QuestionCreateAPI, 'createdAt'>) =>
    apiFetch<{
      success: boolean;
      message: string;
      data: { id: string } & Record<string, unknown>;
    }>('/questions/', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Bank Questions API ───────────────────────────────────────────────────────

/** Câu hỏi ngân hàng — đọc từ bảng questions (JOIN exams) */
export interface BankQuestionAPI {
  id: string;
  code: string;
  text: string;
  type: 'single' | 'multiple' | 'true_false' | 'short';
  level: 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao';
  status: 'approved' | 'pending' | 'draft';
  subject: string;
  grade: string;
  topicId: string | null;
  topicName: string;
  subTopicName: string | null;
  options: string[];
  correctAnswer: string;
  creator: string;
  createdAt: string;
  nangLucId?: string;
  nangLuc?: string;
  examId?: string | null;
  feedback?: string;
  statements?: Question['statements'];
}

export interface BankQuestionCreateAPI {
  text: string;
  type: string;
  level: string;
  subject: string;
  grade: string;
  examId?: string | null;
  options?: string[] | null;
  correctAnswer?: string | null;
  status?: string;
  /** Người thực hiện thay đổi — chỉ dùng để ghi lịch sử (question_histories), không phải cột dữ liệu câu hỏi. */
  actor?: string;
}

export interface BankQuestionHistoryAPI {
  id: string;
  question_id: string;
  action: string;
  actor: string | null;
  timestamp: string;
  note: string;
}

export interface BankQuestionCountByTopicAPI {
  topic_id: string;
  level_id: string | null;
  type_id: string | null;
  competency_component_id: string | null;
  count: number;
}

export interface RandomSelectCellAPI {
  don_vi_id: string;
  muc_do_id?: string | null;
  loai_cau_hoi_id?: string | null;
  nang_luc_id?: string | null;
  so_cau: number;
}

export interface RandomSelectResultAPI {
  don_vi_id: string;
  muc_do_id: string | null;
  loai_cau_hoi_id: string | null;
  nang_luc_id: string | null;
  requested: number;
  found: number;
  questionIds: string[];
}

export const bankQuestionApi = {
  list: () =>
    apiFetch<{ success: boolean; count: number; data: BankQuestionAPI[] }>(
      '/bank-questions/',
    ),
  countByTopic: (topicIds: string[], status: number = 2) =>
    apiFetch<{ success: boolean; data: BankQuestionCountByTopicAPI[] }>(
      `/bank-questions/count-by-topic?topic_ids=${topicIds.join(',')}&status=${status}`,
    ),
  randomSelect: (cells: RandomSelectCellAPI[], gradeId?: string, status: number = 2) =>
    apiFetch<{ success: boolean; data: RandomSelectResultAPI[] }>(
      '/bank-questions/random-select',
      { method: 'POST', body: JSON.stringify({ cells, grade_id: gradeId ?? null, status }) },
    ),
  create: (body: BankQuestionCreateAPI) =>
    apiFetch<{ success: boolean; message: string; data: BankQuestionAPI }>(
      '/bank-questions/',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  update: (id: string, body: Partial<BankQuestionCreateAPI>) =>
    apiFetch<{ success: boolean; message: string }>(
      `/bank-questions/${id}`,
      { method: 'PUT', body: JSON.stringify(body) },
    ),
  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/bank-questions/${id}`,
      { method: 'DELETE' },
    ),
  submit: (id: string, actor?: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/bank-questions/${id}/submit`,
      { method: 'POST', body: JSON.stringify({ actor }) },
    ),
  approve: (id: string, comment?: string, actor?: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/bank-questions/${id}/approve`,
      { method: 'POST', body: JSON.stringify({ comment, actor }) },
    ),
  reject: (id: string, comment?: string, actor?: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/bank-questions/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ comment, actor }) },
    ),
  bulkReview: (ids: string[], verdict: 'approve' | 'reject', comment?: string, actor?: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/bank-questions/bulk-review`,
      { method: 'POST', body: JSON.stringify({ ids, verdict, comment, actor }) },
    ),
  getHistory: (id: string) =>
    apiFetch<{ success: boolean; count: number; data: BankQuestionHistoryAPI[] }>(
      `/bank-questions/${id}/history`,
    ),
};

