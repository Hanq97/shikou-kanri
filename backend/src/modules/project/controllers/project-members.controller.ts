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
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { InvitationsService } from '../../auth/services/invitations.service';
import { AddMemberDto } from '../dto/add-member.dto';
import { InviteWorkerDto } from '../dto/invite-worker.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { ProjectMembersService } from '../services/project-members.service';

function buildCtx(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.header('user-agent') ?? null,
    traceId: (req as Request & { traceId?: string }).traceId ?? 'unknown',
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/members')
export class ProjectMembersController {
  constructor(
    private readonly service: ProjectMembersService,
    private readonly invitations: InvitationsService,
  ) {}

  @Post('invite-worker')
  @Roles('system_admin', 'manager', 'employee')
  async inviteWorker(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: InviteWorkerDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const inv = await this.invitations.sendInvitation(
      {
        email: dto.email,
        role: 'invited',
        name: dto.name,
        projectId,
      },
      user,
      buildCtx(req),
    );
    return { invitation: inv, message: '招待メールを送信しました。' };
  }

  @Get()
  @Roles('system_admin', 'manager', 'employee', 'invited')
  async list(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.service.list(projectId, user) };
  }

  @Post()
  @Roles('system_admin', 'manager', 'employee')
  async add(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: AddMemberDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const member = await this.service.add(
      projectId,
      dto.userId,
      dto.roleOnProject,
      user,
      buildCtx(req),
    );
    return { member };
  }

  @Put(':userId')
  @Roles('system_admin', 'manager', 'employee')
  async updateRole(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const member = await this.service.updateRole(
      projectId,
      userId,
      dto.roleOnProject,
      user,
      buildCtx(req),
    );
    return { member };
  }

  @Delete(':userId')
  @Roles('system_admin', 'manager', 'employee')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.remove(projectId, userId, user, buildCtx(req));
  }
}
