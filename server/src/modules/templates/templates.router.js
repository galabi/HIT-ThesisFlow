import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';
import { NotFoundError } from '../../middleware/error.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/templates/:configId
router.get('/:configId', async (req, res, next) => {
  try {
    const template = await prisma.gradeFormTemplate.findUnique({
      where: { configId: req.params.configId },
      include: {
        fields: {
          include: { rubricItems: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!template) throw new NotFoundError('Template not found');
    res.json(template);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/templates/:configId — full replace
router.put('/:configId', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    const { fields = [] } = req.body;

    if (fields.length > 0) {
      const totalWeight = fields.reduce((sum, f) => sum + (f.weight ?? 0), 0);
      if (Math.abs(totalWeight - 1) > 0.005) {
        return res.status(400).json({ message: 'Field weights must sum to 1.0' });
      }
    }

    const existing = await prisma.gradeFormTemplate.findUnique({
      where: { configId: req.params.configId },
      include: { fields: { select: { id: true } } },
    });

    let templateId;

    if (existing) {
      const fieldIds = existing.fields.map((f) => f.id);
      if (fieldIds.length > 0) {
        await prisma.rubricItem.deleteMany({ where: { fieldId: { in: fieldIds } } });
        await prisma.gradeFormField.deleteMany({ where: { templateId: existing.id } });
      }
      await prisma.gradeFormTemplate.update({
        where: { id: existing.id },
        data: { version: existing.version + 1 },
      });
      templateId = existing.id;
    } else {
      const created = await prisma.gradeFormTemplate.create({
        data: { configId: req.params.configId },
      });
      templateId = created.id;
    }

    for (const { rubricItems, ...fieldData } of fields) {
      const field = await prisma.gradeFormField.create({
        data: { ...fieldData, templateId },
      });
      if (rubricItems?.length) {
        await prisma.rubricItem.createMany({
          data: rubricItems.map((item) => ({ ...item, fieldId: field.id })),
        });
      }
    }

    const template = await prisma.gradeFormTemplate.findUnique({
      where: { id: templateId },
      include: {
        fields: {
          include: { rubricItems: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json(template);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/templates/:configId/fields/:fieldId
router.patch('/:configId/fields/:fieldId', requireRole('PROJECT_COORDINATOR'), async (req, res, next) => {
  try {
    // eslint-disable-next-line no-unused-vars
    const { rubricItems, ...data } = req.body;
    const field = await prisma.gradeFormField.update({
      where: { id: req.params.fieldId },
      data,
      include: { rubricItems: true },
    });
    res.json(field);
  } catch (err) {
    next(err);
  }
});

export default router;
