export interface ChatAttachmentSummary {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  // base64 omitted from list response; client fetches via /attachments/:id endpoint
}

export interface ChatAttachmentFull extends ChatAttachmentSummary {
  dataBase64: string;
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
