import { DatePicker, Input, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { History } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi, type AuditLogSummary } from '@/shared/api/audit-logs.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ResponsiveTable } from '@/shared/components/responsive/ResponsiveTable';

function ChangesCell({ changes }: { changes: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  if (!changes || Object.keys(changes).length === 0) {
    return <span className="text-zinc-400">—</span>;
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-brand-700 hover:underline cursor-pointer bg-transparent border-0 p-0"
      >
        {open ? '▾ hide' : '▸ show'} ({Object.keys(changes).length})
      </button>
      {open && (
        <pre className="mt-2 p-2 bg-zinc-50 rounded text-xs text-zinc-700 overflow-auto max-w-md max-h-40">
          {JSON.stringify(changes, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function AuditLogsListPage(): JSX.Element {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', search, action, dateRange, page],
    queryFn: () =>
      auditLogsApi.list({
        search: search || undefined,
        action: action || undefined,
        from: dateRange?.[0] ? dateRange[0].startOf('day').toISOString() : undefined,
        to: dateRange?.[1] ? dateRange[1].endOf('day').toISOString() : undefined,
        page,
        pageSize,
      }),
  });

  const columns: ColumnsType<AuditLogSummary> = [
    {
      title: t('audit.columns.occurredAt'),
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 180,
      render: (v: string) => (
        <span className="tabular-nums text-sm">{v.replace('T', ' ').slice(0, 19)}</span>
      ),
    },
    {
      title: t('audit.columns.actor'),
      key: 'actor',
      width: 200,
      render: (_, row) =>
        row.actorName ? (
          <div>
            <div className="font-medium">{row.actorName}</div>
            <div className="text-xs text-zinc-500">{row.actorEmail}</div>
          </div>
        ) : (
          <span className="text-zinc-400">{t('audit.system')}</span>
        ),
    },
    {
      title: t('audit.columns.action'),
      dataIndex: 'action',
      key: 'action',
      width: 240,
      render: (v: string) => {
        const label = t(`audit.actions.${v}`, { defaultValue: v });
        return <Tag color="blue">{label}</Tag>;
      },
    },
    {
      title: t('audit.columns.entity'),
      key: 'entity',
      width: 180,
      render: (_, row) =>
        row.entityType ? (
          <div className="text-xs">
            <span className="text-zinc-500">
              {t(`audit.entities.${row.entityType}`, {
                defaultValue: row.entityType,
              })}
              :
            </span>{' '}
            <span className="font-mono">{row.entityId?.slice(0, 8)}</span>
          </div>
        ) : (
          <span className="text-zinc-400">—</span>
        ),
    },
    {
      title: t('audit.columns.ip'),
      dataIndex: 'ipAddress',
      key: 'ip',
      width: 120,
      render: (v: string | null) => (v ? <span className="font-mono text-xs">{v}</span> : '—'),
    },
    {
      title: t('audit.columns.changes'),
      key: 'changes',
      render: (_, row) => <ChangesCell changes={row.changes} />,
    },
  ];

  const mobileCard = (row: AuditLogSummary): JSX.Element => (
    <div className="bg-white border border-zinc-200/70 rounded-xl p-3 shadow-card space-y-1">
      <div className="flex items-center justify-between">
        <Tag color="blue">{row.action}</Tag>
        <span className="text-xs text-zinc-500 tabular-nums">
          {row.occurredAt.replace('T', ' ').slice(0, 16)}
        </span>
      </div>
      <div className="text-sm">
        {row.actorName ?? <span className="text-zinc-400">{t('audit.system')}</span>}
      </div>
      {row.entityType && (
        <div className="text-xs text-zinc-500">
          {row.entityType}: <span className="font-mono">{row.entityId?.slice(0, 8)}</span>
        </div>
      )}
      <ChangesCell changes={row.changes} />
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History size={20} className="text-brand-600" />
          <Typography.Title level={4} className="!m-0">
            {t('audit.title')}
          </Typography.Title>
        </div>

        <div className="bg-white border border-zinc-200/70 rounded-xl p-4 shadow-card">
          <Space wrap size="middle">
            <Input.Search
              placeholder={t('audit.searchPlaceholder')}
              allowClear
              onSearch={setSearch}
              style={{ width: 260 }}
            />
            <Select
              placeholder={t('audit.filterAction')}
              allowClear
              value={action}
              onChange={setAction}
              style={{ minWidth: 240 }}
              options={(data?.distinctActions ?? []).map((a) => ({
                value: a,
                label: a,
              }))}
              showSearch
            />
            <DatePicker.RangePicker
              value={dateRange ?? undefined}
              onChange={(v) => setDateRange(v ? [v[0] ?? null, v[1] ?? null] : null)}
            />
          </Space>
        </div>

        <ResponsiveTable<AuditLogSummary>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={isLoading}
          mobileCard={mobileCard}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            onChange: setPage,
          }}
        />
      </div>
    </AppLayout>
  );
}
