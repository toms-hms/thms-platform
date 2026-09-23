import { gqlRequest } from '@/lib/graphql';
import type { HomeDto, JobDto } from '@/types/api';
import { HOME_FIELDS } from '../homes/queries';
import { JOB_FIELDS } from '../homes/[homeId]/queries';

/** Returns all homes the current user has access to. */
export async function listHomes(): Promise<{ data: HomeDto[] }> {
  const data = await gqlRequest<{ homes: HomeDto[] }>(`query { homes { ${HOME_FIELDS} } }`);
  return { data: data.homes };
}

/** Lists jobs, optionally filtered by homeId, status, or category. */
export async function listJobs(params?: {
  homeId?: string;
  status?: string;
  category?: string;
}): Promise<{ data: JobDto[] }> {
  const data = await gqlRequest<{ jobs: JobDto[] }>(
    `query Jobs($homeId: ID, $status: JobStatus, $category: TradeCategory) {
       jobs(homeId: $homeId, status: $status, category: $category) { ${JOB_FIELDS} }
     }`,
    { homeId: params?.homeId, status: params?.status, category: params?.category }
  );
  return { data: data.jobs };
}
