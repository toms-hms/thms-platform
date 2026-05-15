import { db } from '@/db';
import { contractors } from '@/contractor/models/Contractor';
import { like } from 'drizzle-orm';
import * as contractorService from '@/contractor/service';
import { TradeCategory } from '@/contractor/models/Contractor';

const NAME_PREFIX = 'Test SvcContractor';

async function cleanup() {
  await db.delete(contractors).where(like(contractors.name, `${NAME_PREFIX}%`));
}

describe('contractor/service', () => {
  beforeAll(cleanup);
  afterAll(cleanup);

  describe('createContractor', () => {
    it('creates a contractor with zip codes', async () => {
      const result = await contractorService.createContractor({
        name: `${NAME_PREFIX} Create`,
        categories: [TradeCategory.PLUMBING],
        zipCodes: ['78701'],
      });
      expect(result.id).toBeDefined();
      expect(result.isGlobal).toBe(true);
      expect(result.zipCodes).toContain('78701');
    });
  });

  describe('updateContractor', () => {
    it('updates fields and zip codes', async () => {
      const created = await contractorService.createContractor({
        name: `${NAME_PREFIX} Update`,
        categories: [TradeCategory.ELECTRICAL],
        zipCodes: ['78701'],
      });
      const updated = await contractorService.updateContractor(created.id, {
        companyName: 'Updated Co',
        zipCodes: ['78702'],
      });
      expect(updated.companyName).toBe('Updated Co');
      expect(updated.zipCodes).toContain('78702');
    });
  });

  describe('deleteContractor', () => {
    it('deletes the contractor', async () => {
      const created = await contractorService.createContractor({
        name: `${NAME_PREFIX} Delete`,
        categories: [TradeCategory.HVAC],
      });
      await contractorService.deleteContractor(created.id);
      await expect(contractorService.updateContractor(created.id, {})).rejects.toThrow();
    });
  });
});
