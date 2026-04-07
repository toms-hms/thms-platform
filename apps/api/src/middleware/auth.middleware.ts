import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRole } from '@thms/shared';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(authReq.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}
