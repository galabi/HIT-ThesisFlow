import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart2 } from 'lucide-react';
import { useProject, useGradeSummary } from '../../hooks/useProjects.js';
import { useAuthStore } from '../../store/auth.store.js';

const MILESTONE_STATUS = {
  PENDING: { label: 'ממתין', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
  SUBMITTED: { label: 'הוגש', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  SUPERVISOR_GRADED: { label: 'ציון מנחה', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  COORDINATOR_APPROVED: { label: 'אושר', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  EXAMINER_ASSIGNED: { label: 'בוחן הוקצה', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  EXAMINER_GRADED: { label: 'ציון בוחן', color: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  COMPLETED: { label: 'הושלם', color: 'bg-green-100 text-green-700', dot: 'bg-green-600' },
};

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: project, isLoading } = useProject(id);
  const { data: gradeSummary } = useGradeSummary(id);

  if (isLoading) return <div className="p-6 text-muted-foreground">טוען...</div>;
  if (!project) return <div className="p-6 text-muted-foreground">פרויקט לא נמצא.</div>;

  const students = project.students.map((ps) => ps.student);
  const canApprove = user?.role === 'PROJECT_COORDINATOR';

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/projects')}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
        >
          <ArrowRight size={18} />
        </button>
        <span className="text-sm text-muted-foreground">{project.faculty?.name}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">{project.title}</h1>
        <p className="text-sm text-muted-foreground">
          מנחה: {project.supervisor.firstName} {project.supervisor.lastName}
        </p>
        <p className="text-sm text-muted-foreground">
          סטודנטים: {students.map((s) => `${s.firstName} ${s.lastName}`).join(', ')}
        </p>
      </div>

      {/* Final grade */}
      {project.finalGrade !== null && project.finalGrade !== undefined && (
        <div className="bg-primary/8 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <BarChart2 size={20} className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">ציון ביניים משוקלל</p>
            <p className="text-2xl font-bold text-primary">{project.finalGrade.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Grade summary table */}
      {gradeSummary && gradeSummary.summary.length > 0 && (
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2 bg-slate-50 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground">סיכום ציונים</p>
          </div>
          {gradeSummary.summary.map((item) => (
            <div key={item.milestoneId} className="flex items-center gap-3 px-4 py-2 border-b border-border last:border-0 text-sm">
              <span className="flex-1">{item.name}</span>
              <span className="text-xs text-muted-foreground">{(item.weight * 100).toFixed(0)}%</span>
              <span className="font-medium w-12 text-left">
                {item.score !== null ? item.score.toFixed(1) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Milestones timeline */}
      <div>
        <h2 className="text-sm font-semibold mb-3">אבני דרך</h2>
        <div className="space-y-2">
          {project.milestones.map((milestone, idx) => {
            const cfg = MILESTONE_STATUS[milestone.status] ?? MILESTONE_STATUS.PENDING;
            return (
              <Link
                key={milestone.id}
                to={`/projects/${id}/milestones/${milestone.id}`}
                className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm font-medium">{milestone.config.name}</span>
                {milestone.deadline && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(milestone.deadline).toLocaleDateString('he-IL')}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
