import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Segmented, type MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Edit, LayoutGrid, List as ListIcon, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { extractApiError } from '@/shared/api/client';
import {
  projectsApi,
  type ListProjectsParams,
  type ProjectStatus,
  type ProjectSummary,
  type ProjectType,
} from '@/shared/api/projects.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ResponsiveTable } from '@/shared/components/responsive/ResponsiveTable';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { formatJpy } from '@/shared/utils/format';
import { ChangeStatusModal } from '../components/ChangeStatusModal';
import { KanbanBoard } from '../components/KanbanBoard';
import { ProjectFiltersPanel } from '../components/ProjectFiltersPanel';
import { ProjectStatusTag } from '../components/ProjectStatusTag';
import { ProjectTypeTag } from '../components/ProjectTypeTag';

type ViewMode = 'table' | 'kanban';

interface PendingTransition {
  project: ProjectSummary;
  target: Exclude<ProjectStatus, 'quoting'>;
}

export function ProjectsListPage(): JSX.Element {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [view, setView] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<ListProjectsParams>({
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [pendingTransition, setPendingTransition] = useState<PendingTransition | null>(null);

  const effectiveFilters: ListProjectsParams =
    view === 'kanban' ? { ...filters, page: 1, pageSize: 100 } : filters;

  const { data, isFetching } = useQuery({
    queryKey: ['projects', 'list', effectiveFilters],
    queryFn: () => projectsApi.list(effectiveFilters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.softDelete(id),
    onSuccess: () => {
      message.success(t('project.messages.deleted'));
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const isAdmin = currentUser?.role === 'system_admin';
  const canCreate = currentUser?.role !== 'invited';

  function confirmDelete(row: ProjectSummary): void {
    modal.confirm({
      title: t('project.confirms.deleteTitle'),
      content: t('project.confirms.deleteContent', {
        name: row.name,
        code: row.projectCode,
      }),
      okText: t('project.confirms.deleteOk'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => deleteMutation.mutate(row.id),
    });
  }

  function buildRowMenu(row: ProjectSummary): MenuProps['items'] {
    const items: MenuProps['items'] = [];
    if (canCreate) {
      items.push({
        key: 'edit',
        icon: <Edit size={14} />,
        label: t('common.edit'),
        onClick: () => navigate(`/projects/${row.id}/edit`),
      });
    }
    if (isAdmin) {
      items.push({ type: 'divider' });
      items.push({
        key: 'delete',
        icon: <Trash2 size={14} />,
        label: t('common.delete'),
        danger: true,
        onClick: () => confirmDelete(row),
      });
    }
    return items.length > 0
      ? items
      : [{ key: 'empty', disabled: true, label: t('common.noActions') }];
  }

  const columns: ColumnsType<ProjectSummary> = [
    {
      title: t('project.columns.code'),
      dataIndex: 'projectCode',
      key: 'projectCode',
      width: 120,
      render: (code: string, row) => (
        <button
          type="button"
          onClick={() => navigate(`/projects/${row.id}`)}
          className="bg-transparent border-0 p-0 cursor-pointer text-left font-mono text-sm text-brand-600 hover:text-brand-700 hover:underline"
        >
          {code}
        </button>
      ),
    },
    {
      title: t('project.columns.name'),
      dataIndex: 'name',
      key: 'name',
      render: (_: string, row) => (
        <button
          type="button"
          onClick={() => navigate(`/projects/${row.id}`)}
          className="bg-transparent border-0 p-0 cursor-pointer text-left"
        >
          <div className="font-medium text-zinc-900 hover:text-brand-600 transition-colors">
            {row.name}
          </div>
        </button>
      ),
    },
    {
      title: t('project.columns.customer'),
      key: 'customer',
      width: 180,
      render: (_, row) => (
        <button
          type="button"
          onClick={() => navigate(`/customers/${row.customer.id}`)}
          className="bg-transparent border-0 p-0 cursor-pointer text-left text-sm text-zinc-700 hover:text-brand-600"
        >
          {row.customer.name}
        </button>
      ),
    },
    {
      title: t('project.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: ProjectStatus) => <ProjectStatusTag status={status} />,
    },
    {
      title: t('project.columns.type'),
      dataIndex: 'projectType',
      key: 'projectType',
      width: 140,
      render: (type: ProjectType) => <ProjectTypeTag type={type} />,
    },
    {
      title: t('project.columns.owner'),
      key: 'owner',
      width: 140,
      render: (_, row) => <span className="text-sm text-zinc-700">{row.owner.name}</span>,
    },
    {
      title: t('project.columns.amountTotal'),
      dataIndex: 'amountTotal',
      key: 'amountTotal',
      width: 140,
      align: 'right',
      render: (amount: string | null) => (
        <span className="font-mono text-sm">{formatJpy(amount)}</span>
      ),
    },
    {
      title: t('project.columns.updatedAt'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (date: string) => (
        <span className="text-sm text-zinc-600">{dayjs(date).format('YYYY/MM/DD HH:mm')}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'right',
      render: (_, row) => (
        <Dropdown menu={{ items: buildRowMenu(row) }} trigger={['click']} placement="bottomRight">
          <button
            type="button"
            className="w-8 h-8 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer"
            aria-label={t('common.actions')}
          >
            <MoreVertical size={16} />
          </button>
        </Dropdown>
      ),
    },
  ];

  function renderMobileCard(row: ProjectSummary): JSX.Element {
    return (
      <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(`/projects/${row.id}`)}
            className="bg-transparent border-0 p-0 cursor-pointer text-left flex-1 min-w-0"
          >
            <div className="font-mono text-xs text-brand-600">{row.projectCode}</div>
            <div className="font-medium text-zinc-900 truncate mt-0.5">{row.name}</div>
            <div className="text-xs text-zinc-500 truncate">{row.customer.name}</div>
          </button>
          <Dropdown menu={{ items: buildRowMenu(row) }} trigger={['click']} placement="bottomRight">
            <button
              type="button"
              className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer shrink-0"
              aria-label={t('common.actions')}
            >
              <MoreVertical size={16} />
            </button>
          </Dropdown>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <ProjectStatusTag status={row.status} />
          <ProjectTypeTag type={row.projectType} />
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-zinc-600">
          <span className="truncate">{row.owner.name}</span>
          <span className="font-mono">{formatJpy(row.amountTotal)}</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="m-0 text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
              {t('project.title')}
            </h1>
            <p className="m-0 mt-1 text-sm text-zinc-500">{t('project.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Segmented<ViewMode>
              value={view}
              onChange={(v) => setView(v)}
              options={[
                {
                  value: 'table',
                  icon: <ListIcon size={14} />,
                  label: (
                    <span className="hidden sm:inline ml-1">{t('project.viewToggle.table')}</span>
                  ),
                },
                {
                  value: 'kanban',
                  icon: <LayoutGrid size={14} />,
                  label: (
                    <span className="hidden sm:inline ml-1">{t('project.viewToggle.kanban')}</span>
                  ),
                },
              ]}
            />
            {canCreate && (
              <Button
                type="primary"
                icon={<Plus size={14} />}
                onClick={() => navigate('/projects/new')}
              >
                {t('project.createButton')}
              </Button>
            )}
          </div>
        </div>

        <ProjectFiltersPanel value={filters} onChange={setFilters} />

        {view === 'table' ? (
          <div className="sm:bg-white sm:border sm:border-zinc-200/70 sm:rounded-xl sm:shadow-card sm:overflow-hidden">
            <ResponsiveTable<ProjectSummary>
              columns={columns}
              dataSource={data?.data ?? []}
              rowKey="id"
              loading={isFetching}
              mobileCard={renderMobileCard}
              mobileEmptyText={t('project.empty')}
              pagination={{
                current: filters.page,
                pageSize: filters.pageSize,
                total: data?.total ?? 0,
                showSizeChanger: true,
                showTotal: (total) => t('project.totalCount', { total }),
                onChange: (page, pageSize) => setFilters((f) => ({ ...f, page, pageSize })),
              }}
              size="middle"
              scroll={{ x: 1100 }}
            />
          </div>
        ) : (
          <KanbanBoard
            projects={data?.data ?? []}
            onTransitionRequest={(project, target) => setPendingTransition({ project, target })}
          />
        )}
      </div>

      {pendingTransition && (
        <ChangeStatusModal
          open
          projectId={pendingTransition.project.id}
          from={pendingTransition.project.status}
          to={pendingTransition.target}
          needsAmount={
            pendingTransition.target === 'received' &&
            pendingTransition.project.amountTotal === null
          }
          onClose={() => setPendingTransition(null)}
          onSuccess={() => {
            setPendingTransition(null);
            qc.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}
    </AppLayout>
  );
}
