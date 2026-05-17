import { useQuery } from '@tanstack/react-query';
import { Empty, Spin } from 'antd';
import {
  Camera,
  ClipboardList,
  FileText,
  FolderClosed,
  PencilRuler,
  PresentationIcon,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { projectsApi, type FolderType } from '@/shared/api/projects.api';

const FOLDER_ICON: Record<FolderType, LucideIcon> = {
  document: FileText,
  drawing: PencilRuler,
  schedule: ClipboardList,
  photo: Camera,
  chalkboard: PresentationIcon,
  inspection: Search,
  custom: FolderClosed,
};

interface Props {
  projectId: string;
}

export function FolderListTab({ projectId }: Props): JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['projects', projectId, 'folders'],
    queryFn: () => projectsApi.listFolders(projectId),
    enabled: Boolean(projectId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spin />
      </div>
    );
  }

  const folders = data ?? [];

  if (folders.length === 0) {
    return (
      <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-12">
        <Empty description={t('project.detail.foldersTitle')} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {folders.map((f) => {
        const Icon = FOLDER_ICON[f.folderType];
        return (
          <div
            key={f.id}
            className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4 flex flex-col items-center gap-2 text-center"
          >
            <div className="w-12 h-12 rounded-lg bg-brand-50 text-brand-600 grid place-items-center">
              <Icon size={24} />
            </div>
            <div className="text-sm font-medium text-zinc-900 truncate w-full">{f.name}</div>
            <div className="text-[11px] text-zinc-500">
              {t(`project.folderType.${f.folderType}`)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
