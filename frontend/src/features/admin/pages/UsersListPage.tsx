import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Input, Select, type MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  KeyRound,
  Lock,
  LockOpen,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldOff,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import type { UserRole, UserStatus } from '@/shared/api/types';
import { usersApi, type ListUsersParams, type UserSummary } from '@/shared/api/users.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ResponsiveTable } from '@/shared/components/responsive/ResponsiveTable';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { EmergencyDisable2FaModal } from '../components/EmergencyDisable2FaModal';
import { InviteUserModal } from '../components/InviteUserModal';
import { RoleTag, StatusTag } from '../components/StatusTag';

export function UsersListPage(): JSX.Element {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<ListUsersParams>({
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [disable2FaTarget, setDisable2FaTarget] = useState<UserSummary | null>(null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersApi.list(filters),
  });

  const refresh = (): void => {
    qc.invalidateQueries({ queryKey: ['users'] });
  };

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => usersApi.changeRole(id, role),
    onSuccess: () => {
      message.success(t('users.messages.roleChanged'));
      refresh();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      usersApi.changeStatus(id, status),
    onSuccess: () => {
      message.success(t('users.messages.statusChanged'));
      refresh();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => usersApi.unlock(id),
    onSuccess: () => {
      message.success(t('users.messages.unlocked'));
      refresh();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.softDelete(id),
    onSuccess: () => {
      message.success(t('users.messages.deleted'));
      refresh();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (id: string) => usersApi.cancelInvitation(id),
    onSuccess: () => {
      message.success(t('users.messages.inviteCancelled'));
      refresh();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const isSystemAdmin = currentUser?.role === 'system_admin';

  function confirmAction(args: {
    title: string;
    content: string;
    okText: string;
    danger?: boolean;
    onOk: () => void;
  }): void {
    modal.confirm({
      title: args.title,
      content: args.content,
      okText: args.okText,
      okType: args.danger ? 'danger' : 'primary',
      cancelText: t('common.cancel'),
      onOk: args.onOk,
    });
  }

  function buildRowMenu(row: UserSummary): MenuProps['items'] {
    const isSelf = row.id === currentUser?.id;
    const items: MenuProps['items'] = [];

    if (isSystemAdmin && !isSelf && row.status !== 'pending_invite') {
      items.push({
        key: 'role',
        label: (
          <RoleSubmenu
            currentRole={row.role}
            onChange={(role) =>
              confirmAction({
                title: t('users.confirms.changeRoleTitle'),
                content: t('users.confirms.changeRoleContent', {
                  email: row.email,
                  role: t(`users.roles.${role}`),
                }),
                okText: t('users.confirms.changeRoleOk'),
                onOk: () => changeRoleMutation.mutate({ id: row.id, role }),
              })
            }
          />
        ),
      });
    }

    if (isSystemAdmin && !isSelf && row.status !== 'pending_invite') {
      items.push({
        key: 'status',
        label: (
          <StatusSubmenu
            currentStatus={row.status}
            onChange={(status) =>
              confirmAction({
                title: t('users.confirms.changeStatusTitle'),
                content:
                  t('users.confirms.changeStatusContent', {
                    email: row.email,
                    status: t(`users.statuses.${status}`),
                  }) +
                  (status === 'suspended' || status === 'disabled'
                    ? t('users.confirms.changeStatusContentRevoke')
                    : ''),
                okText: t('users.confirms.changeRoleOk'),
                danger: status !== 'active',
                onOk: () => changeStatusMutation.mutate({ id: row.id, status }),
              })
            }
          />
        ),
      });
    }

    const isLocked =
      row.requireAdminUnlock ||
      (row.lockedUntil !== null && new Date(row.lockedUntil) > new Date());
    if (isSystemAdmin && isLocked) {
      items.push({
        key: 'unlock',
        icon: <LockOpen size={14} />,
        label: t('users.menu.unlock'),
        onClick: () =>
          confirmAction({
            title: t('users.confirms.unlockTitle'),
            content: t('users.confirms.unlockContent', { email: row.email }),
            okText: t('users.confirms.unlockOk'),
            onOk: () => unlockMutation.mutate(row.id),
          }),
      });
    }

    if (isSystemAdmin && row.twoFaEnabled && !isSelf) {
      items.push({
        key: '2fa',
        icon: <ShieldOff size={14} />,
        label: t('users.menu.disable2Fa'),
        onClick: () => setDisable2FaTarget(row),
      });
    }

    if (isSystemAdmin && !isSelf) {
      items.push({ type: 'divider' });
      items.push({
        key: 'delete',
        icon: <Trash2 size={14} />,
        label: t('users.menu.delete'),
        danger: true,
        onClick: () =>
          confirmAction({
            title: t('users.confirms.deleteTitle'),
            content: t('users.confirms.deleteContent', { email: row.email }),
            okText: t('users.confirms.deleteOk'),
            danger: true,
            onOk: () => deleteMutation.mutate(row.id),
          }),
      });
    }

    if (row.status === 'pending_invite') {
      items.push({
        key: 'cancel-invite',
        icon: <Trash2 size={14} />,
        label: t('users.menu.cancelInvite'),
        danger: true,
        onClick: () =>
          confirmAction({
            title: t('users.confirms.cancelInviteTitle'),
            content: t('users.confirms.cancelInviteContent', { email: row.email }),
            okText: t('users.confirms.cancelInviteOk'),
            danger: true,
            onOk: () => cancelInviteMutation.mutate(row.id),
          }),
      });
    }

    if (items.length === 0) return [{ key: 'empty', disabled: true, label: t('common.noActions') }];
    return items;
  }

  const columns: ColumnsType<UserSummary> = [
    {
      title: t('users.columns.name'),
      dataIndex: 'name',
      key: 'name',
      render: (_: string, row) => (
        <div>
          <div className="font-medium text-zinc-900">{row.name || t('users.nameNotSet')}</div>
          <div className="text-xs text-zinc-500">{row.email}</div>
        </div>
      ),
    },
    {
      title: t('users.columns.role'),
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (role: UserRole) => <RoleTag role={role} />,
    },
    {
      title: t('users.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: UserStatus, row) => {
        const isLocked =
          row.requireAdminUnlock ||
          (row.lockedUntil !== null && new Date(row.lockedUntil) > new Date());
        return (
          <div className="flex flex-col items-start gap-1">
            <StatusTag status={status} />
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-full px-2 py-0.5">
                <Lock size={10} />
                {t('users.lockedBadge')}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: t('users.columns.twoFa'),
      dataIndex: 'twoFaEnabled',
      key: 'twoFaEnabled',
      width: 70,
      render: (enabled: boolean) =>
        enabled ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <KeyRound size={12} />
            {t('users.twoFaEnabled')}
          </span>
        ) : (
          <span className="text-xs text-zinc-400">—</span>
        ),
    },
    {
      title: t('users.columns.lastLogin'),
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      render: (date: string | null) =>
        date ? (
          <span className="text-sm text-zinc-600">{dayjs(date).format('YYYY/MM/DD HH:mm')}</span>
        ) : (
          <span className="text-xs text-zinc-400">{t('users.neverLoggedIn')}</span>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'right',
      render: (_, row) => (
        <Dropdown menu={{ items: buildRowMenu(row) }} trigger={['click']} placement="bottomRight">
          <button
            type="button"
            className="w-8 h-8 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer"
            aria-label={t('common.actions')}
          >
            <MoreVertical size={16} />
          </button>
        </Dropdown>
      ),
    },
  ];

  function renderMobileCard(row: UserSummary): JSX.Element {
    const isLocked =
      row.requireAdminUnlock ||
      (row.lockedUntil !== null && new Date(row.lockedUntil) > new Date());
    return (
      <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-zinc-900 truncate">
              {row.name || t('users.nameNotSet')}
            </div>
            <div className="text-xs text-zinc-500 truncate">{row.email}</div>
          </div>
          <Dropdown menu={{ items: buildRowMenu(row) }} trigger={['click']} placement="bottomRight">
            <button
              type="button"
              className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer shrink-0"
              aria-label={t('common.actions')}
            >
              <MoreVertical size={16} />
            </button>
          </Dropdown>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <RoleTag role={row.role} />
          <StatusTag status={row.status} />
          {isLocked && (
            <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-full px-2 py-0.5">
              <Lock size={10} />
              {t('users.lockedBadge')}
            </span>
          )}
          {row.twoFaEnabled && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-2 py-0.5">
              <KeyRound size={10} />
              {t('users.twoFaEnabled')}
            </span>
          )}
        </div>
        <div className="mt-2 text-[11px] text-zinc-400">
          {row.lastLoginAt
            ? dayjs(row.lastLoginAt).format('YYYY/MM/DD HH:mm')
            : t('users.neverLoggedIn')}
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="m-0 text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
              {t('users.title')}
            </h1>
            <p className="m-0 mt-1 text-sm text-zinc-500">{t('users.subtitle')}</p>
          </div>
          <Button type="primary" icon={<UserPlus size={14} />} onClick={() => setInviteOpen(true)}>
            {t('users.inviteButton')}
          </Button>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
          <Input
            placeholder={t('users.searchPlaceholder')}
            prefix={<Search size={14} className="text-zinc-400" />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onPressEnter={() =>
              setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }))
            }
            allowClear
            onClear={() => {
              setSearchInput('');
              setFilters((f) => ({ ...f, search: undefined, page: 1 }));
            }}
            className="sm:!max-w-[280px]"
          />
          <div className="flex gap-2 sm:contents">
            <Select
              placeholder={t('users.roleFilter')}
              allowClear
              value={filters.role}
              onChange={(role) => setFilters((f) => ({ ...f, role, page: 1 }))}
              className="flex-1 sm:!min-w-[140px] sm:flex-none"
              options={[
                { value: 'system_admin', label: t('users.roles.system_admin') },
                { value: 'manager', label: t('users.roles.manager') },
                { value: 'employee', label: t('users.roles.employee') },
                { value: 'invited', label: t('users.roles.invited') },
              ]}
            />
            <Select
              placeholder={t('users.statusFilter')}
              allowClear
              value={filters.status}
              onChange={(status) => setFilters((f) => ({ ...f, status, page: 1 }))}
              className="flex-1 sm:!min-w-[140px] sm:flex-none"
              options={[
                { value: 'active', label: t('users.statuses.active') },
                { value: 'pending_invite', label: t('users.statuses.pending_invite') },
                { value: 'suspended', label: t('users.statuses.suspended') },
                { value: 'disabled', label: t('users.statuses.disabled') },
              ]}
            />
          </div>
          <div className="hidden sm:block flex-1" />
          <Button icon={<RefreshCw size={14} />} onClick={() => refetch()} loading={isFetching}>
            {t('common.refresh')}
          </Button>
        </div>

        {/* Responsive table */}
        <div className="sm:bg-white sm:border sm:border-zinc-200/70 sm:rounded-xl sm:shadow-card sm:overflow-hidden">
          <ResponsiveTable<UserSummary>
            columns={columns}
            dataSource={data?.data ?? []}
            rowKey="id"
            loading={isFetching}
            mobileCard={renderMobileCard}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              showTotal: (total) => t('users.totalCount', { total }),
              onChange: (page, pageSize) => setFilters((f) => ({ ...f, page, pageSize })),
            }}
            size="middle"
          />
        </div>

        {/* Modals */}
        {currentUser && (
          <InviteUserModal
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            onSuccess={() => {
              setInviteOpen(false);
              refresh();
            }}
            currentUserRole={currentUser.role}
          />
        )}
        <EmergencyDisable2FaModal
          open={disable2FaTarget !== null}
          user={disable2FaTarget}
          onClose={() => setDisable2FaTarget(null)}
          onSuccess={() => {
            setDisable2FaTarget(null);
            refresh();
          }}
        />
      </div>
    </AppLayout>
  );
}

function RoleSubmenu({
  currentRole,
  onChange,
}: {
  currentRole: UserRole;
  onChange: (role: UserRole) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const roles: UserRole[] = ['system_admin', 'manager', 'employee', 'invited'];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="text-xs text-zinc-500 px-2 py-1">{t('users.menu.changeRole')}</div>
      {roles.map((r) => (
        <button
          key={r}
          type="button"
          disabled={r === currentRole}
          onClick={() => onChange(r)}
          className={`block w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
            r === currentRole
              ? 'text-zinc-400 cursor-not-allowed'
              : 'text-zinc-700 hover:bg-zinc-100 cursor-pointer'
          }`}
        >
          {t(`users.roles.${r}`)} {r === currentRole && t('users.menu.current')}
        </button>
      ))}
    </div>
  );
}

function StatusSubmenu({
  currentStatus,
  onChange,
}: {
  currentStatus: UserStatus;
  onChange: (status: UserStatus) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const statuses: UserStatus[] = ['active', 'suspended', 'disabled'];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="text-xs text-zinc-500 px-2 py-1">{t('users.menu.changeStatus')}</div>
      {statuses.map((s) => (
        <button
          key={s}
          type="button"
          disabled={s === currentStatus}
          onClick={() => onChange(s)}
          className={`block w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
            s === currentStatus
              ? 'text-zinc-400 cursor-not-allowed'
              : 'text-zinc-700 hover:bg-zinc-100 cursor-pointer'
          }`}
        >
          {t(`users.statuses.${s}`)} {s === currentStatus && t('users.menu.current')}
        </button>
      ))}
    </div>
  );
}
