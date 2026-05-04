import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initSocket } from './services/socket.js';
import { verifyAccessToken } from './services/token.js';
import logger from './lib/logger.js';

const app = createApp();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: env.CLIENT_URL, credentials: true },
});

initSocket(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = verifyAccessToken(token);
    socket.userId = payload.sub;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  logger.debug({ userId: socket.userId }, 'Socket connected');
  socket.on('disconnect', () => {
    logger.debug({ userId: socket.userId }, 'Socket disconnected');
  });
});

httpServer.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});
