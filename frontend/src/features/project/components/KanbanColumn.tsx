import { useDroppable } from '@dnd-kit/core';
import { Empty } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectStatus } from '@/shared/api/projects.api';

interface Props {
  status: ProjectStatus;
  count: number;
  children: ReactNode;
}

const COLUMN_TINT: Record<ProjectStatus, string> = {
  quoting: 'bg-zinc-50 border-zinc-200',
  received: 'bg-blue-50 border-blue-200',
  construction: 'bg-amber-50 border-amber-200',
  completed: 'bg-emerald-50 border-emerald-200',
  handed_over: 'bg-brand-50 border-brand-200',
  cancelled: 'bg-red-50 border-red-200',
};

export function KanbanColumn({ status, count, children }: Props): JSX.Element {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 sm:w-auto shrink-0 rounded-xl border transition-colors ${
        COLUMN_TINT[status]
      } ${isOver ? 'ring-2 ring-brand-400' : ''}`}
    >
      <div className="px-3 py-2.5 border-b border-inherit flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-800">{t(`project.status.${status}`)}</span>
        <span className="text-xs text-zinc-500 bg-white rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="p-2 flex-1 min-h-[120px] space-y-2 overflow-y-auto">
        {count === 0 ? (
          <div className="py-6">
            <Empty
              imageStyle={{ height: 32 }}
              description={<span className="text-xs text-zinc-400">—</span>}
            />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
