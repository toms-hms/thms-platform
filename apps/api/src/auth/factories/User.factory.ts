import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import { db } from '../../db';
import { users } from '../models/User';
import { UserRole } from '@thms/shared';
import type { User } from '../models/User';

// Pre-hash at 4 rounds — fast enough for tests
const TEST_PASSWORD = 'password123';
let cachedHash: string | null = null;
async function getHash() {
  if (!cachedHash) cachedHash = await bcrypt.hash(TEST_PASSWORD, 4);
  return cachedHash;
}

export async function createUser(overrides?: Partial<{ email: string; firstName: string; lastName: string; role: UserRole }>): Promise<User> {
  const [user] = await db.insert(users).values({
    id: createId(),
    email: overrides?.email ?? `test-factory-${createId()}@example.com`,
    passwordHash: await getHash(),
    firstName: overrides?.firstName ?? 'Test',
    lastName: overrides?.lastName ?? 'User',
    role: overrides?.role ?? UserRole.USER,
    updatedAt: new Date(),
  }).returning();
  return user;
}
