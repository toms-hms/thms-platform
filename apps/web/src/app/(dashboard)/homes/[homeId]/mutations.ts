import { request } from '@/lib/api';

export function updateHome(homeId: string, data: any) {
  return request<{ data: any }>(`/api/v1/homes/${homeId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteHome(homeId: string) {
  return request(`/api/v1/homes/${homeId}`, { method: 'DELETE' });
}

export function createJob(homeId: string, data: any) {
  return request<{ data: any }>(`/api/v1/homes/${homeId}/jobs`, { method: 'POST', body: JSON.stringify(data) });
}
