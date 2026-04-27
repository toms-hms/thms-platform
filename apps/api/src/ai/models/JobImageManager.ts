import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { jobImages, type JobImage, type NewJobImage } from './JobImage';
import { NotFoundError } from '../../utils/errors';

export const JobImageManager = {
  async listForJob(jobId: string): Promise<JobImage[]> {
    return db.select().from(jobImages).where(eq(jobImages.jobId, jobId)).orderBy(jobImages.createdAt);
  },

  async findById(id: string): Promise<JobImage | undefined> {
    const [img] = await db.select().from(jobImages).where(eq(jobImages.id, id)).limit(1);
    return img;
  },

  async create(data: NewJobImage): Promise<JobImage> {
    const [img] = await db.insert(jobImages).values(data).returning();
    return img;
  },

  async delete(id: string): Promise<void> {
    await db.delete(jobImages).where(eq(jobImages.id, id));
  },
};
