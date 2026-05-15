import { App, Button } from 'antd';
import { LogOut, Monitor } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/shared/api/auth.api';
import { extractApiError } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/authStore';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { SettingsLayout } from '../components/SettingsLayout';

export function SessionsPage(): JSX.Element {
  const { message, modal } = App.useApp();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  function confirmLogoutAll(): void {
    modal.confirm({
      title: 'すべてのセッションをログアウト',
      content:
        'このアカウントの全デバイスのセッションが無効化されます。再度ログインが必要です。続行しますか？',
      okText: 'すべてログアウト',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        setSubmitting(true);
        try {
          const res = await authApi.logoutAll();
          message.success(`${res.revokedCount} 件のセッションを無効化しました`);
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
    <SettingsLayout title="セッション" description="アクティブなセッションの管理">
      <div className="flex items-start gap-4 p-4 bg-zinc-50 border border-zinc-200/70 rounded-lg mb-6">
        <Monitor className="text-zinc-500 shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="m-0 text-sm font-medium text-zinc-900">現在のセッション</p>
          <p className="m-0 mt-0.5 text-sm text-zinc-500">
            このブラウザでログイン中です。詳細なセッション一覧は次期バージョンで実装予定。
          </p>
        </div>
      </div>

      <div className="border border-zinc-200/70 rounded-lg p-4">
        <h3 className="m-0 text-sm font-semibold text-zinc-900">すべてのセッションをログアウト</h3>
        <p className="m-0 mt-1 text-sm text-zinc-500 leading-relaxed">
          パスワードが漏洩した可能性がある場合や、不審なログインがあった場合に使用します。
          全デバイスのセッションが無効化され、再度ログインが必要になります。
        </p>
        <Button
          danger
          icon={<LogOut size={14} />}
          loading={submitting}
          onClick={confirmLogoutAll}
          className="!mt-3"
        >
          すべてログアウト
        </Button>
      </div>
    </SettingsLayout>
  );
}
