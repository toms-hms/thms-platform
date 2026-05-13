import { request } from '@/lib/api';

export function listContractors(params?: {
  search?: string;
  tradeCategories?: string[];
  zipCodes?: string[];
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  params?.tradeCategories?.forEach((category) => qs.append('tradeCategories', category));
  params?.zipCodes?.forEach((zipCode) => qs.append('zipCodes', zipCode));
  return request<{ data: any[] }>(`/api/v1/contractors${qs.toString() ? `?${qs}` : ''}`);
}

export function getContractor(contractorId: string) {
  return request<{ data: any }>(`/api/v1/contractors/${contractorId}`);
}

export function getContractorJobs(contractorId: string) {
  return request<{ data: any[] }>(`/api/v1/contractors/${contractorId}/jobs`);
}
