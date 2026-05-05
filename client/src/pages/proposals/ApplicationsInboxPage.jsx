import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, CalendarClock, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApplicationsInbox } from '../../hooks/useProposals.js';
import { proposalsApi } from '../../api/proposals.api.js';

const STATUS_LABELS = {
  PENDING: 'ממתין',
  MEETING_REQUESTED: 'בקשת פגישה',
  APPROVED: 'אושר',
  REJECTED: 'נדחה',
};

const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  MEETING_REQUESTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-slate-100 text-slate-500',
};

const TABS = [
  { value: '', label: 'הכל' },
  { value: 'PENDING', label: 'ממתינות' },
  { value: 'MEETING_REQUESTED', label: 'בקשת פגישה' },
  { value: 'APPROVED', label: 'מאושרות' },
  { value: 'REJECTED', label: 'נדחו' },
];

export function ApplicationsInboxPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: applications = [], isLoading } = useApplicationsInbox(
    statusFilter ? { status: statusFilter } : undefined
  );

  return (
    <div className="space-y-5 p-6">
      <h1 className="text-2xl font-bold">תיבת מועמדויות</h1>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-muted-foreground text-sm">טוען...</div>}

      {!isLoading && applications.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          אין מועמדויות להצגה.
        </div>
      )}

      <div className="space-y-3">
        {applications.map((app) => (
          <ApplicationRow key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}

function ApplicationRow({ app }) {
  const [expanded, setExpanded] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['applications-inbox'] });

  const approveMutation = useMutation({
    mutationFn: () => proposalsApi.approveApplication(app.proposal.id, app.id),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: () => proposalsApi.rejectApplication(app.proposal.id, app.id),
    onSuccess: invalidate,
  });

  const isDone = ['APPROVED', 'REJECTED'].includes(app.status);

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-medium text-sm">
              {app.student.firstName} {app.student.lastName}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[app.status]}`}>
              {STATUS_LABELS[app.status]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            <Link to={`/proposals/${app.proposal.id}`} className="hover:underline">
              {app.proposal.title}
            </Link>
            {' · '}{new Date(app.createdAt).toLocaleDateString('he-IL')}
          </p>
        </div>

        {!isDone && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              title="אשר"
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
            >
              <CheckCircle size={16} />
            </button>
            <button
              onClick={() => setShowMeetingForm((v) => !v)}
              title="בקש פגישה"
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <CalendarClock size={16} />
            </button>
            <button
              onClick={() => {
                if (confirm('לדחות מועמדות זו?')) rejectMutation.mutate();
              }}
              disabled={rejectMutation.isPending}
              title="דחה"
              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 text-muted-foreground hover:text-foreground ml-1"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {(approveMutation.isError || rejectMutation.isError) && (
        <p className="px-4 pb-2 text-xs text-destructive">שגיאה. נסה שנית.</p>
      )}

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2 bg-slate-50/50">
          <p className="text-xs text-muted-foreground font-medium">
            {app.student.email}
          </p>
          {app.coverLetter && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">מכתב מוטיבציה:</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{app.coverLetter}</p>
            </div>
          )}
          {app.documents?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">מסמכים:</p>
              <div className="flex flex-wrap gap-2">
                {app.documents.map((doc) => (
                  <span key={doc.id} className="flex items-center gap-1 text-xs bg-white border border-border px-2 py-1 rounded-md">
                    <FileText size={11} /> {doc.fileName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showMeetingForm && (
        <MeetingForm
          proposalId={app.proposal.id}
          appId={app.id}
          onDone={() => { setShowMeetingForm(false); invalidate(); }}
          onCancel={() => setShowMeetingForm(false)}
        />
      )}
    </div>
  );
}

function MeetingForm({ proposalId, appId, onDone, onCancel }) {
  const [note, setNote] = useState('');
  const [scheduled, setScheduled] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      proposalsApi.requestMeeting(proposalId, appId, {
        meetingNote: note,
        meetingScheduled: scheduled || undefined,
      }),
    onSuccess: onDone,
  });

  return (
    <div className="border-t border-border px-4 py-3 space-y-2 bg-blue-50/40">
      <p className="text-xs font-medium">בקשת פגישה</p>
      <textarea
        className="input-base resize-none text-sm"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="הוסף הערה לסטודנט (אופציונלי)"
      />
      <input
        type="datetime-local"
        className="input-base text-sm"
        value={scheduled}
        onChange={(e) => setScheduled(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {mutation.isPending ? 'שולח...' : 'שלח בקשה'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 border border-border rounded-md text-xs hover:bg-muted transition-colors"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
