import type { JobFilterValues, JobRow } from './types';

/** True when the job passes the status filter and its title, home or category contains the search text. */
export function matchesFilters(job: JobRow, { search, status }: JobFilterValues): boolean {
  if (status && job.status !== status) return false;
  if (!search) return true;
  const q = search.toLowerCase();
  return [job.title, job.home.name, job.category].some((text) => text.toLowerCase().includes(q));
}
