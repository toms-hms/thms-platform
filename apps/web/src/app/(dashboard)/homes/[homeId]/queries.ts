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

/** Lists jobs for a home, optionally filtered by status or category. */
export async function listJobs(
  homeId: string,
  params?: { status?: string; category?: string }
): Promise<{ data: JobDto[] }> {
  const data = await gqlRequest<{ jobs: JobDto[] }>(
    `query HomeJobs($homeId: ID, $status: JobStatus, $category: TradeCategory) {
       jobs(homeId: $homeId, status: $status, category: $category) { ${JOB_FIELDS} }
     }`,
    { homeId, status: params?.status, category: params?.category }
  );
  return { data: data.jobs };
}
