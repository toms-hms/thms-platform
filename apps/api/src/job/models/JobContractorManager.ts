import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { jobContractors, type JobContractor, type NewJobContractor } from './JobContractor';
import { contractors } from '../../contractor/models/Contractor';
import { NotFoundError } from '../../utils/errors';

export const JobContractorManager = {
  async listForJob(jobId: string) {
    return db
      .select({ jobContractor: jobContractors, contractor: contractors })
      .from(jobContractors)
      .innerJoin(contractors, eq(jobContractors.contractorId, contractors.id))
      .where(eq(jobContractors.jobId, jobId))
      .orderBy(jobContractors.createdAt);
  },

  async findById(id: string): Promise<JobContractor | undefined> {
    const [jc] = await db.select().from(jobContractors).where(eq(jobContractors.id, id)).limit(1);
    return jc;
  },

  async upsert(jobId: string, contractorId: string, notes?: string): Promise<JobContractor> {
    const [jc] = await db
      .insert(jobContractors)
      .values({ id: `jc_${Date.now()}`, jobId, contractorId, status: 'NOT_CONTACTED', notes, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [jobContractors.jobId, jobContractors.contractorId],
        set: { notes, updatedAt: new Date() },
      })
      .returning();
    return jc;
  },

  async updateStatus(id: string, status: JobContractor['status'], notes?: string): Promise<JobContractor> {
    const now = new Date();
    const current = await this.findById(id);
    if (!current) throw new NotFoundError('JobContractor');

    const contactedStatuses: JobContractor['status'][] = [
      'CONTACTED', 'RESPONDED', 'VISIT_REQUESTED', 'VISIT_SCHEDULED',
      'VISIT_COMPLETED', 'QUOTE_RECEIVED', 'ACCEPTED', 'WORK_IN_PROGRESS', 'WORK_COMPLETED', 'PAID',
    ];
    const respondedStatuses: JobContractor['status'][] = [
      'RESPONDED', 'VISIT_REQUESTED', 'VISIT_SCHEDULED', 'VISIT_COMPLETED',
      'QUOTE_RECEIVED', 'ACCEPTED', 'WORK_IN_PROGRESS', 'WORK_COMPLETED', 'PAID',
    ];

    const [jc] = await db
      .update(jobContractors)
      .set({
        status,
        ...(notes !== undefined && { notes }),
        ...(contactedStatuses.includes(status) && !current.lastContactedAt && { lastContactedAt: now }),
        ...(respondedStatuses.includes(status) && !current.lastResponseAt && { lastResponseAt: now }),
        updatedAt: now,
      })
      .where(eq(jobContractors.id, id))
      .returning();
    return jc;
  },

  async delete(id: string): Promise<void> {
    await db.delete(jobContractors).where(eq(jobContractors.id, id));
  },
};
