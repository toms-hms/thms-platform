import { UserRole } from '@/auth/models/User';

export interface PermissionedManager {
  hasPermission(userId: string, resourceId: string): Promise<boolean>;
  listForUser(userId: string, role: UserRole, ...args: any[]): Promise<any[]>;
}

type CacheLike<K, V> = {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  del(key: K): void;
};

type CacheCtor<K, V> = new (options?: {
  max?: number;
  maxAge?: number;
}) => CacheLike<K, V>;

const LRUCache = require('lru-cache') as CacheCtor<string, boolean>;

const cache = new LRUCache({
  max: 10_000,
  maxAge: 1000 * 60 * 5, // 5 min
});

function cacheKey(userId: string, resourceId: string): string {
  return `${userId}:${resourceId}`;
}

export async function check(
  manager: PermissionedManager,
  userId: string,
  resourceId: string,
): Promise<boolean> {
  const k = cacheKey(userId, resourceId);
  const cached = cache.get(k);
  if (cached !== undefined) return cached;
  const result = await manager.hasPermission(userId, resourceId);
  if (result) cache.set(k, true);
  return result;
}

export async function list(
  manager: PermissionedManager,
  userId: string,
  role: UserRole,
  ...args: any[]
): Promise<any[]> {
  const results = await manager.listForUser(userId, role, ...args);
  for (const item of results) {
    if (item?.id) cache.set(cacheKey(userId, item.id), true);
  }
  return results;
}

export function set(userId: string, resourceId: string): void {
  cache.set(cacheKey(userId, resourceId), true);
}

export function invalidate(userId: string, resourceId: string): void {
  cache.del(cacheKey(userId, resourceId));
}
