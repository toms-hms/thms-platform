import { request, buildUrl } from '@/lib/api';
import type { HomeDto, JobDto } from '@thms/shared';

/** Returns all homes the current user has access to. */
export function listHomes() {
  return request<{ data: HomeDto[] }>('/homes');
}

/** Lists jobs, optionally filtered by homeId, status, or category. */
export function listJobs(params?: { homeId?: string; status?: string; category?: string }) {
  return request<{ data: JobDto[] }>(buildUrl('/jobs', params));
}
