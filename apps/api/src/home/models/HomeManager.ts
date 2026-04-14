import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { homes, type Home, type NewHome } from './Home';
import { NotFoundError } from '../../utils/errors';

export const HomeManager = {
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
};
