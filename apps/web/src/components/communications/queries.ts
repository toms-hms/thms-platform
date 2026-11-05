import { gqlRequest } from '@/lib/graphql';
import type { CommunicationDto } from '@/types/api';
import { CONTRACTOR_FIELDS } from '@/components/jobs/queries';

export const COMMUNICATION_FIELDS = `
  id channel direction subject bodyText bodyHtml sentAt receivedAt parsedSummary needsReview createdAt
  contractor { ${CONTRACTOR_FIELDS} }
`;

/** Lists communications filtered by jobs, contractors, review status, or directions. */
export async function listCommunications(params: {
  jobIds: string[];
  contractorIds?: string[];
  needsReview?: boolean;
  directions?: string[];
}): Promise<{ data: CommunicationDto[] }> {
  const data = await gqlRequest<{ communications: CommunicationDto[] }>(
    `query Communications(
       $jobIds: [ID!]!, $contractorIds: [ID!], $needsReview: Boolean, $directions: [CommunicationDirection!]
     ) {
       communications(
         jobIds: $jobIds, contractorIds: $contractorIds, needsReview: $needsReview, directions: $directions
       ) { ${COMMUNICATION_FIELDS} }
     }`,
    params
  );
  return { data: data.communications };
}
