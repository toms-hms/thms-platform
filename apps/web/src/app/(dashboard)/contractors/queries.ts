import { gqlRequest } from '@/lib/graphql';
import type { ContractorDto, ContractorJobHistoryDto } from '@/types/api';

export const CONTRACTOR_FIELDS = `
  id name companyName email phone categories zipCodes notes isGlobal createdAt updatedAt
`;

/** Lists contractors filtered by search, trade categories, and/or ZIP codes. */
export async function listContractors(params?: {
  search?: string;
  tradeCategories?: string[];
  zipCodes?: string[];
}): Promise<{ data: ContractorDto[] }> {
  const data = await gqlRequest<{ contractors: ContractorDto[] }>(
    `query Contractors($search: String, $tradeCategories: [TradeCategory!], $zipCodes: [String!]) {
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

/** Returns a single contractor by ID. */
export async function getContractor(contractorId: string): Promise<{ data: ContractorDto }> {
  const data = await gqlRequest<{ contractor: ContractorDto }>(
    `query Contractor($contractorId: ID!) { contractor(contractorId: $contractorId) { ${CONTRACTOR_FIELDS} } }`,
    { contractorId }
  );
  return { data: data.contractor };
}

/** Returns the job history for a contractor. */
export async function getContractorJobs(
  contractorId: string
): Promise<{ data: ContractorJobHistoryDto[] }> {
  const data = await gqlRequest<{ contractorJobHistory: ContractorJobHistoryDto[] }>(
    `query ContractorJobs($contractorId: ID!) {
       contractorJobHistory(contractorId: $contractorId) {
         jobId jobTitle jobStatus homeId homeName contractorStatus
       }
     }`,
    { contractorId }
  );
  return { data: data.contractorJobHistory };
}
