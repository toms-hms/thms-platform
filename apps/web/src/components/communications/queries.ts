import { gqlRequest } from '@/lib/graphql';
import type { CommunicationDto } from '@/types/api';
import { CONTRACTOR_FIELDS } from '@/components/jobs/queries';

export const COMMUNICATION_FIELDS = `
  id jobId contractorId channel direction subject bodyText bodyHtml sentAt receivedAt parsedSummary needsReview createdAt
  contractor { ${CONTRACTOR_FIELDS} }
`;

/** Lists communications filtered by job, contractor, review status, or direction. */
export async function listCommunications(params: {
  jobId: string;
  contractorId?: string;
  needsReview?: boolean;
  direction?: string;
}): Promise<{ data: CommunicationDto[] }> {
  const data = await gqlRequest<{ communications: CommunicationDto[] }>(
    `query Communications(
       $jobId: ID!, $contractorId: ID, $needsReview: Boolean, $direction: CommunicationDirection
     ) {
       communications(
         jobId: $jobId, contractorId: $contractorId, needsReview: $needsReview, direction: $direction
       ) { ${COMMUNICATION_FIELDS} }
     }`,
    params
  );
  return { data: data.communications };
}
