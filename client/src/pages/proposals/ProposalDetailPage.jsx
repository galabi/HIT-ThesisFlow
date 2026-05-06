import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Users, Tag, Edit, Send, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useProposal, useMyApplication, useApplyMutation, useProposalMutations } from '../../hooks/useProposals.js';
import { useAuthStore } from '../../store/auth.store.js';
import { FileUploadZone } from '../../components/documents/FileUploadZone.jsx';

const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  MEETING_REQUESTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
};

const STATUS_LABELS = {
  PENDING: 'ממתין לבדיקה',
  MEETING_REQUESTED: 'בקשת פגישה',
  APPROVED: 'אושר',
  REJECTED: 'נדחה',
};

export function ProposalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: proposal, isLoading } = useProposal(id);
  const { data: myApplication } = useMyApplication(
    user?.role === 'STUDENT' ? id : null
  );

  const [showApplyForm, setShowApplyForm] = useState(false);

  if (isLoading) return <div className="p-6 text-muted-foreground">טוען...</div>;
  if (!proposal) return <div className="p-6 text-muted-foreground">הצעה לא נמצאה.</div>;

  const isMine = user?.role === 'SUPERVISOR' && proposal.supervisorId === user.id;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
        >
          <ArrowRight size={18} />
        </button>
        <span className="text-sm text-muted-foreground">{proposal.faculty?.name}</span>
      </div>

      <div>
        <div className="flex items-start gap-3 mb-2">
          <h1 className="text-2xl font-bold flex-1">{proposal.title}</h1>
          {isMine && (
            <Link
              to={`/proposals/${id}/edit`}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors shrink-0"
            >
              <Edit size={16} />
            </Link>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          מנחה: {proposal.supervisor.firstName} {proposal.supervisor.lastName}
        </p>
      </div>

      <div className="space-y-3">
        <Section title="תיאור">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{proposal.description}</p>
        </Section>

        {proposal.requirements && (
          <Section title="דרישות קדם">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{proposal.requirements}</p>
          </Section>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users size={14} /> עד {proposal.maxStudents} סטודנטים
        </span>
        <span>{proposal._count?.applications ?? 0} מועמדויות</span>
      </div>

      {proposal.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {proposal.tags.map((tag) => (
            <span key={tag.id} className="flex items-center gap-1 text-xs bg-primary/8 text-primary px-2.5 py-1 rounded-full">
              <Tag size={10} /> {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Supervisor actions */}
      {isMine && (
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-sm font-medium">ניהול הצעה</p>
          <div className="flex gap-2 flex-wrap">
            {proposal.status === 'DRAFT' && (
              <PublishButton proposalId={id} />
            )}
            {proposal.status === 'PUBLISHED' && (
              <CloseButton proposalId={id} />
            )}
            <Link
              to="/proposals/inbox"
              className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors"
            >
              הצג מועמדויות ({proposal._count?.applications ?? 0})
            </Link>
          </div>
        </div>
      )}

      {/* Student: application status or apply form */}
      {user?.role === 'STUDENT' && (
        <div className="border-t border-border pt-4">
          {myApplication ? (
            <ApplicationStatus app={myApplication} />
          ) : proposal.status === 'PUBLISHED' ? (
            <>
              {!showApplyForm ? (
                <button
                  onClick={() => setShowApplyForm(true)}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Send size={14} /> הגש מועמדות
                </button>
              ) : (
                <ApplyForm
                  proposalId={id}
                  onSuccess={() => setShowApplyForm(false)}
                  onCancel={() => setShowApplyForm(false)}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">ההצעה אינה מקבלת מועמדויות כרגע.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  );
}

function ApplicationStatus({ app }) {
  const Icon = {
    PENDING: Clock,
    MEETING_REQUESTED: Clock,
    APPROVED: CheckCircle,
    REJECTED: XCircle,
  }[app.status] ?? Clock;

  return (
    <div className={`rounded-xl p-4 flex items-start gap-3 ${STATUS_COLORS[app.status]}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium text-sm">סטטוס מועמדות: {STATUS_LABELS[app.status]}</p>
        {app.meetingNote && (
          <p className="text-xs mt-1 opacity-80">{app.meetingNote}</p>
        )}
        {app.meetingScheduled && (
          <p className="text-xs mt-0.5 opacity-80">
            פגישה: {new Date(app.meetingScheduled).toLocaleDateString('he-IL')}
          </p>
        )}
      </div>
    </div>
  );
}

function ApplyForm({ proposalId, onSuccess, onCancel }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [documentIds, setDocumentIds] = useState([]);
  const applyMutation = useApplyMutation(proposalId);

  const addDoc = (id) => setDocumentIds((prev) => [...prev, id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    applyMutation.mutate(
      { coverLetter, documentIds },
      { onSuccess }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-border rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold text-sm">הגשת מועמדות</h3>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">מכתב מוטיבציה (אופציונלי)</label>
        <textarea
          className="input-base resize-none"
          rows={4}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          placeholder="ספר/י על עצמך ולמה אתה/את מתאים/ה לפרויקט זה..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">קורות חיים (PDF)</p>
          <FileUploadZone
            documentType="CV"
            label="העלה קורות חיים"
            accept=".pdf,.doc,.docx"
            onUploaded={addDoc}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">גיליון ציונים (PDF)</p>
          <FileUploadZone
            documentType="TRANSCRIPT"
            label="העלה גיליון ציונים"
            accept=".pdf"
            onUploaded={addDoc}
          />
        </div>
      </div>

      {applyMutation.isError && (
        <p className="text-xs text-destructive">
          {applyMutation.error?.response?.data?.message || 'שגיאה בשליחת המועמדות'}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={applyMutation.isPending}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {applyMutation.isPending ? 'שולח...' : 'שלח מועמדות'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 rounded-md text-sm border border-border hover:bg-muted transition-colors"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function PublishButton({ proposalId }) {
  const { publish } = useProposalMutations();
  return (
    <button
      onClick={() => publish.mutate(proposalId)}
      disabled={publish.isPending}
      className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 transition-colors"
    >
      פרסם הצעה
    </button>
  );
}

function CloseButton({ proposalId }) {
  const { close } = useProposalMutations();
  return (
    <button
      onClick={() => {
        if (confirm('לסגור את ההצעה? לא יתקבלו מועמדויות חדשות.')) {
          close.mutate(proposalId);
        }
      }}
      disabled={close.isPending}
      className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-muted disabled:opacity-60 transition-colors"
    >
      סגור הצעה
    </button>
  );
}
