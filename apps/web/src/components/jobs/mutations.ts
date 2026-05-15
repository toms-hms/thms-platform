import { request } from '@/lib/api';

export function updateJob(jobId: string, data: any) {
  return request<{ data: any }>(`/api/v1/jobs/${jobId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function assignContractor(data: { jobId: string; contractorId: string; notes?: string }) {
  return request<{ data: any }>('/api/v1/job-contractors', { method: 'POST', body: JSON.stringify(data) });
}

export function updateJobContractorStatus(jobContractorId: string, data: any) {
  return request<{ data: any }>(`/api/v1/job-contractors/${jobContractorId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function removeJobContractor(jobContractorId: string) {
  return request(`/api/v1/job-contractors/${jobContractorId}`, { method: 'DELETE' });
}

export function createQuote(data: { jobId: string; [key: string]: any }) {
  return request<{ data: any }>('/api/v1/quotes', { method: 'POST', body: JSON.stringify(data) });
}

export function updateQuote(quoteId: string, data: any) {
  return request<{ data: any }>(`/api/v1/quotes/${quoteId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteQuote(quoteId: string) {
  return request(`/api/v1/quotes/${quoteId}`, { method: 'DELETE' });
}

export function getUploadUrl(data: { jobId: string; fileName: string; contentType: string; kind: string }) {
  return request<{ data: { uploadUrl: string; key: string; kind: string } }>(
    '/api/v1/images/upload-url',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export function confirmUpload(data: { jobId: string; key: string; kind?: string; label?: string }) {
  return request<{ data: any }>('/api/v1/images/confirm', { method: 'POST', body: JSON.stringify(data) });
}

export function deleteImage(imageId: string) {
  return request(`/api/v1/images/${imageId}`, { method: 'DELETE' });
}

export function createAIGeneration(data: { jobId: string; [key: string]: any }) {
  return request<{ data: any }>('/api/v1/ai-generations', { method: 'POST', body: JSON.stringify(data) });
}

export function draftEmail(jobId: string, data: any) {
  return request<{ data: any[] }>(`/api/v1/jobs/${jobId}/email-drafts`, { method: 'POST', body: JSON.stringify(data) });
}

export function sendEmail(jobId: string, data: any) {
  return request<{ data: any }>(`/api/v1/jobs/${jobId}/send-email`, { method: 'POST', body: JSON.stringify(data) });
}
