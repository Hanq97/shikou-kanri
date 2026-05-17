import { useTranslation } from 'react-i18next';
import type { ProjectStatus } from '@/shared/api/projects.api';

const STYLES: Record<ProjectStatus, string> = {
  quoting: 'bg-zinc-50 text-zinc-700 ring-zinc-200',
  received: 'bg-blue-50 text-blue-700 ring-blue-200',
  construction: 'bg-amber-50 text-amber-700 ring-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  handed_over: 'bg-brand-50 text-brand-700 ring-brand-200',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
};

export function ProjectStatusTag({ status }: { status: ProjectStatus }): JSX.Element {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ring-1 ${STYLES[status]}`}
    >
      {t(`project.status.${status}`)}
    </span>
  );
}
