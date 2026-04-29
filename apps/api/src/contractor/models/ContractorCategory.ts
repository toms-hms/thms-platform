import { pgTable, text, primaryKey } from 'drizzle-orm/pg-core';
import { tradeCategoryEnum } from '../../db/enums';
import { contractors } from './Contractor';

export const contractorCategories = pgTable('ContractorCategory', {
  contractorId: text('contractorId').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  category:     tradeCategoryEnum('category').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.contractorId, t.category] }),
}));

export type ContractorCategory    = typeof contractorCategories.$inferSelect;
export type NewContractorCategory = typeof contractorCategories.$inferInsert;
