import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigService } from '../../config/app-config.service';
import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Require2FaGuard } from './guards/require-2fa.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditStubService } from './internal/audit-stub.service';
import { IntermediateTokenService } from './internal/intermediate-token.service';
import { PasswordService } from './internal/password.service';
import { TokenService } from './internal/token.service';
import { TotpService } from './internal/totp.service';
import { InvitationRepository } from './repositories/invitation.repository';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserRepository } from './repositories/user.repository';
import { AccountLockoutService } from './services/account-lockout.service';
import { AuthService } from './services/auth.service';
import { InvitationsService } from './services/invitations.service';
import { UsersService } from './services/users.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get('JWT_ACCESS_TTL') },
      }),
    }),
    ThrottlerModule.forRoot([
      // Global short-window throttle — applies to every endpoint
      { name: 'short', ttl: 60_000, limit: 100 },
      // Named throttler 'login' — high default so it acts as no-op unless overridden.
      // Sensitive endpoints (login, password reset, 2FA verify) tighten via
      // @Throttle({ login: { limit: N, ttl: M } }) decorator.
      { name: 'login', ttl: 900_000, limit: 100_000 },
    ]),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    UsersService,
    InvitationsService,
    AccountLockoutService,
    PasswordService,
    TokenService,
    IntermediateTokenService,
    TotpService,
    AuditStubService,
    UserRepository,
    RefreshTokenRepository,
    PasswordResetRepository,
    InvitationRepository,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    Require2FaGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [
    AuthService,
    UsersService,
    InvitationsService,
    PasswordService,
    TokenService,
    IntermediateTokenService,
    TotpService,
    AuditStubService,
    UserRepository,
    RefreshTokenRepository,
    PasswordResetRepository,
    InvitationRepository,
    JwtAuthGuard,
    RolesGuard,
    Require2FaGuard,
  ],
})
export class AuthModule {}
