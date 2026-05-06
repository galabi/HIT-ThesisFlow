import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, createTestUser } from './helpers.js';
import prisma from '../lib/prisma.js';

const request = buildApp();

let supervisor, supervisorToken;
let student, studentToken;
let coordinator, coordinatorToken;
let projectId, milestoneId, configId;

describe('Milestone submit → supervisor grade → coordinator approve → final grade', () => {
  beforeAll(async () => {
    const coord = await prisma.user.findFirst({ where: { role: 'PROJECT_COORDINATOR' } });
    coordinator = coord;
    const coordLogin = await request.post('/api/v1/auth/login').send({
      email: 'coordinator@hit.ac.il',
      password: 'Password1!',
    });
    coordinatorToken = coordLogin.body.accessToken;

    const sv = await createTestUser(request, {
      email: `test_msv_${Date.now()}@hit.ac.il`,
      role: 'SUPERVISOR',
    });
    supervisor = sv.user;
    supervisorToken = sv.accessToken;

    const st = await createTestUser(request, {
      email: `test_mst_${Date.now()}@hit.ac.il`,
      role: 'STUDENT',
    });
    student = st.user;
    studentToken = st.accessToken;

    // Build minimal faculty + config + template + project in DB directly
    const faculty = await prisma.faculty.create({
      data: {
        name: `MilestoneTestFaculty_${Date.now()}`,
        code: `MST${Date.now()}`,
        coordinatorId: coordinator.id,
      },
    });
    await prisma.facultyMember.create({ data: { userId: supervisor.id, facultyId: faculty.id } });

    const config = await prisma.milestoneConfig.create({
      data: {
        facultyId: faculty.id,
        name: 'דוח ביניים',
        order: 1,
        deadlineOffsetDays: 30,
        requiresExaminers: false,
      },
    });
    configId = config.id;

    // Simple grade template with one NUMBER field
    const template = await prisma.gradeFormTemplate.create({ data: { configId } });
    await prisma.gradeFormField.create({
      data: {
        templateId: template.id,
        label: 'איכות',
        fieldType: 'NUMBER',
        maxScore: 100,
        weight: 1.0,
        order: 1,
      },
    });

    await prisma.milestoneWeight.create({
      data: { facultyId: faculty.id, configId, weight: 1.0 },
    });

    // Create project + student + milestone directly
    const project = await prisma.project.create({
      data: {
        facultyId: faculty.id,
        supervisorId: supervisor.id,
        title: 'Milestone Test Project',
        students: { create: { studentId: student.id } },
        milestones: {
          create: {
            configId,
            deadline: new Date(Date.now() + 30 * 86400 * 1000),
          },
        },
      },
      include: { milestones: true },
    });
    projectId = project.id;
    milestoneId = project.milestones[0].id;
  });

  afterAll(async () => {
    if (projectId) {
      await prisma.gradeFieldResponse.deleteMany({
        where: { submission: { milestoneId } },
      });
      await prisma.gradeSubmission.deleteMany({ where: { milestoneId } });
      await prisma.milestone.deleteMany({ where: { projectId } });
      await prisma.projectStudent.deleteMany({ where: { projectId } });
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
    if (configId) {
      await prisma.gradeFieldResponse.deleteMany({
        where: { field: { template: { configId } } },
      });
      await prisma.gradeFormField.deleteMany({ where: { template: { configId } } });
      await prisma.gradeFormTemplate.deleteMany({ where: { configId } });
      await prisma.milestoneWeight.deleteMany({ where: { configId } });
      const faculty = await prisma.milestoneConfig.findUnique({ where: { id: configId } });
      if (faculty) {
        await prisma.milestoneConfig.deleteMany({ where: { id: configId } });
        await prisma.facultyMember.deleteMany({ where: { facultyId: faculty.facultyId } });
        await prisma.faculty.deleteMany({ where: { id: faculty.facultyId } });
      }
    }
    const userIds = [supervisor?.id, student?.id].filter(Boolean);
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('student submits milestone', async () => {
    const res = await request
      .post(`/api/v1/projects/${projectId}/milestones/${milestoneId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ documentIds: [] });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUBMITTED');
  });

  it('supervisor submits grade', async () => {
    // Fetch the template field id
    const template = await prisma.gradeFormTemplate.findUnique({
      where: { configId },
      include: { fields: true },
    });
    const fieldId = template.fields[0].id;

    const res = await request
      .post(`/api/v1/grades/milestones/${milestoneId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        comments: 'Good work',
        responses: [{ fieldId, numericValue: 85 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.totalScore).toBe(85);

    const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
    expect(milestone.status).toBe('SUPERVISOR_GRADED');
  });

  it('coordinator approves milestone → finalGrade is set', async () => {
    const res = await request
      .post(`/api/v1/projects/${projectId}/milestones/${milestoneId}/coordinator-approve`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.finalGrade).toBe(85);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    expect(project.finalGrade).toBe(85);
  });
});
