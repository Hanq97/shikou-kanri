import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Empty, Select, Spin, type MenuProps } from 'antd';
import dayjs from 'dayjs';
import { MoreVertical, Plus, User as UserIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import {
  projectMembersApi,
  type ProjectMember,
  type ProjectMemberRole,
} from '@/shared/api/projects.api';
import { usersApi } from '@/shared/api/users.api';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { AddMemberModal } from './AddMemberModal';

const ROLES: ProjectMemberRole[] = ['owner', 'contributor', 'inspector', 'invited_worker'];

interface Props {
  projectId: string;
  projectOwnerId: string;
  canManage: boolean;
}

export function ProjectMembersTab({ projectId, projectOwnerId, canManage }: Props): JSX.Element {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: members, isLoading } = useQuery({
    queryKey: ['projects', projectId, 'members'],
    queryFn: () => projectMembersApi.list(projectId),
    enabled: Boolean(projectId),
  });

  const { data: usersResp } = useQuery({
    queryKey: ['users', 'picker'],
    queryFn: () => usersApi.list({ status: 'active', pageSize: 100, sortBy: 'name' }),
    enabled: Boolean(projectId),
  });

  const userById = useMemo(() => {
    const map = new Map<string, { name: string; email: string; role: string }>();
    for (const u of usersResp?.data ?? []) {
      map.set(u.id, { name: u.name, email: u.email, role: u.role });
    }
    return map;
  }, [usersResp]);

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectMemberRole }) =>
      projectMembersApi.updateRole(projectId, userId, role),
    onSuccess: () => {
      message.success(t('project.members.messages.roleChanged'));
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'members'] });
      qc.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => projectMembersApi.remove(projectId, userId),
    onSuccess: () => {
      message.success(t('project.members.messages.removed'));
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'members'] });
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  function confirmRemove(member: ProjectMember): void {
    const name = userById.get(member.userId)?.name ?? member.userId;
    modal.confirm({
      title: t('project.members.removeTitle'),
      content: t('project.members.removeContent', { name }),
      okText: t('project.members.removeOk'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => removeMutation.mutate(member.userId),
    });
  }

  function buildRowMenu(member: ProjectMember): MenuProps['items'] {
    return [
      {
        key: 'remove',
        danger: true,
        label: t('project.members.removeOk'),
        onClick: () => confirmRemove(member),
      },
    ];
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spin />
      </div>
    );
  }

  const rows = members ?? [];

  return (
    <div>
      {canManage && (
        <div className="flex justify-end mb-4">
          <Button type="primary" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            {t('project.members.addButton')}
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-12">
          <Empty description={t('project.members.empty')} />
        </div>
      ) : (
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
          <ul className="divide-y divide-zinc-100 m-0 p-0 list-none">
            {rows.map((m) => {
              const userInfo = userById.get(m.userId);
              const isSelf = m.userId === currentUser?.id;
              const isProjectOwner = m.userId === projectOwnerId;
              return (
                <li key={m.id} className="px-4 sm:px-6 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 grid place-items-center shrink-0">
                    <UserIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 truncate">
                      {userInfo?.name ?? m.userId}
                      {isSelf && (
                        <span className="ml-1 text-xs text-zinc-500">
                          {t('project.members.self')}
                        </span>
                      )}
                      {isProjectOwner && (
                        <span className="ml-1.5 text-[10px] text-brand-700 bg-brand-50 ring-1 ring-brand-200 rounded px-1.5 py-0.5">
                          PJ Owner
                        </span>
                      )}
                    </div>
                    {userInfo?.email && (
                      <div className="text-xs text-zinc-500 truncate">{userInfo.email}</div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {canManage ? (
                      <Select
                        value={m.roleOnProject}
                        size="small"
                        style={{ minWidth: 120 }}
                        onChange={(role) =>
                          updateRoleMutation.mutate({
                            userId: m.userId,
                            role,
                          })
                        }
                        loading={
                          updateRoleMutation.isPending &&
                          updateRoleMutation.variables?.userId === m.userId
                        }
                        options={ROLES.map((r) => ({
                          value: r,
                          label: t(`project.memberRole.${r}`),
                        }))}
                      />
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200">
                        {t(`project.memberRole.${m.roleOnProject}`)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 hidden sm:block w-24 text-right shrink-0">
                    {dayjs(m.invitedAt).format('YYYY/MM/DD')}
                  </div>
                  {canManage && (
                    <Dropdown
                      menu={{ items: buildRowMenu(m) }}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer shrink-0"
                        aria-label={t('common.actions')}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </Dropdown>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AddMemberModal
        open={addOpen}
        projectId={projectId}
        excludeUserIds={rows.filter((m) => !m.revokedAt).map((m) => m.userId)}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          qc.invalidateQueries({ queryKey: ['projects', projectId, 'members'] });
          qc.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
        }}
      />
    </div>
  );
}
