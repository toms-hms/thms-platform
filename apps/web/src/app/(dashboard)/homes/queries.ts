import { gqlRequest } from '@/lib/graphql';
import type { HomeDto } from '@/types/api';

export const HOME_FIELDS = `
  id name address1 address2 city state zipCode country notes fullAddress createdAt updatedAt
`;

/** Returns all homes the current user has access to. */
export async function listHomes(): Promise<{ data: HomeDto[] }> {
  const data = await gqlRequest<{ homes: HomeDto[] }>(`query { homes { ${HOME_FIELDS} } }`);
  return { data: data.homes };
}
