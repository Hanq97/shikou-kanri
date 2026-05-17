import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Spin, Timeline } from 'antd';
import dayjs from 'dayjs';
import { ArrowRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '@/shared/api/customers.api';
import type { ProjectStatus, ProjectType } from '@/shared/api/projects.api';
import { useAuth } from '@/shared/hooks/useAuth';
import { formatJpy } from '@/shared/utils/format';
import { ProjectStatusTag } from '@/features/project/components/ProjectStatusTag';
import { ProjectTypeTag } from '@/features/project/components/ProjectTypeTag';

const STATUS_DOT_COLOR: Record<ProjectStatus, string> = {
  quoting: 'gray',
  received: 'blue',
  construction: 'orange',
  completed: 'green',
  handed_over: 'green',
  cancelled: 'red',
};

interface Props {
  customerId: string;
}

export function ProjectTimelineTab({ customerId }: Props): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['customers', customerId, 'projects'],
    queryFn: () => customersApi.listProjects(customerId),
    enabled: Boolean(customerId),
  });

  const canCreate = currentUser?.role !== 'invited';

  function gotoNewProject(): void {
    navigate(`/projects/new?customerId=${customerId}`);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spin />
      </div>
    );
  }

  const rows = projects ?? [];

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-12">
        <Empty description={t('project.empty')}>
          {canCreate && (
            <Button type="primary" icon={<Plus size={14} />} onClick={gotoNewProject}>
              {t('project.createButton')}
            </Button>
          )}
        </Empty>
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4 sm:p-6">
      {canCreate && (
        <div className="flex justify-end mb-4">
          <Button icon={<Plus size={14} />} onClick={gotoNewProject}>
            {t('project.createButton')}
          </Button>
        </div>
      )}
      <Timeline
        mode="left"
        items={rows.map((p) => ({
          color: STATUS_DOT_COLOR[p.status as ProjectStatus] ?? 'gray',
          label: (
            <span className="text-xs text-zinc-500 whitespace-nowrap">
              {dayjs(p.createdAt).format('YYYY/MM/DD')}
            </span>
          ),
          children: (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="bg-transparent border-0 p-0 cursor-pointer text-left inline-flex items-center gap-1 font-mono text-sm text-brand-600 hover:text-brand-700 hover:underline"
                >
                  {p.projectCode}
                  <ArrowRight size={12} />
                </button>
                <ProjectStatusTag status={p.status as ProjectStatus} />
                <ProjectTypeTag type={p.projectType as ProjectType} />
              </div>
              <div className="text-sm font-medium text-zinc-900">{p.name}</div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                {p.property?.address && <span>{p.property.address}</span>}
                {p.property?.address && <span>·</span>}
                <span>{p.owner.name}</span>
                {p.amountTotal && (
                  <>
                    <span>·</span>
                    <span className="font-mono">{formatJpy(p.amountTotal)}</span>
                  </>
                )}
                {p.actualEnd && (
                  <>
                    <span>·</span>
                    <span>引渡: {dayjs(p.actualEnd).format('YYYY/MM/DD')}</span>
                  </>
                )}
              </div>
            </div>
          ),
        }))}
      />
    </div>
  );
}
