import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  AuthAccountLockedError,
} from '../../../shared/exceptions/auth-errors';
import { RequestContext } from '../domain/types';
import { AuditStubService } from '../internal/audit-stub.service';
import { UserRepository } from '../repositories/user.repository';

export type Tx = Prisma.TransactionClient | PrismaService;

const LAYER_1_THRESHOLD = 5;
const LAYER_1_WINDOW_MS = 15 * 60 * 1000;
const LAYER_1_LOCK_MS = 15 * 60 * 1000;
const LAYER_2_THRESHOLD = 10;

export interface LockoutCheckResult {
  layer1Locked: boolean;
  layer2Locked: boolean;
  lockedUntil?: Date;
}

@Injectable()
export class AccountLockoutService {
  constructor(
    private readonly users: UserRepository,
    private readonly audit: AuditStubService,
  ) {}

  /**
   * Throw AuthAccountLockedError if user is currently locked.
   */
  async assertNotLocked(userId: string, tx?: Tx): Promise<void> {
    const user = await this.users.findById(userId, tx);
    if (!user) return;
    if (user.requireAdminUnlock) {
      throw new AuthAccountLockedError(new Date(Date.now() + 24 * 60 * 60 * 1000), true);
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AuthAccountLockedError(user.lockedUntil, false);
    }
  }

  async recordFailedAttempt(
    userId: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<LockoutCheckResult> {
    const user = await this.users.findById(userId, tx);
    if (!user) return { layer1Locked: false, layer2Locked: false };

    const newCount = user.failedLoginAttempts + 1;
    let lockedUntil: Date | null = user.lockedUntil;
    let requireAdminUnlock = user.requireAdminUnlock;
    let layer1 = false;
    let layer2 = false;

    if (newCount >= LAYER_2_THRESHOLD) {
      lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      requireAdminUnlock = true;
      layer2 = true;
    } else if (newCount >= LAYER_1_THRESHOLD) {
      lockedUntil = new Date(Date.now() + LAYER_1_LOCK_MS);
      layer1 = true;
    }

    await this.users.update(
      userId,
      {
        failedLoginAttempts: newCount,
        lockedUntil,
        requireAdminUnlock,
      },
      tx,
    );

    if (layer2) {
      await this.audit.logAccountLocked(userId, 2, ctx, tx);
    } else if (layer1) {
      await this.audit.logAccountLocked(userId, 1, ctx, tx);
    }

    return {
      layer1Locked: layer1,
      layer2Locked: layer2,
      lockedUntil: lockedUntil ?? undefined,
    };
  }

  async resetAttempts(userId: string, tx?: Tx): Promise<void> {
    await this.users.update(
      userId,
      {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      tx,
    );
  }

  async manualUnlock(userId: string, actorId: string, ctx: RequestContext, tx?: Tx): Promise<void> {
    await this.users.update(
      userId,
      {
        failedLoginAttempts: 0,
        lockedUntil: null,
        requireAdminUnlock: false,
      },
      tx,
    );
    await this.audit.logAccountUnlocked(userId, actorId, ctx, tx);
  }
}
