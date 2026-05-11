import { Router } from 'express';
import { AuthenticatedRequest, authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { permit } from '@/permissions/permit';
import { PermissionService } from '@/permissions/PermissionService';
import { attachContractor, UserContractorManager } from './models/UserContractorManager';
import { CreateUserContractorSchema } from './schema';
import * as userContractorService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const { userId, role } = (req as unknown as AuthenticatedRequest).user;
    const bare = await PermissionService.list(UserContractorManager, userId, role);
    const rows = await attachContractor(bare);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/', validate(CreateUserContractorSchema), async (req, res, next) => {
  try {
    const { userId } = (req as unknown as AuthenticatedRequest).user;
    const row = await userContractorService.createUserContractor(userId, req.body);
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/:userContractorId',
  permit(UserContractorManager, (req) => req.params.userContractorId),
  async (req, res, next) => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user;
      await userContractorService.deleteUserContractor(userId, req.params.userContractorId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  }
);

export default router;
