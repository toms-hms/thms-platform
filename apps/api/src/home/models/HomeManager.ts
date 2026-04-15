import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { homes, type Home, type NewHome } from './Home';
import { NotFoundError } from '../../utils/errors';
import { UserRole } from '@thms/shared';

export const HomeManager = {
  async findAll(): Promise<Home[]> {
    return db.select().from(homes).orderBy(desc(homes.createdAt));
  },

  async findById(id: string): Promise<Home | undefined> {
    const [home] = await db.select().from(homes).where(eq(homes.id, id)).limit(1);
    return home;
  },

  async create(data: NewHome): Promise<Home> {
    const [home] = await db.insert(homes).values(data).returning();
    return home;
  },

  async update(id: string, data: Partial<NewHome>): Promise<Home> {
    const [home] = await db.update(homes).set(data).where(eq(homes.id, id)).returning();
    if (!home) throw new NotFoundError('Home');
    return home;
  },

  async delete(id: string): Promise<void> {
    await db.delete(homes).where(eq(homes.id, id));
  },

  async hasPermission(userId: string, homeId: string): Promise<boolean> {
    const { UserHomeManager } = await import('./UserHomeManager');
    const membership = await UserHomeManager.findMembership(userId, homeId);
    return !!membership;
  },

  async listForUser(userId: string, role: UserRole): Promise<Home[]> {
    if (role === 'ADMIN') return this.findAll();
    const { UserHomeManager } = await import('./UserHomeManager');
    const results = await UserHomeManager.listHomesForUser(userId);
    return results.map((r) => r.home);
  },
};
