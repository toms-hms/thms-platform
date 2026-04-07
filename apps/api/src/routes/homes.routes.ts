import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateHomeSchema, UpdateHomeSchema } from '../schemas/homes.schema';
import * as homesService from '../services/homes.service';

const router = Router();

router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const homes = await homesService.listHomes((req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: homes });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(CreateHomeSchema), async (req, res, next) => {
  try {
    const home = await homesService.createHome(
      (req as unknown as AuthenticatedRequest).user.userId,
      req.body
    );
    res.status(201).json({ data: home });
  } catch (err) {
    next(err);
  }
});

router.get('/:homeId', async (req, res, next) => {
  try {
    const home = await homesService.getHome(
      req.params.homeId,
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: home });
  } catch (err) {
    next(err);
  }
});

router.patch('/:homeId', validate(UpdateHomeSchema), async (req, res, next) => {
  try {
    const home = await homesService.updateHome(
      req.params.homeId,
      (req as unknown as AuthenticatedRequest).user.userId,
      req.body
    );
    res.json({ data: home });
  } catch (err) {
    next(err);
  }
});

router.delete('/:homeId', async (req, res, next) => {
  try {
    await homesService.deleteHome(
      req.params.homeId,
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// Home members
router.get('/:homeId/users', async (req, res, next) => {
  try {
    const { prisma } = await import('../config/prisma');
    const members = await prisma.userHome.findMany({
      where: { homeId: req.params.homeId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    res.json({ data: members });
  } catch (err) {
    next(err);
  }
});

router.post('/:homeId/users', async (req, res, next) => {
  try {
    const result = await homesService.addUserToHome(
      req.params.homeId,
      (req as unknown as AuthenticatedRequest).user.userId,
      req.body.email,
      req.body.role || 'MEMBER'
    );
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/:homeId/users/:userId', async (req, res, next) => {
  try {
    await homesService.removeUserFromHome(
      req.params.homeId,
      (req as unknown as AuthenticatedRequest).user.userId,
      req.params.userId
    );
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
