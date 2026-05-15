import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { jobContractorStatusEnum } from '@/db/enums';
import { jobs } from './Job';
import { contractors } from '@/contractor/models/Contractor';

export const jobContractors = pgTable('JobContractor', {
  id:              text('id').primaryKey(),
  jobId:           text('jobId').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  contractorId:    text('contractorId').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  status:          jobContractorStatusEnum('status').notNull().default('NOT_CONTACTED'),
  lastContactedAt: timestamp('lastContactedAt', { precision: 3 }),
  lastResponseAt:  timestamp('lastResponseAt', { precision: 3 }),
  notes:           text('notes'),
  createdAt:       timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt:       timestamp('updatedAt', { precision: 3 }).notNull(),
}, (t) => [unique().on(t.jobId, t.contractorId)]);

export type JobContractor    = typeof jobContractors.$inferSelect;
export type NewJobContractor = typeof jobContractors.$inferInsert;

export enum JobContractorStatus {
  NOT_CONTACTED = 'NOT_CONTACTED', CONTACTED = 'CONTACTED', RESPONDED = 'RESPONDED',
  VISIT_REQUESTED = 'VISIT_REQUESTED', VISIT_SCHEDULED = 'VISIT_SCHEDULED',
  VISIT_COMPLETED = 'VISIT_COMPLETED', QUOTE_RECEIVED = 'QUOTE_RECEIVED',
  DECLINED = 'DECLINED', ACCEPTED = 'ACCEPTED', WORK_IN_PROGRESS = 'WORK_IN_PROGRESS',
  WORK_COMPLETED = 'WORK_COMPLETED', PAID = 'PAID',
}
