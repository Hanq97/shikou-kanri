import { createBrowserRouter, Navigate } from 'react-router-dom';
import { UsersListPage } from '@/features/admin/pages/UsersListPage';
import { AcceptInvitePage } from '@/features/auth/pages/AcceptInvitePage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { TwoFaChallengePage } from '@/features/auth/pages/TwoFaChallengePage';
import { CustomerDetailPage } from '@/features/customer/pages/CustomerDetailPage';
import { CustomerFormPage } from '@/features/customer/pages/CustomerFormPage';
import { CustomerImportPage } from '@/features/customer/pages/CustomerImportPage';
import { CustomersListPage } from '@/features/customer/pages/CustomersListPage';
import { HomePage } from '@/features/home/HomePage';
import { NotFoundPage } from '@/features/misc/NotFoundPage';
import { ProjectDetailPage } from '@/features/project/pages/ProjectDetailPage';
import { ProjectFormPage } from '@/features/project/pages/ProjectFormPage';
import { ProjectsListPage } from '@/features/project/pages/ProjectsListPage';
import { QuoteDetailPage } from '@/features/quote/pages/QuoteDetailPage';
import { QuoteFormPage } from '@/features/quote/pages/QuoteFormPage';
import { QuotesListPage } from '@/features/quote/pages/QuotesListPage';
import { ChangePasswordPage } from '@/features/settings/pages/ChangePasswordPage';
import { ProfilePage } from '@/features/settings/pages/ProfilePage';
import { SessionsPage } from '@/features/settings/pages/SessionsPage';
import { TwoFaPage } from '@/features/settings/pages/TwoFaPage';
import { AuthGuard } from '@/shared/components/guards/AuthGuard';
import { PublicOnly } from '@/shared/components/guards/PublicOnly';
import { RoleGuard } from '@/shared/components/guards/RoleGuard';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/home" replace /> },

  // Public routes (auto-redirect to /home if already authenticated)
  {
    path: '/login',
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: '/login/2fa',
    element: (
      <PublicOnly>
        <TwoFaChallengePage />
      </PublicOnly>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicOnly>
        <ForgotPasswordPage />
      </PublicOnly>
    ),
  },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },

  // Authenticated routes
  {
    path: '/home',
    element: (
      <AuthGuard>
        <HomePage />
      </AuthGuard>
    ),
  },

  // Settings
  { path: '/settings', element: <Navigate to="/settings/profile" replace /> },
  {
    path: '/settings/profile',
    element: (
      <AuthGuard>
        <ProfilePage />
      </AuthGuard>
    ),
  },
  {
    path: '/settings/password',
    element: (
      <AuthGuard>
        <ChangePasswordPage />
      </AuthGuard>
    ),
  },
  {
    path: '/settings/2fa',
    element: (
      <AuthGuard>
        <TwoFaPage />
      </AuthGuard>
    ),
  },
  {
    path: '/settings/sessions',
    element: (
      <AuthGuard>
        <SessionsPage />
      </AuthGuard>
    ),
  },

  // F1: Customers
  {
    path: '/customers',
    element: (
      <AuthGuard>
        <RoleGuard deny={['invited']}>
          <CustomersListPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/customers/new',
    element: (
      <AuthGuard>
        <RoleGuard deny={['invited']}>
          <CustomerFormPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/customers/:id',
    element: (
      <AuthGuard>
        <RoleGuard deny={['invited']}>
          <CustomerDetailPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/customers/:id/edit',
    element: (
      <AuthGuard>
        <RoleGuard deny={['invited']}>
          <CustomerFormPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },

  // F1: Projects (invited filtered server-side)
  {
    path: '/projects',
    element: (
      <AuthGuard>
        <ProjectsListPage />
      </AuthGuard>
    ),
  },
  {
    path: '/projects/new',
    element: (
      <AuthGuard>
        <RoleGuard deny={['invited']}>
          <ProjectFormPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/projects/:id',
    element: (
      <AuthGuard>
        <ProjectDetailPage />
      </AuthGuard>
    ),
  },
  {
    path: '/projects/:id/edit',
    element: (
      <AuthGuard>
        <RoleGuard deny={['invited']}>
          <ProjectFormPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },

  // F2: Quotes (URL alias /estimates, BE uses /quotes — keeps nav i18n key 見積管理)
  {
    path: '/estimates',
    element: (
      <AuthGuard>
        <RoleGuard roles={['system_admin', 'manager', 'employee']}>
          <QuotesListPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/estimates/new',
    element: (
      <AuthGuard>
        <RoleGuard roles={['system_admin', 'manager', 'employee']}>
          <QuoteFormPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/estimates/:id',
    element: (
      <AuthGuard>
        <RoleGuard roles={['system_admin', 'manager', 'employee']}>
          <QuoteDetailPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/estimates/:id/edit',
    element: (
      <AuthGuard>
        <RoleGuard roles={['system_admin', 'manager', 'employee']}>
          <QuoteFormPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },

  // Admin
  {
    path: '/admin/users',
    element: (
      <AuthGuard>
        <RoleGuard roles={['system_admin', 'manager']}>
          <UsersListPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/admin/customer-import',
    element: (
      <AuthGuard>
        <RoleGuard roles={['system_admin']}>
          <CustomerImportPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },

  { path: '*', element: <NotFoundPage /> },
]);
