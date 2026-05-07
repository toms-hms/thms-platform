import { createId } from '@paralleldrive/cuid2';
import { and, arrayContains, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { homes } from '@/home/models/Home';
import { jobs } from '@/job/models/Job';
import { jobContractors } from '@/job/models/JobContractor';
import { NotFoundError } from '@/utils/errors';
import { BaseManager } from '@/utils/BaseManager';
import { TradeCategory, UserRole } from '@thms/shared';
import { contractors, type Contractor, type NewContractor } from './Contractor';
import { contractorZipCodes } from './ContractorZipCode';

export type ContractorWithRelations = Contractor & {
  zipCodes: string[];
};

/** Fetches zip codes for the given contractors in one batched query and attaches them. */
export async function attachZipCodes(rows: Contractor[]): Promise<ContractorWithRelations[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((c) => c.id);
  const zips = await db.select().from(contractorZipCodes).where(inArray(contractorZipCodes.contractorId, ids));
  return rows.map((c) => ({
    ...c,
    zipCodes: zips.filter((z) => z.contractorId === c.id).map((z) => z.zipCode),
  }));
}

interface FilterContractorsOpts {
  zipCode?: string;
  category?: TradeCategory;
  search?: string;
}

class ContractorManagerClass extends BaseManager<typeof contractors> {
  readonly table = contractors;

  /** Returns contractors matching any combination of optional filters in a single query. */
  async filterContractors(opts: FilterContractorsOpts = {}): Promise<Contractor[]> {
    const { zipCode, category, search } = opts;
    const conditions: (SQL | undefined)[] = [];

    if (zipCode) {
      const subq = db
        .select({ contractorId: contractorZipCodes.contractorId })
        .from(contractorZipCodes)
        .where(eq(contractorZipCodes.zipCode, zipCode));
      conditions.push(inArray(contractors.id, subq));
    }

    if (category) {
      conditions.push(arrayContains(contractors.categories, [category]));
    }

    if (search) {
      const q = `%${search}%`;
      conditions.push(or(
        ilike(contractors.name, q),
        ilike(contractors.companyName, q),
        ilike(contractors.email, q),
      ));
    }

    const active = conditions.filter(Boolean);
    return db.select().from(contractors)
      .where(active.length ? and(...active) : undefined);
  }

  /** Returns the contractor whose email matches (case-insensitive), or undefined if not found. */
  async filterEmail(email: string): Promise<Contractor | undefined> {
    const [c] = await db.select().from(contractors).where(ilike(contractors.email, email)).limit(1);
    return c ?? undefined;
  }

  /** Always returns true — global contractors are visible to all users. Required by the permit middleware. */
  async hasPermission(_userId: string, _resourceId: string): Promise<boolean> {
    return true;
  }

  /** Returns all global contractors. Required by the permissioning framework. */
  async listForUser(_userId: string, _role: UserRole): Promise<Contractor[]> {
    return this.filterContractors();
  }

  /** Creates a contractor with the given zip codes in a single transaction. Returns bare contractor. */
  async create(data: NewContractor, zipCodes: string[]): Promise<Contractor> {
    return db.transaction(async (tx) => {
      const [c] = await tx.insert(contractors).values(data).returning();
      if (zipCodes.length > 0) {
        await tx.insert(contractorZipCodes)
          .values(zipCodes.map((z) => ({ id: createId(), contractorId: c.id, zipCode: z })));
      }
      return c;
    });
  }

  /** Updates a contractor's fields and optionally replaces its zip codes. Returns bare contractor. */
  async update(id: string, data: Partial<NewContractor>, zipCodes?: string[]): Promise<Contractor> {
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
          await tx.insert(contractorZipCodes)
            .values(zipCodes.map((z) => ({ id: createId(), contractorId: id, zipCode: z })));
        }
      }
      return c;
    });
  }

  /** Deletes the contractor with the given ID. */
  async delete(id: string): Promise<void> {
    await db.delete(contractors).where(eq(contractors.id, id));
  }

  /** Returns the job history for a contractor ordered by most recent first. */
  async listJobHistory(contractorId: string) {
    return db
      .select({
        jobId: jobs.id,
        jobTitle: jobs.title,
        jobStatus: jobs.status,
        homeId: homes.id,
        homeName: homes.name,
        contractorStatus: jobContractors.status,
      })
      .from(jobContractors)
      .innerJoin(jobs, eq(jobContractors.jobId, jobs.id))
      .innerJoin(homes, eq(jobs.homeId, homes.id))
      .where(eq(jobContractors.contractorId, contractorId))
      .orderBy(desc(jobContractors.createdAt));
  }
}

/** Singleton — use ContractorManager directly, no instantiation needed. */
export const ContractorManager = new ContractorManagerClass();
