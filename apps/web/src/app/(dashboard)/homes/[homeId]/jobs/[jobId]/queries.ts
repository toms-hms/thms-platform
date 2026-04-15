import { request } from '@/lib/api';

export function getJob(jobId: string) {
  return request<{ data: any }>(`/api/v1/jobs/${jobId}`);
}
