import { request, buildUrl } from '@/lib/api';
import type { CommunicationDto } from '@thms/shared';

/** Lists communications filtered by job, contractor, review status, or direction. */
export function listCommunications(params?: {
  jobId?:        string;
  contractorId?: string;
  needsReview?:  boolean;
  direction?:    string;
}) {
  const queryParams: Record<string, string | undefined> = {
    jobId:        params?.jobId,
    contractorId: params?.contractorId,
    needsReview:  params?.needsReview !== undefined ? String(params.needsReview) : undefined,
    direction:    params?.direction,
  };
  return request<{ data: CommunicationDto[] }>(buildUrl('/communications', queryParams));
}
