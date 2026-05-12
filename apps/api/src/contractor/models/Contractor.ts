import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tradeCategoryEnum } from '../../db/enums';

export const contractors = pgTable('Contractor', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  companyName: text('companyName'),
  email:       text('email'),
  phone:       text('phone'),
  categories:  tradeCategoryEnum('categories').array().notNull(),
  notes:       text('notes'),
  isGlobal:    boolean('is_global').notNull().default(false),
  createdAt:   timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt:   timestamp('updatedAt', { precision: 3 }).notNull(),
});

export type Contractor    = typeof contractors.$inferSelect;
export type NewContractor = typeof contractors.$inferInsert;
