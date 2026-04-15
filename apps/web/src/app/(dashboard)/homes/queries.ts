import { request } from '@/lib/api';

export function listHomes() {
  return request<{ data: any[] }>('/api/v1/homes');
}
