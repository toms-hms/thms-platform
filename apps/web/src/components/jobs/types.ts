import type { JobDetailQuery } from './JobDetail.generated';

/** A job as the job detail page loads it, with its contractors, quotes, messages and images. */
export type JobDetail = NonNullable<JobDetailQuery['job']>;
