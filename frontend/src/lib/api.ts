import { auth } from './firebase';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) return '';
  return user.getIdToken();
}

const UNREACHABLE = "Can't reach GigHuz right now — check your connection and try again.";
const GENERIC_FAILURE = 'Something went sideways on our end — give it another try in a moment.';

async function parseApiResponse<T>(res: Response): Promise<T> {
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(GENERIC_FAILURE);
  }
  if (!data.success) throw new Error(data.error || GENERIC_FAILURE);
  return data.data as T;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
  } catch {
    throw new Error(UNREACHABLE);
  }
  return parseApiResponse<T>(res);
}

// No Content-Type header here — the browser sets the multipart boundary itself.
async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API}/api${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    throw new Error(UNREACHABLE);
  }
  return parseApiResponse<T>(res);
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
  createFreelancer:    (body: object) => apiFetch('/profiles/freelancer',    { method: 'POST', body: JSON.stringify(body) }),
  createRecruiter:     (body: object) => apiFetch('/profiles/recruiter',     { method: 'POST', body: JSON.stringify(body) }),
  createAgentDeveloper:(body: object) => apiFetch('/profiles/agent-developer', { method: 'POST', body: JSON.stringify(body) }),
  getMe:            ()             => apiFetch('/profiles/me'),
  updateMe:         (body: object) => apiFetch('/profiles/me',         { method: 'PATCH', body: JSON.stringify(body) }),
  listFreelancers:  (params?: Record<string,string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/profiles/freelancers${q}`);
  },
  uploadAvatar:   (file: File) => { const fd = new FormData(); fd.append('file', file); return apiUpload('/profiles/me/avatar', fd); },
  uploadResume:   (file: File) => { const fd = new FormData(); fd.append('file', file); return apiUpload('/profiles/me/resume', fd); },
  generateResume: () => apiFetch('/profiles/me/resume/generate', { method: 'POST' }),
  verifySkills:   () => apiFetch('/profiles/me/verify-skills', { method: 'POST' }),
  listCaseStudies:() => apiFetch('/profiles/me/case-studies'),

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
  requestChange:      (milestoneId: string, description: string) =>
    apiFetch(`/payments/milestones/${milestoneId}/change-requests`, { method: 'POST', body: JSON.stringify({ description }) }),
  listChangeRequests: (milestoneId: string) => apiFetch(`/payments/milestones/${milestoneId}/change-requests`),
  rateMilestone:      (milestoneId: string, score: number, feedback?: string) =>
    apiFetch(`/payments/milestones/${milestoneId}/rate`, { method: 'POST', body: JSON.stringify({ score, feedback }) }),
  getMilestoneRating: (milestoneId: string) => apiFetch(`/payments/milestones/${milestoneId}/rating`),

  // AI Agent Marketplace
  listAgentListings:    (category?: string) => apiFetch(`/agent-listings${category ? `?category=${category}` : ''}`),
  myAgentListings:      () => apiFetch('/agent-listings/mine'),
  registerAgentListing: (body: object) => apiFetch('/agent-listings', { method: 'POST', body: JSON.stringify(body) }),
  updateAgentListing:   (id: string, body: object) => apiFetch(`/agent-listings/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
