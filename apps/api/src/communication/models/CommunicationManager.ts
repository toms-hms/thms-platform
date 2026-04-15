import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { communications, type Communication, type NewCommunication } from './Communication';
import { contractors } from '../../contractor/models/Contractor';
import { NotFoundError } from '../../utils/errors';
import { UserRole } from '@thms/shared';

export const CommunicationManager = {
  async listForJob(jobId: string, filters?: { contractorId?: string; needsReview?: boolean; direction?: string }) {
    return db
      .select({ communication: communications, contractor: contractors })
      .from(communications)
      .leftJoin(contractors, eq(communications.contractorId, contractors.id))
      .where(
        and(
          eq(communications.jobId, jobId),
          filters?.contractorId ? eq(communications.contractorId, filters.contractorId) : undefined,
          filters?.needsReview !== undefined ? eq(communications.needsReview, filters.needsReview) : undefined,
          filters?.direction ? eq(communications.direction, filters.direction as Communication['direction']) : undefined,
        )
      )
      .orderBy(communications.createdAt);
  },

  async listForUser(userId: string, role: UserRole, jobId: string, filters?: { contractorId?: string; needsReview?: boolean; direction?: string }) {
    if (role !== 'ADMIN') {
      const { JobManager } = await import('../../job/models/JobManager');
      const allowed = await JobManager.hasPermission(userId, jobId);
      if (!allowed) throw new NotFoundError('Job');
    }
    return this.listForJob(jobId, filters);
  },

  async findById(id: string): Promise<Communication | undefined> {
    const [comm] = await db.select().from(communications).where(eq(communications.id, id)).limit(1);
    return comm;
  },

  async hasPermission(userId: string, communicationId: string): Promise<boolean> {
    const comm = await this.findById(communicationId);
    if (!comm || !comm.jobId) return false;
    const { JobManager } = await import('../../job/models/JobManager');
    return JobManager.hasPermission(userId, comm.jobId);
  },

  async create(data: NewCommunication): Promise<Communication> {
    const [comm] = await db.insert(communications).values(data).returning();
    return comm;
  },

  async update(id: string, data: Partial<Pick<Communication, 'needsReview' | 'parsedSummary'>>): Promise<Communication> {
    const [comm] = await db
      .update(communications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(communications.id, id))
      .returning();
    if (!comm) throw new NotFoundError('Communication');
    return comm;
  },
};
