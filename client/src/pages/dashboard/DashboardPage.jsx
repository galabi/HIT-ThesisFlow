import { useAuthStore } from '../../store/auth.store.js';
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

function StudentDashboard({ user }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">שלום, {user?.firstName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="פרויקטים פעילים" value="—" />
        <StatCard title="אבני דרך ממתינות" value="—" />
        <StatCard title="התראות חדשות" value="—" />
      </div>
      <p className="text-muted-foreground text-sm">
        עיין בהצעות הפרויקטים הזמינות ושלח מועמדות.
      </p>
    </div>
  );
}

function SupervisorDashboard({ user }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">שלום, ד"ר {user?.lastName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="הצעות פעילות" value="—" />
        <StatCard title="מועמדויות ממתינות" value="—" />
        <StatCard title="פרויקטים בניהול" value="—" />
      </div>
    </div>
  );
}

function ExaminerDashboard({ user }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">שלום, {user?.firstName}</h1>
      <StatCard title="פרויקטים לבחינה" value="—" />
    </div>
  );
}

function CoordinatorDashboard({ user }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">לוח בקרה — רכז פרויקטים</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="פרויקטים פעילים" value="—" />
        <StatCard title="ממתינים לאישור" value="—" />
        <StatCard title="הגנות מתוכננות" value="—" />
        <StatCard title="סטודנטים רשומים" value="—" />
      </div>
    </div>
  );
}

function SecretaryDashboard({ user }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">שלום, {user?.firstName}</h1>
      <StatCard title="פרויקטים בפקולטה" value="—" />
    </div>
  );
}

function DefaultDashboard() {
  return <h1 className="text-2xl font-bold">לוח בקרה</h1>;
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold mt-1 text-primary">{value}</p>
    </div>
  );
}
