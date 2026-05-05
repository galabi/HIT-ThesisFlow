import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, AppError } from '../../middleware/error.js';
import {
  submitApplication,
  approveApplication,
  rejectApplication,
  requestMeeting,
} from './proposals.service.js';

const router = Router();
router.use(authenticate);

const PROPOSAL_INCLUDE = {
  faculty: { select: { id: true, name: true } },
  supervisor: { select: { id: true, firstName: true, lastName: true } },
  tags: true,
  _count: { select: { applications: true } },
};

// ── List ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { facultyId } = req.query;
    const where = {};
    if (facultyId) where.facultyId = facultyId;

    if (req.user.role === 'SUPERVISOR') {
      where.OR = [{ status: 'PUBLISHED' }, { supervisorId: req.user.id }];
    } else {
      where.status = 'PUBLISHED';
    }

    const proposals = await prisma.proposal.findMany({
      where,
      include: PROPOSAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(proposals);
  } catch (err) {
    next(err);
  }
});

// ── Create ────────────────────────────────────────────────────────────────────

router.post('/', requireRole('SUPERVISOR'), async (req, res, next) => {
  try {
    const { title, description, requirements, maxStudents = 1, facultyId, tags = [] } = req.body;
    const proposal = await prisma.proposal.create({
      data: {
        title,
        description,
        requirements: requirements ?? null,
        maxStudents,
        facultyId,
        supervisorId: req.user.id,
        tags: { create: tags.map((label) => ({ label })) },
      },
      include: PROPOSAL_INCLUDE,
    });
    res.status(201).json(proposal);
  } catch (err) {
    next(err);
  }
});

// ── Student: my applications (must come before /:id) ─────────────────────────

router.get('/my-applications', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const applications = await prisma.application.findMany({
      where: { studentId: req.user.id },
      include: {
        proposal: {
          include: {
            faculty: { select: { name: true } },
            supervisor: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
});

// ── Supervisor: applications inbox (must come before /:id) ───────────────────

router.get('/applications/inbox', requireRole('SUPERVISOR'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const applications = await prisma.application.findMany({
      where: {
        proposal: { supervisorId: req.user.id },
        ...(status ? { status } : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        proposal: { select: { id: true, title: true } },
        documents: { select: { id: true, fileName: true, documentType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
});

// ── Single proposal ───────────────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: req.params.id },
      include: PROPOSAL_INCLUDE,
    });
    if (!proposal) throw new NotFoundError('Proposal not found');
    res.json(proposal);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('SUPERVISOR'), async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) throw new NotFoundError('Proposal not found');
    if (proposal.supervisorId !== req.user.id) throw new ForbiddenError();

    const { title, description, requirements, maxStudents, tags } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (requirements !== undefined) data.requirements = requirements;
    if (maxStudents !== undefined) data.maxStudents = maxStudents;

    const updated = await prisma.proposal.update({ where: { id: req.params.id }, data });

    if (tags !== undefined) {
      await prisma.proposalTag.deleteMany({ where: { proposalId: req.params.id } });
      if (tags.length > 0) {
        await prisma.proposalTag.createMany({
          data: tags.map((label) => ({ proposalId: req.params.id, label })),
        });
      }
    }

    const result = await prisma.proposal.findUnique({
      where: { id: req.params.id },
      include: PROPOSAL_INCLUDE,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('SUPERVISOR'), async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) throw new NotFoundError('Proposal not found');
    if (proposal.supervisorId !== req.user.id) throw new ForbiddenError();
    if (proposal.status !== 'DRAFT') throw new AppError('Only draft proposals can be deleted', 400);

    await prisma.proposalTag.deleteMany({ where: { proposalId: req.params.id } });
    await prisma.proposal.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/publish', requireRole('SUPERVISOR'), async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) throw new NotFoundError('Proposal not found');
    if (proposal.supervisorId !== req.user.id) throw new ForbiddenError();
    if (proposal.status !== 'DRAFT') throw new AppError('Only draft proposals can be published', 400);

    const updated = await prisma.proposal.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED' },
      include: PROPOSAL_INCLUDE,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/close', requireRole('SUPERVISOR', 'PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) throw new NotFoundError('Proposal not found');
    if (req.user.role === 'SUPERVISOR' && proposal.supervisorId !== req.user.id) {
      throw new ForbiddenError();
    }

    const updated = await prisma.proposal.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: PROPOSAL_INCLUDE,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── Applications ──────────────────────────────────────────────────────────────

router.get('/:id/my-application', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const app = await prisma.application.findUnique({
      where: { proposalId_studentId: { proposalId: req.params.id, studentId: req.user.id } },
      include: { documents: { select: { id: true, fileName: true, documentType: true } } },
    });
    res.json(app ?? null);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/applications', async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) throw new NotFoundError('Proposal not found');

    if (
      req.user.role === 'SUPERVISOR' && proposal.supervisorId !== req.user.id ||
      !['SUPERVISOR', 'PROJECT_COORDINATOR', 'FACULTY_SECRETARY'].includes(req.user.role)
    ) {
      throw new ForbiddenError();
    }

    const applications = await prisma.application.findMany({
      where: { proposalId: req.params.id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        documents: { select: { id: true, fileName: true, documentType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/applications', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const app = await submitApplication(req.params.id, req.user.id, req.body);
    res.status(201).json(app);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/applications/:appId/approve', requireRole('SUPERVISOR'), async (req, res, next) => {
  try {
    const project = await approveApplication(req.params.appId, req.user.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/applications/:appId/reject', requireRole('SUPERVISOR'), async (req, res, next) => {
  try {
    await rejectApplication(req.params.appId, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/applications/:appId/request-meeting',
  requireRole('SUPERVISOR'),
  async (req, res, next) => {
    try {
      await requestMeeting(req.params.appId, req.user.id, req.body);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
