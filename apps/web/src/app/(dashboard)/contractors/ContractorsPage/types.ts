import type { ContractorsQuery } from './queries/__generated__/Contractors.generated';

/** One row of the contractor directory, as the page loads it. */
export type Contractor = ContractorsQuery['contractors'][number];

/** The directory's filters, as the filter row edits them. */
export interface ContractorFilterValues {
  search: string;
  tradeCategory: string;
  zipCode: string;
}
