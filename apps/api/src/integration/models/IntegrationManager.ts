import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { integrations, type Integration, type NewIntegration } from './Integration';
import { NotFoundError } from '../../utils/errors';

export const IntegrationManager = {
  async listForUser(userId: string): Promise<Integration[]> {
    return db.select().from(integrations).where(eq(integrations.userId, userId));
  },

  async findById(id: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.id, id)).limit(1);
    return integration;
  },

  async findByUserAndProvider(userId: string, provider: Integration['provider']): Promise<Integration | undefined> {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)))
      .limit(1);
    return integration;
  },

  async upsertByProvider(userId: string, provider: Integration['provider'], data: Omit<NewIntegration, 'userId' | 'provider'>): Promise<Integration> {
    const [integration] = await db
      .insert(integrations)
      .values({ userId, provider, ...data })
      .onConflictDoUpdate({
        target: [integrations.userId, integrations.provider],
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return integration;
  },

  async delete(id: string): Promise<void> {
    await db.delete(integrations).where(eq(integrations.id, id));
  },
};
