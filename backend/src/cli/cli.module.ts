import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { AftercareModule } from '../modules/aftercare/aftercare.module';
import { AuthModule } from '../modules/auth';
import { NotificationModule } from '../modules/notification';
import { CryptoModule } from '../shared/crypto/crypto.module';
import { PrismaModule } from '../shared/database/prisma.module';
import { HttpHelpersModule } from '../shared/http/http.module';
import { AppLoggerModule } from '../shared/observability/logger.module';
import { AftercareRunBatchCommand } from './aftercare-batch.command';
import { BootstrapCreateAdminCommand } from './bootstrap-create-admin.command';
import { EmergencyDisable2FaCommand } from './emergency-disable-2fa.command';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    CryptoModule,
    HttpHelpersModule,
    NotificationModule,
    AuthModule,
    AftercareModule,
  ],
  providers: [
    BootstrapCreateAdminCommand,
    EmergencyDisable2FaCommand,
    AftercareRunBatchCommand,
  ],
})
export class CliModule {}
