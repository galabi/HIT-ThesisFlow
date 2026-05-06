import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, FileText, CheckCircle } from 'lucide-react';
import { useProject, useSubmitMilestone, useCoordinatorApprove, useSubmitGrade, useMyGrade } from '../../hooks/useProjects.js';
import { useAuthStore } from '../../store/auth.store.js';
import { FileUploadZone } from '../../components/documents/FileUploadZone.jsx';
import { DynamicGradeForm } from '../../components/grades/DynamicGradeForm.jsx';

const STATUS_LABELS = {
  PENDING: 'ממתין להגשה',
  SUBMITTED: 'הוגש — ממתין לציון',
  SUPERVISOR_GRADED: 'ציון מנחה — ממתין לאישור',
  COORDINATOR_APPROVED: 'אושר על ידי רכז',
  EXAMINER_ASSIGNED: 'בוחנים הוקצו',
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

  const handleStudentSubmit = () => {
    submitMutation.mutate(
      { documentIds },
      { onSuccess: () => setDocumentIds([]) }
    );
  };

  const handleGradeSubmit = (data) => {
    gradeMutation.mutate(data, { onSuccess: () => setShowGradeForm(false) });
  };

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
    </div>
  );
}
