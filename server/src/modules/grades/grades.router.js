import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, AppError } from '../../middleware/error.js';
import { sendNotifications } from '../notifications/notifications.service.js';
import { calculateSubmissionScore } from '@hit/shared';
import { recalculateFinalGrade } from './grades.service.js';

const router = Router();
router.use(authenticate);

// ── Submit grade ──────────────────────────────────────────────────────────────

router.post('/milestones/:milestoneId', requireRole('SUPERVISOR', 'EXAMINER'), async (req, res, next) => {
  try {
    const { comments, responses = [] } = req.body;

    const existing = await prisma.gradeSubmission.findUnique({
      where: { milestoneId_graderId: { milestoneId: req.params.milestoneId, graderId: req.user.id } },
    });
    if (existing) throw new AppError('You have already graded this milestone', 409);

    const milestone = await prisma.milestone.findUnique({
      where: { id: req.params.milestoneId },
      include: {
        config: {
          include: {
            gradeTemplate: { include: { fields: true } },
          },
        },
        project: {
          include: {
            students: { select: { studentId: true } },
            faculty: { select: { id: true, coordinatorId: true } },
          },
        },
        examinerAssignments: { select: { examinerId: true } },
      },
    });
    if (!milestone) throw new NotFoundError('Milestone not found');

    // Role-based access: supervisor must own the project, examiner must be assigned
    if (req.user.role === 'SUPERVISOR' && milestone.project.supervisorId !== req.user.id) {
      throw new ForbiddenError();
    }
    if (
      req.user.role === 'EXAMINER' &&
      !milestone.examinerAssignments.some((a) => a.examinerId === req.user.id)
    ) {
      throw new ForbiddenError();
    }

    const templateFields = milestone.config.gradeTemplate?.fields ?? [];
    const fieldIdSet = new Set(templateFields.map((f) => f.id));

    for (const r of responses) {
      if (!fieldIdSet.has(r.fieldId)) {
        throw new AppError(`Invalid fieldId: ${r.fieldId}`, 400);
      }
    }

    const totalScore = calculateSubmissionScore(
      templateFields.map((f) => ({ fieldId: f.id, weight: f.weight, maxScore: f.maxScore })),
      responses
    );

    const submission = await prisma.gradeSubmission.create({
      data: {
        milestoneId: req.params.milestoneId,
        graderId: req.user.id,
        role: req.user.role,
        totalScore,
        comments: comments ?? null,
        responses: {
          create: responses.map((r) => ({
            fieldId: r.fieldId,
            numericValue: r.numericValue ?? null,
            booleanValue: r.booleanValue ?? null,
            textValue: r.textValue ?? null,
          })),
        },
      },
      include: { responses: true },
    });

    // Update milestone status based on role
    let newStatus = null;

    if (req.user.role === 'SUPERVISOR') {
      newStatus = 'SUPERVISOR_GRADED';
    } else if (req.user.role === 'EXAMINER') {
      const assignmentCount = milestone.examinerAssignments.length;
      const examinerGradeCount = await prisma.gradeSubmission.count({
        where: { milestoneId: req.params.milestoneId, role: 'EXAMINER' },
      });
      if (assignmentCount > 0 && examinerGradeCount >= assignmentCount) {
        newStatus = 'EXAMINER_GRADED';
      }
    }

    if (newStatus) {
      await prisma.milestone.update({
        where: { id: req.params.milestoneId },
        data: {
          status: newStatus,
          ...(newStatus === 'SUPERVISOR_GRADED' ? { supervisorGradedAt: new Date() } : {}),
        },
      });
    }

    // Notifications
    if (req.user.role === 'SUPERVISOR' && milestone.project.faculty.coordinatorId) {
      await sendNotifications([
        {
          userId: milestone.project.faculty.coordinatorId,
          type: 'MILESTONE_GRADED',
          title: `ציון הוגש: ${milestone.config.name}`,
          body: `מנחה הגיש ציון עבור "${milestone.config.name}". ממתין לאישורך.`,
          actionUrl: `/projects/${milestone.projectId}/milestones/${milestone.id}`,
        },
      ]);
    }

    if (newStatus === 'EXAMINER_GRADED') {
      await recalculateFinalGrade(milestone.projectId);
      await sendNotifications(
        milestone.project.students.map((ps) => ({
          userId: ps.studentId,
          type: 'MILESTONE_GRADED',
          title: `כל הציונים התקבלו: ${milestone.config.name}`,
          body: `כל הבוחנים סיימו לציין את "${milestone.config.name}".`,
          actionUrl: `/projects/${milestone.projectId}`,
        }))
      );
    }

    res.status(201).json(submission);
  } catch (err) {
    next(err);
  }
});

// ── Get all submissions for a milestone ───────────────────────────────────────

router.get('/milestones/:milestoneId', async (req, res, next) => {
  try {
    const submissions = await prisma.gradeSubmission.findMany({
      where: { milestoneId: req.params.milestoneId },
      include: {
        grader: { select: { id: true, firstName: true, lastName: true, role: true } },
        responses: { include: { field: { select: { label: true, fieldType: true, maxScore: true } } } },
      },
      orderBy: { submittedAt: 'asc' },
    });
    res.json(submissions);
  } catch (err) {
    next(err);
  }
});

// ── Get my submission ─────────────────────────────────────────────────────────

router.get('/milestones/:milestoneId/my', async (req, res, next) => {
  try {
    const submission = await prisma.gradeSubmission.findUnique({
      where: { milestoneId_graderId: { milestoneId: req.params.milestoneId, graderId: req.user.id } },
      include: {
        responses: { include: { field: { select: { label: true, fieldType: true, maxScore: true } } } },
      },
    });
    res.json(submission ?? null);
  } catch (err) {
    next(err);
  }
});

export default router;
