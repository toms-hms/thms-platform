import { request } from '@/lib/api';
import type { CommunicationDto } from '@thms/shared';

interface UpdateCommunicationInput {
  needsReview?: boolean;
  parsedSummary?: string;
}

/** Updates review status or parsed summary on a communication. */
export function updateCommunication(communicationId: string, data: UpdateCommunicationInput) {
  return request<{ data: CommunicationDto }>(`/api/v1/communications/${communicationId}`, { method: 'PATCH', body: JSON.stringify(data) });
}
