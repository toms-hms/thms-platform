import { gqlRequest } from '@/lib/graphql';
import type { CreateHomeInput, CreateJobInput, HomeDto, JobDto } from '@/types/api';
import { HOME_FIELDS } from '../homes/queries';
import { JOB_FIELDS } from '../homes/[homeId]/queries';

type CreateJobData = CreateJobInput & { homeId: string };

/** Creates a new job under the given home. */
export async function createJob(input: CreateJobData): Promise<{ data: JobDto }> {
  const data = await gqlRequest<{ createJob: { job: JobDto } }>(
    `mutation CreateJob(
       $homeId: ID!, $title: String!, $category: TradeCategory!, $intent: JobIntent,
       $categories: [TradeCategory!], $description: String, $notes: String,
       $status: JobStatus, $aiSession: JSONString
     ) {
       createJob(
         homeId: $homeId, title: $title, category: $category, intent: $intent,
         categories: $categories, description: $description, notes: $notes,
         status: $status, aiSession: $aiSession
       ) { job { ${JOB_FIELDS} } }
     }`,
    { ...input, aiSession: input.aiSession ? JSON.stringify(input.aiSession) : undefined }
  );
  return { data: data.createJob.job };
}

/** Creates a home from the jobs page, so a job can be added to it straight away. */
export async function createHome(input: CreateHomeInput): Promise<{ data: HomeDto }> {
  const data = await gqlRequest<{ createHome: { home: HomeDto } }>(
    `mutation CreateHomeFromJobs(
       $name: String!, $address1: String!, $city: String!, $state: String!,
       $zipCode: String!, $country: String
     ) {
       createHome(
         name: $name, address1: $address1, city: $city, state: $state,
         zipCode: $zipCode, country: $country
       ) { home { ${HOME_FIELDS} } }
     }`,
    input as unknown as Record<string, unknown>
  );
  return { data: data.createHome.home };
}
