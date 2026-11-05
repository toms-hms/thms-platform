import { gqlRequest } from '@/lib/graphql';
import type { HomeDto, JobDto } from '@/types/api';
import { HOME_FIELDS } from '../queries';

export const JOB_FIELDS = `
  id homeId createdByUserId title intent category description notes status aiSession createdAt updatedAt
  home { id name }
`;

/** Returns a single home by ID. */
export async function getHome(homeId: string): Promise<{ data: HomeDto }> {
  const data = await gqlRequest<{ home: HomeDto }>(
    `query GetHome($homeId: ID!) { home(homeId: $homeId) { ${HOME_FIELDS} } }`,
    { homeId }
  );
  return { data: data.home };
}

/** Lists jobs for the given homes, optionally filtered by statuses or trade categories. */
export async function listJobs(params: {
  homeIds: string[];
  statuses?: string[];
  tradeCategories?: string[];
}): Promise<{ data: JobDto[] }> {
  const data = await gqlRequest<{ jobs: JobDto[] }>(
    `query HomeJobs($homeIds: [ID!], $statuses: [JobStatus!], $tradeCategories: [TradeCategory!]) {
       jobs(homeIds: $homeIds, statuses: $statuses, tradeCategories: $tradeCategories) { ${JOB_FIELDS} }
     }`,
    params
  );
  return { data: data.jobs };
}
