import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { jobs } from '../../job/models/Job';
import { users } from '../../auth/models/User';
import { aiGenerations } from './AIGeneration';

export const jobImages = pgTable('JobImage', {
  id:             text('id').primaryKey(),
  jobId:          text('jobId').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  storageKey:     text('storageKey').notNull(),
  kind:           text('kind').notNull().default('SOURCE'),
  label:          text('label'),
  aiGenerationId: text('aiGenerationId').references(() => aiGenerations.id),
  uploadedById:   text('uploadedById').notNull().references(() => users.id),
  createdAt:      timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
});

export type JobImage    = typeof jobImages.$inferSelect;
export type NewJobImage = typeof jobImages.$inferInsert;
