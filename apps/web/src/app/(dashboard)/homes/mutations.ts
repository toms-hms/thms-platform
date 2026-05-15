import { request } from '@/lib/api';
import type { HomeDto, CreateHomeInput } from '@thms/shared';

/** Creates a new home for the current user. */
export function createHome(data: CreateHomeInput) {
  return request<{ data: HomeDto }>('/api/v1/homes', { method: 'POST', body: JSON.stringify(data) });
}
