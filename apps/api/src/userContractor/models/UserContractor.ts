import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from '@/auth/models/User';
import { contractors } from '@/contractor/models/Contractor';

export const userContractors = pgTable('user_contractors', {
  id:           text('id').primaryKey(),
  userId:       text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contractorId: text('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  note:         text('note'),
  createdAt:    timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { precision: 3 }).notNull(),
});

export type UserContractor    = typeof userContractors.$inferSelect;
export type NewUserContractor = typeof userContractors.$inferInsert;
