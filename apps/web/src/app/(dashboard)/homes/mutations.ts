import { gqlRequest } from '@/lib/graphql';
import type { CreateHomeInput, HomeDto } from '@/types/api';
import { HOME_FIELDS } from './queries';

/** Creates a new home for the current user. */
export async function createHome(input: CreateHomeInput): Promise<{ data: HomeDto }> {
  const data = await gqlRequest<{ createHome: { home: HomeDto } }>(
    `mutation CreateHome(
       $name: String!, $address1: String!, $address2: String, $city: String!,
       $state: String!, $zipCode: String!, $country: String, $notes: String
     ) {
       createHome(
         name: $name, address1: $address1, address2: $address2, city: $city,
         state: $state, zipCode: $zipCode, country: $country, notes: $notes
       ) { home { ${HOME_FIELDS} } }
     }`,
    input as unknown as Record<string, unknown>
  );
  return { data: data.createHome.home };
}
