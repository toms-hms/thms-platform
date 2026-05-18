const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1';

/**
 * Builds an API URL with query params. The `/api/v1` prefix is added automatically —
 * callers pass resource paths like `/contractors`, not `/api/v1/contractors`.
 * Handles array params as repeated keys (tradeCategories=A&tradeCategories=B).
 */
export function buildUrl(path: string, params?: Record<string, string | string[] | undefined>): string {
  const prefixedPath = `${API_PREFIX}${path}`;
  if (!params) return prefixedPath;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, v));
    } else {
      qs.set(key, value);
    }
  }
  const queryString = qs.toString();
  return queryString ? `${prefixedPath}?${queryString}` : prefixedPath;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Prepend /api/v1 unless the path already starts with it (for paths from buildUrl)
  const fullPath = path.startsWith(API_PREFIX) ? path : `${API_PREFIX}${path}`;
  const res = await fetch(`${API_BASE}${fullPath}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new ApiError('Session expired', 401, 'UNAUTHORIZED');
    }
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

export const auth = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    request<{ data: { user: any; tokens: { accessToken: string; refreshToken: string } } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(data) }
    ),
  login: (data: { email: string; password: string }) =>
    request<{ data: { user: any; tokens: { accessToken: string; refreshToken: string } } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data) }
    ),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<{ data: any }>('/auth/me'),
};
