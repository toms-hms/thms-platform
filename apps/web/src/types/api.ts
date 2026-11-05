/**
 * API shapes the GraphQL schema cannot describe.
 *
 * Every query and mutation result is typed by the `*.generated.ts` file codegen
 * writes beside its `.graphql` file, and schema enums and inputs come from
 * `@/graphql/types.generated`. This file holds only what the schema leaves
 * untyped: the JSON the AI session stores, and roles the schema exposes as plain
 * strings.
 */

/** A user's platform role. The schema exposes `role` as a string. */
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

// ─── AI session summary (the JSON in `summary` / `aiSession`) ────────────────

export interface IssueSummary {
  intent: 'ISSUE';
  rootCause: string;
  severity: string;
  scope: string;
  priceRange: [number, number];
  constraints: string[];
}

export interface ImprovementSummary {
  intent: 'IMPROVEMENT';
  scope: string;
  priceRange: [number, number];
  constraints: string[];
}

export interface RecurringSummary {
  intent: 'RECURRING_WORK';
  frequency: string;
  scope: string;
  priceRange: [number, number];
  constraints?: string[];
}

export type AiSessionSummary = IssueSummary | ImprovementSummary | RecurringSummary;
