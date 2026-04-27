import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateHomeSchema, UpdateHomeSchema } from './schema';
import { UserHomeManager } from './models/UserHomeManager';
import { HomeManager } from './models/HomeManager';
import { permit } from '../permissions/permit';
import { PermissionService } from '../permissions/PermissionService';
import * as homeService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const { userId, role } = (req as unknown as AuthenticatedRequest).user;
    const homes = await PermissionService.list(HomeManager, userId, role);
    res.json({ data: homes });
  } catch (err) { next(err); }
});

router.post('/', validate(CreateHomeSchema), async (req, res, next) => {
  try {
    const home = await homeService.createHome((req as unknown as AuthenticatedRequest).user.userId, req.body);
    res.status(201).json({ data: home });
  } catch (err) { next(err); }
});

router.get('/:homeId',
  permit(HomeManager, (req) => req.params.homeId),
  async (req, res, next) => {
    try {
      const home = await homeService.getHome(req.params.homeId);
      res.json({ data: home });
    } catch (err) { next(err); }
  }
);

router.patch('/:homeId',
  permit(HomeManager, (req) => req.params.homeId),
  validate(UpdateHomeSchema),
  async (req, res, next) => {
    try {
      const home = await homeService.updateHome(req.params.homeId, req.body);
      res.json({ data: home });
    } catch (err) { next(err); }
  }
);

router.delete('/:homeId',
  permit(HomeManager, (req) => req.params.homeId),
  async (req, res, next) => {
    try {
      await homeService.deleteHome(req.params.homeId, (req as unknown as AuthenticatedRequest).user.userId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  }
);

router.get('/:homeId/users',
  permit(HomeManager, (req) => req.params.homeId),
  async (req, res, next) => {
    try {
      const members = await UserHomeManager.listMembersForHome(req.params.homeId);
      res.json({ data: members });
    } catch (err) { next(err); }
  }
);

router.post('/:homeId/users',
  permit(HomeManager, (req) => req.params.homeId),
  async (req, res, next) => {
    try {
      const result = await homeService.addUserToHome(req.params.homeId, req.body.email, req.body.role || 'MEMBER');
      res.status(201).json({ data: result });
    } catch (err) { next(err); }
  }
);

router.delete('/:homeId/users/:userId',
  permit(HomeManager, (req) => req.params.homeId),
  async (req, res, next) => {
    try {
      await homeService.removeUserFromHome(req.params.homeId, req.params.userId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  }
);

export default router;
