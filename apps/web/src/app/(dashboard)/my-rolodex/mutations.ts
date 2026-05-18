import { request } from '@/lib/api';
import type { CreateUserContractorInput, UserContractorDto } from '@thms/shared';

/** Adds a contractor to the user's rolodex, creating a private contractor if no contractorId is given. */
export function createUserContractor(data: CreateUserContractorInput) {
  return request<{ data: UserContractorDto }>('/user-contractors', { method: 'POST', body: JSON.stringify(data) });
}

/** Removes a contractor from the user's rolodex. */
export function deleteUserContractor(userContractorId: string) {
  return request(`/user-contractors/${userContractorId}`, { method: 'DELETE' });
}
