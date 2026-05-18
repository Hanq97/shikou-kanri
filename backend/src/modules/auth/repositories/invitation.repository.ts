import { Injectable } from '@nestjs/common';
import { Invitation, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

export type Tx = Prisma.TransactionClient | PrismaService;

export interface CreateInvitationInput {
  email: string;
  name?: string | null;
  tokenHash: string;
  role: UserRole;
  expiresAt: Date;
  invitedById: string;
  projectId?: string | null;
}

@Injectable()
export class InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateInvitationInput, tx?: Tx): Promise<Invitation> {
    const client = tx ?? this.prisma;
    return client.invitation.create({
      data: { ...input, email: input.email.toLowerCase() },
    });
  }

  findById(id: string, tx?: Tx): Promise<Invitation | null> {
    const client = tx ?? this.prisma;
    return client.invitation.findUnique({ where: { id } });
  }

  findByHash(tokenHash: string, tx?: Tx): Promise<Invitation | null> {
    const client = tx ?? this.prisma;
    return client.invitation.findUnique({ where: { tokenHash } });
  }

  findActiveByEmail(email: string, tx?: Tx): Promise<Invitation | null> {
    const client = tx ?? this.prisma;
    return client.invitation.findFirst({
      where: {
        email: email.toLowerCase(),
        usedAt: null,
        cancelledAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  markUsed(id: string, tx?: Tx): Promise<Invitation> {
    const client = tx ?? this.prisma;
    return client.invitation.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  cancel(id: string, tx?: Tx): Promise<Invitation> {
    const client = tx ?? this.prisma;
    return client.invitation.update({
      where: { id },
      data: { cancelledAt: new Date() },
    });
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.invitation.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() }, usedAt: null },
          {
            usedAt: { not: null },
            createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          { cancelledAt: { not: null } },
        ],
      },
    });
    return result.count;
  }
}
