import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, AppError } from '../../middleware/error.js';
import { sendNotifications } from '../notifications/notifications.service.js';

const router = Router();
router.use(authenticate);

// ── Assign examiner to milestone ──────────────────────────────────────────────

router.post('/', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const { milestoneId, examinerId } = req.body;
    if (!milestoneId || !examinerId) throw new AppError('milestoneId and examinerId are required', 400);

    const [milestone, examiner] = await Promise.all([
      prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: {
          config: true,
          project: {
            include: {
              faculty: { select: { coordinatorId: true } },
              students: { select: { studentId: true } },
            },
          },
          examinerAssignments: true,
        },
      }),
      prisma.user.findUnique({ where: { id: examinerId } }),
    ]);

    if (!milestone) throw new NotFoundError('Milestone not found');
    if (!examiner || examiner.role !== 'EXAMINER') throw new AppError('User is not an examiner', 400);
    if (milestone.project.faculty.coordinatorId !== req.user.id) throw new ForbiddenError();
    if (!milestone.config.requiresExaminers) throw new AppError('This milestone does not require examiners', 400);

    const duplicate = milestone.examinerAssignments.find((a) => a.examinerId === examinerId);
    if (duplicate) throw new AppError('Examiner already assigned to this milestone', 409);

    const assignment = await prisma.examinerAssignment.create({
      data: { milestoneId, examinerId, assignedBy: req.user.id },
      include: {
        examiner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // After this assignment, count total
    const total = milestone.examinerAssignments.length + 1;
    if (total >= 2) {
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: { status: 'EXAMINER_ASSIGNED' },
      });
    }

    await sendNotifications([
      {
        userId: examinerId,
        type: 'EXAMINER_ASSIGNED',
        title: 'הוקצית כבוחן',
        body: `הוקצית לבחינת "${milestone.config.name}" בפרויקט. אנא בדוק את לוח הזמנים.`,
        actionUrl: `/projects/${milestone.projectId}/milestones/${milestoneId}`,
      },
    ]);

    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
});

// ── List assignments for a milestone ─────────────────────────────────────────

router.get('/milestones/:milestoneId', async (req, res, next) => {
  try {
    const assignments = await prisma.examinerAssignment.findMany({
      where: { milestoneId: req.params.milestoneId },
      include: {
        examiner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { assignedAt: 'asc' },
    });
    res.json(assignments);
  } catch (err) {
    next(err);
  }
});

// ── Remove assignment ─────────────────────────────────────────────────────────

router.delete('/:id', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const assignment = await prisma.examinerAssignment.findUnique({
      where: { id: req.params.id },
      include: {
        milestone: {
          include: { project: { include: { faculty: { select: { coordinatorId: true } } } } },
        },
      },
    });
    if (!assignment) throw new NotFoundError('Assignment not found');
    if (assignment.milestone.project.faculty.coordinatorId !== req.user.id) throw new ForbiddenError();

    await prisma.examinerAssignment.delete({ where: { id: req.params.id } });

    // Revert to COORDINATOR_APPROVED if we drop below 2
    const remaining = await prisma.examinerAssignment.count({
      where: { milestoneId: assignment.milestoneId },
    });
    if (remaining < 2 && assignment.milestone.status === 'EXAMINER_ASSIGNED') {
      await prisma.milestone.update({
        where: { id: assignment.milestoneId },
        data: { status: 'COORDINATOR_APPROVED' },
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
