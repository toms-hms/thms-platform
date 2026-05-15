import { request } from '@/lib/api';
import type {
  JobDto,
  UpdateJobInput,
  JobContractorDto,
  JobContractorStatus,
  QuoteDto,
  CreateQuoteInput,
  UpdateQuoteInput,
  CommunicationDto,
} from '@thms/shared';

interface JobImageDto {
  id: string;
  jobId: string;
  storageKey: string;
  kind: string;
  label?: string | null;
  aiGenerationId?: string | null;
  uploadedById: string;
  createdAt: string;
  url: string;
}

interface UploadUrlResult {
  uploadUrl: string;
  key: string;
  kind: string;
}

interface EmailDraftDto {
  contractorId: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

interface EmailDraftInput {
  contractorIds: string[];
  tone?: string;
  includeImages?: boolean;
  customInstructions?: string;
}

interface SendEmailInput {
  integrationId: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  contractorId: string;
}

/** Updates fields on an existing job. */
export function updateJob(jobId: string, data: UpdateJobInput) {
  return request<{ data: JobDto }>(`/api/v1/jobs/${jobId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/** Assigns a contractor to a job. */
export function assignContractor(data: { jobId: string; contractorId: string; notes?: string }) {
  return request<{ data: JobContractorDto }>('/api/v1/job-contractors', { method: 'POST', body: JSON.stringify(data) });
}

/** Updates the status of a job-contractor assignment. */
export function updateJobContractorStatus(jobContractorId: string, data: { status: JobContractorStatus; notes?: string }) {
  return request<{ data: JobContractorDto }>(`/api/v1/job-contractors/${jobContractorId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/** Removes a contractor from a job. */
export function removeJobContractor(jobContractorId: string) {
  return request(`/api/v1/job-contractors/${jobContractorId}`, { method: 'DELETE' });
}

/** Creates a quote for a job. */
export function createQuote(data: CreateQuoteInput & { jobId: string }) {
  return request<{ data: QuoteDto }>('/api/v1/quotes', { method: 'POST', body: JSON.stringify(data) });
}

/** Updates an existing quote. */
export function updateQuote(quoteId: string, data: UpdateQuoteInput) {
  return request<{ data: QuoteDto }>(`/api/v1/quotes/${quoteId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/** Deletes a quote by ID. */
export function deleteQuote(quoteId: string) {
  return request(`/api/v1/quotes/${quoteId}`, { method: 'DELETE' });
}

/** Requests a presigned URL for uploading a job image to object storage. */
export function getUploadUrl(data: { jobId: string; fileName: string; contentType: string; kind: string }) {
  return request<{ data: UploadUrlResult }>(
    '/api/v1/images/upload-url',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

/** Confirms a completed image upload and persists the image record. */
export function confirmUpload(data: { jobId: string; key: string; kind?: string; label?: string }) {
  return request<{ data: JobImageDto }>('/api/v1/images/confirm', { method: 'POST', body: JSON.stringify(data) });
}

/** Deletes a job image by ID. */
export function deleteImage(imageId: string) {
  return request(`/api/v1/images/${imageId}`, { method: 'DELETE' });
}

/** Creates an AI generation for a job image. */
export function createAIGeneration(data: { jobId: string; sourceImageId: string; provider: string; prompt: string; metadata?: Record<string, unknown> }) {
  return request<{ data: import('@thms/shared').AIGenerationDto }>('/api/v1/ai-generations', { method: 'POST', body: JSON.stringify(data) });
}

/** Generates AI email drafts for the given contractors on a job. */
export function draftEmail(jobId: string, data: EmailDraftInput) {
  return request<{ data: EmailDraftDto[] }>(`/api/v1/jobs/${jobId}/email-drafts`, { method: 'POST', body: JSON.stringify(data) });
}

/** Sends an email via the user's connected email integration. */
export function sendEmail(jobId: string, data: SendEmailInput) {
  return request<{ data: CommunicationDto }>(`/api/v1/jobs/${jobId}/send-email`, { method: 'POST', body: JSON.stringify(data) });
}
