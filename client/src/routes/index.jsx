import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { RoleGuard } from './RoleGuard.jsx';
import { AppShell } from '../components/layout/AppShell.jsx';
import { LoginPage } from '../pages/auth/LoginPage.jsx';
import { RegisterPage } from '../pages/auth/RegisterPage.jsx';
import { DashboardPage } from '../pages/dashboard/DashboardPage.jsx';
import { FacultyConfigPage } from '../pages/admin/FacultyConfigPage.jsx';
import { GradeFormBuilderPage } from '../pages/admin/GradeFormBuilderPage.jsx';
import { ProposalListPage } from '../pages/proposals/ProposalListPage.jsx';
import { ProposalDetailPage } from '../pages/proposals/ProposalDetailPage.jsx';
import { ProposalCreatePage } from '../pages/proposals/ProposalCreatePage.jsx';
import { ApplicationsInboxPage } from '../pages/proposals/ApplicationsInboxPage.jsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Proposals */}
        <Route path="proposals" element={<ProposalListPage />} />
        <Route path="proposals/new" element={
          <RoleGuard roles={['SUPERVISOR']}>
            <ProposalCreatePage />
          </RoleGuard>
        } />
        <Route path="proposals/inbox" element={
          <RoleGuard roles={['SUPERVISOR']}>
            <ApplicationsInboxPage />
          </RoleGuard>
        } />
        <Route path="proposals/:id" element={<ProposalDetailPage />} />

        {/* Admin routes — PROJECT_COORDINATOR only */}
        <Route
          path="admin/faculty"
          element={
            <RoleGuard roles={['PROJECT_COORDINATOR']}>
              <FacultyConfigPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/faculty/config/:configId/template"
          element={
            <RoleGuard roles={['PROJECT_COORDINATOR']}>
              <GradeFormBuilderPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
