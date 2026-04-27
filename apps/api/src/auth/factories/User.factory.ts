import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { db } from '@/db';
import { users } from '@/auth/models/User';
import { UserRole } from '@thms/shared';
import type { User } from '@/auth/models/User';

const TEST_PASSWORD = 'password123';
let cachedHash: string | null = null;
async function getHash() {
  if (!cachedHash) cachedHash = await bcrypt.hash(TEST_PASSWORD, 4);
  return cachedHash;
}

export const userFactory = Factory.define<User>(({ onCreate, sequence }) => {
  onCreate(async (user) => {
    const [inserted] = await db.insert(users).values({
      ...user,
      passwordHash: await getHash(),
      updatedAt: new Date(),
    }).returning();
    return inserted;
  });

  return {
    id: createId(),
    email: `test-factory-${sequence}@example.com`,
    passwordHash: '',
    firstName: 'Test',
    lastName: `User${sequence}`,
    role: UserRole.USER,
    refreshTokenHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
