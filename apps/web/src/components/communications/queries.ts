import { request, buildUrl } from '@/lib/api';

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
  return request<{ data: any[] }>(buildUrl('/api/v1/communications', queryParams));
}
