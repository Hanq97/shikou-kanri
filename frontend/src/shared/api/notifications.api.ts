import { apiClient } from './client';

export type NotificationKind =
  | 'chat_new_message'
  | 'chat_mention'
  | 'quote_approval_request'
  | 'aftercare_due'
  | 'project_member_added'
  | 'other';

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

export const notificationsApi = {
  async list(
    params: {
      unreadOnly?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<NotificationsList> {
    const { data } = await apiClient.get<NotificationsList>('/notifications', {
      params,
    });
    return data;
  },

  async unreadCount(): Promise<number> {
    const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  },

  async markRead(id: string): Promise<void> {
    await apiClient.post(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<number> {
    const { data } = await apiClient.post<{ count: number }>('/notifications/read-all');
    return data.count;
  },
};
