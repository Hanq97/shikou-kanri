import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { AuthModule } from '../modules/auth';
import { NotificationModule } from '../modules/notification';
import { CryptoModule } from '../shared/crypto/crypto.module';
import { PrismaModule } from '../shared/database/prisma.module';
import { HttpHelpersModule } from '../shared/http/http.module';
import { AppLoggerModule } from '../shared/observability/logger.module';
import { BootstrapCreateAdminCommand } from './bootstrap-create-admin.command';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    CryptoModule,
    HttpHelpersModule,
    NotificationModule,
    AuthModule,
  ],
  providers: [BootstrapCreateAdminCommand],
})
export class CliModule {}
