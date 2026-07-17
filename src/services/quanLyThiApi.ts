/**
 * quanLyThiApi.ts
 * Centralized API service for Exam Management and Portal (Port 8005)
 * Base URL: http://localhost:8005
 */

const BASE_URL = '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'Lỗi không xác định từ server.');
  }
  if (res.status === 204) {
    return undefined as any;
  }
  return res.json();
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ExamSessionAPI {
  id: string;
  name: string;
  session_code: string | null;
  exam_id: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  status: string; // "pending", "active", "completed"
}

export interface ExamCandidateAPI {
  id: string;
  session_id: string;
  username: string;
  full_name: string;
  status: string; // "not_started", "in_progress", "submitted"
}

// ─── Admin API ─────────────────────────────────────────────────────────────

export const quanLyThiAdminApi = {
  listSessions: () =>
    apiFetch<ExamSessionAPI[]>('/api/exam/admin/sessions'),
    
  createSession: (body: Omit<ExamSessionAPI, 'id'>) =>
    apiFetch<ExamSessionAPI>('/api/exam/admin/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    
  updateSession: (id: string, body: Partial<ExamSessionAPI>) =>
    apiFetch<ExamSessionAPI>(`/api/exam/admin/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
    
  deleteSession: (id: string) =>
    apiFetch<void>(`/api/exam/admin/sessions/${id}`, {
      method: 'DELETE',
    }),

  updateSessionStatus: (id: string, status: string) =>
    apiFetch<ExamSessionAPI>(`/api/exam/admin/sessions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
    
  addCandidates: (candidates: any[]) =>
    apiFetch<ExamCandidateAPI[]>(`/api/exam/admin/candidates`, {
      method: 'POST',
      body: JSON.stringify(candidates),
    }),
    
  getCandidates: (sessionId: string) =>
    apiFetch<ExamCandidateAPI[]>(`/api/exam/admin/sessions/${sessionId}/candidates`),

  getAllCandidates: () =>
    apiFetch<ExamCandidateAPI[]>('/api/exam/admin/candidates'),

  updateCandidate: (candidateId: string, data: Partial<ExamCandidateAPI>) =>
    apiFetch<ExamCandidateAPI>(`/api/exam/admin/candidates/${candidateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCandidate: (candidateId: string) =>
    apiFetch<void>(`/api/exam/admin/candidates/${candidateId}`, {
      method: 'DELETE',
    }),
    
  getResults: (sessionId: string) =>
    apiFetch<any[]>(`/api/exam/admin/sessions/${sessionId}/results`),
    
  getCandidateHistory: (candidateId: string) =>
    apiFetch<any>(`/api/exam/admin/candidates/${candidateId}/history`),

  resetCandidateExamResult: (candidateId: string, subject: string) =>
    apiFetch<void>(`/api/exam/admin/candidates/${candidateId}/results/${encodeURIComponent(subject)}`, {
      method: 'DELETE',
    }),
};
