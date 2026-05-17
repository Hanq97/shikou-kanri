import { useQuery } from '@tanstack/react-query';
import { Button, Collapse, Spin } from 'antd';
import dayjs from 'dayjs';
import { ArrowLeft, Edit, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { quotesApi } from '@/shared/api/quotes.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { useAuth } from '@/shared/hooks/useAuth';
import { formatJpy } from '@/shared/utils/format';
import { QuoteStatusTag } from '../components/QuoteStatusTag';

export function QuoteDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quotes', 'detail', id],
    queryFn: () => quotesApi.get(id as string),
    enabled: Boolean(id),
  });

  const { data: versions } = useQuery({
    queryKey: ['quotes', 'versions', id],
    queryFn: () => quotesApi.listVersions(id as string),
    enabled: Boolean(id),
  });

  if (isLoading || !quote) {
    return (
      <AppLayout>
        <div className="grid place-items-center py-20">
          <Spin />
        </div>
      </AppLayout>
    );
  }

  const canEdit =
    quote.status === 'draft' &&
    (user?.role === 'system_admin' || user?.role === 'manager' || user?.role === 'employee');

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 transition-colors bg-transparent border-0 cursor-pointer shrink-0"
              aria-label={t('common.back')}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="m-0 text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight font-mono truncate">
                  {quote.quoteNumber}
                  {quote.versionNo > 1 && (
                    <span className="text-zinc-400 ml-2 text-base">v{quote.versionNo}</span>
                  )}
                </h1>
                <QuoteStatusTag status={quote.status} />
              </div>
              <p className="m-0 mt-1 text-sm text-zinc-500 truncate">
                {quote.project.projectCode} — {quote.project.name}
              </p>
            </div>
          </div>
          {canEdit && (
            <Button
              icon={<Edit size={14} />}
              onClick={() => navigate(`/estimates/${quote.id}/edit`)}
            >
              {t('common.edit')}
            </Button>
          )}
        </div>

        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label={t('quote.detail.labelCounterParty')} value={quote.counterPartyName} />
          <Field
            label={t('quote.detail.labelIssuedAt')}
            value={dayjs(quote.issuedAt).format('YYYY/MM/DD')}
          />
          <Field
            label={t('quote.detail.labelValidUntil')}
            value={quote.validUntil ? dayjs(quote.validUntil).format('YYYY/MM/DD') : '—'}
          />
          <Field
            label={t('quote.detail.labelQualifiedInvoiceNumber')}
            value={quote.qualifiedInvoiceNumber ?? '—'}
          />
          <Field
            label={t('quote.detail.labelAmountSubtotal')}
            value={formatJpy(quote.amountSubtotal)}
            mono
          />
          <Field label={t('quote.detail.labelAmountTax')} value={formatJpy(quote.amountTax)} mono />
          <Field
            label={t('quote.detail.labelAmountTotal')}
            value={formatJpy(quote.amountTotal)}
            mono
            highlight
          />
          {quote.approvedBy && (
            <Field
              label={t('quote.detail.labelApprovedBy')}
              value={`${quote.approvedBy.name} (${quote.approvedAt ? dayjs(quote.approvedAt).format('YYYY/MM/DD HH:mm') : ''})`}
            />
          )}
          {quote.notes && (
            <div className="sm:col-span-2">
              <div className="text-xs text-zinc-500 mb-1">{t('quote.detail.labelNotes')}</div>
              <div className="whitespace-pre-wrap text-zinc-800">{quote.notes}</div>
            </div>
          )}
        </div>

        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4 sm:p-6">
          <h2 className="m-0 text-base font-semibold text-zinc-800 mb-3">
            {t('quote.detail.linesTitle')}
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-200">
                  <th className="text-left py-2 pr-2">#</th>
                  <th className="text-left py-2 pr-2">{t('quote.line.itemName')}</th>
                  <th className="text-right py-2 pr-2">{t('quote.line.quantity')}</th>
                  <th className="text-left py-2 pr-2">{t('quote.line.unit')}</th>
                  <th className="text-right py-2 pr-2">{t('quote.line.unitPrice')}</th>
                  <th className="text-right py-2">{t('quote.line.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((l, i) => (
                  <tr key={l.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-2 text-zinc-500">{i + 1}</td>
                    <td className="py-2 pr-2">
                      <div className="text-zinc-900">{l.itemName}</div>
                      {l.isOptional && (
                        <span className="text-xs text-amber-600">{t('quote.line.optional')}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono">{l.quantity}</td>
                    <td className="py-2 pr-2 text-zinc-600">{l.unit}</td>
                    <td className="py-2 pr-2 text-right font-mono">{formatJpy(l.unitPrice)}</td>
                    <td className="py-2 text-right font-mono">{formatJpy(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {versions && versions.length > 0 && (
          <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <History size={16} className="text-zinc-500" />
              <h2 className="m-0 text-base font-semibold text-zinc-800">
                {t('quote.detail.versionsTitle', { count: versions.length })}
              </h2>
            </div>
            <Collapse
              ghost
              items={versions.map((v) => ({
                key: v.id,
                label: (
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-mono text-sm text-zinc-700">v{v.versionNo}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                        {t(`quote.changeType.${v.changeType}`)}
                      </span>
                      {v.reason && (
                        <span className="text-xs text-zinc-500 truncate">— {v.reason}</span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {dayjs(v.createdAt).format('YYYY/MM/DD HH:mm')}
                    </span>
                  </div>
                ),
                children: (
                  <pre className="text-xs bg-zinc-50 rounded p-3 overflow-x-auto max-h-80 overflow-y-auto">
                    {JSON.stringify(v.snapshotJson, null, 2)}
                  </pre>
                ),
              }))}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Field({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}): JSX.Element {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={`mt-0.5 ${mono ? 'font-mono' : ''} ${
          highlight ? 'text-lg font-semibold text-zinc-900' : 'text-zinc-800'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
