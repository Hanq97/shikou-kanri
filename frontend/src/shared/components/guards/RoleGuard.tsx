import { Button, Result } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '@/shared/api/types';
import { AppLayout } from '@/shared/components/layout/AppLayout';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const allowed = (() => {
    if (!user) return false;
    if (roles) return roles.includes(user.role);
    if (deny) return !deny.includes(user.role);
    return true;
  })();
  if (!allowed) {
    if (fallback) return <>{fallback}</>;
    return (
      <AppLayout>
        <Result
          status="403"
          title={t('common.errors.forbiddenTitle')}
          subTitle={t('common.errors.forbiddenSubtitle')}
          extra={
            <Button type="primary" onClick={() => navigate('/home')}>
              {t('common.backToHome')}
            </Button>
          }
        />
      </AppLayout>
    );
  }
  return <>{children}</>;
}
