import { z } from 'zod';
import type { TypedRequest, TypedBodyRequest } from '@/middleware/auth.middleware';

export const RegisterSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8),
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
});

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterRequest = TypedBodyRequest<typeof RegisterSchema>;
export type LoginRequest    = TypedBodyRequest<typeof LoginSchema>;
export type RefreshRequest  = TypedBodyRequest<typeof RefreshSchema>;
export type LogoutRequest   = TypedRequest;
export type GetMeRequest    = TypedRequest;
export type AuthRequest     = TypedRequest; // kept as alias for backwards compat
