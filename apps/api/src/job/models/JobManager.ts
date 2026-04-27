import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { jobs, type Job, type NewJob } from './Job';
import { userHomes } from '../../home/models/UserHome';
import { NotFoundError } from '../../utils/errors';
import { UserRole } from '@thms/shared';

export const JobManager = {
  async listForUser(userId: string, role: UserRole, homeId: string, filters?: { status?: string; category?: string }): Promise<Job[]> {
    if (role === 'ADMIN') return this.queryForHome(homeId, filters);
    const [membership] = await db
      .select()
      .from(userHomes)
      .where(and(eq(userHomes.userId, userId), eq(userHomes.homeId, homeId)))
      .limit(1);
    if (!membership) throw new NotFoundError('Home');
    return this.queryForHome(homeId, filters);
  },

  async queryForHome(homeId: string, filters?: { status?: string; category?: string }): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.homeId, homeId),
          filters?.status   ? eq(jobs.status, filters.status as Job['status'])       : undefined,
          filters?.category ? eq(jobs.category, filters.category as Job['category']) : undefined,
        )
      )
      .orderBy(desc(jobs.createdAt));
  },

  async findById(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return job;
  },

  async hasPermission(userId: string, jobId: string): Promise<boolean> {
    const job = await this.findById(jobId);
    if (!job) return false;
    const { HomeManager } = await import('../../home/models/HomeManager');
    return HomeManager.hasPermission(userId, job.homeId);
  },

  async create(data: NewJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(data).returning();
    return job;
  },

  async update(id: string, data: Partial<NewJob>): Promise<Job> {
    const [job] = await db
      .update(jobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    if (!job) throw new NotFoundError('Job');
    return job;
  },

  async delete(id: string): Promise<void> {
    await db.delete(jobs).where(eq(jobs.id, id));
  },
};
