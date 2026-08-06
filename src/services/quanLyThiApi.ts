/**
 * quanLyThiApi.ts
 * Centralized API service for Exam Management and Portal (Port 8005)
 * Base URL: xem src/config/apiBase.ts (đổi qua VITE_APP_API_URL, mặc định domain online).
 */
import { API_ORIGIN } from '../config/apiBase';

const BASE_URL = API_ORIGIN;

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

export interface ExamCandidateAPI {
  id: string;
  username: string;
  full_name: string;
  status: string; // "not_started", "in_progress", "submitted"
}

// ─── Admin API ─────────────────────────────────────────────────────────────

export const quanLyThiAdminApi = {
  addCandidates: (candidates: any[]) =>
    apiFetch<ExamCandidateAPI[]>(`/api/exam/admin/candidates`, {
      method: 'POST',
      body: JSON.stringify(candidates),
    }),

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
    
  getCandidateHistory: (candidateId: string) =>
    apiFetch<any>(`/api/exam/admin/candidates/${candidateId}/history`),

  resetCandidateExamResult: (candidateId: string, subject: string) =>
    apiFetch<void>(`/api/exam/admin/candidates/${candidateId}/results/${encodeURIComponent(subject)}`, {
      method: 'DELETE',
    }),
};
