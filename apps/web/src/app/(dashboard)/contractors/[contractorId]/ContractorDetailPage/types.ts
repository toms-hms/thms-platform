import type { ContractorQuery } from './queries/__generated__/Contractor.generated';

/** The contractor as the detail page loads it. */
export type ContractorDetail = NonNullable<ContractorQuery['contractor']>;
