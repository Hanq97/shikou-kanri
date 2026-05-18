import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ListAuditLogsQueryDto } from '../dto/list-audit-logs-query.dto';
import { AuditLogsService } from '../services/audit-logs.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @Roles('system_admin')
  async list(@Query() query: ListAuditLogsQueryDto) {
    return this.service.list({
      actorUserId: query.actorUserId,
      action: query.action,
      entityType: query.entityType,
      search: query.search,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
    });
  }
}
