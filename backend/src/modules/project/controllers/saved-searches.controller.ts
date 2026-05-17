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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../../auth/domain/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  CreateSavedSearchDto,
  ListSavedSearchesQueryDto,
} from '../dto/saved-search.dto';
import { SavedSearchesService } from '../services/saved-searches.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('saved-searches')
export class SavedSearchesController {
  constructor(private readonly service: SavedSearchesService) {}

  @Get()
  @Roles('system_admin', 'manager', 'employee')
  async list(
    @Query() query: ListSavedSearchesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.service.list(user, query.scope) };
  }

  @Post()
  @Roles('system_admin', 'manager', 'employee')
  async create(
    @Body() dto: CreateSavedSearchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { savedSearch: await this.service.create(dto, user) };
  }

  @Delete(':id')
  @Roles('system_admin', 'manager', 'employee')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.delete(id, user);
  }
}
