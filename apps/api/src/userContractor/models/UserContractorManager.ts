import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { contractors } from '@/contractor/models/Contractor';
import { attachZipCodes, type ContractorWithRelations } from '@/contractor/models/ContractorManager';
import { UserRole } from '@/auth/models/User';
import { userContractors, type UserContractor, type NewUserContractor } from './UserContractor';

export type UserContractorWithContractor = UserContractor & {
  contractor: ContractorWithRelations;
};

/** Fetches the linked contractor (with zip codes) for each join row in two batched queries. */
export async function attachContractor(rows: UserContractor[]): Promise<UserContractorWithContractor[]> {
  if (rows.length === 0) return [];
  const contractorIds = rows.map((r) => r.contractorId);
  const allContractors = await db.select().from(contractors).where(inArray(contractors.id, contractorIds));
  const withZips = await attachZipCodes(allContractors);

  return rows.map((row) => {
    const contractor = withZips.find((c) => c.id === row.contractorId)!;
    return { ...row, contractor };
  });
}

export const UserContractorManager = {
  /** Returns all user-contractor joins for the given user. */
  async filterUser(userId: string): Promise<UserContractor[]> {
    return db.select().from(userContractors).where(eq(userContractors.userId, userId)).orderBy(desc(userContractors.createdAt));
  },

  /** Returns all user-contractor joins across all users. */
  async filterAll(): Promise<UserContractor[]> {
    return db.select().from(userContractors).orderBy(desc(userContractors.createdAt));
  },

  /** Returns records for the user (all records for admins). Required by the permissioning framework. */
  async listForUser(userId: string, role: UserRole): Promise<UserContractor[]> {
    return role === UserRole.ADMIN ? this.filterAll() : this.filterUser(userId);
  },

  /** Returns true if the user-contractor record belongs to the given user. Required by the permit middleware. */
  async hasPermission(userId: string, resourceId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: userContractors.id })
      .from(userContractors)
      .where(and(eq(userContractors.id, resourceId), eq(userContractors.userId, userId)))
      .limit(1);
    return !!row;
  },

  /** Returns the user-contractor join with the given ID, or undefined if not found. */
  async filterById(id: string): Promise<UserContractor | undefined> {
    const [row] = await db.select().from(userContractors).where(eq(userContractors.id, id)).limit(1);
    return row ?? undefined;
  },

  /** Returns an existing join for the user and contractor, or undefined. */
  async filterExisting(userId: string, contractorId: string): Promise<UserContractor | undefined> {
    const [row] = await db
      .select()
      .from(userContractors)
      .where(and(eq(userContractors.userId, userId), eq(userContractors.contractorId, contractorId)))
      .limit(1);
    return row ?? undefined;
  },

  /** Creates a user-contractor join record. */
  async create(data: NewUserContractor): Promise<UserContractor> {
    const [row] = await db.insert(userContractors).values(data).returning();
    return row;
  },

  /** Deletes the user-contractor join with the given ID. */
  async delete(id: string): Promise<void> {
    await db.delete(userContractors).where(eq(userContractors.id, id));
  },
};
