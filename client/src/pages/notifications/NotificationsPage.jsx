import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications, useMarkRead, useMarkAllRead } from '../../hooks/useNotifications.js';

const TYPE_ICON = {
  APPLICATION_SUBMITTED: '📋',
  APPLICATION_APPROVED:  '✅',
  APPLICATION_REJECTED:  '❌',
  MEETING_REQUESTED:     '📅',
  PROJECT_STARTED:       '🚀',
  MILESTONE_SUBMITTED:   '📤',
  MILESTONE_GRADED:      '📊',
  MILESTONE_APPROVED:    '✔️',
  EXAMINER_ASSIGNED:     '👤',
  DEFENSE_SCHEDULED:     '🗓️',
  GRADE_FINALIZED:       '🏆',
  GENERAL:               '🔔',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `${Math.floor(diff / 60)} דקות`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} שעות`;
  return new Date(dateStr).toLocaleDateString('he-IL');
}

export function NotificationsPage() {
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const { data, isLoading } = useNotifications({
    unread: filter === 'unread' || undefined,
    page,
    limit: LIMIT,
  });

  const markReadMutation = useMarkRead();
  const markAllMutation = useMarkAllRead();

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-2xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={20} />
          <h1 className="text-xl font-bold">התראות</h1>
          {total > 0 && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </div>
        <button
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending || notifications.every((n) => n.isRead)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
        >
          <CheckCheck size={15} />
          סמן הכל כנקרא
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {['all', 'unread'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'הכל' : 'לא נקרא'}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm">טוען...</div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <p>אין התראות</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            onMarkRead={() => markReadMutation.mutate(n.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded-md border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
          >
            הקודם
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded-md border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
          >
            הבא
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notification: n, onMarkRead }) {
  const icon = TYPE_ICON[n.type] ?? '🔔';

  const inner = (
    <div
      className={`flex items-start gap-3 bg-white border rounded-xl px-4 py-3 shadow-sm transition-all ${
        n.isRead
          ? 'border-border opacity-70'
          : 'border-primary/20 bg-primary/[0.02] hover:shadow-md'
      }`}
    >
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${n.isRead ? 'font-normal' : 'font-semibold'}`}>
          {n.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.isRead && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkRead(); }}
          className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title="סמן כנקרא"
        >
          <CheckCheck size={15} />
        </button>
      )}
    </div>
  );

  return n.actionUrl ? (
    <Link to={n.actionUrl} onClick={!n.isRead ? onMarkRead : undefined}>
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}
