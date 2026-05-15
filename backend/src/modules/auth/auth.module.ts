import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigService } from '../../config/app-config.service';
import { AuditStubService } from './internal/audit-stub.service';
import { IntermediateTokenService } from './internal/intermediate-token.service';
import { PasswordService } from './internal/password.service';
import { TokenService } from './internal/token.service';
import { TotpService } from './internal/totp.service';
import { InvitationRepository } from './repositories/invitation.repository';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [
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
  providers: [
    PasswordService,
    TokenService,
    IntermediateTokenService,
    TotpService,
    AuditStubService,
    UserRepository,
    RefreshTokenRepository,
    PasswordResetRepository,
    InvitationRepository,
  ],
  exports: [
    PasswordService,
    TokenService,
    IntermediateTokenService,
    TotpService,
    AuditStubService,
    UserRepository,
    RefreshTokenRepository,
    PasswordResetRepository,
    InvitationRepository,
  ],
})
export class AuthModule {}
