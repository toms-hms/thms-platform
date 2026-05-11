import { request } from '@/lib/api';
import type { UserContractorDto } from '@thms/shared';

/** Fetches the current user's rolodex entries with contractor data attached. */
export function listUserContractors() {
  return request<{ data: UserContractorDto[] }>('/api/v1/user-contractors');
}
