import { request } from '@/lib/api';
import type { HomeDto } from '@thms/shared';

/** Returns all homes the current user has access to. */
export function listHomes() {
  return request<{ data: HomeDto[] }>('/api/v1/homes');
}
