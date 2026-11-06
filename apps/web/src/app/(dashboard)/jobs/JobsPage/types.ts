import type { JobsQuery } from './queries/__generated__/Jobs.generated';

/** A job as the list shows it. */
export type JobRow = JobsQuery['jobs'][number];

export interface JobFilterValues {
  search: string;
  status: string;
}
