import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProjectSummary } from '@/shared/api/projects.api';
import { formatJpy } from '@/shared/utils/format';
import { ProjectTypeTag } from './ProjectTypeTag';

interface Props {
  project: ProjectSummary;
}

export function KanbanCard({ project }: Props): JSX.Element {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
    data: { status: project.status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white border border-zinc-200/70 rounded-lg shadow-card p-3 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 w-5 h-5 grid place-items-center text-zinc-400 hover:text-zinc-700 cursor-grab active:cursor-grabbing bg-transparent border-0 p-0 touch-none"
          aria-label="Drag"
        >
          <GripVertical size={14} />
        </button>
        <button
          type="button"
          onClick={() => navigate(`/projects/${project.id}`)}
          className="flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer"
        >
          <div className="font-mono text-[11px] text-brand-600">{project.projectCode}</div>
          <div className="text-sm font-medium text-zinc-900 truncate mt-0.5 hover:text-brand-600">
            {project.name}
          </div>
        </button>
      </div>
      <div className="text-xs text-zinc-500 truncate mt-1">{project.customer.name}</div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <ProjectTypeTag type={project.projectType} />
        <span className="font-mono text-[11px] text-zinc-600">
          {formatJpy(project.amountTotal)}
        </span>
      </div>
    </div>
  );
}
