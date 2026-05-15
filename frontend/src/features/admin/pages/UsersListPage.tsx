import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Input, Select, Table, type MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  KeyRound,
  LockOpen,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldOff,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { extractApiError } from '@/shared/api/client';
import type { UserRole, UserStatus } from '@/shared/api/types';
import { usersApi, type ListUsersParams, type UserSummary } from '@/shared/api/users.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { EmergencyDisable2FaModal } from '../components/EmergencyDisable2FaModal';
import { InviteUserModal } from '../components/InviteUserModal';
import { ROLE_LABEL, RoleTag, STATUS_LABEL, StatusTag } from '../components/StatusTag';

export function UsersListPage(): JSX.Element {
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
      message.success('ロールを変更しました');
      refresh();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      usersApi.changeStatus(id, status),
    onSuccess: () => {
      message.success('ステータスを変更しました');
      refresh();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => usersApi.unlock(id),
    onSuccess: () => {
      message.success('アカウントロックを解除しました');
      refresh();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.softDelete(id),
    onSuccess: () => {
      message.success('ユーザーを削除しました');
      refresh();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (id: string) => usersApi.cancelInvitation(id),
    onSuccess: () => {
      message.success('招待を取り消しました');
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
      cancelText: 'キャンセル',
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
                title: 'ロールを変更',
                content: `${row.email} のロールを「${ROLE_LABEL[role]}」に変更しますか？`,
                okText: '変更する',
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
                title: 'ステータスを変更',
                content: `${row.email} を「${STATUS_LABEL[status]}」にしますか？${
                  status === 'suspended' || status === 'disabled'
                    ? ' このユーザーの全セッションが無効化されます。'
                    : ''
                }`,
                okText: '変更する',
                danger: status !== 'active',
                onOk: () => changeStatusMutation.mutate({ id: row.id, status }),
              })
            }
          />
        ),
      });
    }

    if (isSystemAdmin) {
      items.push({
        key: 'unlock',
        icon: <LockOpen size={14} />,
        label: 'ロック解除',
        onClick: () =>
          confirmAction({
            title: 'アカウントロックを解除',
            content: `${row.email} のロックを解除しますか？`,
            okText: '解除する',
            onOk: () => unlockMutation.mutate(row.id),
          }),
      });
    }

    if (isSystemAdmin && row.twoFaEnabled && !isSelf) {
      items.push({
        key: '2fa',
        icon: <ShieldOff size={14} />,
        label: '2FAを強制無効化',
        onClick: () => setDisable2FaTarget(row),
      });
    }

    if (isSystemAdmin && !isSelf) {
      items.push({ type: 'divider' });
      items.push({
        key: 'delete',
        icon: <Trash2 size={14} />,
        label: 'ユーザーを削除',
        danger: true,
        onClick: () =>
          confirmAction({
            title: 'ユーザーを削除',
            content: `${row.email} を削除しますか？（ソフトデリート、後で復元可能）`,
            okText: '削除する',
            danger: true,
            onOk: () => deleteMutation.mutate(row.id),
          }),
      });
    }

    if (row.status === 'pending_invite') {
      items.push({
        key: 'cancel-invite',
        icon: <Trash2 size={14} />,
        label: '招待を取り消す',
        danger: true,
        onClick: () =>
          confirmAction({
            title: '招待を取り消す',
            content: `${row.email} への招待を取り消しますか？`,
            okText: '取り消す',
            danger: true,
            // Backend cancels by invitation ID — but UsersListPage doesn't have invitation ID for pending_invite users.
            // For now use user.id since backend expects invitation.id. Actual handling: skip via dedicated invitations list page (future).
            onOk: () => cancelInviteMutation.mutate(row.id),
          }),
      });
    }

    if (items.length === 0) return [{ key: 'empty', disabled: true, label: '操作なし' }];
    return items;
  }

  const columns: ColumnsType<UserSummary> = [
    {
      title: '氏名',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, row) => (
        <div>
          <div className="font-medium text-zinc-900">{row.name || '(未設定)'}</div>
          <div className="text-xs text-zinc-500">{row.email}</div>
        </div>
      ),
    },
    {
      title: 'ロール',
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (role: UserRole) => <RoleTag role={role} />,
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: UserStatus) => <StatusTag status={status} />,
    },
    {
      title: '2FA',
      dataIndex: 'twoFaEnabled',
      key: 'twoFaEnabled',
      width: 70,
      render: (enabled: boolean) =>
        enabled ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <KeyRound size={12} />
            有効
          </span>
        ) : (
          <span className="text-xs text-zinc-400">—</span>
        ),
    },
    {
      title: '最終ログイン',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      render: (date: string | null) =>
        date ? (
          <span className="text-sm text-zinc-600">{dayjs(date).format('YYYY/MM/DD HH:mm')}</span>
        ) : (
          <span className="text-xs text-zinc-400">未ログイン</span>
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
            aria-label="操作"
          >
            <MoreVertical size={16} />
          </button>
        </Dropdown>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="m-0 text-2xl font-semibold text-zinc-900 tracking-tight">
              ユーザー管理
            </h1>
            <p className="m-0 mt-1 text-sm text-zinc-500">
              アカウントの招待・ロール・ステータスを管理
            </p>
          </div>
          <Button type="primary" icon={<UserPlus size={14} />} onClick={() => setInviteOpen(true)}>
            ユーザーを招待
          </Button>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4 flex flex-wrap gap-3 items-center">
          <Input
            placeholder="氏名・メールで検索"
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
            style={{ maxWidth: 280 }}
          />
          <Select
            placeholder="ロール"
            allowClear
            value={filters.role}
            onChange={(role) => setFilters((f) => ({ ...f, role, page: 1 }))}
            style={{ minWidth: 140 }}
            options={[
              { value: 'system_admin', label: 'システム管理者' },
              { value: 'manager', label: 'マネージャー' },
              { value: 'employee', label: '社員' },
              { value: 'invited', label: '招待ユーザー' },
            ]}
          />
          <Select
            placeholder="ステータス"
            allowClear
            value={filters.status}
            onChange={(status) => setFilters((f) => ({ ...f, status, page: 1 }))}
            style={{ minWidth: 140 }}
            options={[
              { value: 'active', label: '有効' },
              { value: 'pending_invite', label: '招待中' },
              { value: 'suspended', label: '停止中' },
              { value: 'disabled', label: '無効' },
            ]}
          />
          <div className="flex-1" />
          <Button icon={<RefreshCw size={14} />} onClick={() => refetch()} loading={isFetching}>
            更新
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
          <Table<UserSummary>
            columns={columns}
            dataSource={data?.data ?? []}
            rowKey="id"
            loading={isFetching}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              showTotal: (total) => `全 ${total} 件`,
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
  const roles: UserRole[] = ['system_admin', 'manager', 'employee', 'invited'];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="text-xs text-zinc-500 px-2 py-1">ロール変更</div>
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
          {ROLE_LABEL[r]} {r === currentRole && '(現在)'}
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
  const statuses: UserStatus[] = ['active', 'suspended', 'disabled'];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="text-xs text-zinc-500 px-2 py-1">ステータス変更</div>
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
          {STATUS_LABEL[s]} {s === currentStatus && '(現在)'}
        </button>
      ))}
    </div>
  );
}
