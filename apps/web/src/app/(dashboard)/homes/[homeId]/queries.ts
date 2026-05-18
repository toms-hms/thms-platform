import { request, buildUrl } from '@/lib/api';
import type { HomeDto, JobDto } from '@thms/shared';

/** Returns a single home by ID. */
export function getHome(homeId: string) {
  return request<{ data: HomeDto }>(`/homes/${homeId}`);
}

/** Lists jobs for a home, optionally filtered by status or category. */
export function listJobs(homeId: string, params?: { status?: string; category?: string }) {
  return request<{ data: JobDto[] }>(buildUrl('/jobs', { homeId, ...params }));
}
