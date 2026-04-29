import { eq, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '../../db';
import { contractors, type Contractor, type NewContractor } from './Contractor';
import { contractorCategories } from './ContractorCategory';
import { contractorZipCodes } from './ContractorZipCode';
import { NotFoundError } from '../../utils/errors';
import { TradeCategory, UserRole } from '@thms/shared';

export type ContractorWithRelations = Contractor & {
  categories: TradeCategory[];
  zipCodes: string[];
};

async function attachRelations(rows: Contractor[]): Promise<ContractorWithRelations[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((c) => c.id);
  const [cats, zips] = await Promise.all([
    db.select().from(contractorCategories).where(inArray(contractorCategories.contractorId, ids)),
    db.select().from(contractorZipCodes).where(inArray(contractorZipCodes.contractorId, ids)),
  ]);
  return rows.map((c) => ({
    ...c,
    categories: cats.filter((cat) => cat.contractorId === c.id).map((cat) => cat.category as TradeCategory),
    zipCodes: zips.filter((z) => z.contractorId === c.id).map((z) => z.zipCode),
  }));
}

export const ContractorManager = {
  async findAll(): Promise<ContractorWithRelations[]> {
    const rows = await db.select().from(contractors);
    return attachRelations(rows);
  },

  async hasPermission(_userId: string, _resourceId: string): Promise<boolean> {
    return true;
  },

  async listForUser(_userId: string, _role: UserRole): Promise<ContractorWithRelations[]> {
    return this.findAll();
  },

  async findById(id: string): Promise<ContractorWithRelations | undefined> {
    const [c] = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1);
    if (!c) return undefined;
    const [result] = await attachRelations([c]);
    return result;
  },

  async create(
    data: NewContractor,
    categories: TradeCategory[],
    zipCodes: string[],
  ): Promise<ContractorWithRelations> {
    return db.transaction(async (tx) => {
      const [c] = await tx.insert(contractors).values(data).returning();
      if (categories.length > 0) {
        await tx.insert(contractorCategories).values(
          categories.map((cat) => ({ contractorId: c.id, category: cat })),
        );
      }
      if (zipCodes.length > 0) {
        await tx.insert(contractorZipCodes).values(
          zipCodes.map((z) => ({ id: createId(), contractorId: c.id, zipCode: z })),
        );
      }
      const [result] = await attachRelations([c]);
      return result;
    });
  },

  async update(
    id: string,
    data: Partial<NewContractor>,
    categories?: TradeCategory[],
    zipCodes?: string[],
  ): Promise<ContractorWithRelations> {
    return db.transaction(async (tx) => {
      const [c] = await tx
        .update(contractors)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(contractors.id, id))
        .returning();
      if (!c) throw new NotFoundError('Contractor');

      if (categories !== undefined) {
        await tx.delete(contractorCategories).where(eq(contractorCategories.contractorId, id));
        if (categories.length > 0) {
          await tx.insert(contractorCategories).values(
            categories.map((cat) => ({ contractorId: id, category: cat })),
          );
        }
      }
      if (zipCodes !== undefined) {
        await tx.delete(contractorZipCodes).where(eq(contractorZipCodes.contractorId, id));
        if (zipCodes.length > 0) {
          await tx.insert(contractorZipCodes).values(
            zipCodes.map((z) => ({ id: createId(), contractorId: id, zipCode: z })),
          );
        }
      }
      const [result] = await attachRelations([c]);
      return result;
    });
  },

  async delete(id: string): Promise<void> {
    await db.delete(contractors).where(eq(contractors.id, id));
  },
};
