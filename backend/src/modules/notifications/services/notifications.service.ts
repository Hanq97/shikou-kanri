import { Injectable } from '@nestjs/common';
import { Notification, NotificationKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { NotificationSummary, NotificationsList } from '../domain/types';

export interface CreateNotificationInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    opts: { unreadOnly?: boolean; page?: number; pageSize?: number } = {},
  ): Promise<NotificationsList> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 50;
    const where: Prisma.NotificationWhereInput = { userId };
    if (opts.unreadOnly) where.readAt = null;

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      items: items.map((n) => this.toSummary(n)),
      total,
      unreadCount,
      page,
      pageSize,
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<number> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count;
  }

  async create(input: CreateNotificationInput): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        link: input.link,
      },
    });
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;
    await this.prisma.notification.createMany({
      data: inputs.map((i) => ({
        userId: i.userId,
        kind: i.kind,
        title: i.title,
        body: i.body,
        link: i.link,
      })),
    });
  }

  private toSummary(n: Notification): NotificationSummary {
    return {
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
