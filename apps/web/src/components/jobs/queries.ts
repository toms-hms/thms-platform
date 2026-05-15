import { request, buildUrl } from '@/lib/api';
import type {
  ContractorDto,
  JobContractorDto,
  QuoteDto,
  AIGenerationDto,
  IntegrationDto,
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

/** Lists job-contractor assignments for a given job. */
export function listJobContractors(params: { jobId?: string }) {
  return request<{ data: JobContractorDto[] }>(buildUrl('/api/v1/job-contractors', params));
}

/** Lists quotes for a given job. */
export function listQuotes(params: { jobId?: string }) {
  return request<{ data: QuoteDto[] }>(buildUrl('/api/v1/quotes', params));
}

/** Lists uploaded images for a given job. */
export function listImages(params: { jobId?: string }) {
  return request<{ data: JobImageDto[] }>(buildUrl('/api/v1/images', params));
}

/** Lists AI generations for a given job. */
export function listAIGenerations(params: { jobId?: string }) {
  return request<{ data: AIGenerationDto[] }>(buildUrl('/api/v1/ai-generations', params));
}

/** Lists contractors filtered by search, trade categories, and/or ZIP codes. */
export function listContractors(params?: {
  search?: string;
  tradeCategories?: string[];
  zipCodes?: string[];
}) {
  return request<{ data: ContractorDto[] }>(buildUrl('/api/v1/contractors', params));
}

/** Returns all integrations for the current user. */
export function listIntegrations() {
  return request<{ data: IntegrationDto[] }>('/api/v1/integrations');
}
