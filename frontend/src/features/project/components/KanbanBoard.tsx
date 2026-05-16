import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { App } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectStatus, ProjectSummary } from '@/shared/api/projects.api';
import { KanbanCard } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';

const COLUMNS: ProjectStatus[] = [
  'quoting',
  'received',
  'construction',
  'completed',
  'handed_over',
  'cancelled',
];

const VALID_FORWARD: Record<ProjectStatus, ProjectStatus[]> = {
  quoting: ['received', 'cancelled'],
  received: ['construction', 'cancelled'],
  construction: ['completed', 'cancelled'],
  completed: ['handed_over', 'cancelled'],
  handed_over: [],
  cancelled: [],
};

interface Props {
  projects: ProjectSummary[];
  onTransitionRequest: (project: ProjectSummary, target: Exclude<ProjectStatus, 'quoting'>) => void;
}

export function KanbanBoard({ projects, onTransitionRequest }: Props): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grouped = useMemo(() => {
    const map = new Map<ProjectStatus, ProjectSummary[]>();
    for (const s of COLUMNS) map.set(s, []);
    for (const p of projects) {
      map.get(p.status)?.push(p);
    }
    return map;
  }, [projects]);

  const activeProject = projects.find((p) => p.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent): void {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent): void {
    setActiveId(null);
    if (!e.over) return;
    const overStatus = e.over.id as ProjectStatus;
    const project = projects.find((p) => p.id === e.active.id);
    if (!project) return;
    if (project.status === overStatus) return;

    if (!VALID_FORWARD[project.status].includes(overStatus)) {
      message.error(
        t('project.actions.confirmTransitionContent', {
          from: t(`project.status.${project.status}`),
          to: t(`project.status.${overStatus}`),
        }) + ' ❌',
      );
      return;
    }

    onTransitionRequest(project, overStatus as Exclude<ProjectStatus, 'quoting'>);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:snap-none">
        {COLUMNS.map((status) => {
          const items = grouped.get(status) ?? [];
          return (
            <div key={status} className="snap-start sm:snap-none">
              <KanbanColumn status={status} count={items.length}>
                {items.map((p) => (
                  <KanbanCard key={p.id} project={p} />
                ))}
              </KanbanColumn>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeProject ? (
          <div className="bg-white border border-brand-300 rounded-lg shadow-floating p-3 w-64 cursor-grabbing">
            <div className="font-mono text-[11px] text-brand-600">{activeProject.projectCode}</div>
            <div className="text-sm font-medium text-zinc-900 truncate">{activeProject.name}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
