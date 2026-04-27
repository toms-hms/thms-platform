import { request } from '@/lib/api';

export function updateJob(jobId: string, data: any) {
  return request<{ data: any }>(`/api/v1/jobs/${jobId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function assignContractor(jobId: string, data: any) {
  return request<{ data: any }>(`/api/v1/jobs/${jobId}/contractors`, { method: 'POST', body: JSON.stringify(data) });
}

export function updateContractorStatus(jobId: string, jobContractorId: string, data: any) {
  return request<{ data: any }>(`/api/v1/jobs/${jobId}/contractors/${jobContractorId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function removeContractor(jobId: string, jobContractorId: string) {
  return request(`/api/v1/jobs/${jobId}/contractors/${jobContractorId}`, { method: 'DELETE' });
}

export function createQuote(jobId: string, data: any) {
  return request<{ data: any }>(`/api/v1/jobs/${jobId}/quotes`, { method: 'POST', body: JSON.stringify(data) });
}

export function updateQuote(quoteId: string, data: any) {
  return request<{ data: any }>(`/api/v1/quotes/${quoteId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteQuote(quoteId: string) {
  return request(`/api/v1/quotes/${quoteId}`, { method: 'DELETE' });
}

export function getUploadUrl(jobId: string, data: { fileName: string; contentType: string; kind: string }) {
  return request<{ data: { uploadUrl: string; key: string; kind: string } }>(
    `/api/v1/jobs/${jobId}/images/upload-url`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export function confirmUpload(jobId: string, data: { key: string; kind: string; label?: string }) {
  return request<{ data: any }>(`/api/v1/jobs/${jobId}/images/confirm`, { method: 'POST', body: JSON.stringify(data) });
}

export function deleteImage(jobId: string, imageId: string) {
  return request(`/api/v1/jobs/${jobId}/images/${imageId}`, { method: 'DELETE' });
}

export function createAIGeneration(jobId: string, data: any) {
  return request<{ data: any }>(`/api/v1/jobs/${jobId}/ai-generations`, { method: 'POST', body: JSON.stringify(data) });
}

export function draftEmail(jobId: string, data: any) {
  return request<{ data: any[] }>(`/api/v1/jobs/${jobId}/email-drafts`, { method: 'POST', body: JSON.stringify(data) });
}

export function sendEmail(jobId: string, data: any) {
  return request<{ data: any }>(`/api/v1/jobs/${jobId}/send-email`, { method: 'POST', body: JSON.stringify(data) });
}
