import { Badge, Button, Dropdown, Empty, Spin } from 'antd';
import dayjs from 'dayjs';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi, type NotificationSummary } from '@/shared/api/notifications.api';

const POLL_INTERVAL_MS = 30_000;

function formatTimestamp(iso: string): string {
  const d = dayjs(iso);
  const now = dayjs();
  const diffMin = now.diff(d, 'minute');
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = now.diff(d, 'hour');
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = now.diff(d, 'day');
  if (diffDay < 7) return `${diffDay}日前`;
  return d.format('YYYY/MM/DD');
}

const KIND_EMOJI: Record<string, string> = {
  chat_new_message: '💬',
  chat_mention: '🔔',
  quote_approval_request: '📋',
  aftercare_due: '🔧',
  project_member_added: '👥',
  other: '📢',
};

export function NotificationBell(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.list({ pageSize: 10 }),
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  function handleClick(n: NotificationSummary): void {
    if (!n.readAt) {
      markReadMutation.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
    setOpen(false);
  }

  const unread = countData ?? 0;

  const items = data?.items ?? [];

  const panelContent = (
    <div className="bg-white rounded-xl shadow-elevated border border-zinc-200/70 w-[360px] max-w-[90vw]">
      <div className="px-4 py-3 border-b border-zinc-200/70 flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold text-zinc-900">{t('notifications.title')}</h3>
        {unread > 0 && (
          <Button
            type="link"
            size="small"
            onClick={() => markAllReadMutation.mutate()}
            loading={markAllReadMutation.isPending}
          >
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center">
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('notifications.empty')}
            className="py-6"
          />
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={`block w-full text-left px-4 py-3 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 cursor-pointer bg-transparent ${
                !n.readAt ? 'bg-brand-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-lg shrink-0">{KIND_EMOJI[n.kind] ?? '📢'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="m-0 text-sm font-medium text-zinc-900 truncate">{n.title}</p>
                    {!n.readAt && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
                  </div>
                  {n.body && (
                    <p className="m-0 mt-0.5 text-xs text-zinc-600 line-clamp-2">{n.body}</p>
                  )}
                  <p className="m-0 mt-1 text-[11px] text-zinc-400">
                    {formatTimestamp(n.createdAt)}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      placement="bottomRight"
      dropdownRender={() => panelContent}
    >
      <button
        type="button"
        className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer relative"
        aria-label={t('nav.notifications')}
      >
        <Badge count={unread} size="small" offset={[-2, 2]}>
          <Bell size={18} />
        </Badge>
      </button>
    </Dropdown>
  );
}
