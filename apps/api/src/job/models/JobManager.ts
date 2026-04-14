import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { jobs, type Job, type NewJob } from './Job';
import { userHomes } from '../../home/models/UserHome';
import { NotFoundError } from '../../utils/errors';

export const JobManager = {
  async listForHome(homeId: string, userId: string, filters?: { status?: string; category?: string }): Promise<Job[]> {
    const [membership] = await db
      .select()
      .from(userHomes)
      .where(and(eq(userHomes.userId, userId), eq(userHomes.homeId, homeId)))
      .limit(1);
    if (!membership) throw new NotFoundError('Home');

    return db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.homeId, homeId),
          filters?.status   ? eq(jobs.status, filters.status as Job['status'])       : undefined,
          filters?.category ? eq(jobs.category, filters.category)                    : undefined,
        )
      )
      .orderBy(desc(jobs.createdAt));
  },

  async findById(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return job;
  },

  async findByIdForUser(id: string, userId: string): Promise<Job> {
    const job = await this.findById(id);
    if (!job) throw new NotFoundError('Job');
    const [membership] = await db
      .select()
      .from(userHomes)
      .where(and(eq(userHomes.userId, userId), eq(userHomes.homeId, job.homeId)))
      .limit(1);
    if (!membership) throw new NotFoundError('Job');
    return job;
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
