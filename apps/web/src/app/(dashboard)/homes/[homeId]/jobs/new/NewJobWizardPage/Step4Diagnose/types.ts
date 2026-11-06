import type { TradeCategory } from '@/graphql/types.generated';

/** A trade category the assistant suggests, and why. */
export interface CategorySuggestion {
  category: TradeCategory;
  reason: string;
}

/** One answered question in the diagnostic conversation. */
export interface HistoryEntry {
  answer: string;
  question: string;
}
