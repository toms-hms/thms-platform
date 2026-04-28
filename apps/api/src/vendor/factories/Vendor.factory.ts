import { createId } from '@paralleldrive/cuid2';
import { Factory } from 'fishery';
import { VendorManager, type VendorWithRelations } from '@/vendor/models/VendorManager';
import { TradeCategory } from '@thms/shared';

export const vendorFactory = Factory.define<VendorWithRelations>(({ onCreate, sequence }) => {
  onCreate(async (vendor) => {
    const { categories, zipCodes, ...base } = vendor;
    return VendorManager.create(base, categories, zipCodes);
  });

  return {
    id:          createId(),
    name:        `Test Vendor ${sequence}`,
    companyName: `Test Vendor Co ${sequence}`,
    email:       `vendor-${sequence}@example.com`,
    phone:       `512555${String(sequence).padStart(4, '0')}`,
    notes:       null,
    categories:  [TradeCategory.PLUMBING],
    zipCodes:    ['78701'],
    createdAt:   new Date(),
    updatedAt:   new Date(),
  };
});
