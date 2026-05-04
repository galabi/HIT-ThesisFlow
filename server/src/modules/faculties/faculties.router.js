import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';
import { NotFoundError } from '../../middleware/error.js';

const router = Router();
router.use(authenticate);

// ── Faculty CRUD ─────────────────────────────────────────────────────────────

router.get('/', async (_req, res, next) => {
  try {
    const faculties = await prisma.faculty.findMany({
      include: { coordinator: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(faculties);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const { name, code, description, coordinatorId, secretaryId } = req.body;
    const faculty = await prisma.faculty.create({
      data: { name, code, description, coordinatorId, secretaryId },
    });
    res.status(201).json(faculty);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: req.params.id },
      include: {
        coordinator: { select: { id: true, firstName: true, lastName: true } },
        secretary: { select: { id: true, firstName: true, lastName: true } },
        milestoneConfigs: { orderBy: { order: 'asc' } },
      },
    });
    if (!faculty) throw new NotFoundError('Faculty not found');
    res.json(faculty);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const { name, description, coordinatorId, secretaryId } = req.body;
    const faculty = await prisma.faculty.update({
      where: { id: req.params.id },
      data: { name, description, coordinatorId, secretaryId },
    });
    res.json(faculty);
  } catch (err) {
    next(err);
  }
});

// ── Members ──────────────────────────────────────────────────────────────────

router.get('/:id/members', requireRole('PROJECT_COORDINATOR', 'FACULTY_SECRETARY'), async (req, res, next) => {
  try {
    const members = await prisma.facultyMember.findMany({
      where: { facultyId: req.params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    });
    res.json(members);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const { userId } = req.body;
    const member = await prisma.facultyMember.create({
      data: { facultyId: req.params.id, userId },
    });
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/members/:userId', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    await prisma.facultyMember.deleteMany({
      where: { facultyId: req.params.id, userId: req.params.userId },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── Milestone Configs ─────────────────────────────────────────────────────────

router.get('/:id/milestone-configs', async (req, res, next) => {
  try {
    const configs = await prisma.milestoneConfig.findMany({
      where: { facultyId: req.params.id },
      orderBy: { order: 'asc' },
      include: { gradeTemplate: { include: { fields: { include: { rubricItems: true }, orderBy: { order: 'asc' } } } } },
    });
    res.json(configs);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/milestone-configs', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const { name, description, order, deadlineOffsetDays, isRequired, requiresExaminers } = req.body;
    const config = await prisma.milestoneConfig.create({
      data: { facultyId: req.params.id, name, description, order, deadlineOffsetDays, isRequired, requiresExaminers },
    });
    res.status(201).json(config);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/milestone-configs/:configId', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const config = await prisma.milestoneConfig.update({
      where: { id: req.params.configId },
      data: req.body,
    });
    res.json(config);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/milestone-configs/:configId', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    await prisma.milestoneConfig.delete({ where: { id: req.params.configId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── Milestone Weights ─────────────────────────────────────────────────────────

router.get('/:id/weights', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const weights = await prisma.milestoneWeight.findMany({
      where: { facultyId: req.params.id },
      include: { config: true },
    });
    res.json(weights);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/weights', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const weights = req.body; // [{ configId, weight }]
    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    if (Math.abs(total - 1) > 0.001) {
      return res.status(400).json({ message: 'Weights must sum to 1.0' });
    }
    await prisma.$transaction([
      prisma.milestoneWeight.deleteMany({ where: { facultyId: req.params.id } }),
      ...weights.map((w) =>
        prisma.milestoneWeight.create({ data: { facultyId: req.params.id, configId: w.configId, weight: w.weight } })
      ),
    ]);
    res.json({ message: 'Weights updated' });
  } catch (err) {
    next(err);
  }
});

export default router;
