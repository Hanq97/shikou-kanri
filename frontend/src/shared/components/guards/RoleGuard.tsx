import { Result } from 'antd';
import type { ReactNode } from 'react';
import type { UserRole } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/authStore';

interface RoleGuardProps {
  /** Allow only these roles (whitelist). Mutually exclusive with `deny`. */
  roles?: UserRole[];
  /** Deny these roles (blacklist). Mutually exclusive with `roles`. */
  deny?: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ roles, deny, children, fallback }: RoleGuardProps): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const allowed = (() => {
    if (!user) return false;
    if (roles) return roles.includes(user.role);
    if (deny) return !deny.includes(user.role);
    return true;
  })();
  if (!allowed) {
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
