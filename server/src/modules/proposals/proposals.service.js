import prisma from '../../lib/prisma.js';
import { sendNotifications } from '../notifications/notifications.service.js';
import { NotFoundError, ForbiddenError, AppError } from '../../middleware/error.js';

export async function submitApplication(proposalId, studentId, { coverLetter, documentIds = [] }) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { id: true, title: true, status: true, supervisorId: true },
  });
  if (!proposal) throw new NotFoundError('Proposal not found');
  if (proposal.status !== 'PUBLISHED') {
    throw new AppError('Proposal is not accepting applications', 400);
  }

  const existing = await prisma.application.findUnique({
    where: { proposalId_studentId: { proposalId, studentId } },
  });
  if (existing) throw new AppError('You have already applied to this proposal', 409);

  const app = await prisma.application.create({
    data: { proposalId, studentId, coverLetter: coverLetter ?? null },
  });

  if (documentIds.length > 0) {
    await prisma.document.updateMany({
      where: { id: { in: documentIds }, uploaderId: studentId },
      data: { applicationId: app.id },
    });
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { firstName: true, lastName: true },
  });

  await sendNotifications([
    {
      userId: proposal.supervisorId,
      type: 'APPLICATION_SUBMITTED',
      title: 'מועמדות חדשה',
      body: `${student.firstName} ${student.lastName} הגיש/ה מועמדות לפרויקט "${proposal.title}"`,
      actionUrl: `/proposals/${proposalId}/applications`,
    },
  ]);

  return app;
}

export async function approveApplication(appId, supervisorId) {
  const app = await prisma.application.findUnique({
    where: { id: appId },
    include: {
      proposal: {
        include: {
          faculty: { include: { milestoneConfigs: { orderBy: { order: 'asc' } } } },
        },
      },
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!app) throw new NotFoundError('Application not found');
  if (app.proposal.supervisorId !== supervisorId) throw new ForbiddenError();
  if (!['PENDING', 'MEETING_REQUESTED'].includes(app.status)) {
    throw new AppError('Application is already processed', 400);
  }

  const project = await prisma.project.create({
    data: {
      title: app.proposal.title,
      description: app.proposal.description,
      facultyId: app.proposal.facultyId,
      supervisorId,
      proposalId: app.proposalId,
    },
  });

  await prisma.projectStudent.create({
    data: { projectId: project.id, studentId: app.studentId },
  });

  const now = new Date();
  for (const config of app.proposal.faculty.milestoneConfigs) {
    await prisma.milestone.create({
      data: {
        projectId: project.id,
        configId: config.id,
        deadline: config.deadlineOffsetDays
          ? new Date(now.getTime() + config.deadlineOffsetDays * 86_400_000)
          : null,
      },
    });
  }

  await prisma.application.update({ where: { id: appId }, data: { status: 'APPROVED' } });

  const approvedCount = await prisma.application.count({
    where: { proposalId: app.proposalId, status: 'APPROVED' },
  });
  if (approvedCount >= app.proposal.maxStudents) {
    await prisma.proposal.update({
      where: { id: app.proposalId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  await sendNotifications([
    {
      userId: app.studentId,
      type: 'APPLICATION_APPROVED',
      title: 'מועמדותך אושרה!',
      body: `מועמדותך לפרויקט "${app.proposal.title}" אושרה. הפרויקט שלך התחיל.`,
      actionUrl: `/projects/${project.id}`,
    },
    {
      userId: supervisorId,
      type: 'PROJECT_STARTED',
      title: 'פרויקט חדש התחיל',
      body: `הפרויקט "${project.title}" עם ${app.student.firstName} ${app.student.lastName} התחיל.`,
      actionUrl: `/projects/${project.id}`,
    },
  ]);

  return project;
}

export async function rejectApplication(appId, supervisorId) {
  const app = await prisma.application.findUnique({
    where: { id: appId },
    include: { proposal: { select: { title: true, supervisorId: true } } },
  });
  if (!app) throw new NotFoundError('Application not found');
  if (app.proposal.supervisorId !== supervisorId) throw new ForbiddenError();

  await prisma.application.update({ where: { id: appId }, data: { status: 'REJECTED' } });

  await sendNotifications([
    {
      userId: app.studentId,
      type: 'APPLICATION_REJECTED',
      title: 'מועמדותך נדחתה',
      body: `מצטערים, מועמדותך לפרויקט "${app.proposal.title}" נדחתה.`,
      actionUrl: `/proposals/${app.proposalId}`,
    },
  ]);
}

export async function requestMeeting(appId, supervisorId, { meetingNote, meetingScheduled } = {}) {
  const app = await prisma.application.findUnique({
    where: { id: appId },
    include: { proposal: { select: { title: true, supervisorId: true } } },
  });
  if (!app) throw new NotFoundError('Application not found');
  if (app.proposal.supervisorId !== supervisorId) throw new ForbiddenError();

  await prisma.application.update({
    where: { id: appId },
    data: {
      status: 'MEETING_REQUESTED',
      meetingNote: meetingNote ?? null,
      meetingScheduled: meetingScheduled ? new Date(meetingScheduled) : null,
    },
  });

  await sendNotifications([
    {
      userId: app.studentId,
      type: 'MEETING_REQUESTED',
      title: 'בקשת פגישה',
      body: `המנחה מבקש/ת לקיים פגישה בנוגע לפרויקט "${app.proposal.title}". ${meetingNote ?? ''}`,
      actionUrl: `/proposals/${app.proposalId}`,
    },
  ]);
}
