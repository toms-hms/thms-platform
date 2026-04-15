import { request } from '@/lib/api';

export function listJobContractors(jobId: string) {
  return request<{ data: any[] }>(`/api/v1/jobs/${jobId}/contractors`);
}

export function listQuotes(jobId: string) {
  return request<{ data: any[] }>(`/api/v1/jobs/${jobId}/quotes`);
}

export function listImages(jobId: string) {
  return request<{ data: any[] }>(`/api/v1/jobs/${jobId}/images`);
}

export function listAIGenerations(jobId: string) {
  return request<{ data: any[] }>(`/api/v1/jobs/${jobId}/ai-generations`);
}

export function listContractors(params?: { search?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.category) qs.set('category', params.category);
  return request<{ data: any[] }>(`/api/v1/contractors${qs.toString() ? `?${qs}` : ''}`);
}

export function listIntegrations() {
  return request<{ data: any[] }>('/api/v1/integrations');
}
