import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/domain/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateAftercareRecordDto } from '../dto/create-aftercare-record.dto';
import { ListAftercareRecordsQueryDto } from '../dto/list-aftercare-records-query.dto';
import { UpdateAftercareRecordDto } from '../dto/update-aftercare-record.dto';
import { AftercareRecordsService } from '../services/aftercare-records.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('aftercare/records')
export class AftercareRecordsController {
  constructor(private readonly service: AftercareRecordsService) {}

  @Get()
  @Roles('system_admin', 'manager', 'employee')
  async list(@Query() query: ListAftercareRecordsQueryDto) {
    return this.service.list({
      customerId: query.customerId,
      propertyId: query.propertyId,
      status: query.status,
      recordType: query.recordType,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
    });
  }

  @Get(':id')
  @Roles('system_admin', 'manager', 'employee')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('system_admin', 'manager', 'employee')
  async create(
    @Body() dto: CreateAftercareRecordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('system_admin', 'manager', 'employee')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAftercareRecordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('system_admin', 'manager')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.softDelete(id);
  }
}
