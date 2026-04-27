import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PermissionService, PermissionedManager } from './PermissionService';
import { ForbiddenError } from '../utils/errors';

export function permit(
  manager: PermissionedManager,
  getResourceId: (req: Request) => string | undefined,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user;
      const resourceId = getResourceId(req);
      if (!resourceId) return next(new ForbiddenError());
      const allowed = await PermissionService.check(manager, userId, resourceId);
      if (!allowed) return next(new ForbiddenError());
      next();
    } catch (err) {
      next(err);
    }
  };
}
