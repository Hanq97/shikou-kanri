import { App, Button } from 'antd';
import { LogOut, Monitor } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/authStore';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { SettingsLayout } from '../components/SettingsLayout';

export function SessionsPage(): JSX.Element {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  function confirmLogoutAll(): void {
    modal.confirm({
      title: t('settings.sessions.logoutAllConfirmTitle'),
      content: t('settings.sessions.logoutAllConfirmContent'),
      okText: t('settings.sessions.logoutAllButton'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        setSubmitting(true);
        try {
          const res = await authApi.logoutAll();
          message.success(t('settings.sessions.logoutAllSuccess', { count: res.revokedCount }));
          await logout();
          navigate('/login', { replace: true });
        } catch (err) {
          message.error(mapErrorMessage(extractApiError(err)));
          setSubmitting(false);
        }
      },
    });
  }

  return (
    <SettingsLayout
      title={t('settings.sessions.title')}
      description={t('settings.sessions.description')}
    >
      <div className="flex items-start gap-4 p-4 bg-zinc-50 border border-zinc-200/70 rounded-lg mb-6">
        <Monitor className="text-zinc-500 shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="m-0 text-sm font-medium text-zinc-900">
            {t('settings.sessions.currentTitle')}
          </p>
          <p className="m-0 mt-0.5 text-sm text-zinc-500">{t('settings.sessions.currentHint')}</p>
        </div>
      </div>

      <div className="border border-zinc-200/70 rounded-lg p-4">
        <h3 className="m-0 text-sm font-semibold text-zinc-900">
          {t('settings.sessions.logoutAllTitle')}
        </h3>
        <p className="m-0 mt-1 text-sm text-zinc-500 leading-relaxed">
          {t('settings.sessions.logoutAllHint')}
        </p>
        <Button
          danger
          icon={<LogOut size={14} />}
          loading={submitting}
          onClick={confirmLogoutAll}
          className="!mt-3"
        >
          {t('settings.sessions.logoutAllButton')}
        </Button>
      </div>
    </SettingsLayout>
  );
}
