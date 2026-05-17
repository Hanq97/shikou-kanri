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
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { ListCustomersQueryDto } from '../dto/list-customers-query.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { CustomersService } from '../services/customers.service';
import { PropertiesService } from '../services/properties.service';

function buildCtx(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.header('user-agent') ?? null,
    traceId: (req as Request & { traceId?: string }).traceId ?? 'unknown',
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly service: CustomersService,
    private readonly properties: PropertiesService,
  ) {}

  @Get()
  @Roles('system_admin', 'manager', 'employee')
  async list(
    @Query() query: ListCustomersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(
      {
        search: query.search,
        isOb: query.isOb,
        sortBy: query.sortBy ?? 'createdAt',
        sortOrder: query.sortOrder ?? 'desc',
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 50,
      },
      user,
    );
  }

  @Get(':id')
  @Roles('system_admin', 'manager', 'employee')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { customer: await this.service.findById(id, user) };
  }

  @Get(':id/properties')
  @Roles('system_admin', 'manager', 'employee')
  async getProperties(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.properties.listByCustomer(id, user) };
  }

  @Get(':id/projects')
  @Roles('system_admin', 'manager', 'employee')
  async getProjects(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.service.listProjectsByCustomer(id, user) };
  }

  @Post()
  @Roles('system_admin', 'manager', 'employee')
  async create(
    @Body() dto: CreateCustomerDto,
    @Query('force') force: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.create(
      dto,
      user,
      buildCtx(req),
      force === 'true',
    );
    if (result.kind === 'duplicate') {
      return { duplicateOf: result.duplicateOf };
    }
    return { customer: result.customer };
  }

  @Put(':id')
  @Roles('system_admin', 'manager', 'employee')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCustomerDto,
    @Query('force') force: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.update(
      id,
      dto,
      user,
      buildCtx(req),
      force === 'true',
    );
    if (result.kind === 'duplicate') {
      return { duplicateOf: result.duplicateOf };
    }
    return { customer: result.customer };
  }

  @Delete(':id')
  @Roles('system_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.softDelete(id, user, buildCtx(req));
  }
}
