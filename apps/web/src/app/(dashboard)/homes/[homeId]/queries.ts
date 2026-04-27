import { request } from '@/lib/api';

export function getHome(homeId: string) {
  return request<{ data: any }>(`/api/v1/homes/${homeId}`);
}

export function listJobs(homeId: string, params?: { status?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.category) qs.set('category', params.category);
  return request<{ data: any[] }>(`/api/v1/homes/${homeId}/jobs${qs.toString() ? `?${qs}` : ''}`);
}
