import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, cleanupTestUsers } from './helpers.js';
import prisma from '../lib/prisma.js';

const request = buildApp();
const EMAIL = `test_auth_${Date.now()}@hit.ac.il`;
const PASSWORD = 'Password1!';

describe('Auth', () => {
  afterAll(async () => {
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  it('registers a new user', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      email: EMAIL,
      password: PASSWORD,
      firstName: 'Auth',
      lastName: 'Test',
      role: 'STUDENT',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(EMAIL);
  });

  it('rejects duplicate email on register', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      email: EMAIL,
      password: PASSWORD,
      firstName: 'Auth',
      lastName: 'Test',
      role: 'STUDENT',
    });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: EMAIL,
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe('STUDENT');
  });

  it('rejects wrong password', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: EMAIL,
      password: 'WrongPass1!',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 on protected route without token', async () => {
    const res = await request.get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('returns user profile with valid token', async () => {
    const loginRes = await request.post('/api/v1/auth/login').send({
      email: EMAIL,
      password: PASSWORD,
    });
    const token = loginRes.body.accessToken;

    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(EMAIL);
  });
});
