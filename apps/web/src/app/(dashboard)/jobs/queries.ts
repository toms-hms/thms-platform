import { gqlRequest } from '@/lib/graphql';
import type { HomeDto, JobDto } from '@/types/api';
import { HOME_FIELDS } from '../homes/queries';
import { JOB_FIELDS } from '../homes/[homeId]/queries';

/** Returns all homes the current user has access to. */
export async function listHomes(): Promise<{ data: HomeDto[] }> {
  const data = await gqlRequest<{ homes: HomeDto[] }>(`query { homes { ${HOME_FIELDS} } }`);
  return { data: data.homes };
}

/** Lists jobs, optionally filtered by homes, statuses, or trade categories. */
export async function listJobs(params?: {
  homeIds?: string[];
  statuses?: string[];
  tradeCategories?: string[];
}): Promise<{ data: JobDto[] }> {
  const data = await gqlRequest<{ jobs: JobDto[] }>(
    `query Jobs($homeIds: [ID!], $statuses: [JobStatus!], $tradeCategories: [TradeCategory!]) {
       jobs(homeIds: $homeIds, statuses: $statuses, tradeCategories: $tradeCategories) { ${JOB_FIELDS} }
     }`,
    params
  );
  return { data: data.jobs };
}
