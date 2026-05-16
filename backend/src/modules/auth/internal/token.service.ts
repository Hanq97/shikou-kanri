import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, RefreshTokenRevokedReason } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../../../config/app-config.service';
import { HashService } from '../../../shared/crypto/hash.service';
import { RandomService } from '../../../shared/crypto/random.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  AuthRefreshInvalidError,
  AuthRefreshReuseDetectedError,
  AuthTokenExpiredError,
  AuthTokenInvalidError,
} from '../../../shared/exceptions/auth-errors';
import {
  JwtAccessPayload,
  RequestContext,
  TokenPair,
  UserRoleName,
} from '../domain/types';

const MAX_ACTIVE_REFRESH_PER_USER = 5;
const ACCESS_TTL_SECONDS = 30 * 60; // 30 min
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly hashes: HashService,
    private readonly random: RandomService,
    private readonly config: AppConfigService,
  ) {}

  get accessTtlSeconds(): number {
    return ACCESS_TTL_SECONDS;
  }

  get refreshTtlSeconds(): number {
    return REFRESH_TTL_SECONDS;
  }

  signAccessToken(payload: Omit<JwtAccessPayload, 'jti'>): {
    token: string;
    jti: string;
  } {
    const jti = randomUUID();
    const token = this.jwt.sign(
      { ...payload, jti },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_TTL'),
      },
    );
    return { token, jti };
  }

  verifyAccessToken(token: string): JwtAccessPayload {
    try {
      return this.jwt.verify<JwtAccessPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
    } catch (err) {
      if ((err as Error).name === 'TokenExpiredError')
        throw new AuthTokenExpiredError();
      throw new AuthTokenInvalidError();
    }
  }

  generateRefreshToken(): { plaintext: string; hash: string } {
    const plaintext = this.random.base64Url(48); // 384-bit, plenty
    const hash = this.hashes.sha256(plaintext);
    return { plaintext, hash };
  }

  hashRefreshToken(plaintext: string): string {
    return this.hashes.sha256(plaintext);
  }

  /**
   * Issue brand new token pair (new family). Used on login + invitation accept + 2FA verify success.
   */
  async issueTokenPair(
    userId: string,
    role: UserRoleName,
    email: string,
    ctx: RequestContext,
    tx?: Tx,
  ): Promise<TokenPair> {
    const client = tx ?? this.prisma;
    const { plaintext, hash } = this.generateRefreshToken();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

    await this.enforceMaxActive(client, userId);

    await client.refreshToken.create({
      data: {
        userId,
        tokenHash: hash,
        familyId,
        lineageSeq: 0,
        expiresAt,
        userAgent: ctx.userAgent ?? undefined,
        ipAddress: ctx.ipAddress ?? undefined,
      },
    });

    const { token: accessToken } = this.signAccessToken({
      sub: userId,
      email,
      role,
    });

    return {
      accessToken,
      refreshToken: plaintext,
      accessExpiresIn: ACCESS_TTL_SECONDS,
      refreshExpiresIn: REFRESH_TTL_SECONDS,
    };
  }

  /**
   * Rotate token pair. Reuse detection → revoke entire family.
   */
  async rotateTokenPair(
    currentRefreshPlaintext: string,
    ctx: RequestContext,
  ): Promise<TokenPair> {
    return this.prisma.$transaction(async (tx) => {
      const tokenHash = this.hashRefreshToken(currentRefreshPlaintext);
      const current = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!current) throw new AuthRefreshInvalidError();
      if (current.expiresAt < new Date()) throw new AuthTokenExpiredError();

      if (current.revokedAt !== null) {
        // Reuse detected — revoke entire family
        await tx.refreshToken.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: 'family_revoked' },
        });
        throw new AuthRefreshReuseDetectedError();
      }

      const user = current.user;
      if (!user || user.deletedAt !== null || user.status !== 'active') {
        throw new AuthRefreshInvalidError();
      }

      // Revoke current
      await tx.refreshToken.update({
        where: { id: current.id },
        data: { revokedAt: new Date(), revokedReason: 'rotated' },
      });

      // Issue new in same family
      const { plaintext, hash } = this.generateRefreshToken();
      const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          familyId: current.familyId,
          lineageSeq: current.lineageSeq + 1,
          expiresAt,
          userAgent: ctx.userAgent ?? undefined,
          ipAddress: ctx.ipAddress ?? undefined,
        },
      });

      const { token: accessToken } = this.signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role as UserRoleName,
      });

      return {
        accessToken,
        refreshToken: plaintext,
        accessExpiresIn: ACCESS_TTL_SECONDS,
        refreshExpiresIn: REFRESH_TTL_SECONDS,
      };
    });
  }

  async revokeByPlaintext(
    plaintext: string,
    reason: RefreshTokenRevokedReason,
    tx?: Tx,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const tokenHash = this.hashRefreshToken(plaintext);
    await client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeAllForUser(
    userId: string,
    reason: RefreshTokenRevokedReason,
    tx?: Tx,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return result.count;
  }

  async revokeAllForUserExcept(
    userId: string,
    keepTokenHash: string,
    reason: RefreshTokenRevokedReason,
    tx?: Tx,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.refreshToken.updateMany({
      where: { userId, revokedAt: null, NOT: { tokenHash: keepTokenHash } },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return result.count;
  }

  private async enforceMaxActive(client: Tx, userId: string): Promise<void> {
    const active = await client.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { issuedAt: 'asc' },
    });

    if (active.length < MAX_ACTIVE_REFRESH_PER_USER) return;

    // Revoke oldest to bring count back to MAX-1 (so we can add 1 new)
    const toRevoke = active.slice(
      0,
      active.length - MAX_ACTIVE_REFRESH_PER_USER + 1,
    );
    await client.refreshToken.updateMany({
      where: { id: { in: toRevoke.map((t) => t.id) } },
      data: { revokedAt: new Date(), revokedReason: 'admin_revoke' },
    });
  }
}
