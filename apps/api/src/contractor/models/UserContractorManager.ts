import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { userContractors, type UserContractor, type NewUserContractor } from './UserContractor';
import { contractors } from './Contractor';
import { NotFoundError } from '../../utils/errors';

export const UserContractorManager = {
  async findMembership(userId: string, contractorId: string): Promise<UserContractor | undefined> {
    const [uc] = await db
      .select()
      .from(userContractors)
      .where(and(eq(userContractors.userId, userId), eq(userContractors.contractorId, contractorId)))
      .limit(1);
    return uc;
  },

  async assertMembership(userId: string, contractorId: string): Promise<UserContractor> {
    const uc = await this.findMembership(userId, contractorId);
    if (!uc) throw new NotFoundError('Contractor');
    return uc;
  },

  async listContractorsForUser(userId: string) {
    return db
      .select({ contractor: contractors })
      .from(userContractors)
      .innerJoin(contractors, eq(userContractors.contractorId, contractors.id))
      .where(eq(userContractors.userId, userId));
  },

  async create(data: NewUserContractor): Promise<UserContractor> {
    const [uc] = await db.insert(userContractors).values(data).returning();
    return uc;
  },

  async delete(userId: string, contractorId: string): Promise<void> {
    await db.delete(userContractors).where(
      and(eq(userContractors.userId, userId), eq(userContractors.contractorId, contractorId))
    );
  },
};
