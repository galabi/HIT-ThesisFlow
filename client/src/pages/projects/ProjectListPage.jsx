import { Link } from 'react-router-dom';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects.js';
import { useAuthStore } from '../../store/auth.store.js';

const STATUS_CONFIG = {
  ACTIVE: { label: 'פעיל', color: 'bg-green-100 text-green-700', Icon: Clock },
  COMPLETED: { label: 'הושלם', color: 'bg-blue-100 text-blue-700', Icon: CheckCircle },
  TERMINATED: { label: 'הופסק', color: 'bg-red-100 text-red-600', Icon: XCircle },
};

const MILESTONE_STATUS_COLOR = {
  PENDING: 'bg-slate-200',
  SUBMITTED: 'bg-blue-400',
  SUPERVISOR_GRADED: 'bg-amber-400',
  COORDINATOR_APPROVED: 'bg-green-400',
  EXAMINER_ASSIGNED: 'bg-blue-400',
  EXAMINER_GRADED: 'bg-green-400',
  COMPLETED: 'bg-green-600',
};

export function ProjectListPage() {
  const { data: projects = [], isLoading } = useProjects();
  const user = useAuthStore((s) => s.user);

  if (isLoading) return <div className="p-6 text-muted-foreground">טוען...</div>;

  return (
    <div className="space-y-5 p-6">
      <h1 className="text-2xl font-bold">פרויקטים</h1>

      {projects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          אין פרויקטים להצגה.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} userId={user?.id} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, userId }) {
  const { label, color } = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.ACTIVE;
  const students = project.students.map((ps) => ps.student);
  const completedMilestones = project.milestones.filter((m) =>
    ['COORDINATOR_APPROVED', 'EXAMINER_GRADED', 'COMPLETED'].includes(m.status)
  ).length;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h2 className="font-semibold text-base leading-snug line-clamp-2">{project.title}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${color}`}>{label}</span>
      </div>

      <p className="text-xs text-muted-foreground mb-1">
        מנחה: {project.supervisor.firstName} {project.supervisor.lastName}
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        {students.map((s) => `${s.firstName} ${s.lastName}`).join(', ')}
      </p>

      {project.finalGrade !== null && project.finalGrade !== undefined && (
        <p className="text-sm font-bold text-primary mb-2">
          ציון סופי: {project.finalGrade.toFixed(1)}
        </p>
      )}

      {/* Milestone progress dots */}
      {project.milestones.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {completedMilestones}/{project.milestones.length} אבני דרך
          </p>
          <div className="flex gap-1">
            {project.milestones.map((m) => (
              <div
                key={m.id}
                title={m.config.name}
                className={`h-2 flex-1 rounded-full ${MILESTONE_STATUS_COLOR[m.status] ?? 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3">{project.faculty?.name}</p>
    </Link>
  );
}
