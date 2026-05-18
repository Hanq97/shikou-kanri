import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLogsService } from './services/audit-logs.service';

@Module({
  imports: [AuthModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogRepository],
  exports: [AuditLogsService, AuditLogRepository],
})
export class AuditModule {}
