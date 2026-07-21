import { auth } from './firebase';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) return '';
  return user.getIdToken();
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'API error');
  return data.data as T;
}

// No Content-Type header here — the browser sets the multipart boundary itself.
async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API}/api${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'API error');
  return data.data as T;
}

export const api = {
  // Jobs
  postJob:      (body: object)            => apiFetch('/jobs',            { method: 'POST', body: JSON.stringify(body) }),
  listJobs:     ()                         => apiFetch('/jobs'),
  getJob:       (id: string)              => apiFetch(`/jobs/${id}`),
  structureJob: (id: string)              => apiFetch(`/jobs/${id}/structure`, { method: 'POST' }),
  matchJob:     (id: string)              => apiFetch(`/jobs/${id}/match`,     { method: 'POST' }),
  assignJob:    (id: string, body: object) => apiFetch(`/jobs/${id}/assign`,   { method: 'POST', body: JSON.stringify(body) }),

  // Profiles
  createFreelancer: (body: object) => apiFetch('/profiles/freelancer', { method: 'POST', body: JSON.stringify(body) }),
  createRecruiter:  (body: object) => apiFetch('/profiles/recruiter',  { method: 'POST', body: JSON.stringify(body) }),
  getMe:            ()             => apiFetch('/profiles/me'),
  updateMe:         (body: object) => apiFetch('/profiles/me',         { method: 'PATCH', body: JSON.stringify(body) }),
  listFreelancers:  (params?: Record<string,string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/profiles/freelancers${q}`);
  },
  uploadAvatar:   (file: File) => { const fd = new FormData(); fd.append('file', file); return apiUpload('/profiles/me/avatar', fd); },
  uploadResume:   (file: File) => { const fd = new FormData(); fd.append('file', file); return apiUpload('/profiles/me/resume', fd); },
  generateResume: () => apiFetch('/profiles/me/resume/generate', { method: 'POST' }),

  // Submissions
  submit:         (body: object) => apiFetch('/submissions', { method: 'POST', body: JSON.stringify(body) }),
  listSubmissions:(jobId?: string) => {
    const q = jobId ? `?jobId=${jobId}` : '';
    return apiFetch(`/submissions${q}`);
  },
  getSubmission: (id: string) => apiFetch(`/submissions/${id}`),

  // Payments
  createMilestone: (body: object) => apiFetch('/payments/milestones', { method: 'POST', body: JSON.stringify(body) }),
  listMilestones:  ()             => apiFetch('/payments/milestones'),
};
