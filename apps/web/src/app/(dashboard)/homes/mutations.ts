import { request } from '@/lib/api';

export function createHome(data: any) {
  return request<{ data: any }>('/api/v1/homes', { method: 'POST', body: JSON.stringify(data) });
}
