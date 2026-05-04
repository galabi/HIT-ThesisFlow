import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';
import { sanitizeUser } from '../auth/auth.service.js';
import { NotFoundError } from '../../middleware/error.js';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('PROJECT_COORDINATOR', 'FACULTY_SECRETARY'), async (req, res, next) => {
  try {
    const { role, facultyId, page = 1, limit = 20 } = req.query;
    const where = {
      ...(role ? { role } : {}),
      ...(facultyId ? { facultyMemberships: { some: { facultyId } } } : {}),
    };
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { lastName: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ data: users.map(sanitizeUser), total });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { facultyMemberships: { include: { faculty: true } } },
    });
    if (!user) throw new NotFoundError('User not found');
    const isOwn = req.user.id === req.params.id;
    const isAdmin = ['PROJECT_COORDINATOR', 'FACULTY_SECRETARY'].includes(req.user.role);
    if (!isOwn && !isAdmin) return res.status(403).json({ message: 'Forbidden' });
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { ...(role ? { role } : {}), ...(isActive !== undefined ? { isActive } : {}) },
    });
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/projects', async (req, res, next) => {
  try {
    const isOwn = req.user.id === req.params.id;
    const isAdmin = ['PROJECT_COORDINATOR'].includes(req.user.role);
    if (!isOwn && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { students: { some: { studentId: req.params.id } } },
          { supervisorId: req.params.id },
        ],
      },
      include: { faculty: true, students: { include: { student: true } } },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

export default router;
