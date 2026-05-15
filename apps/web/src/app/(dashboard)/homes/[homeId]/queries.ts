import { request, buildUrl } from '@/lib/api';

export function getHome(homeId: string) {
  return request<{ data: any }>(`/api/v1/homes/${homeId}`);
}

export function listJobs(homeId: string, params?: { status?: string; category?: string }) {
  return request<{ data: any[] }>(buildUrl('/api/v1/jobs', { homeId, ...params }));
}
