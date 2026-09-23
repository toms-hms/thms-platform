import { gqlRequest } from '@/lib/graphql';
import type { HomeDto, UpdateHomeInput } from '@/types/api';
import { HOME_FIELDS } from '../queries';

/** Updates fields on an existing home. */
export async function updateHome(homeId: string, input: UpdateHomeInput): Promise<{ data: HomeDto }> {
  const data = await gqlRequest<{ updateHome: { home: HomeDto } }>(
    `mutation UpdateHome(
       $homeId: ID!, $name: String, $address1: String, $address2: String,
       $city: String, $state: String, $zipCode: String, $notes: String
     ) {
       updateHome(
         homeId: $homeId, name: $name, address1: $address1, address2: $address2,
         city: $city, state: $state, zipCode: $zipCode, notes: $notes
       ) { home { ${HOME_FIELDS} } }
     }`,
    { homeId, ...input }
  );
  return { data: data.updateHome.home };
}

/** Deletes a home by ID. */
export async function deleteHome(homeId: string): Promise<{ data: { success: boolean } }> {
  const data = await gqlRequest<{ deleteHome: { success: boolean } }>(
    `mutation DeleteHome($homeId: ID!) { deleteHome(homeId: $homeId) { success } }`,
    { homeId }
  );
  return { data: data.deleteHome };
}
