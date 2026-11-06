import type { JobImagesQuery } from './queries/__generated__/JobImages.generated';

/** One image on the job: an uploaded source photo or a generated concept. */
export type JobImageRow = JobImagesQuery['jobImages'][number];
