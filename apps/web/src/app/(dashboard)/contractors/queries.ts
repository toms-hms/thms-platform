import { request, buildUrl } from '@/lib/api';
import type { ContractorDto, JobDto } from '@thms/shared';

/** Lists contractors filtered by search, trade categories, and/or ZIP codes. */
export function listContractors(params?: {
  search?: string;
  tradeCategories?: string[];
  zipCodes?: string[];
}) {
  return request<{ data: ContractorDto[] }>(buildUrl('/api/v1/contractors', params));
}

/** Returns a single contractor by ID. */
export function getContractor(contractorId: string) {
  return request<{ data: ContractorDto }>(`/api/v1/contractors/${contractorId}`);
}

/** Returns the job history for a contractor. */
export function getContractorJobs(contractorId: string) {
  return request<{ data: JobDto[] }>(`/api/v1/contractors/${contractorId}/jobs`);
}
