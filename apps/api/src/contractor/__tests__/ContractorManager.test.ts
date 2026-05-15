import { db } from '@/db';
import { contractors } from '@/contractor/models/Contractor';
import { like } from 'drizzle-orm';
import { contractorFactory } from '@/contractor/factories/Contractor.factory';
import { ContractorManager } from '@/contractor/models/ContractorManager';
import { TradeCategory } from '@/contractor/models/Contractor';
import { UserRole } from '@/auth/models/User';

const NAME_PREFIX = 'Test MgrContractor';

async function cleanup() {
  await db.delete(contractors).where(like(contractors.name, `${NAME_PREFIX}%`));
}

describe('ContractorManager', () => {
  beforeAll(cleanup);
  afterAll(cleanup);

  describe('hasPermission', () => {
    it('always returns true — contractors are globally visible', async () => {
      const contractor = await contractorFactory.create({ name: `${NAME_PREFIX} Permission` });
      expect(await ContractorManager.hasPermission('any-user', contractor.id)).toBe(true);
    });
  });

  describe('listForUser', () => {
    it('returns all global contractors regardless of user', async () => {
      const contractor = await contractorFactory.create({ name: `${NAME_PREFIX} List` });
      const result = await ContractorManager.listForUser('any-user', UserRole.USER);
      expect(result.some((c) => c.id === contractor.id)).toBe(true);
    });
  });

  describe('filter', () => {
    it('filters by trade category', async () => {
      const c = await contractorFactory.create({
        name: `${NAME_PREFIX} Filter HVAC`,
        categories: [TradeCategory.HVAC],
      });
      const result = await ContractorManager.filter({ tradeCategories: [TradeCategory.HVAC] });
      expect(result.some((r) => r.id === c.id)).toBe(true);
    });
  });

  describe('create / update / delete', () => {
    it('creates, updates, and deletes a contractor', async () => {
      const c = await contractorFactory.create({ name: `${NAME_PREFIX} CRUD` });
      expect(c.id).toBeDefined();

      const updated = await ContractorManager.update(c.id, { companyName: 'New Co' });
      expect(updated.companyName).toBe('New Co');

      await ContractorManager.delete(c.id);
      const result = await ContractorManager.filter({ ids: [c.id] });
      expect(result).toHaveLength(0);
    });
  });
});
