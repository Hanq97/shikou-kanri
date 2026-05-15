import { Briefcase, Calculator, ClipboardCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { AppLayout } from '@/shared/components/layout/AppLayout';

const ROLE_DISPLAY: Record<string, string> = {
  system_admin: 'システム管理者',
  manager: 'マネージャー',
  employee: '社員',
  invited: '招待ユーザー',
};

interface StatCardProps {
  label: string;
  value: number;
  suffix: string;
  icon: ReactNode;
  tone: 'brand' | 'emerald' | 'amber' | 'violet';
}

const TONE_CLASS: Record<StatCardProps['tone'], string> = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
};

function StatCard({ label, value, suffix, icon, tone }: StatCardProps): JSX.Element {
  return (
    <div className="bg-white border border-zinc-200/70 rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="m-0 text-sm text-zinc-500">{label}</p>
          <p className="m-0 mt-2 text-3xl font-semibold text-zinc-900 tracking-tight tabular-nums">
            {value.toLocaleString('ja-JP')}
            <span className="text-sm font-normal text-zinc-500 ml-1">{suffix}</span>
          </p>
        </div>
        <div className={`w-10 h-10 rounded-lg grid place-items-center ${TONE_CLASS[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function HomePage(): JSX.Element {
  const { user } = useAuth();

  if (!user) return <></>;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="m-0 text-2xl font-semibold text-zinc-900 tracking-tight">
            ようこそ、{user.name}様
          </h1>
          <p className="m-0 mt-1 text-sm text-zinc-500">
            施工管理システムへログインしました。ダッシュボードのプレースホルダーです。
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="進行中の案件"
            value={0}
            suffix="件"
            tone="brand"
            icon={<Briefcase size={20} />}
          />
          <StatCard
            label="今月の見積"
            value={0}
            suffix="件"
            tone="violet"
            icon={<Calculator size={20} />}
          />
          <StatCard
            label="アフター通知"
            value={0}
            suffix="件"
            tone="amber"
            icon={<ClipboardCheck size={20} />}
          />
          <StatCard label="OB顧客" value={0} suffix="名" tone="emerald" icon={<Users size={20} />} />
        </div>

        {/* Account info card */}
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200/70">
            <h2 className="m-0 text-base font-semibold text-zinc-900">アカウント情報</h2>
          </div>
          <dl className="divide-y divide-zinc-100">
            <div className="px-6 py-3.5 grid grid-cols-3 gap-4 text-sm">
              <dt className="text-zinc-500">メールアドレス</dt>
              <dd className="col-span-2 m-0 text-zinc-900 font-medium">{user.email}</dd>
            </div>
            <div className="px-6 py-3.5 grid grid-cols-3 gap-4 text-sm">
              <dt className="text-zinc-500">ロール</dt>
              <dd className="col-span-2 m-0 text-zinc-900 font-medium">
                {ROLE_DISPLAY[user.role] ?? user.role}
              </dd>
            </div>
            <div className="px-6 py-3.5 grid grid-cols-3 gap-4 text-sm">
              <dt className="text-zinc-500">2要素認証</dt>
              <dd className="col-span-2 m-0">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.twoFaEnabled
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200'
                  }`}
                >
                  {user.twoFaEnabled ? '有効' : '無効'}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-center text-xs text-zinc-400 m-0 pt-4">
          F8-AUTH MVP — Phase 1 ダッシュボードは順次実装予定です
        </p>
      </div>
    </AppLayout>
  );
}
