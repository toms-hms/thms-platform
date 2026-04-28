import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateVendorSchema, UpdateVendorSchema } from './schema';
import { VendorManager } from './models/VendorManager';
import { permit } from '../permissions/permit';
import { PermissionService } from '../permissions/PermissionService';
import * as vendorService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const { userId, role } = (req as unknown as AuthenticatedRequest).user;
    const vendors = await PermissionService.list(VendorManager, userId, role);
    const { search, category } = req.query as { search?: string; category?: string };
    const filtered = vendors.filter((v) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !v.name.toLowerCase().includes(s) &&
          !v.companyName?.toLowerCase().includes(s) &&
          !v.email?.toLowerCase().includes(s)
        ) return false;
      }
      if (category && !v.categories.includes(category as any)) return false;
      return true;
    });
    res.json({ data: filtered });
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN'), validate(CreateVendorSchema), async (req, res, next) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    res.status(201).json({ data: vendor });
  } catch (err) { next(err); }
});

router.get('/:vendorId',
  permit(VendorManager, (req) => req.params.vendorId),
  async (req, res, next) => {
    try {
      const vendor = await vendorService.getVendor(req.params.vendorId);
      res.json({ data: vendor });
    } catch (err) { next(err); }
  },
);

router.patch('/:vendorId',
  requireRole('ADMIN'),
  permit(VendorManager, (req) => req.params.vendorId),
  validate(UpdateVendorSchema),
  async (req, res, next) => {
    try {
      const vendor = await vendorService.updateVendor(req.params.vendorId, req.body);
      res.json({ data: vendor });
    } catch (err) { next(err); }
  },
);

router.delete('/:vendorId',
  requireRole('ADMIN'),
  permit(VendorManager, (req) => req.params.vendorId),
  async (req, res, next) => {
    try {
      await vendorService.deleteVendor(req.params.vendorId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

export default router;
