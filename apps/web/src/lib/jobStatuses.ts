import { JobStatus } from '@/graphql/types.generated';

/** Every job status in lifecycle order, which is how a user scans them (the generated enum is alphabetical). */
export const JOB_STATUSES = [
  JobStatus.DRAFT,
  JobStatus.PLANNING,
  JobStatus.REACHING_OUT,
  JobStatus.COMPARING_QUOTES,
  JobStatus.SCHEDULED,
  JobStatus.IN_PROGRESS,
  JobStatus.AWAITING_PAYMENT,
  JobStatus.COMPLETED,
];

/** A status as words: `REACHING_OUT` → `REACHING OUT`. */
export function jobStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}
