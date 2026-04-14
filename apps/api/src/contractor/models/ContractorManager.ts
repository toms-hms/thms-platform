import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { contractors, type Contractor, type NewContractor } from './Contractor';
import { NotFoundError } from '../../utils/errors';

export const ContractorManager = {
  async findById(id: string): Promise<Contractor | undefined> {
    const [c] = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1);
    return c;
  },

  async create(data: NewContractor): Promise<Contractor> {
    const [c] = await db.insert(contractors).values(data).returning();
    return c;
  },

  async update(id: string, data: Partial<NewContractor>): Promise<Contractor> {
    const [c] = await db
      .update(contractors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contractors.id, id))
      .returning();
    if (!c) throw new NotFoundError('Contractor');
    return c;
  },

  async delete(id: string): Promise<void> {
    await db.delete(contractors).where(eq(contractors.id, id));
  },
};
