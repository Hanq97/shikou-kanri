import { useTranslation } from 'react-i18next';
import type { ProjectType } from '@/shared/api/projects.api';

const STYLES: Record<ProjectType, string> = {
  new_construction: 'bg-brand-50 text-brand-700 ring-brand-200',
  remodel: 'bg-amber-50 text-amber-700 ring-amber-200',
  repair: 'bg-zinc-50 text-zinc-700 ring-zinc-200',
  aftercare: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export function ProjectTypeTag({ type }: { type: ProjectType }): JSX.Element {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ring-1 ${STYLES[type]}`}
    >
      {t(`project.type.${type}`)}
    </span>
  );
}
