import { request } from '@/lib/api';
import type { HomeDto, UpdateHomeInput } from '@thms/shared';

/** Updates fields on an existing home. */
export function updateHome(homeId: string, data: UpdateHomeInput) {
  return request<{ data: HomeDto }>(`/homes/${homeId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/** Deletes a home by ID. */
export function deleteHome(homeId: string) {
  return request(`/homes/${homeId}`, { method: 'DELETE' });
}
