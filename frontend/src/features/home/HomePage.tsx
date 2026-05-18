import { Briefcase, Calculator, ClipboardCheck, Users, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@/shared/api/dashboard.api';
import { useAuth } from '@/shared/hooks/useAuth';
import { AppLayout } from '@/shared/components/layout/AppLayout';

interface StatCardProps {
  label: string;
  value: number;
  suffix: string;
  icon: ReactNode;
  tone: 'brand' | 'emerald' | 'amber' | 'violet' | 'red';
  to?: string;
}

const TONE_CLASS: Record<StatCardProps['tone'], string> = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  red: 'bg-red-50 text-red-600',
};

function StatCard({ label, value, suffix, icon, tone, to }: StatCardProps): JSX.Element {
  const { i18n } = useTranslation();
  const inner = (
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
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function jpyFormat(amount: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return `¥${n.toLocaleString('ja-JP')}`;
}

export function HomePage(): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(),
    refetchOnWindowFocus: false,
  });

  if (!user) return <></>;

  const counts = data?.counts ?? {
    activeCustomers: 0,
    activeProjects: 0,
    pendingQuotes: 0,
    overdueAftercare: 0,
  };

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
            value={counts.activeProjects}
            suffix={t('common.items')}
            tone="brand"
            icon={<Briefcase size={20} />}
            to="/projects"
          />
          <StatCard
            label={t('home.stats.pendingQuotes')}
            value={counts.pendingQuotes}
            suffix={t('common.items')}
            tone="violet"
            icon={<Calculator size={20} />}
            to="/estimates"
          />
          <StatCard
            label={t('home.stats.overdueAftercare')}
            value={counts.overdueAftercare}
            suffix={t('common.items')}
            tone="red"
            icon={<ClipboardCheck size={20} />}
            to="/aftercare/schedules"
          />
          <StatCard
            label={t('home.stats.activeCustomers')}
            value={counts.activeCustomers}
            suffix={t('common.people')}
            tone="emerald"
            icon={<Users size={20} />}
            to="/customers"
          />
        </div>

        {/* Alerts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Aftercare due 14d */}
          <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-200/70 flex items-center justify-between">
              <h2 className="m-0 text-base font-semibold text-zinc-900 flex items-center gap-2">
                <Wrench size={16} className="text-brand-600" />
                {t('home.alerts.aftercareDue14d')}
              </h2>
              <Link to="/aftercare/schedules" className="text-xs text-brand-700 hover:underline">
                {t('home.alerts.viewAll')}
              </Link>
            </div>
            <div className="divide-y divide-zinc-100">
              {isLoading ? (
                <div className="px-5 py-4 text-sm text-zinc-400">{t('common.loading')}</div>
              ) : (data?.alerts.aftercareDue14d ?? []).length === 0 ? (
                <div className="px-5 py-4 text-sm text-zinc-400">{t('home.alerts.empty')}</div>
              ) : (
                data?.alerts.aftercareDue14d.map((a) => (
                  <Link
                    key={a.scheduleId}
                    to={`/customers/${a.customerId}`}
                    className="block px-5 py-2.5 hover:bg-zinc-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate">
                          {a.customerName}
                        </div>
                        <div className="text-xs text-zinc-500 truncate">{a.propertyAddress}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-zinc-900 tabular-nums">
                          {a.scheduledDate}
                        </div>
                        <div className="text-xs text-amber-600">
                          {t('aftercare.dueInDays', { days: a.daysUntil })}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Pending quote approvals */}
          <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-200/70 flex items-center justify-between">
              <h2 className="m-0 text-base font-semibold text-zinc-900 flex items-center gap-2">
                <Calculator size={16} className="text-violet-600" />
                {t('home.alerts.pendingApprovals')}
              </h2>
              <Link to="/estimates" className="text-xs text-brand-700 hover:underline">
                {t('home.alerts.viewAll')}
              </Link>
            </div>
            <div className="divide-y divide-zinc-100">
              {isLoading ? (
                <div className="px-5 py-4 text-sm text-zinc-400">{t('common.loading')}</div>
              ) : (data?.alerts.pendingApprovals ?? []).length === 0 ? (
                <div className="px-5 py-4 text-sm text-zinc-400">{t('home.alerts.empty')}</div>
              ) : (
                data?.alerts.pendingApprovals.map((p) => (
                  <Link
                    key={p.quoteId}
                    to={`/estimates/${p.quoteId}`}
                    className="block px-5 py-2.5 hover:bg-zinc-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate">
                          {p.quoteNumber}
                          {p.projectName && (
                            <span className="text-zinc-500 ml-2">{p.projectName}</span>
                          )}
                        </div>
                        {p.customerName && (
                          <div className="text-xs text-zinc-500 truncate">{p.customerName}</div>
                        )}
                      </div>
                      <div className="text-sm font-medium text-zinc-900 tabular-nums shrink-0">
                        {jpyFormat(p.amountTotal)}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-200/70">
            <h2 className="m-0 text-base font-semibold text-zinc-900">
              {t('home.recentActivity')}
            </h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {isLoading ? (
              <div className="px-5 py-4 text-sm text-zinc-400">{t('common.loading')}</div>
            ) : (data?.recentActivity ?? []).length === 0 ? (
              <div className="px-5 py-4 text-sm text-zinc-400">{t('home.alerts.empty')}</div>
            ) : (
              data?.recentActivity.map((a, i) => {
                const content = (
                  <div className="px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-50">
                    <span className="text-sm text-zinc-700 truncate">{a.summary}</span>
                    <span className="text-xs text-zinc-400 tabular-nums shrink-0">
                      {a.timestamp.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                );
                return a.link ? (
                  <Link key={`${a.kind}-${i}`} to={a.link} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={`${a.kind}-${i}`}>{content}</div>
                );
              })
            )}
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400 m-0 pt-4">{t('home.footer')}</p>
      </div>
    </AppLayout>
  );
}
