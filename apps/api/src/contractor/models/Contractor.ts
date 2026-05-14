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

export enum TradeCategory {
  PLUMBING = 'PLUMBING', ELECTRICAL = 'ELECTRICAL', HVAC = 'HVAC',
  ROOFING = 'ROOFING', PAINTING = 'PAINTING', LANDSCAPING = 'LANDSCAPING',
  GENERAL_CONTRACTING = 'GENERAL_CONTRACTING', CARPENTRY = 'CARPENTRY',
  FLOORING = 'FLOORING', PEST_CONTROL = 'PEST_CONTROL',
  DOORS_AND_WINDOWS = 'DOORS_AND_WINDOWS', POOL_AND_SPA = 'POOL_AND_SPA',
}
