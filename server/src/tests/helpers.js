import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import supertest from 'supertest';
import { createApp } from '../app.js';
import { initSocket } from '../services/socket.js';
import prisma from '../lib/prisma.js';

// Build a supertest agent wrapping the full express app
export function buildApp() {
  const app = createApp();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer);
  initSocket(io);
  return supertest(app);
}

// Seed a test user and return { user, accessToken }
export async function createTestUser(request, overrides = {}) {
  const defaults = {
    email: `test_${Date.now()}@hit.ac.il`,
    password: 'Password1!',
    firstName: 'Test',
    lastName: 'User',
    role: 'STUDENT',
  };
  const data = { ...defaults, ...overrides };

  await request.post('/api/v1/auth/register').send(data);
  const res = await request.post('/api/v1/auth/login').send({
    email: data.email,
    password: data.password,
  });
  return { user: res.body.user, accessToken: res.body.accessToken, email: data.email };
}

// Clean up users created during tests (by email prefix)
export async function cleanupTestUsers() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'test_' } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return;

  // Delete any projects supervised by test users (with their children)
  const supervisedProjects = await prisma.project.findMany({
    where: { supervisorId: { in: ids } },
    select: { id: true },
  });
  const projectIds = supervisedProjects.map((p) => p.id);
  if (projectIds.length > 0) {
    await prisma.milestone.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectStudent.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }

  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.projectStudent.deleteMany({ where: { studentId: { in: ids } } });
  await prisma.facultyMember.deleteMany({ where: { userId: { in: ids } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
