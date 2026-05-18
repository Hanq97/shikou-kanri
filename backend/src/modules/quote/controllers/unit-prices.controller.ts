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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../../auth/domain/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateUnitPriceDto } from '../dto/create-unit-price.dto';
import { ListUnitPricesQueryDto } from '../dto/list-unit-prices-query.dto';
import { UpdateUnitPriceDto } from '../dto/update-unit-price.dto';
import { UnitPricesService } from '../services/unit-prices.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('unit-prices')
export class UnitPricesController {
  constructor(private readonly service: UnitPricesService) {}

  @Get()
  @Roles('system_admin', 'manager', 'employee')
  async list(
    @Query() query: ListUnitPricesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(
      {
        search: query.search,
        category: query.category,
        isActive: query.isActive,
        sortBy: query.sortBy ?? 'itemName',
        sortOrder: query.sortOrder ?? 'asc',
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 50,
      },
      user,
    );
  }

  @Post()
  @Roles('system_admin')
  async create(
    @Body() dto: CreateUnitPriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { unitPrice: await this.service.create(dto, user) };
  }

  @Put(':id')
  @Roles('system_admin')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUnitPriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { unitPrice: await this.service.update(id, dto, user) };
  }

  @Delete(':id')
  @Roles('system_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.service.softDelete(id, user);
  }
}
