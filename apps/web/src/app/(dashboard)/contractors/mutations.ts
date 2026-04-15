import { request } from '@/lib/api';

export function createContractor(data: any) {
  return request<{ data: any }>('/api/v1/contractors', { method: 'POST', body: JSON.stringify(data) });
}

export function updateContractor(contractorId: string, data: any) {
  return request<{ data: any }>(`/api/v1/contractors/${contractorId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteContractor(contractorId: string) {
  return request(`/api/v1/contractors/${contractorId}`, { method: 'DELETE' });
}
