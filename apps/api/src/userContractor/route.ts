import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { permit } from '@/permissions/permit';
import { PermissionService } from '@/permissions/PermissionService';
import { attachContractor, UserContractorManager } from './models/UserContractorManager';
import {
  UserContractorParamsSchema,
  DeleteUserContractorRequest,
  UserContractorsRequest,
  CreateUserContractorSchema,
} from './schema';
import * as userContractorService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req: UserContractorsRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user;
    const bare = await PermissionService.list(UserContractorManager, userId, role);
    const rows = await attachContractor(bare);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/', validate(CreateUserContractorSchema), async (req: UserContractorsRequest, res: Response, next: NextFunction) => {
  try {
    const row = await userContractorService.createUserContractor(req.user.userId, req.body);
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/:userContractorId',
  validate(UserContractorParamsSchema, 'params'),
  permit(UserContractorManager, (req) => req.params.userContractorId),
  async (req: DeleteUserContractorRequest, res: Response, next: NextFunction) => {
    try {
      await userContractorService.deleteUserContractor(req.user.userId, req.params.userContractorId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

export default router;
