import { request } from '@/lib/api';
import type { CreateUserContractorInput, UserContractorDto } from '@thms/shared';

/** Adds a contractor to the user's rolodex, creating a private contractor if no contractorId is given. */
export function createUserContractor(data: CreateUserContractorInput) {
  return request<{ data: UserContractorDto }>('/api/v1/user-contractors', { method: 'POST', body: JSON.stringify(data) });
}

/** Removes a contractor from the user's rolodex. */
export function deleteUserContractor(userContractorId: string) {
  return request(`/api/v1/user-contractors/${userContractorId}`, { method: 'DELETE' });
}
