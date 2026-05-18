import { Injectable } from '@nestjs/common';
import { ChatMessage, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

export interface MessageWithRelations extends ChatMessage {
  author: { id: string; name: string };
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  reads: Array<{
    userId: string;
    readAt: Date;
    user: { id: string; name: string };
  }>;
}

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    projectId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: MessageWithRelations[]; total: number }> {
    const where: Prisma.ChatMessageWhereInput = {
      projectId,
      deletedAt: null,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: { select: { id: true, name: true } },
          attachments: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
          reads: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.chatMessage.count({ where }),
    ]);
    return { items: items as MessageWithRelations[], total };
  }

  async findById(id: string): Promise<MessageWithRelations | null> {
    const msg = await this.prisma.chatMessage.findFirst({
      where: { id, deletedAt: null },
      include: {
        author: { select: { id: true, name: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
          },
        },
        reads: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    return (msg as MessageWithRelations | null) ?? null;
  }

  async findAttachment(id: string): Promise<{
    id: string;
    messageId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    dataBase64: string;
  } | null> {
    return this.prisma.chatAttachment.findUnique({ where: { id } });
  }

  async createWithAttachments(
    data: Prisma.ChatMessageCreateInput,
    attachments: Array<{
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      dataBase64: string;
    }>,
  ): Promise<ChatMessage> {
    return this.prisma.$transaction(async (tx) => {
      const msg = await tx.chatMessage.create({
        data: { ...data, attachmentCount: attachments.length },
      });
      if (attachments.length > 0) {
        await tx.chatAttachment.createMany({
          data: attachments.map((a) => ({ messageId: msg.id, ...a })),
        });
      }
      return msg;
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.chatMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async markRead(messageId: string, userId: string): Promise<void> {
    await this.prisma.chatMessageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: {},
    });
  }

  async unreadCountForUser(projectId: string, userId: string): Promise<number> {
    return this.prisma.chatMessage.count({
      where: {
        projectId,
        deletedAt: null,
        authorId: { not: userId },
        reads: { none: { userId } },
      },
    });
  }

  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, revokedAt: null },
    });
    if (member) return true;
    // Also allow owner
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerUserId: userId, deletedAt: null },
    });
    return !!project;
  }
}
