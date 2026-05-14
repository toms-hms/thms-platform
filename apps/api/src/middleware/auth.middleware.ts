import { Request, Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { z, ZodTypeAny } from 'zod';
import { verifyAccessToken } from '../utils/jwt.utils';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRole } from '@/auth/models/User';

type AuthenticatedUser = {
  userId: string;
  email: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/** Typed request with authenticated user and narrowed params, query, and body. */
export type TypedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  Q = Record<string, unknown>,
  B = any
> = Request<P, unknown, B, Q> & AuthenticatedRequest;

export type TypedParamsRequest<P extends ZodTypeAny> =
  TypedRequest<z.infer<P>>;

export type TypedQueryRequest<Q extends ZodTypeAny> =
  TypedRequest<{}, z.infer<Q>>;

export type TypedParamsQueryRequest<P extends ZodTypeAny, Q extends ZodTypeAny> =
  TypedRequest<z.infer<P>, z.infer<Q>>;

export type TypedBodyRequest<B extends ZodTypeAny> =
  TypedRequest<{}, {}, z.infer<B>>;

export type TypedParamsBodyRequest<P extends ZodTypeAny, B extends ZodTypeAny> =
  TypedRequest<z.infer<P>, {}, z.infer<B>>;

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
