import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tradeCategoryEnum } from '../../db/enums';

export const contractors = pgTable('Contractor', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  companyName: text('companyName'),
  email:       text('email'),
  phone:       text('phone'),
  category:    tradeCategoryEnum('category').notNull(),
  notes:       text('notes'),
  createdAt:   timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt:   timestamp('updatedAt', { precision: 3 }).notNull(),
});

export type Contractor    = typeof contractors.$inferSelect;
export type NewContractor = typeof contractors.$inferInsert;
