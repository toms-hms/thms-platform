import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { jobStatusEnum, jobIntentEnum, tradeCategoryEnum } from '../../db/enums';
import { homes } from '../../home/models/Home';
import { users } from '../../auth/models/User';
import type { AiSession } from '@thms/shared';

export const jobs = pgTable('Job', {
  id:              text('id').primaryKey(),
  homeId:          text('homeId').notNull().references(() => homes.id, { onDelete: 'cascade' }),
  title:           text('title').notNull(),
  intent:          jobIntentEnum('intent').notNull().default('ISSUE'),
  category:        tradeCategoryEnum('category').notNull(),
  description:     text('description'),
  notes:           text('notes'),
  status:          jobStatusEnum('status').notNull().default('DRAFT'),
  aiSession:       jsonb('ai_session').$type<AiSession>(),
  createdByUserId: text('createdByUserId').notNull().references(() => users.id),
  createdAt:       timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt:       timestamp('updatedAt', { precision: 3 }).notNull(),
});

export type Job    = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
