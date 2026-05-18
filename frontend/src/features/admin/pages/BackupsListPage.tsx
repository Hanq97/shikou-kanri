/**
 * MOCK-IMPL — see DEMO-TO-PROD-MIGRATION.md#f8-04
 * All backup data is hardcoded for demo. Productize by wiring to AWS RDS
 * automated snapshot API + S3 cross-region replication state.
 */
import { App as AntdApp, Button, Modal, Popconfirm, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Database, DownloadCloud, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ResponsiveTable } from '@/shared/components/responsive/ResponsiveTable';

interface MockBackup {
  id: string;
  backupAt: string;
  type: 'auto' | 'manual';
  sizeGB: number;
  status: 'success' | 'failed' | 'in_progress';
  retentionDays: number;
}

const INITIAL_BACKUPS: MockBackup[] = [
  {
    id: 'b-001',
    backupAt: '2026-05-19T03:00:00Z',
    type: 'auto',
    sizeGB: 4.2,
    status: 'success',
    retentionDays: 30,
  },
  {
    id: 'b-002',
    backupAt: '2026-05-18T03:00:00Z',
    type: 'auto',
    sizeGB: 4.1,
    status: 'success',
    retentionDays: 30,
  },
  {
    id: 'b-003',
    backupAt: '2026-05-17T03:00:00Z',
    type: 'auto',
    sizeGB: 4.0,
    status: 'success',
    retentionDays: 30,
  },
  {
    id: 'b-004',
    backupAt: '2026-05-16T12:30:00Z',
    type: 'manual',
    sizeGB: 4.0,
    status: 'success',
    retentionDays: 90,
  },
  {
    id: 'b-005',
    backupAt: '2026-05-16T03:00:00Z',
    type: 'auto',
    sizeGB: 3.9,
    status: 'success',
    retentionDays: 30,
  },
  {
    id: 'b-006',
    backupAt: '2026-05-15T03:00:00Z',
    type: 'auto',
    sizeGB: 3.9,
    status: 'failed',
    retentionDays: 30,
  },
  {
    id: 'b-007',
    backupAt: '2026-05-14T03:00:00Z',
    type: 'auto',
    sizeGB: 3.8,
    status: 'success',
    retentionDays: 30,
  },
  {
    id: 'b-008',
    backupAt: '2026-05-13T03:00:00Z',
    type: 'auto',
    sizeGB: 3.8,
    status: 'success',
    retentionDays: 30,
  },
];

const STATUS_COLOR: Record<MockBackup['status'], string> = {
  success: 'green',
  failed: 'red',
  in_progress: 'blue',
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function BackupsListPage(): JSX.Element {
  const { t } = useTranslation();
  const { message, modal } = AntdApp.useApp();
  const [backups, setBackups] = useState<MockBackup[]>(INITIAL_BACKUPS);
  const [running, setRunning] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalGB = backups.reduce((acc, b) => acc + b.sizeGB, 0);
    const ok = backups.filter((b) => b.status === 'success').length;
    return { total: backups.length, totalGB: totalGB.toFixed(1), ok };
  }, [backups]);

  async function runBackup(): Promise<void> {
    setRunning(true);
    const inProgress: MockBackup = {
      id: `b-${Date.now()}`,
      backupAt: new Date().toISOString(),
      type: 'manual',
      sizeGB: 0,
      status: 'in_progress',
      retentionDays: 90,
    };
    setBackups((prev) => [inProgress, ...prev]);
    await delay(3000);
    setBackups((prev) =>
      prev.map((b) => (b.id === inProgress.id ? { ...b, status: 'success', sizeGB: 4.2 } : b)),
    );
    setRunning(false);
    message.success(t('backups.runSuccess'));
  }

  async function restore(row: MockBackup): Promise<void> {
    setRestoringId(row.id);
    await delay(5000);
    setRestoringId(null);
    modal.success({
      title: t('backups.restoreCompleted'),
      content: t('backups.restoreCompletedDetail', { date: row.backupAt }),
    });
  }

  const columns: ColumnsType<MockBackup> = [
    {
      title: t('backups.columns.backupAt'),
      dataIndex: 'backupAt',
      key: 'backupAt',
      width: 180,
      render: (v: string) => (
        <span className="tabular-nums">{v.replace('T', ' ').slice(0, 16)}</span>
      ),
    },
    {
      title: t('backups.columns.type'),
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t2: MockBackup['type']) => (
        <Tag color={t2 === 'manual' ? 'blue' : 'default'}>{t(`backups.type.${t2}`)}</Tag>
      ),
    },
    {
      title: t('backups.columns.size'),
      dataIndex: 'sizeGB',
      key: 'size',
      width: 100,
      render: (v: number) => (v > 0 ? `${v.toFixed(1)} GB` : '—'),
    },
    {
      title: t('backups.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: MockBackup['status']) => (
        <Tag color={STATUS_COLOR[s]}>{t(`backups.status.${s}`)}</Tag>
      ),
    },
    {
      title: t('backups.columns.retention'),
      dataIndex: 'retentionDays',
      key: 'retention',
      width: 100,
      render: (v: number) => `${v}日`,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      render: (_, row) =>
        row.status === 'success' ? (
          <Popconfirm
            title={t('backups.restoreConfirmTitle')}
            description={t('backups.restoreConfirmDesc')}
            okText={t('backups.restoreConfirmOk')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => restore(row)}
          >
            <Button size="small" icon={<RotateCcw size={14} />} loading={restoringId === row.id}>
              {t('backups.restore')}
            </Button>
          </Popconfirm>
        ) : (
          <span className="text-zinc-400">—</span>
        ),
    },
  ];

  const mobileCard = (row: MockBackup): JSX.Element => (
    <div className="bg-white border border-zinc-200/70 rounded-xl p-4 shadow-card space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold tabular-nums">
          {row.backupAt.replace('T', ' ').slice(0, 16)}
        </span>
        <Tag color={STATUS_COLOR[row.status]}>{t(`backups.status.${row.status}`)}</Tag>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>
          <Tag color={row.type === 'manual' ? 'blue' : 'default'}>
            {t(`backups.type.${row.type}`)}
          </Tag>
          {row.sizeGB > 0 ? `${row.sizeGB.toFixed(1)} GB` : '—'}
        </span>
        <span className="text-zinc-500 text-xs">
          {t('backups.columns.retention')}: {row.retentionDays}日
        </span>
      </div>
      {row.status === 'success' && (
        <Popconfirm
          title={t('backups.restoreConfirmTitle')}
          description={t('backups.restoreConfirmDesc')}
          okText={t('backups.restoreConfirmOk')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
          onConfirm={() => restore(row)}
        >
          <Button
            size="small"
            block
            icon={<RotateCcw size={14} />}
            loading={restoringId === row.id}
          >
            {t('backups.restore')}
          </Button>
        </Popconfirm>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-brand-600" />
            <Typography.Title level={4} className="!m-0">
              {t('backups.title')}
            </Typography.Title>
          </div>
          <Button
            type="primary"
            icon={<DownloadCloud size={14} />}
            onClick={runBackup}
            loading={running}
          >
            {t('backups.runNow')}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white border border-zinc-200/70 rounded-xl p-4 shadow-card">
            <div className="text-xs text-zinc-500">{t('backups.stat.total')}</div>
            <div className="text-2xl font-semibold tabular-nums">{stats.total}</div>
          </div>
          <div className="bg-white border border-zinc-200/70 rounded-xl p-4 shadow-card">
            <div className="text-xs text-zinc-500">{t('backups.stat.totalSize')}</div>
            <div className="text-2xl font-semibold tabular-nums">{stats.totalGB} GB</div>
          </div>
          <div className="bg-white border border-zinc-200/70 rounded-xl p-4 shadow-card">
            <div className="text-xs text-zinc-500">{t('backups.stat.ok')}</div>
            <div className="text-2xl font-semibold tabular-nums text-emerald-600">{stats.ok}</div>
          </div>
        </div>

        <ResponsiveTable<MockBackup>
          columns={columns}
          dataSource={backups}
          rowKey="id"
          mobileCard={mobileCard}
          pagination={false}
        />

        <Modal
          open={false}
          footer={null}
          title={t('backups.restoreCompleted')}
          onCancel={() => {}}
        />
      </div>
    </AppLayout>
  );
}
