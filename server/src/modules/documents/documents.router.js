import { Router } from 'express';
import path from 'path';
import crypto from 'crypto';
import { authenticate } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { createPresignedPutUrl, createPresignedGetUrl } from '../../services/storage.js';
import { NotFoundError, ForbiddenError, AppError } from '../../middleware/error.js';
import { env } from '../../config/env.js';

const router = Router();
router.use(authenticate);

router.post('/presign', async (req, res, next) => {
  try {
    if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID) {
      throw new AppError('File storage is not configured', 503);
    }
    const { fileName, mimeType, documentType } = req.body;
    const ext = path.extname(fileName || '.bin');
    const storageKey = `uploads/${req.user.id}/${crypto.randomUUID()}${ext}`;
    const url = await createPresignedPutUrl(storageKey, mimeType);
    res.json({ url, storageKey });
  } catch (err) {
    next(err);
  }
});

router.post('/confirm', async (req, res, next) => {
  try {
    const { storageKey, fileName, mimeType, sizeBytes, documentType } = req.body;
    const doc = await prisma.document.create({
      data: {
        uploaderId: req.user.id,
        documentType,
        fileName,
        storageKey,
        mimeType,
        sizeBytes: sizeBytes ?? 0,
      },
    });
    res.status(201).json({ id: doc.id, fileName: doc.fileName, documentType: doc.documentType });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw new NotFoundError('Document not found');

    const canView =
      doc.uploaderId === req.user.id ||
      ['SUPERVISOR', 'PROJECT_COORDINATOR', 'EXAMINER', 'FACULTY_SECRETARY'].includes(
        req.user.role
      );
    if (!canView) throw new ForbiddenError();

    const url = await createPresignedGetUrl(doc.storageKey);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

export default router;
