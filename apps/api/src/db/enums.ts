import { pgEnum } from 'drizzle-orm/pg-core';

export const tradeCategoryEnum = pgEnum('TradeCategory', [
  'PLUMBING', 'ELECTRICAL', 'HVAC', 'ROOFING', 'PAINTING',
  'LANDSCAPING', 'GENERAL_CONTRACTING', 'CARPENTRY', 'FLOORING', 'PEST_CONTROL',
  'DOORS_AND_WINDOWS', 'POOL_AND_SPA',
]);

export const jobIntentEnum = pgEnum('JobIntent', ['ISSUE', 'IMPROVEMENT', 'RECURRING_WORK']);

export const userRoleEnum = pgEnum('UserRole', ['ADMIN', 'USER']);
export const homeRoleEnum = pgEnum('HomeRole', ['OWNER', 'MEMBER']);
export const jobStatusEnum = pgEnum('JobStatus', [
  'DRAFT', 'PLANNING', 'REACHING_OUT', 'COMPARING_QUOTES',
  'SCHEDULED', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'COMPLETED',
]);
export const jobContractorStatusEnum = pgEnum('JobContractorStatus', [
  'NOT_CONTACTED', 'CONTACTED', 'RESPONDED', 'VISIT_REQUESTED',
  'VISIT_SCHEDULED', 'VISIT_COMPLETED', 'QUOTE_RECEIVED', 'DECLINED',
  'ACCEPTED', 'WORK_IN_PROGRESS', 'WORK_COMPLETED', 'PAID',
]);
export const communicationChannelEnum = pgEnum('CommunicationChannel', ['EMAIL']);
export const communicationDirectionEnum = pgEnum('CommunicationDirection', ['SENT', 'RECEIVED']);
export const quoteStatusEnum = pgEnum('QuoteStatus', ['DRAFT', 'CONFIRMED']);
export const aiGenerationStatusEnum = pgEnum('AIGenerationStatus', ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);
export const integrationTypeEnum = pgEnum('IntegrationType', ['EMAIL', 'AI']);
export const integrationProviderEnum = pgEnum('IntegrationProvider', ['GOOGLE', 'MICROSOFT', 'OPENAI']);
