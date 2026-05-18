import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AftercareRecordsService } from '../services/aftercare-records.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('aftercare/customers')
export class AftercareTimelineController {
  constructor(private readonly service: AftercareRecordsService) {}

  @Get(':customerId/timeline')
  @Roles('system_admin', 'manager', 'employee')
  async timeline(@Param('customerId', new ParseUUIDPipe()) customerId: string) {
    return { items: await this.service.timelineForCustomer(customerId) };
  }
}
