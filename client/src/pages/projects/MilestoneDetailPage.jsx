import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, FileText, CheckCircle, UserPlus, Trash2, CalendarClock, ExternalLink } from 'lucide-react';
import { useProject, useSubmitMilestone, useCoordinatorApprove, useSubmitGrade, useMyGrade } from '../../hooks/useProjects.js';
import {
  useAssignments, useCreateAssignment, useDeleteAssignment,
  useDefense, useCreateDefense, useUpdateDefense, useDeleteDefense,
  useExaminers,
} from '../../hooks/useAssignments.js';
import { useAuthStore } from '../../store/auth.store.js';
import { FileUploadZone } from '../../components/documents/FileUploadZone.jsx';
import { DynamicGradeForm } from '../../components/grades/DynamicGradeForm.jsx';

const STATUS_LABELS = {
  PENDING: 'ממתין להגשה',
  SUBMITTED: 'הוגש — ממתין לציון',
  SUPERVISOR_GRADED: 'ציון מנחה — ממתין לאישור',
  COORDINATOR_APPROVED: 'אושר — ממתין לבוחנים',
  EXAMINER_ASSIGNED: 'בוחנים הוקצו',
  DEFENSE_SCHEDULED: 'הגנה נקבעה',
  EXAMINER_GRADED: 'כל הציונים התקבלו',
  COMPLETED: 'הושלם',
};

export function MilestoneDetailPage() {
  const { id: projectId, milestoneId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: project, isLoading } = useProject(projectId);
  const milestone = project?.milestones?.find((m) => m.id === milestoneId);

  const { data: myGrade } = useMyGrade(
    ['SUPERVISOR', 'EXAMINER'].includes(user?.role) ? milestoneId : null
  );
  const { data: assignments = [] } = useAssignments(milestoneId);
  const { data: defense } = useDefense(milestoneId);

  const submitMutation = useSubmitMilestone(projectId, milestoneId);
  const approveMutation = useCoordinatorApprove(projectId, milestoneId);
  const gradeMutation = useSubmitGrade(milestoneId, projectId);

  const [documentIds, setDocumentIds] = useState([]);
  const [showGradeForm, setShowGradeForm] = useState(false);

  if (isLoading) return <div className="p-6 text-muted-foreground">טוען...</div>;
  if (!milestone) return <div className="p-6 text-muted-foreground">אבן דרך לא נמצאה.</div>;

  const isStudent = user?.role === 'STUDENT';
  const isSupervisor = user?.role === 'SUPERVISOR' && project?.supervisorId === user?.id;
  const isCoordinator = user?.role === 'PROJECT_COORDINATOR';
  const isExaminer =
    user?.role === 'EXAMINER' && assignments.some((a) => a.examinerId === user?.id);

  const handleStudentSubmit = () => {
    submitMutation.mutate(
      { documentIds },
      { onSuccess: () => setDocumentIds([]) }
    );
  };

  const handleGradeSubmit = (data) => {
    gradeMutation.mutate(data, { onSuccess: () => setShowGradeForm(false) });
  };

  const coordinatorStages = ['COORDINATOR_APPROVED', 'EXAMINER_ASSIGNED', 'DEFENSE_SCHEDULED', 'EXAMINER_GRADED', 'COMPLETED'];
  const showAssignPanel = isCoordinator && coordinatorStages.includes(milestone.status) && milestone.config?.requiresExaminers;
  const showDefensePanel = isCoordinator && ['EXAMINER_ASSIGNED', 'DEFENSE_SCHEDULED', 'EXAMINER_GRADED', 'COMPLETED'].includes(milestone.status);

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate(`/projects/${projectId}`)} className="hover:text-foreground">
          <ArrowRight size={16} />
        </button>
        <Link to={`/projects/${projectId}`} className="hover:text-foreground">
          {project?.title}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{milestone.config.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold">{milestone.config.name}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 shrink-0">
            {STATUS_LABELS[milestone.status] ?? milestone.status}
          </span>
        </div>
        {milestone.deadline && (
          <p className="text-sm text-muted-foreground">
            תאריך יעד: {new Date(milestone.deadline).toLocaleDateString('he-IL')}
          </p>
        )}
        {milestone.submittedAt && (
          <p className="text-xs text-muted-foreground">
            הוגש: {new Date(milestone.submittedAt).toLocaleDateString('he-IL')}
          </p>
        )}
        {defense && (
          <div className="mt-1 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 space-y-0.5">
            <p className="font-semibold">
              הגנה: {new Date(defense.scheduledAt).toLocaleString('he-IL')}
            </p>
            {defense.location && <p>מיקום: {defense.location}</p>}
            {defense.meetingUrl && (
              <a
                href={defense.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 underline hover:text-indigo-900"
              >
                <ExternalLink size={11} /> קישור לפגישה
              </a>
            )}
          </div>
        )}
      </div>

      {/* Submitted documents */}
      {milestone.documents?.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground mb-2">מסמכים שהוגשו</p>
          <div className="space-y-1">
            {milestone.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm">
                <FileText size={13} className="text-muted-foreground" />
                <span>{doc.fileName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(doc.uploadedAt).toLocaleDateString('he-IL')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grade submissions summary */}
      {milestone.gradeSubmissions?.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground mb-2">ציונים שהוגשו</p>
          <div className="space-y-1">
            {milestone.gradeSubmissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between text-sm">
                <span>
                  {sub.grader.firstName} {sub.grader.lastName}
                  <span className="text-xs text-muted-foreground mr-1">({sub.grader.role})</span>
                </span>
                <span className="font-bold text-primary">{sub.totalScore.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STUDENT: submit document ── */}
      {isStudent && milestone.status === 'PENDING' && (
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">הגשת דוח</h2>
          <FileUploadZone
            documentType="PROGRESS_REPORT"
            label="העלה את הדוח (PDF)"
            accept=".pdf,.doc,.docx"
            onUploaded={(id) => setDocumentIds((prev) => [...prev, id])}
          />
          {documentIds.length > 0 && (
            <p className="text-xs text-green-600">{documentIds.length} קובץ/ים מוכן להגשה</p>
          )}
          {submitMutation.isError && (
            <p className="text-xs text-destructive">
              {submitMutation.error?.response?.data?.message || 'שגיאה בהגשה'}
            </p>
          )}
          <button
            onClick={handleStudentSubmit}
            disabled={submitMutation.isPending}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {submitMutation.isPending ? 'מגיש...' : 'הגש אבן דרך'}
          </button>
        </div>
      )}

      {isStudent && milestone.status !== 'PENDING' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
          <CheckCircle size={16} />
          <span>ההגשה בוצעה בהצלחה.</span>
        </div>
      )}

      {/* ── SUPERVISOR: grade form ── */}
      {isSupervisor && milestone.status === 'SUBMITTED' && !myGrade && (
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">מילוי טופס ציונים</h2>
            <button
              onClick={() => setShowGradeForm((v) => !v)}
              className="text-xs text-primary hover:underline"
            >
              {showGradeForm ? 'סגור' : 'פתח טופס'}
            </button>
          </div>
          {showGradeForm && (
            <DynamicGradeForm
              configId={milestone.config.id}
              onSubmit={handleGradeSubmit}
              isSaving={gradeMutation.isPending}
              error={gradeMutation.error}
            />
          )}
        </div>
      )}

      {isSupervisor && myGrade && (
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground mb-1">הציון שהגשת</p>
          <p className="text-2xl font-bold text-primary">{myGrade.totalScore.toFixed(1)}</p>
          {myGrade.comments && (
            <p className="text-sm text-muted-foreground mt-1">{myGrade.comments}</p>
          )}
        </div>
      )}

      {/* ── COORDINATOR: approve ── */}
      {isCoordinator && milestone.status === 'SUPERVISOR_GRADED' && (
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold">אישור רכז</h2>
          <p className="text-sm text-muted-foreground">
            המנחה הגיש ציון. לחץ לאשר ולחשב את הציון המשוקלל.
          </p>
          {approveMutation.isError && (
            <p className="text-xs text-destructive">
              {approveMutation.error?.response?.data?.message || 'שגיאה באישור'}
            </p>
          )}
          <button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {approveMutation.isPending ? 'מאשר...' : 'אשר אבן דרך'}
          </button>
          {approveMutation.isSuccess && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle size={14} /> אבן הדרך אושרה.
            </p>
          )}
        </div>
      )}

      {/* ── COORDINATOR: assign examiners ── */}
      {showAssignPanel && (
        <AssignExaminersPanel
          milestoneId={milestoneId}
          projectId={projectId}
          assignments={assignments}
        />
      )}

      {/* ── COORDINATOR: schedule defense ── */}
      {showDefensePanel && (
        <ScheduleDefensePanel
          milestoneId={milestoneId}
          projectId={projectId}
          defense={defense}
        />
      )}

      {/* ── EXAMINER: grade form ── */}
      {isExaminer &&
        ['EXAMINER_ASSIGNED', 'DEFENSE_SCHEDULED'].includes(milestone.status) &&
        !myGrade && (
          <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">מילוי טופס ציונים (בוחן)</h2>
              <button
                onClick={() => setShowGradeForm((v) => !v)}
                className="text-xs text-primary hover:underline"
              >
                {showGradeForm ? 'סגור' : 'פתח טופס'}
              </button>
            </div>
            {showGradeForm && (
              <DynamicGradeForm
                configId={milestone.config.id}
                onSubmit={handleGradeSubmit}
                isSaving={gradeMutation.isPending}
                error={gradeMutation.error}
              />
            )}
          </div>
        )}

      {isExaminer && myGrade && (
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground mb-1">הציון שהגשת</p>
          <p className="text-2xl font-bold text-primary">{myGrade.totalScore.toFixed(1)}</p>
          {myGrade.comments && (
            <p className="text-sm text-muted-foreground mt-1">{myGrade.comments}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Assign Examiners Panel ───────────────────────────────────────────────────

function AssignExaminersPanel({ milestoneId, projectId, assignments }) {
  const { data: examiners = [] } = useExaminers();
  const createMutation = useCreateAssignment(projectId);
  const deleteMutation = useDeleteAssignment(projectId, milestoneId);
  const [selectedId, setSelectedId] = useState('');

  const assignedIds = new Set(assignments.map((a) => a.examinerId));
  const available = examiners.filter((e) => !assignedIds.has(e.id));

  const handleAssign = () => {
    if (!selectedId) return;
    createMutation.mutate(
      { milestoneId, examinerId: selectedId },
      { onSuccess: () => setSelectedId('') }
    );
  };

  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <UserPlus size={15} className="text-muted-foreground" />
        <h2 className="text-sm font-semibold">הקצאת בוחנים</h2>
        <span className="text-xs text-muted-foreground">({assignments.length}/2)</span>
      </div>

      {assignments.length > 0 && (
        <div className="space-y-1">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5">
              <span>{a.examiner.firstName} {a.examiner.lastName}</span>
              <button
                onClick={() => deleteMutation.mutate(a.id)}
                disabled={deleteMutation.isPending}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {assignments.length < 2 && (
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input-base flex-1 text-sm"
          >
            <option value="">בחר בוחן...</option>
            {available.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedId || createMutation.isPending}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            הוסף
          </button>
        </div>
      )}

      {assignments.length >= 2 && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle size={13} /> שני בוחנים הוקצו.
        </p>
      )}

      {createMutation.isError && (
        <p className="text-xs text-destructive">
          {createMutation.error?.response?.data?.message || 'שגיאה בהקצאה'}
        </p>
      )}
    </div>
  );
}

// ─── Schedule Defense Panel ───────────────────────────────────────────────────

function ScheduleDefensePanel({ milestoneId, projectId, defense }) {
  const createMutation = useCreateDefense(projectId, milestoneId);
  const updateMutation = useUpdateDefense(projectId, milestoneId);
  const deleteMutation = useDeleteDefense(projectId, milestoneId);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    scheduledAt: '',
    location: '',
    meetingUrl: '',
  });

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleCreate = () => {
    createMutation.mutate(
      { milestoneId, ...form },
      { onSuccess: () => setForm({ scheduledAt: '', location: '', meetingUrl: '' }) }
    );
  };

  const handleUpdate = () => {
    updateMutation.mutate(
      { id: defense.id, ...form },
      { onSuccess: () => setEditing(false) }
    );
  };

  if (defense && !editing) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">הגנה מתוזמנת</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setForm({
                  scheduledAt: defense.scheduledAt.slice(0, 16),
                  location: defense.location ?? '',
                  meetingUrl: defense.meetingUrl ?? '',
                });
                setEditing(true);
              }}
              className="text-xs text-primary hover:underline"
            >
              עריכה
            </button>
            <button
              onClick={() => {
                if (confirm('לבטל את ההגנה?')) deleteMutation.mutate(defense.id);
              }}
              className="text-xs text-destructive hover:underline"
            >
              ביטול
            </button>
          </div>
        </div>
        <p className="text-sm">{new Date(defense.scheduledAt).toLocaleString('he-IL')}</p>
        {defense.location && <p className="text-xs text-muted-foreground">{defense.location}</p>}
        {defense.meetingUrl && (
          <a
            href={defense.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            <ExternalLink size={11} /> קישור לפגישה
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock size={15} className="text-muted-foreground" />
        <h2 className="text-sm font-semibold">{editing ? 'עדכון הגנה' : 'תיאום הגנה'}</h2>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">תאריך ושעה</label>
          <input
            type="datetime-local"
            className="input-base mt-0.5"
            value={form.scheduledAt}
            onChange={set('scheduledAt')}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">מיקום (אופציונלי)</label>
          <input
            type="text"
            className="input-base mt-0.5"
            value={form.location}
            onChange={set('location')}
            placeholder="חדר 301..."
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">קישור Zoom/Meet (אופציונלי)</label>
          <input
            type="url"
            className="input-base mt-0.5"
            value={form.meetingUrl}
            onChange={set('meetingUrl')}
            placeholder="https://..."
          />
        </div>
      </div>

      {(createMutation.isError || updateMutation.isError) && (
        <p className="text-xs text-destructive">
          {(createMutation.error || updateMutation.error)?.response?.data?.message || 'שגיאה'}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={editing ? handleUpdate : handleCreate}
          disabled={!form.scheduledAt || createMutation.isPending || updateMutation.isPending}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {createMutation.isPending || updateMutation.isPending ? 'שומר...' : editing ? 'עדכן' : 'קבע הגנה'}
        </button>
        {editing && (
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-1.5 rounded-md text-sm border border-border hover:bg-muted transition-colors"
          >
            ביטול
          </button>
        )}
      </div>
    </div>
  );
}
