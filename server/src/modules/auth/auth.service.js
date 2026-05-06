import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  tokenExpiryDate,
} from '../../services/token.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.js';

export async function register({ email, password, firstName, lastName, role, studentLevel }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, role, studentLevel: studentLevel ?? null },
  });
  return sanitizeUser(user);
}

export async function login(user) {
  const { accessToken, refreshToken } = await issueTokens(user);
  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refresh(rawRefreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: rawRefreshToken } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token revoked or expired', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new AppError('User not found', 401);

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

export async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;
  await prisma.refreshToken
    .updateMany({ where: { token: rawRefreshToken }, data: { revokedAt: new Date() } })
    .catch(() => {});
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { facultyMemberships: { include: { faculty: true } } },
  });
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
}

async function issueTokens(user) {
  const payload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: tokenExpiryDate(env.JWT_REFRESH_EXPIRES_IN),
    },
  });

  return { accessToken, refreshToken };
}

export function sanitizeUser(user) {
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}
