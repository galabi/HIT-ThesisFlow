import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store.js';
import { useProjects } from '../../hooks/useProjects.js';
import { useProposals, useApplicationsInbox } from '../../hooks/useProposals.js';
import { useNotificationStore } from '../../store/notification.store.js';
import { Role } from '@hit/shared';

const dashboardByRole = {
  [Role.STUDENT]: StudentDashboard,
  [Role.SUPERVISOR]: SupervisorDashboard,
  [Role.EXAMINER]: ExaminerDashboard,
  [Role.PROJECT_COORDINATOR]: CoordinatorDashboard,
  [Role.FACULTY_SECRETARY]: SecretaryDashboard,
};

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const Component = dashboardByRole[user?.role] || DefaultDashboard;
  return <Component user={user} />;
}

// ─── Student ──────────────────────────────────────────────────────────────────

function StudentDashboard({ user }) {
  const { data: projects = [] } = useProjects();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
  const pendingMilestones = projects.flatMap((p) => p.milestones ?? []).filter(
    (m) => m.status === 'PENDING'
  ).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">שלום, {user?.firstName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="פרויקטים פעילים" value={activeProjects} to="/projects" />
        <StatCard title="אבני דרך ממתינות" value={pendingMilestones} to="/projects" />
        <StatCard title="התראות שלא נקראו" value={unreadCount} to="/notifications" />
      </div>
      {activeProjects === 0 && (
        <p className="text-muted-foreground text-sm">
          עיין ב<Link to="/proposals" className="text-primary hover:underline">הצעות הפרויקטים</Link> הזמינות ושלח מועמדות.
        </p>
      )}
    </div>
  );
}

// ─── Supervisor ───────────────────────────────────────────────────────────────

function SupervisorDashboard({ user }) {
  const { data: proposals = [] } = useProposals();
  const { data: inbox = [] } = useApplicationsInbox();
  const { data: projects = [] } = useProjects();

  const myProposals = proposals.filter((p) => p.supervisorId === user?.id);
  const activeProposals = myProposals.filter((p) => p.status === 'PUBLISHED').length;
  const pendingApps = inbox.filter((a) => a.status === 'PENDING').length;
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">שלום, ד"ר {user?.lastName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="הצעות פעילות" value={activeProposals} to="/proposals" />
        <StatCard title="מועמדויות ממתינות" value={pendingApps} to="/proposals/inbox" />
        <StatCard title="פרויקטים בניהול" value={activeProjects} to="/projects" />
      </div>
    </div>
  );
}

// ─── Coordinator ──────────────────────────────────────────────────────────────

function CoordinatorDashboard({ user }) {
  const { data: projects = [] } = useProjects();

  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
  const pendingApproval = projects.flatMap((p) => p.milestones ?? []).filter(
    (m) => m.status === 'SUPERVISOR_GRADED'
  ).length;
  const scheduledDefenses = projects.flatMap((p) => p.milestones ?? []).filter(
    (m) => m.status === 'DEFENSE_SCHEDULED'
  ).length;
  const studentCount = new Set(
    projects.flatMap((p) => (p.students ?? []).map((ps) => ps.studentId ?? ps.student?.id))
  ).size;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">לוח בקרה — רכז פרויקטים</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="פרויקטים פעילים" value={activeProjects} to="/projects" />
        <StatCard title="ממתינים לאישורי" value={pendingApproval} to="/projects" />
        <StatCard title="הגנות מתוכננות" value={scheduledDefenses} to="/projects" />
        <StatCard title="סטודנטים" value={studentCount} to="/projects" />
      </div>
    </div>
  );
}

// ─── Examiner ────────────────────────────────────────────────────────────────

function ExaminerDashboard({ user }) {
  const { data: projects = [] } = useProjects();
  const assigned = projects.filter((p) => p.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">שלום, {user?.firstName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="פרויקטים לבחינה" value={assigned} to="/projects" />
      </div>
    </div>
  );
}

// ─── Secretary ───────────────────────────────────────────────────────────────

function SecretaryDashboard({ user }) {
  const { data: projects = [] } = useProjects();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">שלום, {user?.firstName}</h1>
      <StatCard title="פרויקטים בפקולטה" value={projects.length} to="/projects" />
    </div>
  );
}

function DefaultDashboard() {
  return <h1 className="text-2xl font-bold">לוח בקרה</h1>;
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ title, value, to }) {
  const inner = (
    <div className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold mt-1 text-primary">
        {value === undefined ? '—' : value}
      </p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
