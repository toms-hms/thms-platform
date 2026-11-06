import { JobIntent, type TradeCategory } from '@/graphql/types.generated';
import type { AiSessionSummary } from '@/types/api';

/** What the wizard has collected so far, across all five steps. */
export interface WizardData {
  aiSummary: AiSessionSummary | null;
  categories: TradeCategory[];
  category: TradeCategory | null;
  categorySuggestions: Array<{ category: TradeCategory; reason: string }>;
  description: string;
  intent: JobIntent | null;
  jobId: string | null;
  photos: File[];
  selectedContractorIds: string[];
  title: string;
}

export const EMPTY_WIZARD: WizardData = {
  aiSummary: null,
  categories: [],
  category: null,
  categorySuggestions: [],
  description: '',
  intent: null,
  jobId: null,
  photos: [],
  selectedContractorIds: [],
  title: '',
};

/** Step 4's name in the progress bar, which depends on what the job is for. */
export const STEP4_LABEL: Record<JobIntent, string> = {
  [JobIntent.IMPROVEMENT]: 'Plan',
  [JobIntent.ISSUE]: 'Diagnose',
  [JobIntent.RECURRING_WORK]: 'Estimate',
};
