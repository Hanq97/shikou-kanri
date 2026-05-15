import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../config/app-config.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { HashService } from '../../../shared/crypto/hash.service';
import {
  Auth2FaInvalidError,
  AuthAccountSuspendedError,
  AuthInvalidCredentialsError,
  AuthInvitationExpiredError,
  AuthInvitationInvalidError,
  AuthInvitationUsedError,
  AuthPasswordResetExpiredError,
  AuthPasswordResetInvalidError,
  AuthRefreshInvalidError,
} from '../../../shared/exceptions/auth-errors';
import { EmailService } from '../../notification/email.service';
import { AuthenticatedUser, RequestContext, TokenPair } from '../domain/types';
import { AuditStubService } from '../internal/audit-stub.service';
import { IntermediateTokenService } from '../internal/intermediate-token.service';
import { PasswordService } from '../internal/password.service';
import { TokenService } from '../internal/token.service';
import { TotpService } from '../internal/totp.service';
import { RandomService } from '../../../shared/crypto/random.service';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { UserRepository } from '../repositories/user.repository';
import { AccountLockoutService } from './account-lockout.service';

export type LoginResult =
  | { kind: 'success'; user: AuthenticatedUser; tokens: TokenPair }
  | { kind: 'requires2fa'; intermediateToken: string; expiresIn: number };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserRepository,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly intermediate: IntermediateTokenService,
    private readonly totp: TotpService,
    private readonly hashes: HashService,
    private readonly random: RandomService,
    private readonly lockout: AccountLockoutService,
    private readonly audit: AuditStubService,
    private readonly passwordResets: PasswordResetRepository,
    private readonly email: EmailService,
    private readonly config: AppConfigService,
  ) {}

  // === Login ===

  async login(email: string, password: string, ctx: RequestContext): Promise<LoginResult> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);

    // Constant-time-ish: verify password even if user not found
    const passwordValid = await this.password.verify(user?.passwordHash ?? null, password);

    if (!user || !passwordValid || user.deletedAt !== null) {
      if (user) {
        await this.prisma.$transaction(async (tx) => {
          await this.lockout.recordFailedAttempt(user.id, ctx, tx);
          await this.audit.logLoginFailure(normalizedEmail, 'invalid_credentials', ctx, tx);
        });
      } else {
        await this.audit.logLoginFailure(normalizedEmail, 'unknown_email', ctx);
      }
      throw new AuthInvalidCredentialsError();
    }

    if (user.status === 'suspended' || user.status === 'disabled') {
      throw new AuthAccountSuspendedError();
    }

    await this.lockout.assertNotLocked(user.id);

    // Reset failed attempts on successful password verify
    await this.lockout.resetAttempts(user.id);

    if (user.twoFaEnabled && user.twoFaSecret) {
      const { token: intermediateToken, expiresIn } = this.intermediate.issue(user.id);
      await this.audit.log(
        {
          actorUserId: user.id,
          action: 'auth.login.pending_2fa',
          entityType: 'user',
          entityId: user.id,
          ctx,
        },
      );
      return { kind: 'requires2fa', intermediateToken, expiresIn };
    }

    const tokens = await this.prisma.$transaction(async (tx) => {
      const pair = await this.tokens.issueTokenPair(user.id, user.role, user.email, ctx, tx);
      await this.users.setLastLoginAt(user.id, new Date(), tx);
      await this.audit.logLoginSuccess(user.id, ctx, tx);
      return pair;
    });

    return { kind: 'success', user: this.toAuthenticatedUser(user, false), tokens };
  }

  // === 2FA verify (TOTP) ===

  async verify2Fa(
    intermediateToken: string,
    code: string,
    useBackupCode: boolean,
    ctx: RequestContext,
  ): Promise<{ user: AuthenticatedUser; tokens: TokenPair; remainingBackupCodes?: number }> {
    const { userId } = this.intermediate.verify(intermediateToken);
    const user = await this.users.findById(userId);
    if (!user || user.deletedAt !== null || !user.twoFaEnabled || !user.twoFaSecret) {
      throw new Auth2FaInvalidError();
    }

    let remainingBackupCodes: number | undefined;

    if (useBackupCode) {
      if (!user.twoFaRecoveryCodes) throw new Auth2FaInvalidError();
      const result = this.totp.verifyAndConsumeBackupCode(code, user.twoFaRecoveryCodes);
      if (!result.valid || !result.updatedEncrypted) {
        await this.audit.log({
          actorUserId: user.id,
          action: 'auth.2fa.backup_code.failed',
          entityType: 'user',
          entityId: user.id,
          ctx,
        });
        throw new Auth2FaInvalidError();
      }
      await this.users.update(user.id, { twoFaRecoveryCodes: result.updatedEncrypted });
      remainingBackupCodes = result.remaining;
    } else {
      const secret = this.totp.decryptSecret(user.twoFaSecret);
      if (!this.totp.verify(code, secret)) {
        await this.audit.log({
          actorUserId: user.id,
          action: 'auth.2fa.failed',
          entityType: 'user',
          entityId: user.id,
          ctx,
        });
        throw new Auth2FaInvalidError();
      }
    }

    const tokens = await this.prisma.$transaction(async (tx) => {
      const pair = await this.tokens.issueTokenPair(user.id, user.role, user.email, ctx, tx);
      await this.users.setLastLoginAt(user.id, new Date(), tx);
      await this.audit.logLoginSuccess(user.id, ctx, tx);
      return pair;
    });

    return {
      user: this.toAuthenticatedUser(user, false),
      tokens,
      ...(remainingBackupCodes !== undefined ? { remainingBackupCodes } : {}),
    };
  }

  // === Refresh ===

  async refresh(refreshTokenPlaintext: string, ctx: RequestContext): Promise<TokenPair> {
    if (!refreshTokenPlaintext) throw new AuthRefreshInvalidError();
    return this.tokens.rotateTokenPair(refreshTokenPlaintext, ctx);
  }

  // === Logout ===

  async logout(refreshTokenPlaintext: string | null, userId: string, ctx: RequestContext): Promise<void> {
    if (refreshTokenPlaintext) {
      await this.tokens.revokeByPlaintext(refreshTokenPlaintext, 'logout');
    }
    await this.audit.logLogout(userId, ctx);
  }

  async logoutAll(userId: string, ctx: RequestContext): Promise<{ revokedCount: number }> {
    const revokedCount = await this.tokens.revokeAllForUser(userId, 'logout');
    await this.audit.logLogoutAll(userId, revokedCount, ctx);
    return { revokedCount };
  }

  // === Profile (/auth/me) ===

  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new AuthRefreshInvalidError();
    return this.toAuthenticatedUser(user, false);
  }

  // === Password change ===

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    currentRefreshTokenPlaintext: string | null,
    ctx: RequestContext,
  ): Promise<TokenPair> {
    const user = await this.users.findById(userId);
    if (!user) throw new AuthRefreshInvalidError();

    if (user.passwordHash) {
      const valid = await this.password.verify(user.passwordHash, oldPassword);
      if (!valid) throw new AuthInvalidCredentialsError();
    }

    this.password.validatePolicy(newPassword);
    const newHash = await this.password.hash(newPassword);

    const tokens = await this.prisma.$transaction(async (tx) => {
      await this.users.update(
        userId,
        {
          passwordHash: newHash,
          forcePasswordChange: false,
        },
        tx,
      );

      // Revoke all other refresh tokens
      const currentHash = currentRefreshTokenPlaintext
        ? this.tokens.hashRefreshToken(currentRefreshTokenPlaintext)
        : null;
      if (currentHash) {
        await this.tokens.revokeAllForUserExcept(userId, currentHash, 'password_change', tx);
      } else {
        await this.tokens.revokeAllForUser(userId, 'password_change', tx);
      }

      await this.audit.logPasswordChange(userId, ctx, tx);

      return this.tokens.issueTokenPair(userId, user.role, user.email, ctx, tx);
    });

    return tokens;
  }

  // === Password reset ===

  async requestPasswordReset(email: string, ctx: RequestContext): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user || user.deletedAt !== null) {
      // No-op to prevent enumeration; small artificial delay
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
      return;
    }

    // Rate limit: 3 per hour
    const recentCount = await this.passwordResets.countRecentForUser(user.id, 60 * 60 * 1000);
    if (recentCount >= 3) {
      // Silently skip to avoid enumeration; could still be valid in practice
      return;
    }

    const tokenPlaintext = this.random.base64Url(32);
    const tokenHash = this.hashes.sha256(tokenPlaintext);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await this.passwordResets.create({ userId: user.id, tokenHash, expiresAt });
    await this.audit.log({
      actorUserId: user.id,
      action: 'auth.password.reset_requested',
      entityType: 'user',
      entityId: user.id,
      ctx,
    });

    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${encodeURIComponent(tokenPlaintext)}`;

    await this.email.send({
      to: user.email,
      subject: '施工管理システム — パスワードリセット',
      template: 'password-reset',
      vars: {
        name: user.name,
        resetUrl,
      },
    });
  }

  async resetPassword(token: string, newPassword: string, ctx: RequestContext): Promise<void> {
    if (!token) throw new AuthPasswordResetInvalidError();
    const tokenHash = this.hashes.sha256(token);
    const record = await this.passwordResets.findByHash(tokenHash);
    if (!record) throw new AuthPasswordResetInvalidError();
    if (record.usedAt) throw new AuthPasswordResetInvalidError();
    if (record.expiresAt < new Date()) throw new AuthPasswordResetExpiredError();

    this.password.validatePolicy(newPassword);
    const passwordHash = await this.password.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await this.users.update(
        record.userId,
        {
          passwordHash,
          forcePasswordChange: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          requireAdminUnlock: false,
        },
        tx,
      );
      await this.passwordResets.markUsed(record.id, tx);
      await this.tokens.revokeAllForUser(record.userId, 'password_change', tx);
      await this.audit.logPasswordReset(record.userId, ctx, tx);
    });
  }

  // === 2FA enrollment ===

  async start2FaEnrollment(userId: string): Promise<{ secret: string; otpauthUri: string; qrCodeDataUrl: string }> {
    const user = await this.users.findById(userId);
    if (!user) throw new AuthRefreshInvalidError();

    const secret = this.totp.generateSecret();
    const otpauthUri = this.totp.buildOtpauthUri(user.email, secret);
    const qrCodeDataUrl = await this.totp.generateQrCode(otpauthUri);
    const encrypted = this.totp.encryptSecret(secret);

    await this.users.update(userId, {
      twoFaPendingSecret: encrypted,
      twoFaPendingUntil: new Date(Date.now() + 10 * 60 * 1000),
    });

    return { secret, otpauthUri, qrCodeDataUrl };
  }

  async verify2FaEnrollment(userId: string, code: string, ctx: RequestContext): Promise<{ backupCodes: string[] }> {
    const user = await this.users.findById(userId);
    if (!user || !user.twoFaPendingSecret) throw new Auth2FaInvalidError();
    if (user.twoFaPendingUntil && user.twoFaPendingUntil < new Date()) {
      throw new Auth2FaInvalidError();
    }

    const secret = this.totp.decryptSecret(user.twoFaPendingSecret);
    if (!this.totp.verify(code, secret)) throw new Auth2FaInvalidError();

    const backupCodes = this.totp.generateBackupCodes();
    const encryptedSecret = this.totp.encryptSecret(secret);
    const encryptedCodes = this.totp.encryptBackupCodes(backupCodes);

    await this.prisma.$transaction(async (tx) => {
      await this.users.update(
        userId,
        {
          twoFaEnabled: true,
          twoFaSecret: encryptedSecret,
          twoFaRecoveryCodes: encryptedCodes,
          twoFaPendingSecret: null,
          twoFaPendingUntil: null,
          forceTwoFaEnrollment: false,
        },
        tx,
      );
      await this.audit.log2FaEnroll(userId, ctx, tx);
    });

    return { backupCodes };
  }

  async disable2Fa(
    userId: string,
    password: string,
    code: string,
    useBackupCode: boolean,
    ctx: RequestContext,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user || !user.twoFaEnabled) throw new Auth2FaInvalidError();

    if (user.role === 'system_admin') {
      // Admin cannot self-disable (audit policy). Use admin emergency endpoint via another admin.
      throw new AuthInvalidCredentialsError();
    }

    const passwordValid = await this.password.verify(user.passwordHash, password);
    if (!passwordValid) throw new AuthInvalidCredentialsError();

    if (useBackupCode) {
      if (!user.twoFaRecoveryCodes) throw new Auth2FaInvalidError();
      const result = this.totp.verifyAndConsumeBackupCode(code, user.twoFaRecoveryCodes);
      if (!result.valid) throw new Auth2FaInvalidError();
    } else {
      if (!user.twoFaSecret) throw new Auth2FaInvalidError();
      const secret = this.totp.decryptSecret(user.twoFaSecret);
      if (!this.totp.verify(code, secret)) throw new Auth2FaInvalidError();
    }

    await this.prisma.$transaction(async (tx) => {
      await this.users.update(
        userId,
        {
          twoFaEnabled: false,
          twoFaSecret: null,
          twoFaRecoveryCodes: null,
        },
        tx,
      );
      await this.audit.log2FaDisable(userId, 'user_self', userId, ctx, tx);
    });
  }

  // === Invitation accept ===

  async getInvitationByToken(token: string): Promise<{
    email: string;
    role: string;
    name: string | null;
    expiresAt: Date;
  }> {
    if (!token) throw new AuthInvitationInvalidError();
    const tokenHash = this.hashes.sha256(token);
    // Lookup via repository would be cleaner; use prisma directly here
    const record = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { invitedBy: { select: { id: true, name: true, email: true } } },
    });
    if (!record) throw new AuthInvitationInvalidError();
    if (record.cancelledAt) throw new AuthInvitationInvalidError();
    if (record.usedAt) throw new AuthInvitationUsedError();
    if (record.expiresAt < new Date()) throw new AuthInvitationExpiredError();

    return {
      email: record.email,
      role: record.role,
      name: record.name,
      expiresAt: record.expiresAt,
    };
  }

  async acceptInvitation(
    token: string,
    password: string,
    ctx: RequestContext,
  ): Promise<{ user: AuthenticatedUser; tokens: TokenPair }> {
    if (!token) throw new AuthInvitationInvalidError();
    const tokenHash = this.hashes.sha256(token);
    const invitation = await this.prisma.invitation.findUnique({ where: { tokenHash } });
    if (!invitation) throw new AuthInvitationInvalidError();
    if (invitation.cancelledAt) throw new AuthInvitationInvalidError();
    if (invitation.usedAt) throw new AuthInvitationUsedError();
    if (invitation.expiresAt < new Date()) throw new AuthInvitationExpiredError();

    this.password.validatePolicy(password);
    const passwordHash = await this.password.hash(password);

    const { user, tokens } = await this.prisma.$transaction(async (tx) => {
      // Check existing user (created at invite time as pending_invite)
      let user = await this.users.findByEmail(invitation.email, tx, true);
      if (user && user.status === 'pending_invite') {
        user = await this.users.update(
          user.id,
          {
            passwordHash,
            status: 'active',
            emailVerified: true,
            name: invitation.name ?? user.name,
            role: invitation.role,
          },
          tx,
        );
      } else if (!user) {
        user = await this.users.create(
          {
            email: invitation.email,
            name: invitation.name ?? invitation.email,
            role: invitation.role,
            status: 'active',
            passwordHash,
            createdById: invitation.invitedById,
          },
          tx,
        );
      } else {
        throw new AuthInvitationInvalidError();
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      });

      await this.audit.logInvitationAccepted(invitation.id, user.id, ctx, tx);

      const pair = await this.tokens.issueTokenPair(user.id, user.role, user.email, ctx, tx);
      await this.users.setLastLoginAt(user.id, new Date(), tx);

      return { user, tokens: pair };
    });

    return { user: this.toAuthenticatedUser(user, false), tokens };
  }

  // === Helpers ===

  toAuthenticatedUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    twoFaEnabled: boolean;
    forcePasswordChange: boolean;
    forceTwoFaEnrollment: boolean;
  }, _includeSensitive: boolean): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthenticatedUser['role'],
      status: user.status as AuthenticatedUser['status'],
      twoFaEnabled: user.twoFaEnabled,
      forcePasswordChange: user.forcePasswordChange,
      forceTwoFaEnrollment: user.forceTwoFaEnrollment,
    };
  }
}
