import { eq, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '../../db';
import { contractors, type Contractor, type NewContractor } from './Contractor';
import { contractorZipCodes } from './ContractorZipCode';
import { NotFoundError } from '../../utils/errors';
import { UserRole } from '@thms/shared';

export type ContractorWithRelations = Contractor & {
  zipCodes: string[];
};

async function attachRelations(rows: Contractor[]): Promise<ContractorWithRelations[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((c) => c.id);
  const zips = await db.select().from(contractorZipCodes).where(inArray(contractorZipCodes.contractorId, ids));
  return rows.map((c) => ({
    ...c,
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

  async create(data: NewContractor, zipCodes: string[]): Promise<ContractorWithRelations> {
    return db.transaction(async (tx) => {
      const [c] = await tx.insert(contractors).values(data).returning();
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
    zipCodes?: string[],
  ): Promise<ContractorWithRelations> {
    return db.transaction(async (tx) => {
      const [c] = await tx
        .update(contractors)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(contractors.id, id))
        .returning();
      if (!c) throw new NotFoundError('Contractor');

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
