import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, createTestUser } from './helpers.js';
import prisma from '../lib/prisma.js';

const request = buildApp();

let supervisor, supervisorToken;
let student, studentToken;
let facultyId, proposalId, applicationId, projectId;

describe('Proposals → Application → Project', () => {
  beforeAll(async () => {
    // Create faculty + supervisor
    const sv = await createTestUser(request, {
      email: `test_sv_${Date.now()}@hit.ac.il`,
      role: 'SUPERVISOR',
    });
    supervisor = sv.user;
    supervisorToken = sv.accessToken;

    const st = await createTestUser(request, {
      email: `test_st_${Date.now()}@hit.ac.il`,
      role: 'STUDENT',
    });
    student = st.user;
    studentToken = st.accessToken;

    // Create a faculty with a coordinator (seed coordinator already exists)
    const coord = await prisma.user.findFirst({ where: { role: 'PROJECT_COORDINATOR' } });
    const faculty = await prisma.faculty.create({
      data: {
        name: `Test Faculty ${Date.now()}`,
        code: `TST${Date.now()}`,
        coordinatorId: coord.id,
      },
    });
    facultyId = faculty.id;

    // Add supervisor to faculty
    await prisma.facultyMember.create({
      data: { userId: supervisor.id, facultyId },
    });

    // Minimal milestone config so project has milestones to create
    await prisma.milestoneConfig.create({
      data: {
        facultyId,
        name: 'דוח ראשון',
        order: 1,
        deadlineOffsetDays: 30,
        requiresExaminers: false,
      },
    });
  });

  afterAll(async () => {
    // Delete milestones by configId (covers both direct projectId and any orphans)
    const configs = await prisma.milestoneConfig.findMany({ where: { facultyId }, select: { id: true } });
    const configIds = configs.map((c) => c.id);
    if (configIds.length > 0) {
      await prisma.milestone.deleteMany({ where: { configId: { in: configIds } } });
    }
    if (projectId) {
      await prisma.projectStudent.deleteMany({ where: { projectId } });
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
    if (proposalId) {
      await prisma.proposalTag.deleteMany({ where: { proposalId } });
      await prisma.application.deleteMany({ where: { proposalId } });
      await prisma.proposal.deleteMany({ where: { id: proposalId } });
    }
    await prisma.milestoneWeight.deleteMany({ where: { facultyId } });
    await prisma.milestoneConfig.deleteMany({ where: { facultyId } });
    await prisma.facultyMember.deleteMany({ where: { facultyId } });
    await prisma.faculty.deleteMany({ where: { id: facultyId } });
    const userIds = [supervisor?.id, student?.id].filter(Boolean);
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.projectStudent.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('supervisor creates a proposal', async () => {
    const res = await request
      .post('/api/v1/proposals')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        facultyId,
        title: 'Test Proposal',
        description: 'A test proposal description',
        maxStudents: 2,
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Proposal');
    proposalId = res.body.id;
  });

  it('supervisor publishes the proposal', async () => {
    const res = await request
      .post(`/api/v1/proposals/${proposalId}/publish`)
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
  });

  it('student submits an application', async () => {
    const res = await request
      .post(`/api/v1/proposals/${proposalId}/applications`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ coverLetter: 'I am interested.' });
    expect(res.status).toBe(201);
    expect(res.body.studentId).toBe(student.id);
    applicationId = res.body.id;
  });

  it('student cannot apply twice', async () => {
    const res = await request
      .post(`/api/v1/proposals/${proposalId}/applications`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ coverLetter: 'Again.' });
    expect(res.status).toBe(409);
  });

  it('supervisor approves application → project is created', async () => {
    const res = await request
      .post(`/api/v1/proposals/${proposalId}/applications/${applicationId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    projectId = res.body.id;
    // Milestones are created as a side-effect; verify via DB
    const milestones = await prisma.milestone.findMany({ where: { projectId } });
    expect(milestones.length).toBeGreaterThan(0);
  });

  it('project appears in student project list', async () => {
    const res = await request
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.map((p) => p.id);
    expect(ids).toContain(projectId);
  });
});
