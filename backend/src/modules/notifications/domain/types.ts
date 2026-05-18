import type { NotificationKind } from '@prisma/client';

export interface NotificationSummary {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsList {
  items: NotificationSummary[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}
