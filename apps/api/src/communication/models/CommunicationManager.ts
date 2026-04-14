import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { communications, type Communication, type NewCommunication } from './Communication';
import { contractors } from '../../contractor/models/Contractor';
import { NotFoundError } from '../../utils/errors';

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

  async findById(id: string): Promise<Communication | undefined> {
    const [comm] = await db.select().from(communications).where(eq(communications.id, id)).limit(1);
    return comm;
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
