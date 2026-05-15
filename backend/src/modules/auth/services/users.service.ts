import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  AuthInsufficientPermissionError,
  AuthLastAdminError,
} from '../../../shared/exceptions/auth-errors';
import { NotFoundError } from '../../../shared/exceptions/app-error';
import { AuthenticatedUser, RequestContext } from '../domain/types';
import { AuditStubService } from '../internal/audit-stub.service';
import { TokenService } from '../internal/token.service';
import { ListUsersFilter, UserRepository } from '../repositories/user.repository';
import { AccountLockoutService } from './account-lockout.service';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  nameKana: string | null;
  role: UserRole;
  status: UserStatus;
  twoFaEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly lockout: AccountLockoutService,
    private readonly audit: AuditStubService,
  ) {}

  async list(filter: ListUsersFilter): Promise<{ data: UserDto[]; total: number; page: number; pageSize: number }> {
    const result = await this.users.list(filter);
    return {
      data: result.data.map((u) => this.toDto(u)),
      total: result.total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findById(id: string, requester: AuthenticatedUser): Promise<UserDto> {
    const isSelf = id === requester.id;
    const allowed = isSelf || requester.role === 'system_admin' || requester.role === 'manager';
    if (!allowed) throw new AuthInsufficientPermissionError();

    const user = await this.users.findById(id, undefined, requester.role === 'system_admin');
    if (!user) throw new NotFoundError('user', id);
    return this.toDto(user);
  }

  async changeRole(
    userId: string,
    newRole: UserRole,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<UserDto> {
    if (actor.role !== 'system_admin') throw new AuthInsufficientPermissionError();

    return this.prisma.$transaction(async (tx) => {
      const user = await this.users.findById(userId, tx);
      if (!user) throw new NotFoundError('user', userId);
      if (user.role === newRole) return this.toDto(user);

      // Last admin protection
      if (user.role === 'system_admin' && newRole !== 'system_admin') {
        const adminCount = await this.users.countByRole('system_admin', true, tx);
        if (adminCount <= 1) throw new AuthLastAdminError();
      }

      const updatePayload: Prisma.UserUpdateInput = {
        role: newRole,
        updatedById: actor.id,
        // If promoted to admin and no 2FA → force enrollment
        ...(newRole === 'system_admin' && !user.twoFaEnabled
          ? { forceTwoFaEnrollment: true }
          : {}),
      };

      const updated = await this.users.update(userId, updatePayload, tx);
      await this.audit.logRoleChange(userId, user.role, newRole, actor.id, ctx, tx);
      return this.toDto(updated);
    });
  }

  async changeStatus(
    userId: string,
    newStatus: UserStatus,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<UserDto> {
    if (actor.role !== 'system_admin') throw new AuthInsufficientPermissionError();

    return this.prisma.$transaction(async (tx) => {
      const user = await this.users.findById(userId, tx);
      if (!user) throw new NotFoundError('user', userId);
      if (user.status === newStatus) return this.toDto(user);

      // Last admin protection
      if (user.role === 'system_admin' && newStatus !== 'active') {
        const adminCount = await this.users.countByRole('system_admin', true, tx);
        if (adminCount <= 1) throw new AuthLastAdminError();
      }

      const updated = await this.users.update(
        userId,
        { status: newStatus, updatedById: actor.id },
        tx,
      );

      if (newStatus !== 'active') {
        await this.tokens.revokeAllForUser(
          userId,
          newStatus === 'suspended' ? 'account_suspended' : 'account_disabled',
          tx,
        );
      }

      await this.audit.logStatusChange(userId, user.status, newStatus, actor.id, ctx, tx);
      return this.toDto(updated);
    });
  }

  async updateProfile(
    userId: string,
    input: { name?: string; nameKana?: string | null },
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<UserDto> {
    const isSelf = userId === actor.id;
    if (!isSelf && actor.role !== 'system_admin') {
      throw new AuthInsufficientPermissionError();
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await this.users.findById(userId, tx);
      if (!user) throw new NotFoundError('user', userId);

      const changes: Record<string, { from: unknown; to: unknown }> = {};
      const data: Prisma.UserUpdateInput = { updatedById: actor.id };

      if (input.name !== undefined && input.name !== user.name) {
        data.name = input.name;
        changes.name = { from: user.name, to: input.name };
      }
      if (input.nameKana !== undefined && input.nameKana !== user.nameKana) {
        data.nameKana = input.nameKana;
        changes.nameKana = { from: user.nameKana, to: input.nameKana };
      }

      const updated = await this.users.update(userId, data, tx);
      if (Object.keys(changes).length > 0) {
        await this.audit.log(
          {
            actorUserId: actor.id,
            action: 'user.profile.updated',
            entityType: 'user',
            entityId: userId,
            changes,
            ctx,
          },
          tx,
        );
      }
      return this.toDto(updated);
    });
  }

  async unlockUser(userId: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<UserDto> {
    if (actor.role !== 'system_admin') throw new AuthInsufficientPermissionError();

    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('user', userId);

    await this.lockout.manualUnlock(userId, actor.id, ctx);
    const updated = await this.users.findById(userId);
    return this.toDto(updated!);
  }

  async emergencyDisable2Fa(
    userId: string,
    reason: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<UserDto> {
    if (actor.role !== 'system_admin') throw new AuthInsufficientPermissionError();
    if (userId === actor.id) {
      throw new AuthInsufficientPermissionError('管理者自身の2要素認証を緊急解除することはできません');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await this.users.findById(userId, tx);
      if (!user) throw new NotFoundError('user', userId);

      const updated = await this.users.update(
        userId,
        {
          twoFaEnabled: false,
          twoFaSecret: null,
          twoFaRecoveryCodes: null,
          ...(user.role === 'system_admin' ? { forceTwoFaEnrollment: true } : {}),
          updatedById: actor.id,
        },
        tx,
      );

      await this.audit.log(
        {
          actorUserId: actor.id,
          action: 'auth.2fa.admin_disable',
          entityType: 'user',
          entityId: userId,
          changes: { reason },
          ctx,
        },
        tx,
      );

      // Revoke all sessions to force re-login + re-enroll
      await this.tokens.revokeAllForUser(userId, 'admin_revoke', tx);

      return this.toDto(updated);
    });
  }

  async softDelete(userId: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    if (actor.role !== 'system_admin') throw new AuthInsufficientPermissionError();
    if (userId === actor.id) {
      throw new AuthInsufficientPermissionError('自分自身を削除することはできません');
    }

    await this.prisma.$transaction(async (tx) => {
      const user = await this.users.findById(userId, tx);
      if (!user) throw new NotFoundError('user', userId);

      if (user.role === 'system_admin') {
        const adminCount = await this.users.countByRole('system_admin', true, tx);
        if (adminCount <= 1) throw new AuthLastAdminError();
      }

      await this.users.softDelete(userId, actor.id, tx);
      await this.tokens.revokeAllForUser(userId, 'admin_revoke', tx);
      await this.audit.logUserDeleted(userId, actor.id, ctx, tx);
    });
  }

  // === DTO ===

  toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      nameKana: user.nameKana,
      role: user.role,
      status: user.status,
      twoFaEnabled: user.twoFaEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }
}
