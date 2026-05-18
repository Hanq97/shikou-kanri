import { apiClient } from './client';

export interface ChatAttachmentSummary {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ChatMessageSummary {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  body: string;
  attachments: ChatAttachmentSummary[];
  readBy: Array<{ userId: string; userName: string; readAt: string }>;
  isReadByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessagesPage {
  items: ChatMessageSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateMessagePayload {
  body: string;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    dataBase64: string;
  }>;
}

export const chatApi = {
  async listMessages(
    projectId: string,
    params: { page?: number; pageSize?: number } = {},
  ): Promise<ChatMessagesPage> {
    const { data } = await apiClient.get<ChatMessagesPage>(`/projects/${projectId}/chat/messages`, {
      params,
    });
    return data;
  },

  async createMessage(
    projectId: string,
    payload: CreateMessagePayload,
  ): Promise<ChatMessageSummary> {
    const { data } = await apiClient.post<ChatMessageSummary>(
      `/projects/${projectId}/chat/messages`,
      payload,
    );
    return data;
  },

  async markRead(projectId: string, messageId: string): Promise<void> {
    await apiClient.post(`/projects/${projectId}/chat/messages/${messageId}/read`);
  },

  async deleteMessage(projectId: string, messageId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/chat/messages/${messageId}`);
  },

  async unreadCount(projectId: string): Promise<number> {
    const { data } = await apiClient.get<{ count: number }>(
      `/projects/${projectId}/chat/unread-count`,
    );
    return data.count;
  },

  attachmentUrl(projectId: string, attachmentId: string): string {
    return `/api/v1/projects/${projectId}/chat/attachments/${attachmentId}`;
  },
};
