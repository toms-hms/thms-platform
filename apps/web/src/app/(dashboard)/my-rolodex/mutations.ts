import { gqlRequest } from '@/lib/graphql';
import type { CreateUserContractorInput, UserContractorDto } from '@/types/api';
import { CONTRACTOR_FIELDS } from '../contractors/queries';

/** Adds a contractor to the user's rolodex, creating a private contractor if no contractorId is given. */
export async function createUserContractor(
  input: CreateUserContractorInput
): Promise<{ data: UserContractorDto }> {
  const data = await gqlRequest<{ createUserContractor: { userContractor: UserContractorDto } }>(
    `mutation CreateUserContractor(
       $contractorId: ID, $note: String, $name: String, $companyName: String, $email: String,
       $phone: String, $categories: [TradeCategory!], $zipCodes: [String!], $notes: String
     ) {
       createUserContractor(
         contractorId: $contractorId, note: $note, name: $name, companyName: $companyName,
         email: $email, phone: $phone, categories: $categories, zipCodes: $zipCodes, notes: $notes
       ) {
         userContractor { id note createdAt updatedAt contractor { ${CONTRACTOR_FIELDS} } }
       }
     }`,
    input as unknown as Record<string, unknown>
  );
  return { data: data.createUserContractor.userContractor };
}

/** Removes a contractor from the user's rolodex. */
export async function deleteUserContractor(
  userContractorId: string
): Promise<{ data: { success: boolean } }> {
  const data = await gqlRequest<{ deleteUserContractor: { success: boolean } }>(
    `mutation DeleteUserContractor($userContractorId: ID!) {
       deleteUserContractor(userContractorId: $userContractorId) { success }
     }`,
    { userContractorId }
  );
  return { data: data.deleteUserContractor };
}
