import { App as AntdApp, Button, DatePicker, Input, Space, Switch, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { Wrench } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  aftercareApi,
  type MaintenanceScheduleType,
  type OBCustomerSummary,
} from '@/shared/api/aftercare.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ResponsiveTable } from '@/shared/components/responsive/ResponsiveTable';

const SCHEDULE_TYPE_BADGE: Record<MaintenanceScheduleType, string> = {
  one_year: '1年',
  three_year: '3年',
  five_year: '5年',
  ten_year: '10年',
  custom: '臨時',
};

export function ObCustomersListPage(): JSX.Element {
  const { t } = useTranslation();
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['aftercare', 'ob-customers', search, overdueOnly, dateRange, page],
    queryFn: () =>
      aftercareApi.listOBCustomers({
        search: search || undefined,
        overdueOnly: overdueOnly || undefined,
        nextMaintenanceFrom: dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
        nextMaintenanceTo: dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
        page,
        pageSize,
      }),
  });

  const batchMutation = useMutation({
    mutationFn: () => aftercareApi.runBatch(),
    onSuccess: (result) => {
      message.success(
        t('aftercare.batch.success', {
          notified: result.notifiedCount,
          sent: result.emailsSent,
          overdue: result.overdueMarkedCount,
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ['aftercare'] });
    },
    onError: () => {
      message.error(t('aftercare.batch.failed'));
    },
  });

  const renderNextMaintenance = (row: OBCustomerSummary): JSX.Element => {
    if (!row.nextMaintenance) {
      return <span className="text-zinc-400">{t('aftercare.none')}</span>;
    }
    const { scheduledDate, scheduleType, isOverdue, daysUntil } = row.nextMaintenance;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium tabular-nums">{scheduledDate}</span>
        <Tag color="default" className="!m-0">
          {SCHEDULE_TYPE_BADGE[scheduleType]}
        </Tag>
        {isOverdue ? (
          <Tag color="red" className="!m-0">
            {t('aftercare.overdueByDays', { days: Math.abs(daysUntil) })}
          </Tag>
        ) : daysUntil <= 14 ? (
          <Tag color="orange" className="!m-0">
            {t('aftercare.dueInDays', { days: daysUntil })}
          </Tag>
        ) : null}
      </div>
    );
  };

  const columns: ColumnsType<OBCustomerSummary> = [
    {
      title: t('customer.columns.name'),
      dataIndex: 'name',
      key: 'name',
      render: (_, row) => (
        <div>
          <Link to={`/customers/${row.id}`} className="font-medium text-brand-700 hover:underline">
            {row.name}
          </Link>
          {row.nameKana && <div className="text-xs text-zinc-500">{row.nameKana}</div>}
        </div>
      ),
    },
    {
      title: t('customer.columns.phone'),
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (v) => v ?? <span className="text-zinc-400">—</span>,
    },
    {
      title: t('aftercare.list.propertyCount'),
      dataIndex: 'propertyCount',
      key: 'propertyCount',
      width: 100,
      align: 'center',
    },
    {
      title: t('aftercare.list.nextMaintenance'),
      key: 'nextMaintenance',
      render: (_, row) => renderNextMaintenance(row),
    },
    {
      title: t('aftercare.list.openRecords'),
      dataIndex: 'openRecordCount',
      key: 'openRecordCount',
      width: 120,
      align: 'center',
      render: (count: number) =>
        count > 0 ? <Tag color="red">{count}</Tag> : <span className="text-zinc-400">0</span>,
    },
  ];

  const mobileCard = (row: OBCustomerSummary): JSX.Element => (
    <div className="bg-white border border-zinc-200/70 rounded-xl p-4 shadow-card space-y-2">
      <div className="flex items-start justify-between">
        <Link to={`/customers/${row.id}`} className="font-semibold text-brand-700">
          {row.name}
        </Link>
        <span className="text-xs text-zinc-500">
          {t('aftercare.list.propertyCount')}: {row.propertyCount}
        </span>
      </div>
      {row.phone && <div className="text-sm text-zinc-600">{row.phone}</div>}
      <div className="text-sm">{renderNextMaintenance(row)}</div>
      {row.openRecordCount > 0 && (
        <Tag color="red">
          {t('aftercare.list.openRecords')}: {row.openRecordCount}
        </Tag>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Wrench size={20} className="text-brand-600" />
            <Typography.Title level={4} className="!m-0">
              {t('aftercare.list.title')}
            </Typography.Title>
          </div>
          <Button
            type="primary"
            onClick={() => batchMutation.mutate()}
            loading={batchMutation.isPending}
          >
            {t('aftercare.batch.run')}
          </Button>
        </div>

        <div className="bg-white border border-zinc-200/70 rounded-xl p-4 shadow-card">
          <Space wrap size="middle">
            <Input.Search
              placeholder={t('aftercare.list.searchPlaceholder')}
              allowClear
              onSearch={setSearch}
              style={{ width: 260 }}
            />
            <DatePicker.RangePicker
              value={dateRange ?? undefined}
              onChange={(v) => setDateRange(v ? [v[0] ?? null, v[1] ?? null] : null)}
              placeholder={[t('aftercare.list.dateFrom'), t('aftercare.list.dateTo')]}
            />
            <Space>
              <Switch checked={overdueOnly} onChange={setOverdueOnly} />
              <span>{t('aftercare.list.overdueOnly')}</span>
            </Space>
            {dayjs().format('YYYY-MM-DD') && (
              <span className="text-xs text-zinc-500">
                {t('aftercare.list.today')}: {dayjs().format('YYYY-MM-DD')}
              </span>
            )}
          </Space>
        </div>

        <ResponsiveTable<OBCustomerSummary>
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
            showSizeChanger: false,
          }}
        />
      </div>
    </AppLayout>
  );
}
