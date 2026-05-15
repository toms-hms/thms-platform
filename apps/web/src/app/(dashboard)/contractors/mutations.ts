import { request } from '@/lib/api';
import type { ContractorDto, CreateContractorInput, UpdateContractorInput } from '@thms/shared';

/** Creates a new global contractor. */
export function createContractor(data: CreateContractorInput) {
  return request<{ data: ContractorDto }>('/api/v1/contractors', { method: 'POST', body: JSON.stringify(data) });
}

/** Updates fields on an existing contractor. */
export function updateContractor(contractorId: string, data: UpdateContractorInput) {
  return request<{ data: ContractorDto }>(`/api/v1/contractors/${contractorId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/** Deletes a contractor by ID. */
export function deleteContractor(contractorId: string) {
  return request(`/api/v1/contractors/${contractorId}`, { method: 'DELETE' });
}
