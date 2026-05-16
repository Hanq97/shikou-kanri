import { Spin } from 'antd';
import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';

interface PublicOnlyProps {
  children: ReactNode;
}

export function PublicOnly({ children }: PublicOnlyProps): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const loadCurrentUser = useAuthStore((s) => s.loadCurrentUser);

  useEffect(() => {
    if (!isInitialized) void loadCurrentUser();
  }, [isInitialized, loadCurrentUser]);

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (user) return <Navigate to="/home" replace />;
  return <>{children}</>;
}
