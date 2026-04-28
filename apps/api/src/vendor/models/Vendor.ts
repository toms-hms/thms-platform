import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const vendors = pgTable('Vendor', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  companyName: text('companyName'),
  email:       text('email'),
  phone:       text('phone'),
  notes:       text('notes'),
  createdAt:   timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt:   timestamp('updatedAt', { precision: 3 }).notNull(),
});

export type Vendor    = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
