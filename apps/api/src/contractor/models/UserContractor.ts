import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { users } from '../../auth/models/User';
import { contractors } from './Contractor';

export const userContractors = pgTable('UserContractor', {
  userId:       text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contractorId: text('contractorId').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  createdAt:    timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.contractorId] })]);

export type UserContractor    = typeof userContractors.$inferSelect;
export type NewUserContractor = typeof userContractors.$inferInsert;
