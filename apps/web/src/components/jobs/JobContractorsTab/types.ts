import type { JobDetail } from '@/components/jobs/types';
import type { DraftEmailMutation } from './mutations/__generated__/DraftEmail.generated';

/** One contractor's assignment to the job, as the job detail query loads it. */
export type JobContractorRow = JobDetail['contractors'][number];

/** One generated outreach email, before it is sent. */
export type EmailDraft = NonNullable<DraftEmailMutation['draftEmail']>['drafts'][number];
