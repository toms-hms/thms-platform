import { pgTable, text, timestamp, doublePrecision, unique } from 'drizzle-orm/pg-core';
import { quoteStatusEnum } from '../../db/enums';
import { jobs } from '../../job/models/Job';
import { contractors } from '../../contractor/models/Contractor';
import { communications } from '../../communication/models/Communication';

export const quotes = pgTable('Quote', {
  id:                    text('id').primaryKey(),
  jobId:                 text('jobId').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  contractorId:          text('contractorId').notNull().references(() => contractors.id),
  amount:                doublePrecision('amount').notNull(),
  description:           text('description'),
  status:                quoteStatusEnum('status').notNull().default('DRAFT'),
  sourceCommunicationId: text('sourceCommunicationId').references(() => communications.id),
  createdAt:             timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt:             timestamp('updatedAt', { precision: 3 }).notNull(),
}, (t) => [unique().on(t.sourceCommunicationId)]);

export type Quote    = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
