import { resend } from '../config/mailer.js';
import { env } from '../config/env.js';
import logger from '../lib/logger.js';

export async function sendEmail({ to, subject, html }) {
  if (!resend) {
    logger.warn({ to, subject }, 'Email not sent — RESEND_API_KEY not configured');
    return;
  }
  try {
    await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
  }
}

export function notificationEmailHtml({ title, body, actionUrl }) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
      <h2 style="color:#1a1a2e">${title}</h2>
      <p style="color:#333;line-height:1.6">${body}</p>
      ${
        actionUrl
          ? `<a href="${actionUrl}"
               style="display:inline-block;margin-top:16px;padding:10px 20px;
                      background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none">
               פתח באפליקציה
             </a>`
          : ''
      }
      <hr style="margin-top:32px;border:none;border-top:1px solid #eee"/>
      <p style="color:#999;font-size:12px">HIT ThesisFlow — מערכת ניהול פרויקטי גמר</p>
    </div>`;
}
