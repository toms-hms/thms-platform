import { gqlRequest } from '@/lib/graphql';
import type { JobDto } from '@/types/api';

const CONTRACTOR_FIELDS = `id name companyName email phone categories zipCodes notes isGlobal createdAt updatedAt`;

/** Returns a single job by ID with all related entities (contractors, images, quotes, etc). */
export async function getJob(jobId: string): Promise<{ data: JobDto }> {
  const data = await gqlRequest<{ job: JobDto }>(
    `query GetJob($jobId: ID!) {
       job(jobId: $jobId) {
         id title intent category description notes status aiSession createdAt updatedAt
         home { id name }
         contractors {
           id status lastContactedAt lastResponseAt notes createdAt updatedAt
           contractor { ${CONTRACTOR_FIELDS} }
         }
         quotes { id amount description status createdAt updatedAt contractor { ${CONTRACTOR_FIELDS} } }
         communications {
           id channel direction subject bodyText bodyHtml sentAt receivedAt
           parsedSummary needsReview createdAt contractor { ${CONTRACTOR_FIELDS} }
         }
         aiGenerations { id prompt provider status originalImageUrl generatedImageUrl createdAt }
         images { id storageKey kind label url createdAt }
       }
     }`,
    { jobId }
  );
  return { data: data.job };
}
