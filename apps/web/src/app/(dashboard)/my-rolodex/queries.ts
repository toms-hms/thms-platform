import { gqlRequest } from '@/lib/graphql';
import type { UserContractorDto } from '@/types/api';
import { CONTRACTOR_FIELDS } from '../contractors/queries';

/** Fetches the current user's rolodex entries with contractor data attached. */
export async function listUserContractors(): Promise<{ data: UserContractorDto[] }> {
  const data = await gqlRequest<{ userContractors: UserContractorDto[] }>(
    `query { userContractors { id note createdAt updatedAt contractor { ${CONTRACTOR_FIELDS} } } }`
  );
  return { data: data.userContractors };
}
