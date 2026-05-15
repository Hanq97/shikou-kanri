import type { UserRole, UserStatus } from '@/shared/api/types';

const ROLE_CLASS: Record<UserRole, string> = {
  system_admin: 'bg-red-50 text-red-700 ring-red-200',
  manager: 'bg-amber-50 text-amber-700 ring-amber-200',
  employee: 'bg-blue-50 text-blue-700 ring-blue-200',
  invited: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
};
const ROLE_LABEL: Record<UserRole, string> = {
  system_admin: 'システム管理者',
  manager: 'マネージャー',
  employee: '社員',
  invited: '招待ユーザー',
};

const STATUS_CLASS: Record<UserStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending_invite: 'bg-amber-50 text-amber-700 ring-amber-200',
  suspended: 'bg-orange-50 text-orange-700 ring-orange-200',
  disabled: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
};
const STATUS_LABEL: Record<UserStatus, string> = {
  active: '有効',
  pending_invite: '招待中',
  suspended: '停止中',
  disabled: '無効',
};

export function RoleTag({ role }: { role: UserRole }): JSX.Element {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${ROLE_CLASS[role]}`}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

export function StatusTag({ status }: { status: UserStatus }): JSX.Element {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export { ROLE_LABEL, STATUS_LABEL };
