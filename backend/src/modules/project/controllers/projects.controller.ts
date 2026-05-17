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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ChangeStatusDto } from '../dto/change-status.dto';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ListProjectsQueryDto } from '../dto/list-projects-query.dto';
import { ReverseStatusDto } from '../dto/reverse-status.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectExportService } from '../services/project-export.service';
import { ProjectFoldersService } from '../services/project-folders.service';
import { ProjectStatusMachineService } from '../services/project-status-machine.service';
import { ProjectsService } from '../services/projects.service';

function buildCtx(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.header('user-agent') ?? null,
    traceId: (req as Request & { traceId?: string }).traceId ?? 'unknown',
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly service: ProjectsService,
    private readonly statusMachine: ProjectStatusMachineService,
    private readonly folders: ProjectFoldersService,
    private readonly exporter: ProjectExportService,
  ) {}

  @Get()
  @Roles('system_admin', 'manager', 'employee', 'invited')
  async list(
    @Query() query: ListProjectsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(
      {
        search: query.search,
        status: query.status,
        customerId: query.customerId,
        ownerUserId: query.ownerUserId,
        projectType: query.projectType,
        from: query.from,
        to: query.to,
        sortBy: query.sortBy ?? 'createdAt',
        sortOrder: query.sortOrder ?? 'desc',
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 50,
      },
      user,
    );
  }

  @Get('export.csv')
  @Roles('system_admin', 'manager')
  async exportCsv(
    @Query() query: ListProjectsQueryDto,
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.exporter.exportCsv(
      {
        search: query.search,
        status: query.status,
        customerId: query.customerId,
        ownerUserId: query.ownerUserId,
        projectType: query.projectType,
        from: query.from,
        to: query.to,
        sortBy: query.sortBy ?? 'createdAt',
        sortOrder: query.sortOrder ?? 'desc',
      },
      user,
      buildCtx(req),
      res,
    );
  }

  @Get(':id')
  @Roles('system_admin', 'manager', 'employee', 'invited')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { project: await this.service.findById(id, user) };
  }

  @Get(':id/folders')
  @Roles('system_admin', 'manager', 'employee', 'invited')
  async listFolders(@Param('id', new ParseUUIDPipe()) id: string) {
    return { data: await this.folders.list(id) };
  }

  @Post()
  @Roles('system_admin', 'manager', 'employee')
  async create(
    @Body() dto: CreateProjectDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const project = await this.service.create(dto, user, buildCtx(req));
    return { project };
  }

  @Put(':id')
  @Roles('system_admin', 'manager', 'employee')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const project = await this.service.update(id, dto, user, buildCtx(req));
    return { project };
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

  @Post(':id/status')
  @Roles('system_admin', 'manager', 'employee')
  async changeStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeStatusDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const project = await this.statusMachine.transition(
      id,
      dto.status,
      { amountTotal: dto.amountTotal, reason: dto.reason },
      user,
      buildCtx(req),
    );
    return { project };
  }

  @Post(':id/status/reverse')
  @Roles('system_admin')
  async reverseStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReverseStatusDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const project = await this.statusMachine.reverseTransition(
      id,
      dto.status,
      dto.reason,
      user,
      buildCtx(req),
    );
    return { project };
  }
}
