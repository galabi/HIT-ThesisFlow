import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, AppError } from '../../middleware/error.js';
import { sendNotifications } from '../notifications/notifications.service.js';

const router = Router();
router.use(authenticate);

// ── Schedule defense ──────────────────────────────────────────────────────────

router.post('/defense', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const { milestoneId, scheduledAt, location, meetingUrl } = req.body;
    if (!milestoneId || !scheduledAt) throw new AppError('milestoneId and scheduledAt are required', 400);

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        config: true,
        defenseExam: true,
        project: {
          include: {
            faculty: { select: { coordinatorId: true } },
            students: { select: { studentId: true } },
            supervisor: { select: { id: true } },
          },
        },
        examinerAssignments: { select: { examinerId: true } },
      },
    });
    if (!milestone) throw new NotFoundError('Milestone not found');
    if (milestone.project.faculty.coordinatorId !== req.user.id) throw new ForbiddenError();
    if (milestone.defenseExam) throw new AppError('Defense already scheduled', 409);

    const defense = await prisma.defenseExam.create({
      data: {
        milestoneId,
        scheduledAt: new Date(scheduledAt),
        location: location ?? null,
        meetingUrl: meetingUrl ?? null,
      },
    });

    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: 'DEFENSE_SCHEDULED' },
    });

    const notifyIds = [
      milestone.project.supervisor.id,
      ...milestone.project.students.map((ps) => ps.studentId),
      ...milestone.examinerAssignments.map((a) => a.examinerId),
    ];
    const dateStr = new Date(scheduledAt).toLocaleDateString('he-IL');
    await sendNotifications(
      notifyIds.map((userId) => ({
        userId,
        type: 'DEFENSE_SCHEDULED',
        title: `הגנה נקבעה: ${milestone.config.name}`,
        body: `הגנה על "${milestone.config.name}" נקבעה ל-${dateStr}${location ? ` — ${location}` : ''}.`,
        actionUrl: `/projects/${milestone.projectId}/milestones/${milestoneId}`,
      }))
    );

    res.status(201).json(defense);
  } catch (err) {
    next(err);
  }
});

// ── Get defense for milestone ─────────────────────────────────────────────────

router.get('/defense/milestones/:milestoneId', async (req, res, next) => {
  try {
    const defense = await prisma.defenseExam.findUnique({
      where: { milestoneId: req.params.milestoneId },
    });
    res.json(defense ?? null);
  } catch (err) {
    next(err);
  }
});

// ── Update defense ────────────────────────────────────────────────────────────

router.patch('/defense/:id', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const { scheduledAt, location, meetingUrl } = req.body;

    const defense = await prisma.defenseExam.findUnique({
      where: { id: req.params.id },
      include: {
        milestone: {
          include: { project: { include: { faculty: { select: { coordinatorId: true } } } } },
        },
      },
    });
    if (!defense) throw new NotFoundError('Defense not found');
    if (defense.milestone.project.faculty.coordinatorId !== req.user.id) throw new ForbiddenError();

    const updated = await prisma.defenseExam.update({
      where: { id: req.params.id },
      data: {
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(meetingUrl !== undefined ? { meetingUrl } : {}),
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── Cancel defense ────────────────────────────────────────────────────────────

router.delete('/defense/:id', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const defense = await prisma.defenseExam.findUnique({
      where: { id: req.params.id },
      include: {
        milestone: {
          include: { project: { include: { faculty: { select: { coordinatorId: true } } } } },
        },
      },
    });
    if (!defense) throw new NotFoundError('Defense not found');
    if (defense.milestone.project.faculty.coordinatorId !== req.user.id) throw new ForbiddenError();

    await prisma.defenseExam.delete({ where: { id: req.params.id } });

    // Revert milestone status to EXAMINER_ASSIGNED
    await prisma.milestone.update({
      where: { id: defense.milestoneId },
      data: { status: 'EXAMINER_ASSIGNED' },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
