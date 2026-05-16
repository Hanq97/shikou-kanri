import { createBrowserRouter, Navigate } from 'react-router-dom';
import { UsersListPage } from '@/features/admin/pages/UsersListPage';
import { AcceptInvitePage } from '@/features/auth/pages/AcceptInvitePage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { TwoFaChallengePage } from '@/features/auth/pages/TwoFaChallengePage';
import { HomePage } from '@/features/home/HomePage';
import { NotFoundPage } from '@/features/misc/NotFoundPage';
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

  { path: '*', element: <NotFoundPage /> },
]);
