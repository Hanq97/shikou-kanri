import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ListObCustomersQueryDto } from '../dto/list-ob-customers-query.dto';
import { ObCustomersService } from '../services/ob-customers.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('aftercare/ob-customers')
export class ObCustomersController {
  constructor(private readonly service: ObCustomersService) {}

  @Get()
  @Roles('system_admin', 'manager', 'employee')
  async list(@Query() query: ListObCustomersQueryDto) {
    return this.service.list({
      search: query.search,
      nextMaintenanceFrom: query.nextMaintenanceFrom
        ? new Date(query.nextMaintenanceFrom)
        : undefined,
      nextMaintenanceTo: query.nextMaintenanceTo
        ? new Date(query.nextMaintenanceTo)
        : undefined,
      overdueOnly: query.overdueOnly,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
    });
  }
}
