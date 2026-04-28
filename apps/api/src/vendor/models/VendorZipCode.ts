import { pgTable, text } from 'drizzle-orm/pg-core';
import { vendors } from './Vendor';

export const vendorZipCodes = pgTable('VendorZipCode', {
  id:       text('id').primaryKey(),
  vendorId: text('vendorId').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  zipCode:  text('zipCode').notNull(),
});

export type VendorZipCode    = typeof vendorZipCodes.$inferSelect;
export type NewVendorZipCode = typeof vendorZipCodes.$inferInsert;
