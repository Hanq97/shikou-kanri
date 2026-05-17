import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { PropertiesService } from '../services/properties.service';

function buildCtx(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.header('user-agent') ?? null,
    traceId: (req as Request & { traceId?: string }).traceId ?? 'unknown',
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('properties')
export class PropertiesController {
  constructor(private readonly service: PropertiesService) {}

  @Get()
  @Roles('system_admin', 'manager', 'employee')
  async list(
    @Query('customerId', new ParseUUIDPipe()) customerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.service.listByCustomer(customerId, user) };
  }

  @Get(':id')
  @Roles('system_admin', 'manager', 'employee')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { property: await this.service.findById(id, user) };
  }

  @Post()
  @Roles('system_admin', 'manager', 'employee')
  async create(
    @Body() dto: CreatePropertyDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { property: await this.service.create(dto, user, buildCtx(req)) };
  }

  @Put(':id')
  @Roles('system_admin', 'manager', 'employee')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePropertyDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      property: await this.service.update(id, dto, user, buildCtx(req)),
    };
  }

  @Delete(':id')
  @Roles('system_admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.softDelete(id, user, buildCtx(req));
  }
}
