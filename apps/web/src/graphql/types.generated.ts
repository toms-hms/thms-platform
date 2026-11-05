export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * The `DateTime` scalar type represents a DateTime
   * value as specified by
   * [iso8601](https://en.wikipedia.org/wiki/ISO_8601).
   */
  DateTime: { input: string; output: string; }
  /**
   * Allows use of a JSON String for input / output from the GraphQL schema.
   *
   * Use of this type is *not recommended* as you lose the benefits of having a defined, static
   * schema (one of the key benefits of GraphQL).
   */
  JSONString: { input: string; output: string; }
};

/** Whether the platform sent the message or received it. */
export enum CommunicationDirection {
  RECEIVED = 'RECEIVED',
  SENT = 'SENT'
}

/** A user's role within a single home. Only OWNER may delete the home. */
export enum HomeRole {
  MEMBER = 'MEMBER',
  OWNER = 'OWNER'
}

/** Where a single contractor stands on a job. */
export enum JobContractorStatus {
  ACCEPTED = 'ACCEPTED',
  CONTACTED = 'CONTACTED',
  DECLINED = 'DECLINED',
  NOT_CONTACTED = 'NOT_CONTACTED',
  PAID = 'PAID',
  QUOTE_RECEIVED = 'QUOTE_RECEIVED',
  RESPONDED = 'RESPONDED',
  VISIT_COMPLETED = 'VISIT_COMPLETED',
  VISIT_REQUESTED = 'VISIT_REQUESTED',
  VISIT_SCHEDULED = 'VISIT_SCHEDULED',
  WORK_COMPLETED = 'WORK_COMPLETED',
  WORK_IN_PROGRESS = 'WORK_IN_PROGRESS'
}

/** What the homeowner is trying to achieve, which decides how the assistant scopes the work. */
export enum JobIntent {
  IMPROVEMENT = 'IMPROVEMENT',
  ISSUE = 'ISSUE',
  RECURRING_WORK = 'RECURRING_WORK'
}

/** Where the job sits in its lifecycle. Only the user moves a job between states. */
export enum JobStatus {
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  COMPARING_QUOTES = 'COMPARING_QUOTES',
  COMPLETED = 'COMPLETED',
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  PLANNING = 'PLANNING',
  REACHING_OUT = 'REACHING_OUT',
  SCHEDULED = 'SCHEDULED'
}

/** Whether the quote is still provisional or has been confirmed by the homeowner. */
export enum QuoteStatus {
  CONFIRMED = 'CONFIRMED',
  DRAFT = 'DRAFT'
}

/** The trade a contractor works in, and the category a job falls under. */
export enum TradeCategory {
  CARPENTRY = 'CARPENTRY',
  DOORS_AND_WINDOWS = 'DOORS_AND_WINDOWS',
  ELECTRICAL = 'ELECTRICAL',
  FLOORING = 'FLOORING',
  GENERAL_CONTRACTING = 'GENERAL_CONTRACTING',
  HVAC = 'HVAC',
  LANDSCAPING = 'LANDSCAPING',
  PAINTING = 'PAINTING',
  PEST_CONTROL = 'PEST_CONTROL',
  PLUMBING = 'PLUMBING',
  POOL_AND_SPA = 'POOL_AND_SPA',
  ROOFING = 'ROOFING'
}
