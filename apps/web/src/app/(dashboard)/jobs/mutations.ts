import { request } from '@/lib/api';
import type { JobDto, CreateJobInput } from '@thms/shared';

type CreateJobData = CreateJobInput & { homeId: string };

/** Creates a new job under the given home. */
export function createJob(data: CreateJobData) {
  return request<{ data: JobDto }>('/api/v1/jobs', { method: 'POST', body: JSON.stringify(data) });
}
