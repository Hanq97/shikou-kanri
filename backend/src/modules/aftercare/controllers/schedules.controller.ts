import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/domain/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ListSchedulesQueryDto } from '../dto/list-schedules-query.dto';
import { SchedulesService } from '../services/schedules.service';

class MarkCompletedBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

class CancelBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('aftercare/schedules')
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get()
  @Roles('system_admin', 'manager', 'employee')
  async list(@Query() query: ListSchedulesQueryDto) {
    return this.service.list({
      customerId: query.customerId,
      propertyId: query.propertyId,
      status: query.status,
      scheduleType: query.scheduleType,
      scheduledFrom: query.scheduledFrom
        ? new Date(query.scheduledFrom)
        : undefined,
      scheduledTo: query.scheduledTo ? new Date(query.scheduledTo) : undefined,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
    });
  }

  @Get(':id')
  @Roles('system_admin', 'manager', 'employee')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post(':id/mark-completed')
  @HttpCode(HttpStatus.OK)
  @Roles('system_admin', 'manager', 'employee')
  async markCompleted(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: MarkCompletedBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.markCompleted(id, user, body.notes);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('system_admin', 'manager')
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CancelBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.cancel(id, user, body.reason);
  }

  @Post('regenerate-for-property/:propertyId')
  @HttpCode(HttpStatus.OK)
  @Roles('system_admin', 'manager')
  async regenerate(
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.regenerateForProperty(propertyId, user);
  }
}
