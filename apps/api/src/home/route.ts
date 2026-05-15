import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  HomeParamsSchema, HomeUserParamsSchema,
  GetHomesRequest, GetHomeRequest, CreateHomeRequest,
  UpdateHomeRequest, DeleteHomeRequest,
  AddHomeUserRequest, AddHomeUserSchema,
  RemoveHomeUserRequest,
  CreateHomeSchema, UpdateHomeSchema,
} from './schema';
import { UserHomeManager } from './models/UserHomeManager';
import { HomeManager } from './models/HomeManager';
import { permit } from '@/permissions/permit';
import * as permissionService from '@/permissions/PermissionService';
import * as homeService from './service';
import { formatAddress } from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req: GetHomesRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user;
    const homes = await permissionService.list(HomeManager, userId, role);
    res.json({ data: homes });
  } catch (err) { next(err); }
});

router.post('/', validate(CreateHomeSchema), async (req: CreateHomeRequest, res: Response, next: NextFunction) => {
  try {
    const home = await homeService.createHome(req.user.userId, req.body);
    res.status(201).json({ data: home });
  } catch (err) { next(err); }
});

router.get('/:homeId',
  validate(HomeParamsSchema, 'params'),
  permit(HomeManager, (req) => req.params.homeId),
  async (req: GetHomeRequest, res: Response, next: NextFunction) => {
    try {
      const home = await HomeManager.findById(req.params.homeId);
      res.json({ data: home ? { ...home, fullAddress: formatAddress(home) } : home });
    } catch (err) { next(err); }
  },
);

router.patch('/:homeId',
  validate(HomeParamsSchema, 'params'),
  permit(HomeManager, (req) => req.params.homeId),
  validate(UpdateHomeSchema),
  async (req: UpdateHomeRequest, res: Response, next: NextFunction) => {
    try {
      const home = await homeService.updateHome(req.params.homeId, req.body);
      res.json({ data: home });
    } catch (err) { next(err); }
  },
);

router.delete('/:homeId',
  validate(HomeParamsSchema, 'params'),
  permit(HomeManager, (req) => req.params.homeId),
  async (req: DeleteHomeRequest, res: Response, next: NextFunction) => {
    try {
      await homeService.deleteHome(req.params.homeId, req.user.userId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

router.get('/:homeId/users',
  validate(HomeParamsSchema, 'params'),
  permit(HomeManager, (req) => req.params.homeId),
  async (req: GetHomeRequest, res: Response, next: NextFunction) => {
    try {
      const members = await UserHomeManager.listMembersForHome(req.params.homeId);
      res.json({ data: members });
    } catch (err) { next(err); }
  },
);

router.post('/:homeId/users',
  validate(HomeParamsSchema, 'params'),
  permit(HomeManager, (req) => req.params.homeId),
  validate(AddHomeUserSchema),
  async (req: AddHomeUserRequest, res: Response, next: NextFunction) => {
    try {
      const result = await homeService.addUserToHome(req.params.homeId, req.body.email, req.body.role);
      res.status(201).json({ data: result });
    } catch (err) { next(err); }
  },
);

router.delete('/:homeId/users/:userId',
  validate(HomeUserParamsSchema, 'params'),
  permit(HomeManager, (req) => req.params.homeId),
  async (req: RemoveHomeUserRequest, res: Response, next: NextFunction) => {
    try {
      await homeService.removeUserFromHome(req.params.homeId, req.params.userId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  },
);

export default router;
