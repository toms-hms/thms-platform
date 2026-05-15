import { request, buildUrl } from '@/lib/api';

export function listJobContractors(params: { jobId?: string }) {
  return request<{ data: any[] }>(buildUrl('/api/v1/job-contractors', params));
}

export function listQuotes(params: { jobId?: string }) {
  return request<{ data: any[] }>(buildUrl('/api/v1/quotes', params));
}

export function listImages(params: { jobId?: string }) {
  return request<{ data: any[] }>(buildUrl('/api/v1/images', params));
}

export function listAIGenerations(params: { jobId?: string }) {
  return request<{ data: any[] }>(buildUrl('/api/v1/ai-generations', params));
}

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

export function listIntegrations() {
  return request<{ data: any[] }>('/api/v1/integrations');
}
