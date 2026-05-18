import { useTranslation } from 'react-i18next';
import type { QuoteStatus } from '@/shared/api/quotes.api';

const STYLES: Record<QuoteStatus, string> = {
  draft: 'bg-zinc-50 text-zinc-700 ring-zinc-200',
  submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
  pending_admin: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  sent: 'bg-brand-50 text-brand-700 ring-brand-200',
  won: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  lost: 'bg-zinc-100 text-zinc-600 ring-zinc-300',
};

export function QuoteStatusTag({ status }: { status: QuoteStatus }): JSX.Element {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ring-1 ${STYLES[status]}`}
    >
      {t(`quote.status.${status}`)}
    </span>
  );
}
