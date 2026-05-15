import { Alert, Button } from 'antd';
import { ArrowLeft, Construction } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { AppLayout } from '@/shared/components/layout/AppLayout';

interface SettingsPlaceholderPageProps {
  /** Section identifier ('profile' | '2fa' | 'sessions'). */
  section: 'profile' | '2fa' | 'sessions';
}

const SECTION_TITLE: Record<string, string> = {
  profile: 'プロフィール設定',
  '2fa': '2要素認証設定',
  sessions: 'セッション管理',
};

const SECTION_SUB: Record<string, string> = {
  profile: 'パスワード変更とプロフィール情報の管理',
  '2fa': '2要素認証の有効化・無効化、バックアップコードの管理',
  sessions: 'アクティブなセッションの確認と削除',
};

export function SettingsPlaceholderPage({ section }: SettingsPlaceholderPageProps): JSX.Element {
  const { user } = useAuth();
  const isForceFlow =
    (section === 'profile' && user?.forcePasswordChange) ||
    (section === '2fa' && user?.forceTwoFaEnrollment);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-zinc-900 tracking-tight">
            {SECTION_TITLE[section]}
          </h1>
          <p className="m-0 mt-1 text-sm text-zinc-500">{SECTION_SUB[section]}</p>
        </div>

        {isForceFlow && (
          <Alert
            type="warning"
            message={
              section === 'profile'
                ? 'パスワードの変更が必要です（初回ログイン）。'
                : '管理者は2要素認証の設定が必要です。'
            }
            showIcon
          />
        )}

        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto mb-4 grid place-items-center">
            <Construction size={22} />
          </div>
          <h3 className="m-0 text-base font-semibold text-zinc-900">Phase P8 で実装予定</h3>
          <p className="m-0 mt-1.5 text-sm text-zinc-500 max-w-md mx-auto">
            この画面は Phase 1 (P7) では未実装です。 P8 (Settings + User Management UI)
            で本格的に実装されます。
          </p>
          <Link to="/home" className="inline-block mt-6">
            <Button icon={<ArrowLeft size={14} />}>ホームに戻る</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
