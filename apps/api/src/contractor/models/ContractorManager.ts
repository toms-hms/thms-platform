import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { contractors, type Contractor, type NewContractor } from './Contractor';
import { NotFoundError } from '../../utils/errors';
import { UserRole } from '@thms/shared';

export const ContractorManager = {
  async findAll(): Promise<Contractor[]> {
    return db.select().from(contractors);
  },

  async hasPermission(_userId: string, _resourceId: string): Promise<boolean> {
    return true; // contractors are global — any authenticated user can read
  },

  async listForUser(_userId: string, _role: UserRole): Promise<Contractor[]> {
    return this.findAll();
  },

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
