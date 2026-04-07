const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, body?.error?.code);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    request<{ data: { user: any; tokens: { accessToken: string; refreshToken: string } } }>(
      '/api/v1/auth/register',
      { method: 'POST', body: JSON.stringify(data) }
    ),
  login: (data: { email: string; password: string }) =>
    request<{ data: { user: any; tokens: { accessToken: string; refreshToken: string } } }>(
      '/api/v1/auth/login',
      { method: 'POST', body: JSON.stringify(data) }
    ),
  logout: () => request('/api/v1/auth/logout', { method: 'POST' }),
  me: () => request<{ data: any }>('/api/v1/auth/me'),
};

// Homes
export const homes = {
  list: () => request<{ data: any[] }>('/api/v1/homes'),
  get: (homeId: string) => request<{ data: any }>(`/api/v1/homes/${homeId}`),
  create: (data: any) =>
    request<{ data: any }>('/api/v1/homes', { method: 'POST', body: JSON.stringify(data) }),
  update: (homeId: string, data: any) =>
    request<{ data: any }>(`/api/v1/homes/${homeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (homeId: string) =>
    request(`/api/v1/homes/${homeId}`, { method: 'DELETE' }),
  listUsers: (homeId: string) =>
    request<{ data: any[] }>(`/api/v1/homes/${homeId}/users`),
};

// Jobs
export const jobs = {
  list: (homeId: string, params?: { status?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    return request<{ data: any[] }>(
      `/api/v1/homes/${homeId}/jobs${qs.toString() ? `?${qs}` : ''}`
    );
  },
  get: (jobId: string) => request<{ data: any }>(`/api/v1/jobs/${jobId}`),
  create: (homeId: string, data: any) =>
    request<{ data: any }>(`/api/v1/homes/${homeId}/jobs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (jobId: string, data: any) =>
    request<{ data: any }>(`/api/v1/jobs/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (jobId: string) =>
    request(`/api/v1/jobs/${jobId}`, { method: 'DELETE' }),
};

// Job contractors
export const jobContractors = {
  list: (jobId: string) =>
    request<{ data: any[] }>(`/api/v1/jobs/${jobId}/contractors`),
  assign: (jobId: string, data: any) =>
    request<{ data: any }>(`/api/v1/jobs/${jobId}/contractors`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (jobId: string, jobContractorId: string, data: any) =>
    request<{ data: any }>(`/api/v1/jobs/${jobId}/contractors/${jobContractorId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (jobId: string, jobContractorId: string) =>
    request(`/api/v1/jobs/${jobId}/contractors/${jobContractorId}`, { method: 'DELETE' }),
};

// Contractors
export const contractors = {
  list: (params?: { search?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category) qs.set('category', params.category);
    return request<{ data: any[] }>(
      `/api/v1/contractors${qs.toString() ? `?${qs}` : ''}`
    );
  },
  get: (contractorId: string) =>
    request<{ data: any }>(`/api/v1/contractors/${contractorId}`),
  create: (data: any) =>
    request<{ data: any }>('/api/v1/contractors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (contractorId: string, data: any) =>
    request<{ data: any }>(`/api/v1/contractors/${contractorId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (contractorId: string) =>
    request(`/api/v1/contractors/${contractorId}`, { method: 'DELETE' }),
};

// Communications
export const communications = {
  list: (
    jobId: string,
    params?: { contractorId?: string; needsReview?: boolean; direction?: string }
  ) => {
    const qs = new URLSearchParams();
    if (params?.contractorId) qs.set('contractorId', params.contractorId);
    if (params?.needsReview !== undefined) qs.set('needsReview', String(params.needsReview));
    if (params?.direction) qs.set('direction', params.direction);
    return request<{ data: any[] }>(
      `/api/v1/jobs/${jobId}/communications${qs.toString() ? `?${qs}` : ''}`
    );
  },
  get: (communicationId: string) =>
    request<{ data: any }>(`/api/v1/communications/${communicationId}`),
  update: (communicationId: string, data: any) =>
    request<{ data: any }>(`/api/v1/communications/${communicationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Quotes
export const quotes = {
  list: (jobId: string) => request<{ data: any[] }>(`/api/v1/jobs/${jobId}/quotes`),
  create: (jobId: string, data: any) =>
    request<{ data: any }>(`/api/v1/jobs/${jobId}/quotes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (quoteId: string, data: any) =>
    request<{ data: any }>(`/api/v1/quotes/${quoteId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (quoteId: string) =>
    request(`/api/v1/quotes/${quoteId}`, { method: 'DELETE' }),
};

// Images
export const images = {
  list: (jobId: string) => request<{ data: any[] }>(`/api/v1/jobs/${jobId}/images`),
  getUploadUrl: (jobId: string, data: { fileName: string; contentType: string; kind: string }) =>
    request<{ data: { uploadUrl: string; key: string; kind: string } }>(
      `/api/v1/jobs/${jobId}/images/upload-url`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
  confirmUpload: (jobId: string, data: { key: string; kind: string; label?: string }) =>
    request<{ data: any }>(`/api/v1/jobs/${jobId}/images/confirm`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (jobId: string, imageId: string) =>
    request(`/api/v1/jobs/${jobId}/images/${imageId}`, { method: 'DELETE' }),
};

// AI generations
export const aiGenerations = {
  list: (jobId: string) =>
    request<{ data: any[] }>(`/api/v1/jobs/${jobId}/ai-generations`),
  create: (jobId: string, data: any) =>
    request<{ data: any }>(`/api/v1/jobs/${jobId}/ai-generations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Email
export const email = {
  draft: (jobId: string, data: any) =>
    request<{ data: any[] }>(`/api/v1/jobs/${jobId}/email-drafts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  send: (jobId: string, data: any) =>
    request<{ data: any }>(`/api/v1/jobs/${jobId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Integrations
export const integrations = {
  list: () => request<{ data: any[] }>('/api/v1/integrations'),
  startGoogleAuth: () =>
    request<{ data: { authorizationUrl: string } }>('/api/v1/integrations/email/google/start'),
  startMicrosoftAuth: () =>
    request<{ data: { authorizationUrl: string } }>('/api/v1/integrations/email/microsoft/start'),
  saveAI: (data: { provider: string; apiKey: string }) =>
    request<{ data: any }>('/api/v1/integrations/ai', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  disconnect: (integrationId: string) =>
    request(`/api/v1/integrations/${integrationId}`, { method: 'DELETE' }),
};
