import { HardHat } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-50 via-white to-brand-50/40 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white grid place-items-center shadow-elevated mb-3">
            <HardHat size={28} strokeWidth={2} />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 m-0 tracking-tight">
            {t('brand.appName')}
          </h1>
          <p className="text-xs text-zinc-500 mt-1 m-0">{t('brand.tagline')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-zinc-200/70 shadow-card px-7 py-8">
          {title && (
            <h2 className="text-lg font-semibold text-zinc-900 m-0 mb-1 tracking-tight">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-zinc-500 mb-6 mt-1 leading-relaxed">{subtitle}</p>
          )}
          {!subtitle && title && <div className="mb-6" />}
          {children}
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6 m-0">{t('brand.copyright')}</p>
      </div>
    </div>
  );
}
