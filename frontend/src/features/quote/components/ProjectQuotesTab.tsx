import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Spin } from 'antd';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { quotesApi, type QuoteSummary } from '@/shared/api/quotes.api';
import { useAuth } from '@/shared/hooks/useAuth';
import { formatJpy } from '@/shared/utils/format';
import { QuoteStatusTag } from './QuoteStatusTag';

interface Props {
  projectId: string;
}

export function ProjectQuotesTab({ projectId }: Props): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', 'project', projectId],
    queryFn: () =>
      quotesApi.list({
        projectId,
        page: 1,
        pageSize: 50,
        sortBy: 'issuedAt',
        sortOrder: 'desc',
      }),
  });

  const canCreate =
    user?.role === 'system_admin' || user?.role === 'manager' || user?.role === 'employee';

  if (isLoading) {
    return (
      <div className="grid place-items-center py-10">
        <Spin />
      </div>
    );
  }

  const quotes = data?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold text-zinc-700">
          {t('quote.projectTab.heading', { count: data?.total ?? 0 })}
        </h3>
        {canCreate && (
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => navigate(`/estimates/new?projectId=${projectId}`)}
          >
            {t('quote.createButton')}
          </Button>
        )}
      </div>

      {quotes.length === 0 ? (
        <Empty description={t('quote.projectTab.empty')} />
      ) : (
        <div className="space-y-2">
          {quotes.map((q: QuoteSummary) => (
            <button
              key={q.id}
              type="button"
              onClick={() => navigate(`/estimates/${q.id}`)}
              className="w-full text-left bg-white border border-zinc-200/70 rounded-lg p-3 sm:p-4 hover:bg-zinc-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-mono text-sm text-brand-600">
                  {q.quoteNumber}
                  {q.versionNo > 1 && <span className="text-zinc-400 ml-1">v{q.versionNo}</span>}
                </span>
                <QuoteStatusTag status={q.status} />
              </div>
              <span className="text-xs text-zinc-500 truncate">{q.counterPartyName}</span>
              <span className="text-xs text-zinc-500 font-mono shrink-0">
                {dayjs(q.issuedAt).format('YYYY/MM/DD')}
              </span>
              <span className="font-mono text-sm text-zinc-900 shrink-0">
                {formatJpy(q.amountTotal)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
