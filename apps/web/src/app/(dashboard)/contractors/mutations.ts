import { gqlRequest } from '@/lib/graphql';
import type { ContractorDto, CreateContractorInput, UpdateContractorInput } from '@/types/api';
import { CONTRACTOR_FIELDS } from './queries';

/** Creates a new global contractor. */
export async function createContractor(input: CreateContractorInput): Promise<{ data: ContractorDto }> {
  const data = await gqlRequest<{ createContractor: { contractor: ContractorDto } }>(
    `mutation CreateContractor(
       $name: String!, $categories: [TradeCategory!]!, $companyName: String,
       $email: String, $phone: String, $zipCodes: [String!], $notes: String
     ) {
       createContractor(
         name: $name, categories: $categories, companyName: $companyName,
         email: $email, phone: $phone, zipCodes: $zipCodes, notes: $notes
       ) { contractor { ${CONTRACTOR_FIELDS} } }
     }`,
    input as unknown as Record<string, unknown>
  );
  return { data: data.createContractor.contractor };
}

/** Updates fields on an existing contractor. */
export async function updateContractor(
  contractorId: string,
  input: UpdateContractorInput
): Promise<{ data: ContractorDto }> {
  const data = await gqlRequest<{ updateContractor: { contractor: ContractorDto } }>(
    `mutation UpdateContractor(
       $contractorId: ID!, $name: String, $categories: [TradeCategory!], $companyName: String,
       $email: String, $phone: String, $zipCodes: [String!], $notes: String
     ) {
       updateContractor(
         contractorId: $contractorId, name: $name, categories: $categories, companyName: $companyName,
         email: $email, phone: $phone, zipCodes: $zipCodes, notes: $notes
       ) { contractor { ${CONTRACTOR_FIELDS} } }
     }`,
    { contractorId, ...input }
  );
  return { data: data.updateContractor.contractor };
}

/** Deletes a contractor by ID. */
export async function deleteContractor(contractorId: string): Promise<{ data: { success: boolean } }> {
  const data = await gqlRequest<{ deleteContractor: { success: boolean } }>(
    `mutation DeleteContractor($contractorId: ID!) {
       deleteContractor(contractorId: $contractorId) { success }
     }`,
    { contractorId }
  );
  return { data: data.deleteContractor };
}
