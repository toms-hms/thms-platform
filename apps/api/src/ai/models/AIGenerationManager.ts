import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { aiGenerations, type AIGeneration, type NewAIGeneration } from './AIGeneration';
import { NotFoundError } from '../../utils/errors';

export const AIGenerationManager = {
  async listForJob(jobId: string): Promise<AIGeneration[]> {
    return db.select().from(aiGenerations).where(eq(aiGenerations.jobId, jobId)).orderBy(aiGenerations.createdAt);
  },

  async findById(id: string): Promise<AIGeneration | undefined> {
    const [gen] = await db.select().from(aiGenerations).where(eq(aiGenerations.id, id)).limit(1);
    return gen;
  },

  async create(data: NewAIGeneration): Promise<AIGeneration> {
    const [gen] = await db.insert(aiGenerations).values(data).returning();
    return gen;
  },

  async update(id: string, data: Partial<NewAIGeneration>): Promise<AIGeneration> {
    const [gen] = await db
      .update(aiGenerations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiGenerations.id, id))
      .returning();
    if (!gen) throw new NotFoundError('AIGeneration');
    return gen;
  },
};
