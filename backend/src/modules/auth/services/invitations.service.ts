import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AppConfigService } from '../../../config/app-config.service';
import { HashService } from '../../../shared/crypto/hash.service';
import { RandomService } from '../../../shared/crypto/random.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  AuthInsufficientPermissionError,
  AuthUserExistsError,
} from '../../../shared/exceptions/auth-errors';
import { NotFoundError } from '../../../shared/exceptions/app-error';
import { EmailService } from '../../notification/email.service';
import {
  AuthenticatedUser,
  RequestContext,
  UserRoleName,
} from '../domain/types';
import { AuditStubService } from '../internal/audit-stub.service';
import { InvitationRepository } from '../repositories/invitation.repository';
import { UserRepository } from '../repositories/user.repository';

const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

const ROLE_DISPLAY: Record<UserRoleName, string> = {
  system_admin: 'システム管理者',
  manager: 'マネージャー',
  employee: '社員',
  invited: '招待ユーザー（職人・協力業者）',
};

const MANAGER_ALLOWED_ROLES: UserRoleName[] = [
  'manager',
  'employee',
  'invited',
];

export interface CreateInvitationInput {
  email: string;
  role: UserRole;
  name?: string;
  projectId?: string;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserRepository,
    private readonly invitations: InvitationRepository,
    private readonly hashes: HashService,
    private readonly random: RandomService,
    private readonly email: EmailService,
    private readonly audit: AuditStubService,
    private readonly config: AppConfigService,
  ) {}

  async sendInvitation(
    input: CreateInvitationInput,
    inviter: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<{ id: string; email: string; role: UserRole; expiresAt: Date }> {
    // Permission check
    if (inviter.role !== 'system_admin') {
      if (!MANAGER_ALLOWED_ROLES.includes(input.role as UserRoleName)) {
        throw new AuthInsufficientPermissionError(
          '管理者ロールへの招待は管理者のみが行えます',
        );
      }
    }

    const normalizedEmail = input.email.toLowerCase();

    // Check user does not already exist
    const existing = await this.users.findByEmail(
      normalizedEmail,
      undefined,
      true,
    );
    if (existing) throw new AuthUserExistsError();

    const existingPending =
      await this.invitations.findActiveByEmail(normalizedEmail);
    if (existingPending) {
      // Cancel old pending, allow re-invite
      await this.invitations.cancel(existingPending.id);
    }

    const tokenPlaintext = this.random.base64Url(32);
    const tokenHash = this.hashes.sha256(tokenPlaintext);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const invitation = await this.prisma.$transaction(async (tx) => {
      const inv = await this.invitations.create(
        {
          email: normalizedEmail,
          name: input.name ?? null,
          tokenHash,
          role: input.role,
          expiresAt,
          invitedById: inviter.id,
          projectId: input.projectId ?? null,
        },
        tx,
      );
      await this.audit.logInvitationCreated(
        inv.id,
        normalizedEmail,
        input.role,
        inviter.id,
        ctx,
        tx,
      );
      return inv;
    });

    const acceptUrl = `${this.config.get('FRONTEND_URL')}/accept-invite?token=${encodeURIComponent(tokenPlaintext)}`;

    await this.email.send({
      to: normalizedEmail,
      subject: '施工管理システム — 招待のご案内',
      template: 'invitation',
      vars: {
        name: input.name ?? normalizedEmail,
        email: normalizedEmail,
        inviterName: inviter.name,
        roleDisplay: ROLE_DISPLAY[input.role as UserRoleName],
        acceptUrl,
        expiresInHours: 24,
      },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt,
    };
  }

  async cancelInvitation(
    id: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<void> {
    const inv = await this.invitations.findById(id);
    if (!inv) throw new NotFoundError('invitation', id);

    // Manager can only cancel own invites
    if (actor.role !== 'system_admin' && inv.invitedById !== actor.id) {
      throw new AuthInsufficientPermissionError();
    }

    if (inv.usedAt || inv.cancelledAt) return; // idempotent

    await this.invitations.cancel(id);
    await this.audit.logInvitationCancelled(id, actor.id, ctx);
  }
}
