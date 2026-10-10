import { gqlRequest } from '@/lib/graphql';
import type { CommunicationDto, UpdateCommunicationInput } from '@/types/api';
import { COMMUNICATION_FIELDS } from './queries';

/** Updates review status or parsed summary on a communication. */
export async function updateCommunication(
  communicationId: string,
  input: UpdateCommunicationInput
): Promise<{ data: CommunicationDto }> {
  const data = await gqlRequest<{ updateCommunication: { communication: CommunicationDto } }>(
    `mutation UpdateCommunication($communicationId: ID!, $needsReview: Boolean, $parsedSummary: String) {
       updateCommunication(
         communicationId: $communicationId, needsReview: $needsReview, parsedSummary: $parsedSummary
       ) { communication { ${COMMUNICATION_FIELDS} } }
     }`,
    { communicationId, ...input }
  );
  return { data: data.updateCommunication.communication };
}
