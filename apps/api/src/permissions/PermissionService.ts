import LRUCache from 'lru-cache';
import { UserRole } from '@thms/shared';

export interface PermissionedManager {
  hasPermission(userId: string, resourceId: string): Promise<boolean>;
  listForUser(userId: string, role: UserRole, ...args: any[]): Promise<any[]>;
}

const cache = new LRUCache<string, boolean>({
  max: 10_000,
  maxAge: 1000 * 60 * 5, // 5 min
});

function key(userId: string, resourceId: string): string {
  return `${userId}:${resourceId}`;
}

export const PermissionService = {
  async check(manager: PermissionedManager, userId: string, resourceId: string): Promise<boolean> {
    const k = key(userId, resourceId);
    const cached = cache.get(k);
    if (cached !== undefined) return cached;
    const result = await manager.hasPermission(userId, resourceId);
    if (result) cache.set(k, true);
    return result;
  },

  async list(manager: PermissionedManager, userId: string, role: UserRole, ...args: any[]): Promise<any[]> {
    const results = await manager.listForUser(userId, role, ...args);
    for (const item of results) {
      if (item?.id) cache.set(key(userId, item.id), true);
    }
    return results;
  },

  set(userId: string, resourceId: string): void {
    cache.set(key(userId, resourceId), true);
  },

  invalidate(userId: string, resourceId: string): void {
    cache.del(key(userId, resourceId));
  },
};
