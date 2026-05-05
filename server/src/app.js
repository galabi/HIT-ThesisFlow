import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';

// Module routers (imported as we build them)
import authRouter from './modules/auth/auth.router.js';
import usersRouter from './modules/users/users.router.js';
import facultiesRouter from './modules/faculties/faculties.router.js';
import templatesRouter from './modules/templates/templates.router.js';
import notificationsRouter from './modules/notifications/notifications.router.js';
import proposalsRouter from './modules/proposals/proposals.router.js';
import documentsRouter from './modules/documents/documents.router.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.use(
    '/api/v1/auth',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true }),
    authRouter
  );

  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/faculties', facultiesRouter);
  app.use('/api/v1/templates', templatesRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/proposals', proposalsRouter);
  app.use('/api/v1/documents', documentsRouter);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use(errorHandler);

  return app;
}
