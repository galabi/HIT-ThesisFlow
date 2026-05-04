import prisma from '../../lib/prisma.js';
import { emitToUser } from '../../services/socket.js';
import { sendEmail, notificationEmailHtml } from '../../services/email.js';

/**
 * Central notification pipeline.
 * Persists in-app notifications, emits via Socket.io, and sends email.
 *
 * @param {Object[]} notifications
 * @param {string}   notifications[].userId
 * @param {string}   notifications[].type
 * @param {string}   notifications[].title
 * @param {string}   notifications[].body
 * @param {string}   [notifications[].actionUrl]
 * @param {object}   [notifications[].metadata]
 */
export async function sendNotifications(notifications) {
  const created = await prisma.$transaction(
    notifications.map((n) =>
      prisma.notification.create({
        data: {
          userId: n.userId,
          type: n.type,
          title: n.title,
          body: n.body,
          actionUrl: n.actionUrl ?? null,
          metadata: n.metadata ?? undefined,
        },
        include: { user: { select: { email: true } } },
      })
    )
  );

  for (const notification of created) {
    emitToUser(notification.userId, 'notification:new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      actionUrl: notification.actionUrl,
      createdAt: notification.createdAt,
    });

    sendEmail({
      to: notification.user.email,
      subject: notification.title,
      html: notificationEmailHtml({
        title: notification.title,
        body: notification.body,
        actionUrl: notification.actionUrl,
      }),
    }).catch(() => {});
  }
}
