import { eq, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '../../db';
import { vendors, type Vendor, type NewVendor } from './Vendor';
import { vendorCategories } from './VendorCategory';
import { vendorZipCodes } from './VendorZipCode';
import { NotFoundError } from '../../utils/errors';
import { TradeCategory, UserRole } from '@thms/shared';

export type VendorWithRelations = Vendor & {
  categories: TradeCategory[];
  zipCodes: string[];
};

async function attachRelations(rows: Vendor[]): Promise<VendorWithRelations[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((v) => v.id);
  const [cats, zips] = await Promise.all([
    db.select().from(vendorCategories).where(inArray(vendorCategories.vendorId, ids)),
    db.select().from(vendorZipCodes).where(inArray(vendorZipCodes.vendorId, ids)),
  ]);
  return rows.map((v) => ({
    ...v,
    categories: cats.filter((c) => c.vendorId === v.id).map((c) => c.category as TradeCategory),
    zipCodes: zips.filter((z) => z.vendorId === v.id).map((z) => z.zipCode),
  }));
}

export const VendorManager = {
  async findAll(): Promise<VendorWithRelations[]> {
    const rows = await db.select().from(vendors);
    return attachRelations(rows);
  },

  async hasPermission(_userId: string, _resourceId: string): Promise<boolean> {
    return true;
  },

  async listForUser(_userId: string, _role: UserRole): Promise<VendorWithRelations[]> {
    return this.findAll();
  },

  async findById(id: string): Promise<VendorWithRelations | undefined> {
    const [v] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    if (!v) return undefined;
    const [result] = await attachRelations([v]);
    return result;
  },

  async create(
    data: NewVendor,
    categories: TradeCategory[],
    zipCodes: string[],
  ): Promise<VendorWithRelations> {
    return db.transaction(async (tx) => {
      const [v] = await tx.insert(vendors).values(data).returning();
      if (categories.length > 0) {
        await tx.insert(vendorCategories).values(
          categories.map((c) => ({ vendorId: v.id, category: c })),
        );
      }
      if (zipCodes.length > 0) {
        await tx.insert(vendorZipCodes).values(
          zipCodes.map((z) => ({ id: createId(), vendorId: v.id, zipCode: z })),
        );
      }
      const [result] = await attachRelations([v]);
      return result;
    });
  },

  async update(
    id: string,
    data: Partial<NewVendor>,
    categories?: TradeCategory[],
    zipCodes?: string[],
  ): Promise<VendorWithRelations> {
    return db.transaction(async (tx) => {
      const [v] = await tx
        .update(vendors)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(vendors.id, id))
        .returning();
      if (!v) throw new NotFoundError('Vendor');

      if (categories !== undefined) {
        await tx.delete(vendorCategories).where(eq(vendorCategories.vendorId, id));
        if (categories.length > 0) {
          await tx.insert(vendorCategories).values(
            categories.map((c) => ({ vendorId: id, category: c })),
          );
        }
      }
      if (zipCodes !== undefined) {
        await tx.delete(vendorZipCodes).where(eq(vendorZipCodes.vendorId, id));
        if (zipCodes.length > 0) {
          await tx.insert(vendorZipCodes).values(
            zipCodes.map((z) => ({ id: createId(), vendorId: id, zipCode: z })),
          );
        }
      }
      const [result] = await attachRelations([v]);
      return result;
    });
  },

  async delete(id: string): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  },
};
