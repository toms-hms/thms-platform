import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { UserRole } from '@thms/shared';
import { UserManager } from './models/UserManager';

export async function register(data: { email: string; password: string; firstName: string; lastName: string }) {
  const existing = await UserManager.findByEmail(data.email);
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await UserManager.create({
    id: createId(),
    email: data.email,
    passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    updatedAt: new Date(),
  });

  const tokens = await generateTokensForUser(user.id, user.email, user.role as UserRole);
  return { user, tokens };
}

export async function login(email: string, password: string) {
  const user = await UserManager.findByEmail(email);
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const tokens = await generateTokensForUser(user.id, user.email, user.role as UserRole);
  return { user, tokens };
}

export async function refreshTokens(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await UserManager.findById(payload.sub);
  if (!user || !user.refreshTokenHash) throw new UnauthorizedError('Invalid refresh token');

  const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!valid) throw new UnauthorizedError('Invalid refresh token');

  const tokens = await generateTokensForUser(user.id, user.email, user.role as UserRole);
  return { user, tokens };
}

export async function logout(userId: string) {
  await UserManager.update(userId, { refreshTokenHash: null, updatedAt: new Date() });
}

export async function getMe(userId: string) {
  const user = await UserManager.findById(userId);
  if (!user) throw new NotFoundError('User');
  const { passwordHash, refreshTokenHash, ...safe } = user;
  return safe;
}

async function generateTokensForUser(userId: string, email: string, role: UserRole) {
  const accessToken = signAccessToken({ sub: userId, email, role });
  const refreshToken = signRefreshToken({ sub: userId });
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await UserManager.update(userId, { refreshTokenHash, updatedAt: new Date() });
  return { accessToken, refreshToken };
}
