import { request } from '@/lib/api';

export function createJob(data: any) {
  return request<{ data: any }>('/api/v1/jobs', { method: 'POST', body: JSON.stringify(data) });
}
