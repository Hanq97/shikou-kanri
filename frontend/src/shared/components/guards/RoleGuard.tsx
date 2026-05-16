import { Result } from 'antd';
import type { ReactNode } from 'react';
import type { UserRole } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/authStore';

interface RoleGuardProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps): JSX.Element {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) {
    return (
      <>
        {fallback ?? (
          <Result
            status="403"
            title="アクセス権限がありません"
            subTitle="この画面を表示する権限がありません。"
          />
        )}
      </>
    );
  }
  return <>{children}</>;
}
