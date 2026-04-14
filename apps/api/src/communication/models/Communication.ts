import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { communicationChannelEnum, communicationDirectionEnum } from '../../db/enums';
import { jobs } from '../../job/models/Job';
import { contractors } from '../../contractor/models/Contractor';

export const communications = pgTable('Communication', {
  id:                text('id').primaryKey(),
  jobId:             text('jobId').references(() => jobs.id),
  contractorId:      text('contractorId').references(() => contractors.id),
  channel:           communicationChannelEnum('channel').notNull().default('EMAIL'),
  direction:         communicationDirectionEnum('direction').notNull(),
  subject:           text('subject'),
  bodyText:          text('bodyText'),
  bodyHtml:          text('bodyHtml'),
  externalThreadId:  text('externalThreadId'),
  externalMessageId: text('externalMessageId'),
  sentAt:            timestamp('sentAt', { precision: 3 }),
  receivedAt:        timestamp('receivedAt', { precision: 3 }),
  parsedSummary:     text('parsedSummary'),
  needsReview:       boolean('needsReview').notNull().default(true),
  createdAt:         timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt:         timestamp('updatedAt', { precision: 3 }).notNull(),
});

export type Communication    = typeof communications.$inferSelect;
export type NewCommunication = typeof communications.$inferInsert;
