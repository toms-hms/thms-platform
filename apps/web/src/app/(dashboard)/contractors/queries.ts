import { request } from '@/lib/api';

export function listContractors(params?: { search?: string; category?: string; homeZipFilter?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.category) qs.set('category', params.category);
  if (params?.homeZipFilter) qs.set('homeZipFilter', 'true');
  return request<{ data: any[] }>(`/api/v1/contractors${qs.toString() ? `?${qs}` : ''}`);
}

export function getContractor(contractorId: string) {
  return request<{ data: any }>(`/api/v1/contractors/${contractorId}`);
}

export function getContractorJobs(contractorId: string) {
  return request<{ data: any[] }>(`/api/v1/contractors/${contractorId}/jobs`);
}
