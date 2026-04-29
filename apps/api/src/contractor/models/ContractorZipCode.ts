import { pgTable, text } from 'drizzle-orm/pg-core';
import { contractors } from './Contractor';

export const contractorZipCodes = pgTable('ContractorZipCode', {
  id:           text('id').primaryKey(),
  contractorId: text('contractorId').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  zipCode:      text('zipCode').notNull(),
});

export type ContractorZipCode    = typeof contractorZipCodes.$inferSelect;
export type NewContractorZipCode = typeof contractorZipCodes.$inferInsert;
