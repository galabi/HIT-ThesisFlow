/** @type {import('socket.io').Server|null} */
let io = null;

export function initSocket(socketIo) {
  io = socketIo;
}

export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}
