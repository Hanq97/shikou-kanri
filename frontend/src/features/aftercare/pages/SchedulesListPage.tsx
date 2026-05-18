import {
  App as AntdApp,
  Button,
  DatePicker,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  aftercareApi,
  type MaintenanceScheduleStatus,
  type MaintenanceScheduleSummary,
  type MaintenanceScheduleType,
} from '@/shared/api/aftercare.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ResponsiveTable } from '@/shared/components/responsive/ResponsiveTable';

const STATUS_COLOR: Record<MaintenanceScheduleStatus, string> = {
  pending: 'blue',
  notified: 'orange',
  overdue: 'red',
  completed: 'green',
  cancelled: 'default',
};

const SCHEDULE_TYPE_LABEL: Record<MaintenanceScheduleType, string> = {
  one_year: '1年',
  three_year: '3年',
  five_year: '5年',
  ten_year: '10年',
  custom: '臨時',
};

const STATUS_OPTIONS: MaintenanceScheduleStatus[] = [
  'pending',
  'notified',
  'overdue',
  'completed',
  'cancelled',
];

export function SchedulesListPage(): JSX.Element {
  const { t } = useTranslation();
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<MaintenanceScheduleStatus[]>([
    'pending',
    'notified',
    'overdue',
  ]);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['aftercare', 'schedules', statusFilter, dateRange, page],
    queryFn: () =>
      aftercareApi.listSchedules({
        status: statusFilter.length > 0 ? statusFilter : undefined,
        scheduledFrom: dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
        scheduledTo: dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
        page,
        pageSize,
      }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => aftercareApi.markScheduleCompleted(id),
    onSuccess: () => {
      message.success(t('aftercare.schedules.completedSuccess'));
      void queryClient.invalidateQueries({ queryKey: ['aftercare'] });
    },
    onError: () => message.error(t('aftercare.schedules.completedFailed')),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => aftercareApi.cancelSchedule(id),
    onSuccess: () => {
      message.success(t('aftercare.schedules.cancelledSuccess'));
      void queryClient.invalidateQueries({ queryKey: ['aftercare'] });
    },
    onError: () => message.error(t('aftercare.schedules.cancelledFailed')),
  });

  const columns: ColumnsType<MaintenanceScheduleSummary> = [
    {
      title: t('aftercare.schedules.scheduledDate'),
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 130,
      render: (date, row) => (
        <div>
          <div className="font-medium tabular-nums">{date}</div>
          <div className="text-xs text-zinc-500">
            {row.daysUntil >= 0
              ? t('aftercare.dueInDays', { days: row.daysUntil })
              : t('aftercare.overdueByDays', { days: Math.abs(row.daysUntil) })}
          </div>
        </div>
      ),
    },
    {
      title: t('aftercare.schedules.type'),
      dataIndex: 'scheduleType',
      key: 'scheduleType',
      width: 80,
      render: (type: MaintenanceScheduleType) => <Tag>{SCHEDULE_TYPE_LABEL[type]}</Tag>,
    },
    {
      title: t('aftercare.schedules.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: MaintenanceScheduleStatus) => (
        <Tag color={STATUS_COLOR[status]}>{t(`aftercare.scheduleStatus.${status}`)}</Tag>
      ),
    },
    {
      title: t('customer.columns.name'),
      key: 'customer',
      render: (_, row) => (
        <Link to={`/customers/${row.customerId}`} className="text-brand-700 hover:underline">
          {row.customerName}
        </Link>
      ),
    },
    {
      title: t('aftercare.schedules.property'),
      dataIndex: 'propertyAddress',
      key: 'property',
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      render: (_, row) =>
        row.status === 'completed' || row.status === 'cancelled' ? (
          <span className="text-zinc-400">—</span>
        ) : (
          <Space size="small">
            <Popconfirm
              title={t('aftercare.schedules.confirmComplete')}
              onConfirm={() => completeMutation.mutate(row.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button size="small" type="primary">
                {t('aftercare.schedules.markCompleted')}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={t('aftercare.schedules.confirmCancel')}
              onConfirm={() => cancelMutation.mutate(row.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button size="small" danger>
                {t('common.cancel')}
              </Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  const mobileCard = (row: MaintenanceScheduleSummary): JSX.Element => (
    <div className="bg-white border border-zinc-200/70 rounded-xl p-4 shadow-card space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-semibold tabular-nums">{row.scheduledDate}</span>
        <Tag color={STATUS_COLOR[row.status]}>{t(`aftercare.scheduleStatus.${row.status}`)}</Tag>
      </div>
      <div className="text-sm">
        <Link
          to={`/customers/${row.customerId}`}
          className="text-brand-700 hover:underline font-medium"
        >
          {row.customerName}
        </Link>
        <Tag className="!ml-2">{SCHEDULE_TYPE_LABEL[row.scheduleType]}</Tag>
      </div>
      <div className="text-xs text-zinc-500">{row.propertyAddress}</div>
      <div className="text-xs">
        {row.daysUntil >= 0
          ? t('aftercare.dueInDays', { days: row.daysUntil })
          : t('aftercare.overdueByDays', { days: Math.abs(row.daysUntil) })}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-brand-600" />
          <Typography.Title level={4} className="!m-0">
            {t('aftercare.schedules.title')}
          </Typography.Title>
        </div>

        <div className="bg-white border border-zinc-200/70 rounded-xl p-4 shadow-card">
          <Space wrap size="middle">
            <Select<MaintenanceScheduleStatus[]>
              mode="multiple"
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder={t('aftercare.schedules.status')}
              style={{ minWidth: 280 }}
              options={STATUS_OPTIONS.map((s) => ({
                value: s,
                label: t(`aftercare.scheduleStatus.${s}`),
              }))}
              allowClear
            />
            <DatePicker.RangePicker
              value={dateRange ?? undefined}
              onChange={(v) => setDateRange(v ? [v[0] ?? null, v[1] ?? null] : null)}
            />
          </Space>
        </div>

        <ResponsiveTable<MaintenanceScheduleSummary>
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
