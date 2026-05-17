import { Button } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuoteStatus, QuoteVersionRecord } from '@/shared/api/quotes.api';
import { formatJpy } from '@/shared/utils/format';
import { QuoteStatusTag } from './QuoteStatusTag';

interface SnapshotShape {
  quote?: {
    status?: QuoteStatus;
    amountTotal?: string | number;
    versionNo?: number;
  };
  lines?: unknown[];
}

function parseSnapshot(raw: unknown): SnapshotShape {
  if (!raw || typeof raw !== 'object') return {};
  return raw as SnapshotShape;
}

export function VersionHistoryItem({ v }: { v: QuoteVersionRecord }): JSX.Element {
  const { t } = useTranslation();
  const [showRaw, setShowRaw] = useState(false);
  const snap = parseSnapshot(v.snapshot);
  const status = snap.quote?.status;
  const amount = snap.quote?.amountTotal;
  const lineCount = snap.lines?.length ?? 0;

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">{t('quote.history.changeReason')}</dt>
        <dd className="text-zinc-900 font-medium">{v.changeReason}</dd>

        <dt className="text-zinc-500">{t('quote.history.changedBy')}</dt>
        <dd className="text-zinc-800">{v.changedBy?.name ?? '—'}</dd>

        <dt className="text-zinc-500">{t('quote.history.changedAt')}</dt>
        <dd className="text-zinc-800 font-mono text-xs">
          {dayjs(v.changedAt).format('YYYY/MM/DD HH:mm:ss')}
        </dd>

        {status && (
          <>
            <dt className="text-zinc-500">{t('quote.history.snapshotStatus')}</dt>
            <dd>
              <QuoteStatusTag status={status} />
            </dd>
          </>
        )}

        {amount !== undefined && (
          <>
            <dt className="text-zinc-500">{t('quote.history.snapshotAmount')}</dt>
            <dd className="text-zinc-900 font-mono">{formatJpy(amount as number | string)}</dd>
          </>
        )}

        {lineCount > 0 && (
          <>
            <dt className="text-zinc-500">{t('quote.history.snapshotLines')}</dt>
            <dd className="text-zinc-800">{t('quote.history.lineCount', { count: lineCount })}</dd>
          </>
        )}
      </dl>

      <div className="pt-2 border-t border-zinc-100">
        <Button size="small" type="text" onClick={() => setShowRaw((v) => !v)}>
          {showRaw ? t('quote.history.hideRaw') : t('quote.history.showRaw')}
        </Button>
        {showRaw && (
          <pre className="mt-2 text-xs bg-zinc-50 rounded p-3 overflow-x-auto max-h-80 overflow-y-auto font-mono">
            {JSON.stringify(v.snapshot, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
