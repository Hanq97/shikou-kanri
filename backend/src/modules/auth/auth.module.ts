import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigService } from '../../config/app-config.service';
import { AuthController } from './controllers/auth.controller';
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
      { name: 'short', ttl: 60_000, limit: 100 },
      { name: 'login', ttl: 900_000, limit: 5 },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
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
