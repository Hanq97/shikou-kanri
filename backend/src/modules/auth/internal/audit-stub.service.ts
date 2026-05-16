import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestContext } from '../domain/types';

export type Tx = Prisma.TransactionClient | PrismaService;

interface AuditEventInput {
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ctx?: RequestContext;
}

/**
 * Phase 1 stub for F8-03 audit module.
 * Writes synchronously to audit_logs.
 * Full features (async queue, log viewer UI, S3 archival) deferred to F8-03 branch.
 */
@Injectable()
export class AuditStubService {
  constructor(private readonly prisma: PrismaService) {}

  async log(event: AuditEventInput, tx?: Tx): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        actorUserId: event.actorUserId ?? null,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        changes: event.changes as Prisma.InputJsonValue | undefined,
        ipAddress: event.ctx?.ipAddress ?? undefined,
        userAgent: event.ctx?.userAgent ?? undefined,
      },
    });
  }

  // === Convenience methods ===

  logLoginSuccess(userId: string, ctx: RequestContext, tx?: Tx): Promise<void> {
    return this.log(
      {
        actorUserId: userId,
        action: 'auth.login.success',
        entityType: 'user',
        entityId: userId,
        ctx,
      },
      tx,
    );
  }

  logLoginFailure(
    email: string,
    reason: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        action: 'auth.login.failure',
        entityType: 'auth',
        changes: { email, reason },
        ctx,
      },
      tx,
    );
  }

  logLogout(userId: string, ctx: RequestContext, tx?: Tx): Promise<void> {
    return this.log(
      {
        actorUserId: userId,
        action: 'auth.logout',
        entityType: 'user',
        entityId: userId,
        ctx,
      },
      tx,
    );
  }

  logLogoutAll(
    userId: string,
    revokedCount: number,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: userId,
        action: 'auth.logout_all',
        entityType: 'user',
        entityId: userId,
        changes: { revokedCount },
        ctx,
      },
      tx,
    );
  }

  logPasswordChange(
    userId: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: userId,
        action: 'auth.password.change',
        entityType: 'user',
        entityId: userId,
        ctx,
      },
      tx,
    );
  }

  logPasswordReset(
    userId: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: userId,
        action: 'auth.password.reset',
        entityType: 'user',
        entityId: userId,
        ctx,
      },
      tx,
    );
  }

  log2FaEnroll(userId: string, ctx: RequestContext, tx?: Tx): Promise<void> {
    return this.log(
      {
        actorUserId: userId,
        action: 'auth.2fa.enroll',
        entityType: 'user',
        entityId: userId,
        ctx,
      },
      tx,
    );
  }

  log2FaDisable(
    userId: string,
    reason: 'user_self' | 'admin_emergency',
    actorId: string | null,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: actorId ?? userId,
        action: 'auth.2fa.disable',
        entityType: 'user',
        entityId: userId,
        changes: { reason },
        ctx,
      },
      tx,
    );
  }

  logAccountLocked(
    userId: string,
    layer: 1 | 2,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        action: 'auth.account.locked',
        entityType: 'user',
        entityId: userId,
        changes: { layer },
        ctx,
      },
      tx,
    );
  }

  logAccountUnlocked(
    userId: string,
    actorId: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: actorId,
        action: 'auth.account.unlocked',
        entityType: 'user',
        entityId: userId,
        ctx,
      },
      tx,
    );
  }

  logInvitationCreated(
    invitationId: string,
    email: string,
    role: string,
    inviterId: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: inviterId,
        action: 'auth.invitation.created',
        entityType: 'invitation',
        entityId: invitationId,
        changes: { email, role },
        ctx,
      },
      tx,
    );
  }

  logInvitationAccepted(
    invitationId: string,
    userId: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: userId,
        action: 'auth.invitation.accepted',
        entityType: 'invitation',
        entityId: invitationId,
        ctx,
      },
      tx,
    );
  }

  logInvitationCancelled(
    invitationId: string,
    actorId: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: actorId,
        action: 'auth.invitation.cancelled',
        entityType: 'invitation',
        entityId: invitationId,
        ctx,
      },
      tx,
    );
  }

  logRoleChange(
    userId: string,
    fromRole: string,
    toRole: string,
    actorId: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: actorId,
        action: 'user.role.changed',
        entityType: 'user',
        entityId: userId,
        changes: { role: { from: fromRole, to: toRole } },
        ctx,
      },
      tx,
    );
  }

  logStatusChange(
    userId: string,
    fromStatus: string,
    toStatus: string,
    actorId: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: actorId,
        action: 'user.status.changed',
        entityType: 'user',
        entityId: userId,
        changes: { status: { from: fromStatus, to: toStatus } },
        ctx,
      },
      tx,
    );
  }

  logUserDeleted(
    userId: string,
    actorId: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      {
        actorUserId: actorId,
        action: 'user.deleted',
        entityType: 'user',
        entityId: userId,
        ctx,
      },
      tx,
    );
  }

  logUserBootstrap(userId: string, email: string): Promise<void> {
    return this.log({
      actorUserId: null,
      action: 'auth.user.bootstrap',
      entityType: 'user',
      entityId: userId,
      changes: { email },
    });
  }

  logSecurityEvent(
    action: string,
    details: Record<string, unknown>,
    ctx?: RequestContext,
    tx?: Tx,
  ): Promise<void> {
    return this.log(
      { action, entityType: 'security', changes: details, ctx },
      tx,
    );
  }
}
