import { request } from '@/lib/api';
import type { JobDto } from '@thms/shared';

/** Returns a single job by ID with all related entities (contractors, images, quotes, etc). */
export function getJob(jobId: string) {
  return request<{ data: JobDto }>(`/jobs/${jobId}`);
}
