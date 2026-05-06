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

const TYPE_CONFIG = {
  APPLICATION_SUBMITTED: { icon: '📋', color: '#4f46e5', label: 'מועמדות חדשה' },
  APPLICATION_APPROVED:  { icon: '✅', color: '#16a34a', label: 'מועמדות אושרה' },
  APPLICATION_REJECTED:  { icon: '❌', color: '#dc2626', label: 'מועמדות נדחתה' },
  MEETING_REQUESTED:     { icon: '📅', color: '#d97706', label: 'בקשת פגישה' },
  PROJECT_STARTED:       { icon: '🚀', color: '#4f46e5', label: 'פרויקט נפתח' },
  MILESTONE_SUBMITTED:   { icon: '📤', color: '#0ea5e9', label: 'אבן דרך הוגשה' },
  MILESTONE_GRADED:      { icon: '📊', color: '#7c3aed', label: 'ציון הוגש' },
  MILESTONE_APPROVED:    { icon: '✔️', color: '#16a34a', label: 'אבן דרך אושרה' },
  EXAMINER_ASSIGNED:     { icon: '👤', color: '#0891b2', label: 'הוקצית כבוחן' },
  DEFENSE_SCHEDULED:     { icon: '🗓️', color: '#7c3aed', label: 'הגנה נקבעה' },
  GENERAL:               { icon: '🔔', color: '#64748b', label: 'הודעה' },
};

export function notificationEmailHtml({ type, title, body, actionUrl }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.GENERAL;
  const appUrl = env.CLIENT_URL ?? 'http://localhost:5173';
  const fullActionUrl = actionUrl ? `${appUrl}${actionUrl}` : null;

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:${cfg.color};padding:24px 32px;text-align:center">
            <span style="font-size:32px">${cfg.icon}</span>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:13px;letter-spacing:.5px">${cfg.label}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;font-weight:700">${title}</h2>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7">${body}</p>
            ${fullActionUrl
              ? `<a href="${fullActionUrl}"
                   style="display:inline-block;padding:12px 28px;background:${cfg.color};color:#fff;
                          border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
                   פתח באפליקציה
                 </a>`
              : ''}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f1f5f9;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">
              HIT ThesisFlow — מערכת ניהול פרויקטי גמר, מכון טכנולוגי חולון
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
