import { Injectable } from '@nestjs/common';
import {
  ChatAttachmentMimeNotAllowedError,
  ChatAttachmentTooLargeError,
  ChatAttachmentTooManyError,
  ChatForbiddenError,
  ChatMessageNotFoundError,
} from '../../../shared/exceptions/chat-errors';
import type { AuthenticatedUser } from '../../auth/domain/types';
import type {
  ChatAttachmentFull,
  ChatMessageSummary,
  ChatMessagesPage,
} from '../domain/types';
import { CreateMessageDto } from '../dto/create-message.dto';
import { ChatGateway } from '../gateways/chat.gateway';
import {
  ChatRepository,
  MessageWithRelations,
} from '../repositories/chat.repository';

const MAX_ATTACHMENT_SIZE = 5 * 1_048_576; // 5MB per file
const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const ALLOWED_MIME_PREFIX = ['image/'];
const ALLOWED_MIME_EXACT = ['application/pdf', 'text/plain'];

@Injectable()
export class ChatService {
  constructor(
    private readonly repo: ChatRepository,
    private readonly gateway: ChatGateway,
  ) {}

  async assertProjectAccess(
    projectId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.role === 'system_admin' || user.role === 'manager') return;
    const ok = await this.repo.isProjectMember(projectId, user.id);
    if (!ok) throw new ChatForbiddenError();
  }

  async list(
    projectId: string,
    user: AuthenticatedUser,
    page: number,
    pageSize: number,
  ): Promise<ChatMessagesPage> {
    await this.assertProjectAccess(projectId, user);
    const { items, total } = await this.repo.list(projectId, page, pageSize);
    return {
      items: items.map((m) => this.toSummary(m, user.id)),
      total,
      page,
      pageSize,
    };
  }

  async create(
    projectId: string,
    user: AuthenticatedUser,
    dto: CreateMessageDto,
  ): Promise<ChatMessageSummary> {
    await this.assertProjectAccess(projectId, user);
    this.validateAttachments(dto.attachments ?? []);

    const created = await this.repo.createWithAttachments(
      {
        project: { connect: { id: projectId } },
        author: { connect: { id: user.id } },
        body: dto.body,
      },
      dto.attachments ?? [],
    );

    // Author auto-marks own message as read
    await this.repo.markRead(created.id, user.id);

    // Notify all other connected clients in the project room
    this.gateway.emitNewMessage(projectId, created.id);

    const full = await this.repo.findById(created.id);
    if (!full) throw new ChatMessageNotFoundError(created.id);
    return this.toSummary(full, user.id);
  }

  async markRead(messageId: string, user: AuthenticatedUser): Promise<void> {
    const msg = await this.repo.findById(messageId);
    if (!msg) throw new ChatMessageNotFoundError(messageId);
    await this.assertProjectAccess(msg.projectId, user);
    await this.repo.markRead(messageId, user.id);
    this.gateway.emitMessageRead(msg.projectId, messageId, user.id);
  }

  async unreadCount(
    projectId: string,
    user: AuthenticatedUser,
  ): Promise<number> {
    await this.assertProjectAccess(projectId, user);
    return this.repo.unreadCountForUser(projectId, user.id);
  }

  async getAttachment(
    attachmentId: string,
    user: AuthenticatedUser,
  ): Promise<ChatAttachmentFull> {
    const att = await this.repo.findAttachment(attachmentId);
    if (!att) throw new ChatMessageNotFoundError(attachmentId);
    const msg = await this.repo.findById(att.messageId);
    if (!msg) throw new ChatMessageNotFoundError(att.messageId);
    await this.assertProjectAccess(msg.projectId, user);
    return {
      id: att.id,
      fileName: att.fileName,
      mimeType: att.mimeType,
      sizeBytes: att.sizeBytes,
      dataBase64: att.dataBase64,
    };
  }

  async delete(messageId: string, user: AuthenticatedUser): Promise<void> {
    const msg = await this.repo.findById(messageId);
    if (!msg) throw new ChatMessageNotFoundError(messageId);
    await this.assertProjectAccess(msg.projectId, user);
    if (
      msg.authorId !== user.id &&
      user.role !== 'system_admin' &&
      user.role !== 'manager'
    ) {
      throw new ChatForbiddenError();
    }
    await this.repo.softDelete(messageId);
  }

  private validateAttachments(
    attachments: Array<{ sizeBytes: number; mimeType: string }>,
  ): void {
    if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new ChatAttachmentTooManyError(MAX_ATTACHMENTS_PER_MESSAGE);
    }
    for (const a of attachments) {
      if (a.sizeBytes > MAX_ATTACHMENT_SIZE) {
        throw new ChatAttachmentTooLargeError(a.sizeBytes, MAX_ATTACHMENT_SIZE);
      }
      const allowed =
        ALLOWED_MIME_PREFIX.some((p) => a.mimeType.startsWith(p)) ||
        ALLOWED_MIME_EXACT.includes(a.mimeType);
      if (!allowed) {
        throw new ChatAttachmentMimeNotAllowedError(a.mimeType);
      }
    }
  }

  private toSummary(
    msg: MessageWithRelations,
    viewerUserId: string,
  ): ChatMessageSummary {
    return {
      id: msg.id,
      projectId: msg.projectId,
      authorId: msg.authorId,
      authorName: msg.author.name,
      body: msg.body,
      attachments: msg.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
      readBy: msg.reads
        .filter((r) => r.userId !== msg.authorId)
        .map((r) => ({
          userId: r.userId,
          userName: r.user.name,
          readAt: r.readAt.toISOString(),
        })),
      isReadByMe: msg.reads.some((r) => r.userId === viewerUserId),
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    };
  }
}
