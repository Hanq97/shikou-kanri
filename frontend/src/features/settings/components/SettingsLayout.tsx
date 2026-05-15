import { KeyRound, Monitor, ShieldCheck, UserCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';

const TABS = [
  { key: 'profile', to: '/settings/profile', label: 'プロフィール', icon: UserCircle },
  { key: 'password', to: '/settings/password', label: 'パスワード', icon: KeyRound },
  { key: '2fa', to: '/settings/2fa', label: '2要素認証', icon: ShieldCheck },
  { key: 'sessions', to: '/settings/sessions', label: 'セッション', icon: Monitor },
];

interface SettingsLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsLayout({ title, description, children }: SettingsLayoutProps): JSX.Element {
  const location = useLocation();

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="m-0 text-2xl font-semibold text-zinc-900 tracking-tight">アカウント設定</h1>
          <p className="m-0 mt-1 text-sm text-zinc-500">
            プロフィール、パスワード、2要素認証、セッションを管理
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          {/* Side tabs */}
          <nav className="space-y-0.5">
            {TABS.map((tab) => {
              const active = location.pathname.startsWith(tab.to);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Content */}
          <div>
            <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200/70">
                <h2 className="m-0 text-base font-semibold text-zinc-900">{title}</h2>
                {description && (
                  <p className="m-0 mt-1 text-sm text-zinc-500">{description}</p>
                )}
              </div>
              <div className="p-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
