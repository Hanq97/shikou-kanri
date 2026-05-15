import { Briefcase, Calculator, ClipboardCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/shared/hooks/useAuth';
import { AppLayout } from '@/shared/components/layout/AppLayout';

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
  const { i18n } = useTranslation();
  return (
    <div className="bg-white border border-zinc-200/70 rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="m-0 text-sm text-zinc-500">{label}</p>
          <p className="m-0 mt-2 text-3xl font-semibold text-zinc-900 tracking-tight tabular-nums">
            {value.toLocaleString(i18n.language)}
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
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user) return <></>;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="m-0 text-2xl font-semibold text-zinc-900 tracking-tight">
            {t('home.welcome', { name: user.name })}
          </h1>
          <p className="m-0 mt-1 text-sm text-zinc-500">{t('home.intro')}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={t('home.stats.ongoingProjects')}
            value={0}
            suffix={t('common.items')}
            tone="brand"
            icon={<Briefcase size={20} />}
          />
          <StatCard
            label={t('home.stats.monthlyEstimates')}
            value={0}
            suffix={t('common.items')}
            tone="violet"
            icon={<Calculator size={20} />}
          />
          <StatCard
            label={t('home.stats.aftercare')}
            value={0}
            suffix={t('common.items')}
            tone="amber"
            icon={<ClipboardCheck size={20} />}
          />
          <StatCard
            label={t('home.stats.obCustomers')}
            value={0}
            suffix={t('common.people')}
            tone="emerald"
            icon={<Users size={20} />}
          />
        </div>

        {/* Account info card */}
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200/70">
            <h2 className="m-0 text-base font-semibold text-zinc-900">{t('home.accountInfo')}</h2>
          </div>
          <dl className="divide-y divide-zinc-100">
            <div className="px-6 py-3.5 grid grid-cols-3 gap-4 text-sm">
              <dt className="text-zinc-500">{t('home.labelEmail')}</dt>
              <dd className="col-span-2 m-0 text-zinc-900 font-medium">{user.email}</dd>
            </div>
            <div className="px-6 py-3.5 grid grid-cols-3 gap-4 text-sm">
              <dt className="text-zinc-500">{t('home.labelRole')}</dt>
              <dd className="col-span-2 m-0 text-zinc-900 font-medium">
                {t(`users.roles.${user.role}`)}
              </dd>
            </div>
            <div className="px-6 py-3.5 grid grid-cols-3 gap-4 text-sm">
              <dt className="text-zinc-500">{t('home.label2Fa')}</dt>
              <dd className="col-span-2 m-0">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.twoFaEnabled
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200'
                  }`}
                >
                  {user.twoFaEnabled ? t('home.twoFaEnabled') : t('home.twoFaDisabled')}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-center text-xs text-zinc-400 m-0 pt-4">{t('home.footer')}</p>
      </div>
    </AppLayout>
  );
}
