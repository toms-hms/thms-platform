import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { authenticateJWT } from '../middleware/auth.middleware';
import { RegisterSchema, LoginSchema, RefreshSchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', validate(RegisterSchema), async (req, res, next) => {
  try {
    const { user, tokens } = await authService.register(req.body);
    res.status(201).json({
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(LoginSchema), async (req, res, next) => {
  try {
    const { user, tokens } = await authService.login(req.body.email, req.body.password);
    res.json({
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validate(RefreshSchema), async (req, res, next) => {
  try {
    const { user, tokens } = await authService.refreshTokens(req.body.refreshToken);
    res.json({ data: { tokens } });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticateJWT, async (req, res, next) => {
  try {
    await authService.logout((req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticateJWT, async (req, res, next) => {
  try {
    const user = await authService.getMe((req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
