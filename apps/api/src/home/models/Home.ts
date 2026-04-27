import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const homes = pgTable('Home', {
  id:       text('id').primaryKey(),
  name:     text('name').notNull(),
  address1: text('address1').notNull(),
  address2: text('address2'),
  city:     text('city').notNull(),
  state:    text('state').notNull(),
  zipCode:  text('zipCode').notNull(),
  country:  text('country').notNull().default('US'),
  notes:    text('notes'),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { precision: 3 }).notNull(),
});

export type Home    = typeof homes.$inferSelect;
export type NewHome = typeof homes.$inferInsert;
