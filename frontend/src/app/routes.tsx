import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AcceptInvitePage } from '@/features/auth/pages/AcceptInvitePage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { TwoFaChallengePage } from '@/features/auth/pages/TwoFaChallengePage';
import { HomePage } from '@/features/home/HomePage';
import { NotFoundPage } from '@/features/misc/NotFoundPage';
import { SettingsPlaceholderPage } from '@/features/misc/SettingsPlaceholderPage';
import { AuthGuard } from '@/shared/components/guards/AuthGuard';
import { PublicOnly } from '@/shared/components/guards/PublicOnly';

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
  {
    path: '/settings/profile',
    element: (
      <AuthGuard>
        <SettingsPlaceholderPage section="profile" />
      </AuthGuard>
    ),
  },
  {
    path: '/settings/2fa',
    element: (
      <AuthGuard>
        <SettingsPlaceholderPage section="2fa" />
      </AuthGuard>
    ),
  },
  {
    path: '/settings/sessions',
    element: (
      <AuthGuard>
        <SettingsPlaceholderPage section="sessions" />
      </AuthGuard>
    ),
  },

  { path: '*', element: <NotFoundPage /> },
]);
