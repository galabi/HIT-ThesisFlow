import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, AppError } from '../../middleware/error.js';
import { sendNotifications } from '../notifications/notifications.service.js';
import { recalculateFinalGrade } from '../grades/grades.service.js';

const router = Router();
router.use(authenticate);

const MILESTONE_INCLUDE = {
  config: { select: { id: true, name: true, order: true, requiresExaminers: true } },
  documents: { select: { id: true, fileName: true, documentType: true, uploadedAt: true } },
  gradeSubmissions: {
    include: { grader: { select: { id: true, firstName: true, lastName: true, role: true } } },
  },
  examinerAssignments: {
    include: { examiner: { select: { id: true, firstName: true, lastName: true } } },
  },
};

// ── List ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    let where = {};

    if (req.user.role === 'STUDENT') {
      where = { students: { some: { studentId: req.user.id } } };
    } else if (req.user.role === 'SUPERVISOR') {
      where = { supervisorId: req.user.id };
    } else if (['PROJECT_COORDINATOR', 'FACULTY_SECRETARY'].includes(req.user.role)) {
      const faculties = await prisma.faculty.findMany({
        where: { coordinatorId: req.user.id },
        select: { id: true },
      });
      where = { facultyId: { in: faculties.map((f) => f.id) } };
    } else if (req.user.role === 'EXAMINER') {
      const assignments = await prisma.examinerAssignment.findMany({
        where: { examinerId: req.user.id },
        include: { milestone: { select: { projectId: true } } },
      });
      const projectIds = [...new Set(assignments.map((a) => a.milestone.projectId))];
      where = { id: { in: projectIds } };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        faculty: { select: { id: true, name: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        students: {
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
        milestones: { include: { config: { select: { order: true, name: true } } } },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Sort milestones by config.order (can't ORDER BY relation in MongoDB Prisma)
    projects.forEach((p) => p.milestones.sort((a, b) => a.config.order - b.config.order));

    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// ── Single project ────────────────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        faculty: { select: { id: true, name: true, coordinatorId: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        students: {
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
        milestones: { include: MILESTONE_INCLUDE },
      },
    });
    if (!project) throw new NotFoundError('Project not found');

    const canView =
      project.students.some((ps) => ps.studentId === req.user.id) ||
      project.supervisorId === req.user.id ||
      ['PROJECT_COORDINATOR', 'FACULTY_SECRETARY', 'EXAMINER'].includes(req.user.role);
    if (!canView) throw new ForbiddenError();

    project.milestones.sort((a, b) => a.config.order - b.config.order);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// ── Grade summary ─────────────────────────────────────────────────────────────

router.get('/:id/grade-summary', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        milestones: {
          include: {
            config: { select: { id: true, name: true, order: true } },
            gradeSubmissions: true,
          },
        },
        faculty: { include: { milestoneWeights: true } },
      },
    });
    if (!project) throw new NotFoundError('Project not found');

    const weightMap = new Map(project.faculty.milestoneWeights.map((w) => [w.configId, w.weight]));

    const summary = project.milestones
      .sort((a, b) => a.config.order - b.config.order)
      .map((m) => {
        const subs = m.gradeSubmissions;
        const avgScore =
          subs.length > 0 ? subs.reduce((s, g) => s + g.totalScore, 0) / subs.length : null;
        return {
          milestoneId: m.id,
          configId: m.configId,
          name: m.config.name,
          order: m.config.order,
          status: m.status,
          score: avgScore,
          weight: weightMap.get(m.configId) ?? 0,
          submissions: subs.map((s) => ({
            graderId: s.graderId,
            role: s.role,
            totalScore: s.totalScore,
          })),
        };
      });

    res.json({ summary, finalGrade: project.finalGrade });
  } catch (err) {
    next(err);
  }
});

// ── Milestone submit (STUDENT) ────────────────────────────────────────────────

router.post(
  '/:id/milestones/:milestoneId/submit',
  requireRole('STUDENT'),
  async (req, res, next) => {
    try {
      const { documentIds = [] } = req.body;

      const ps = await prisma.projectStudent.findUnique({
        where: { projectId_studentId: { projectId: req.params.id, studentId: req.user.id } },
      });
      if (!ps) throw new ForbiddenError();

      const milestone = await prisma.milestone.findUnique({
        where: { id: req.params.milestoneId },
        include: {
          config: { select: { name: true } },
          project: { select: { title: true, supervisorId: true } },
        },
      });
      if (!milestone || milestone.projectId !== req.params.id) {
        throw new NotFoundError('Milestone not found');
      }
      if (milestone.status !== 'PENDING') {
        throw new AppError('Milestone has already been submitted', 400);
      }

      if (documentIds.length > 0) {
        await prisma.document.updateMany({
          where: { id: { in: documentIds }, uploaderId: req.user.id },
          data: { milestoneId: milestone.id },
        });
      }

      const updated = await prisma.milestone.update({
        where: { id: req.params.milestoneId },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      });

      await sendNotifications([
        {
          userId: milestone.project.supervisorId,
          type: 'MILESTONE_SUBMITTED',
          title: `הוגשה אבן דרך: ${milestone.config.name}`,
          body: `סטודנט הגיש "${milestone.config.name}" בפרויקט "${milestone.project.title}".`,
          actionUrl: `/projects/${req.params.id}/milestones/${milestone.id}`,
        },
      ]);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ── Coordinator approve ───────────────────────────────────────────────────────

router.post(
  '/:id/milestones/:milestoneId/coordinator-approve',
  requireRole('PROJECT_COORDINATOR'),
  async (req, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
        include: {
          faculty: { select: { coordinatorId: true } },
          students: { select: { studentId: true } },
        },
      });
      if (!project) throw new NotFoundError('Project not found');
      if (project.faculty.coordinatorId !== req.user.id) throw new ForbiddenError();

      const milestone = await prisma.milestone.findUnique({
        where: { id: req.params.milestoneId },
        include: { config: { select: { name: true } } },
      });
      if (!milestone || milestone.projectId !== req.params.id) {
        throw new NotFoundError('Milestone not found');
      }
      if (milestone.status !== 'SUPERVISOR_GRADED') {
        throw new AppError('Milestone is not ready for coordinator approval', 400);
      }

      await prisma.milestone.update({
        where: { id: req.params.milestoneId },
        data: { status: 'COORDINATOR_APPROVED', coordinatorApprovedAt: new Date() },
      });

      const finalGrade = await recalculateFinalGrade(req.params.id);

      const studentNotifs = project.students.map((ps) => ({
        userId: ps.studentId,
        type: 'MILESTONE_APPROVED',
        title: `אבן דרך אושרה: ${milestone.config.name}`,
        body: `"${milestone.config.name}" אושרה על ידי הרכז.${finalGrade !== null ? ` ציון ביניים: ${finalGrade.toFixed(1)}` : ''}`,
        actionUrl: `/projects/${req.params.id}`,
      }));

      await sendNotifications([
        ...studentNotifs,
        {
          userId: project.supervisorId,
          type: 'MILESTONE_APPROVED',
          title: `אבן דרך אושרה: ${milestone.config.name}`,
          body: `"${milestone.config.name}" אושרה על ידי הרכז.`,
          actionUrl: `/projects/${req.params.id}`,
        },
      ]);

      res.json({ message: 'Milestone approved', finalGrade });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
