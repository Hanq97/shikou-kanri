import { Spin } from 'antd';
import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const loadCurrentUser = useAuthStore((s) => s.loadCurrentUser);
  const location = useLocation();

  useEffect(() => {
    if (!isInitialized) {
      void loadCurrentUser();
    }
  }, [isInitialized, loadCurrentUser]);

  if (!isInitialized || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Force password change flow
  if (user.forcePasswordChange && location.pathname !== '/settings/password') {
    return <Navigate to="/settings/password?force=1" replace />;
  }

  // Force 2FA enrollment for admin
  if (
    user.role === 'system_admin' &&
    user.forceTwoFaEnrollment &&
    location.pathname !== '/settings/2fa'
  ) {
    return <Navigate to="/settings/2fa?force=1" replace />;
  }

  return <>{children}</>;
}
