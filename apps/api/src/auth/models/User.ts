import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { userRoleEnum } from '../../db/enums';

export const users = pgTable('User', {
  id:               text('id').primaryKey(),
  email:            text('email').notNull().unique(),
  passwordHash:     text('passwordHash').notNull(),
  firstName:        text('firstName').notNull(),
  lastName:         text('lastName').notNull(),
  role:             userRoleEnum('role').notNull().default('USER'),
  refreshTokenHash: text('refreshTokenHash'),
  createdAt:        timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt:        timestamp('updatedAt', { precision: 3 }).notNull(),
});

export type User    = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
