import { request } from '@/lib/api';

export function listCommunications(
  jobId: string,
  params?: { contractorId?: string; needsReview?: boolean; direction?: string }
) {
  const qs = new URLSearchParams();
  if (params?.contractorId) qs.set('contractorId', params.contractorId);
  if (params?.needsReview !== undefined) qs.set('needsReview', String(params.needsReview));
  if (params?.direction) qs.set('direction', params.direction);
  return request<{ data: any[] }>(`/api/v1/jobs/${jobId}/communications${qs.toString() ? `?${qs}` : ''}`);
}
