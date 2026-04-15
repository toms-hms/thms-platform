import { request } from '@/lib/api';

export function listContractors(params?: { search?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.category) qs.set('category', params.category);
  return request<{ data: any[] }>(`/api/v1/contractors${qs.toString() ? `?${qs}` : ''}`);
}

export function getContractor(contractorId: string) {
  return request<{ data: any }>(`/api/v1/contractors/${contractorId}`);
}
