import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { userHomes, type UserHome, type NewUserHome } from './UserHome';
import { homes } from './Home';
import { users } from '../../auth/models/User';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

export const UserHomeManager = {
  async findMembership(userId: string, homeId: string): Promise<UserHome | undefined> {
    const [membership] = await db
      .select()
      .from(userHomes)
      .where(and(eq(userHomes.userId, userId), eq(userHomes.homeId, homeId)))
      .limit(1);
    return membership;
  },

  async assertMembership(userId: string, homeId: string): Promise<UserHome> {
    const membership = await this.findMembership(userId, homeId);
    if (!membership) throw new NotFoundError('Home');
    return membership;
  },

  async listHomesForUser(userId: string) {
    return db
      .select({ home: homes, role: userHomes.role })
      .from(userHomes)
      .innerJoin(homes, eq(userHomes.homeId, homes.id))
      .where(eq(userHomes.userId, userId))
      .orderBy(desc(homes.createdAt));
  },

  async listMembersForHome(homeId: string) {
    return db
      .select({ user: users, role: userHomes.role, createdAt: userHomes.createdAt })
      .from(userHomes)
      .innerJoin(users, eq(userHomes.userId, users.id))
      .where(eq(userHomes.homeId, homeId));
  },

  async create(data: NewUserHome): Promise<UserHome> {
    const [membership] = await db.insert(userHomes).values(data).returning();
    return membership;
  },

  async upsert(userId: string, homeId: string, role: 'OWNER' | 'MEMBER'): Promise<UserHome> {
    const [membership] = await db
      .insert(userHomes)
      .values({ userId, homeId, role })
      .onConflictDoUpdate({ target: [userHomes.userId, userHomes.homeId], set: { role } })
      .returning();
    return membership;
  },

  async delete(userId: string, homeId: string): Promise<void> {
    await db.delete(userHomes).where(and(eq(userHomes.userId, userId), eq(userHomes.homeId, homeId)));
  },
};
