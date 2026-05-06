import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}

export function signRefreshToken(payload) {
  return jwt.sign({ ...payload, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

export function tokenExpiryDate(expiresIn) {
  const ms = parseExpiry(expiresIn);
  return new Date(Date.now() + ms);
}

function parseExpiry(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn * 1000;
  const match = String(expiresIn).match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  const [, n, unit] = match;
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return parseInt(n) * units[unit];
}
