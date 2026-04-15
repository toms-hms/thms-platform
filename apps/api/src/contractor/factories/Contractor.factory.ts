import { createId } from '@paralleldrive/cuid2';
import { ContractorManager } from '../models/ContractorManager';
import { TradeCategory } from '@thms/shared';
import type { Contractor } from '../models/Contractor';

export async function createContractor(overrides?: Partial<{ name: string; category: TradeCategory; email: string }>): Promise<Contractor> {
  return ContractorManager.create({
    id: createId(),
    name: overrides?.name ?? 'Test Contractor',
    companyName: null,
    email: overrides?.email ?? null,
    phone: null,
    category: overrides?.category ?? TradeCategory.PLUMBING,
    notes: null,
    updatedAt: new Date(),
  });
}
