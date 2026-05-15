import { request, buildUrl } from '@/lib/api';

export function listHomes() {
  return request<{ data: any[] }>('/api/v1/homes');
}

export function listJobs(params?: { homeId?: string; status?: string; category?: string }) {
  return request<{ data: any[] }>(buildUrl('/api/v1/jobs', params));
}
