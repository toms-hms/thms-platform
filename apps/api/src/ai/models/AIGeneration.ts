import { pgTable, text, timestamp, json } from 'drizzle-orm/pg-core';
import { aiGenerationStatusEnum } from '../../db/enums';
import { jobs } from '../../job/models/Job';
import { users } from '../../auth/models/User';

export const aiGenerations = pgTable('AIGeneration', {
  id:               text('id').primaryKey(),
  jobId:            text('jobId').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  originalImageUrl: text('originalImageUrl'),
  prompt:           text('prompt').notNull(),
  generatedImageUrl: text('generatedImageUrl'),
  provider:         text('provider').notNull(),
  status:           aiGenerationStatusEnum('status').notNull().default('PENDING'),
  metadata:         json('metadata'),
  createdByUserId:  text('createdByUserId').notNull().references(() => users.id),
  createdAt:        timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt:        timestamp('updatedAt', { precision: 3 }).notNull(),
});

export type AIGeneration    = typeof aiGenerations.$inferSelect;
export type NewAIGeneration = typeof aiGenerations.$inferInsert;
