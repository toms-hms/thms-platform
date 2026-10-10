import { gqlRequest } from '@/lib/graphql';
import type {
  AIGenerationDto,
  ContractorDto,
  IntegrationDto,
  JobContractorDto,
  JobImageDto,
  QuoteDto,
} from '@/types/api';

export const CONTRACTOR_FIELDS = `
  id name companyName email phone categories zipCodes notes isGlobal createdAt updatedAt
`;
export const JOB_CONTRACTOR_FIELDS = `
  id jobId contractorId status lastContactedAt lastResponseAt notes createdAt updatedAt
  contractor { ${CONTRACTOR_FIELDS} }
`;
export const QUOTE_FIELDS = `
  id jobId contractorId sourceCommunicationId amount description status createdAt updatedAt contractor { ${CONTRACTOR_FIELDS} }
`;
export const JOB_IMAGE_FIELDS = `id jobId aiGenerationId storageKey kind label url createdAt`;
export const AI_GENERATION_FIELDS = `
  id jobId prompt provider status originalImageUrl generatedImageUrl createdAt
`;

/** Lists job-contractor assignments for a given job. */
export async function listJobContractors(params: { jobId: string }): Promise<{ data: JobContractorDto[] }> {
  const data = await gqlRequest<{ jobContractors: JobContractorDto[] }>(
    `query JobContractors($jobId: ID!) { jobContractors(jobId: $jobId) { ${JOB_CONTRACTOR_FIELDS} } }`,
    params
  );
  return { data: data.jobContractors };
}

/** Lists quotes for a given job. */
export async function listQuotes(params: { jobId: string }): Promise<{ data: QuoteDto[] }> {
  const data = await gqlRequest<{ quotes: QuoteDto[] }>(
    `query Quotes($jobId: ID!) { quotes(jobId: $jobId) { ${QUOTE_FIELDS} } }`,
    params
  );
  return { data: data.quotes };
}

/** Lists uploaded images for a given job. */
export async function listImages(params: { jobId: string }): Promise<{ data: JobImageDto[] }> {
  const data = await gqlRequest<{ jobImages: JobImageDto[] }>(
    `query JobImages($jobId: ID!) { jobImages(jobId: $jobId) { ${JOB_IMAGE_FIELDS} } }`,
    params
  );
  return { data: data.jobImages };
}

/** Lists AI generations for a given job. */
export async function listAIGenerations(params: { jobId: string }): Promise<{ data: AIGenerationDto[] }> {
  const data = await gqlRequest<{ aiGenerations: AIGenerationDto[] }>(
    `query AiGenerations($jobId: ID!) { aiGenerations(jobId: $jobId) { ${AI_GENERATION_FIELDS} } }`,
    params
  );
  return { data: data.aiGenerations };
}

/** Lists contractors filtered by search, trade categories, and/or ZIP codes. */
export async function listContractors(params?: {
  search?: string;
  tradeCategories?: string[];
  zipCodes?: string[];
}): Promise<{ data: ContractorDto[] }> {
  const data = await gqlRequest<{ contractors: ContractorDto[] }>(
    `query JobContractorPicker($search: String, $tradeCategories: [TradeCategory!], $zipCodes: [String!]) {
       contractors(search: $search, tradeCategories: $tradeCategories, zipCodes: $zipCodes) {
         ${CONTRACTOR_FIELDS}
       }
     }`,
    {
      search: params?.search,
      tradeCategories: params?.tradeCategories,
      zipCodes: params?.zipCodes,
    }
  );
  return { data: data.contractors };
}

/** Returns all integrations for the current user. */
export async function listIntegrations(): Promise<{ data: IntegrationDto[] }> {
  const data = await gqlRequest<{ integrations: IntegrationDto[] }>(
    `query { integrations { id type provider status email scopes createdAt updatedAt } }`
  );
  return { data: data.integrations };
}
