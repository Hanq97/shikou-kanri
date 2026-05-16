import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Spin, Tabs, type MenuProps } from 'antd';
import dayjs from 'dayjs';
import { ArrowLeft, ArrowRightCircle, Edit, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { extractApiError } from '@/shared/api/client';
import { projectsApi, type ProjectStatus } from '@/shared/api/projects.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { formatJpy } from '@/shared/utils/format';
import { ChangeStatusModal } from '../components/ChangeStatusModal';
import { FolderListTab } from '../components/FolderListTab';
import { ProjectStatusTag } from '../components/ProjectStatusTag';
import { ProjectTypeTag } from '../components/ProjectTypeTag';
import { ReverseStatusModal } from '../components/ReverseStatusModal';

const FORWARD_TRANSITIONS: Record<ProjectStatus, Exclude<ProjectStatus, 'quoting'>[]> = {
  quoting: ['received', 'cancelled'],
  received: ['construction', 'cancelled'],
  construction: ['completed', 'cancelled'],
  completed: ['handed_over', 'cancelled'],
  handed_over: [],
  cancelled: [],
};

export function ProjectDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [changeStatusTo, setChangeStatusTo] = useState<Exclude<ProjectStatus, 'quoting'> | null>(
    null,
  );
  const [reverseOpen, setReverseOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', 'detail', id],
    queryFn: () => projectsApi.get(id!),
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: (pid: string) => projectsApi.softDelete(pid),
    onSuccess: () => {
      message.success(t('project.messages.deleted'));
      qc.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  function confirmDelete(): void {
    if (!project) return;
    modal.confirm({
      title: t('project.confirms.deleteTitle'),
      content: t('project.confirms.deleteContent', {
        name: project.name,
        code: project.projectCode,
      }),
      okText: t('project.confirms.deleteOk'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => deleteMutation.mutate(project.id),
    });
  }

  if (isLoading || !project) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  const isAdmin = currentUser?.role === 'system_admin';
  const isOwner = project.ownerUserId === currentUser?.id;
  const canEdit = isAdmin || currentUser?.role === 'manager' || isOwner;
  const canChangeStatus = canEdit;
  const availableTransitions = FORWARD_TRANSITIONS[project.status];

  const statusMenuItems: MenuProps['items'] = availableTransitions.map((to) => ({
    key: to,
    label: t(`project.status.${to}`),
    onClick: () => setChangeStatusTo(to),
  }));

  function onMutationSuccess(): void {
    qc.invalidateQueries({ queryKey: ['projects', 'detail', id] });
    qc.invalidateQueries({ queryKey: ['projects', 'list'] });
    setChangeStatusTo(null);
    setReverseOpen(false);
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600"
        >
          <ArrowLeft size={14} />
          {t('common.back')}
        </Link>

        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-sm text-brand-600">{project.projectCode}</span>
              <ProjectStatusTag status={project.status} />
              <ProjectTypeTag type={project.projectType} />
            </div>
            <h1 className="m-0 text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight break-words">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-zinc-600">
              <Link
                to={`/customers/${project.customer.id}`}
                className="text-zinc-700 hover:text-brand-600"
              >
                {project.customer.name}
              </Link>
              <span className="text-zinc-400">·</span>
              <span>{project.owner.name}</span>
              {project.amountTotal && (
                <>
                  <span className="text-zinc-400">·</span>
                  <span className="font-mono">{formatJpy(project.amountTotal)}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 flex-wrap">
            {canChangeStatus && availableTransitions.length > 0 && (
              <Dropdown
                menu={{ items: statusMenuItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button type="primary" icon={<ArrowRightCircle size={14} />}>
                  {t('project.actions.changeStatus')}
                </Button>
              </Dropdown>
            )}
            {isAdmin && (
              <Button icon={<RotateCcw size={14} />} onClick={() => setReverseOpen(true)}>
                {t('project.actions.reverseStatus')}
              </Button>
            )}
            {canEdit && (
              <Button
                icon={<Edit size={14} />}
                onClick={() => navigate(`/projects/${project.id}/edit`)}
              >
                {t('common.edit')}
              </Button>
            )}
            {isAdmin && (
              <Button danger icon={<Trash2 size={14} />} onClick={confirmDelete}>
                {t('common.delete')}
              </Button>
            )}
          </div>
        </div>

        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: t('project.tabs.overview'),
              children: (
                <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200/70">
                    <h2 className="m-0 text-base font-semibold text-zinc-900">
                      {t('project.detail.overviewTitle')}
                    </h2>
                  </div>
                  <dl className="divide-y divide-zinc-100">
                    {[
                      {
                        label: t('project.detail.labelProperty'),
                        value: project.property?.address ?? (
                          <span className="text-zinc-400">{t('project.detail.noProperty')}</span>
                        ),
                      },
                      {
                        label: t('project.detail.labelScheduleStart'),
                        value: project.scheduleStart
                          ? dayjs(project.scheduleStart).format('YYYY/MM/DD')
                          : '—',
                      },
                      {
                        label: t('project.detail.labelScheduleEnd'),
                        value: project.scheduleEnd
                          ? dayjs(project.scheduleEnd).format('YYYY/MM/DD')
                          : '—',
                      },
                      {
                        label: t('project.detail.labelActualStart'),
                        value: project.actualStart
                          ? dayjs(project.actualStart).format('YYYY/MM/DD')
                          : '—',
                      },
                      {
                        label: t('project.detail.labelActualEnd'),
                        value: project.actualEnd
                          ? dayjs(project.actualEnd).format('YYYY/MM/DD')
                          : '—',
                      },
                      {
                        label: t('project.detail.labelAmountTotal'),
                        value: <span className="font-mono">{formatJpy(project.amountTotal)}</span>,
                      },
                      {
                        label: t('project.detail.labelDescription'),
                        value: project.description ? (
                          <span className="whitespace-pre-wrap break-words">
                            {project.description}
                          </span>
                        ) : (
                          <span className="text-zinc-400">{t('project.detail.noDescription')}</span>
                        ),
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="px-4 sm:px-6 py-3 sm:py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 text-sm"
                      >
                        <dt className="text-zinc-500">{row.label}</dt>
                        <dd className="sm:col-span-2 m-0 text-zinc-900">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ),
            },
            {
              key: 'members',
              label: t('project.tabs.members'),
              children: (
                <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-8 text-center text-sm text-zinc-500">
                  P4 FE で実装予定
                </div>
              ),
            },
            {
              key: 'folders',
              label: t('project.tabs.folders'),
              children: <FolderListTab projectId={project.id} />,
            },
          ]}
        />
      </div>

      {changeStatusTo && (
        <ChangeStatusModal
          open
          projectId={project.id}
          from={project.status}
          to={changeStatusTo}
          needsAmount={changeStatusTo === 'received' && project.amountTotal === null}
          onClose={() => setChangeStatusTo(null)}
          onSuccess={onMutationSuccess}
        />
      )}

      <ReverseStatusModal
        open={reverseOpen}
        projectId={project.id}
        currentStatus={project.status}
        onClose={() => setReverseOpen(false)}
        onSuccess={onMutationSuccess}
      />
    </AppLayout>
  );
}
