import { pgTable, text, primaryKey } from 'drizzle-orm/pg-core';
import { tradeCategoryEnum } from '../../db/enums';
import { vendors } from './Vendor';

export const vendorCategories = pgTable('VendorCategory', {
  vendorId: text('vendorId').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  category: tradeCategoryEnum('category').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.vendorId, t.category] }),
}));

export type VendorCategory    = typeof vendorCategories.$inferSelect;
export type NewVendorCategory = typeof vendorCategories.$inferInsert;
