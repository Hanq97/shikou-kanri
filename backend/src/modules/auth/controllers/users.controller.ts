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
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { AuthenticatedUser, RequestContext } from '../domain/types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ChangeRoleDto } from '../dto/change-role.dto';
import { ChangeStatusDto } from '../dto/change-status.dto';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { EmergencyDisable2FaDto } from '../dto/emergency-disable-2fa.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { InvitationsService } from '../services/invitations.service';
import { UsersService } from '../services/users.service';

function buildCtx(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.header('user-agent') ?? null,
    traceId: (req as Request & { traceId?: string }).traceId ?? 'unknown',
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly invitations: InvitationsService,
  ) {}

  // === List & detail ===

  @Roles('system_admin', 'manager')
  @Get()
  async list(@Query() query: ListUsersQueryDto) {
    return this.users.list({
      search: query.search,
      role: query.role,
      status: query.status,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
    });
  }

  @Get(':id')
  async detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { user: await this.users.findById(id, user) };
  }

  // === Invitations ===

  @Roles('system_admin', 'manager')
  @Post('invitations')
  async createInvitation(
    @Body() dto: CreateInvitationDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const invitation = await this.invitations.sendInvitation(
      { email: dto.email, role: dto.role, name: dto.name },
      user,
      buildCtx(req),
    );
    return { invitation, message: '招待メールを送信しました。' };
  }

  @Roles('system_admin', 'manager')
  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvitation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.invitations.cancelInvitation(id, user, buildCtx(req));
  }

  // === Admin actions ===

  @Roles('system_admin')
  @Put(':id/role')
  async changeRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeRoleDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      user: await this.users.changeRole(id, dto.role, user, buildCtx(req)),
    };
  }

  @Roles('system_admin')
  @Put(':id/status')
  async changeStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeStatusDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      user: await this.users.changeStatus(id, dto.status, user, buildCtx(req)),
    };
  }

  @Put(':id/profile')
  async updateProfile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      user: await this.users.updateProfile(id, dto, user, buildCtx(req)),
    };
  }

  @Roles('system_admin')
  @Post(':id/unlock')
  async unlock(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { user: await this.users.unlockUser(id, user, buildCtx(req)) };
  }

  @Roles('system_admin')
  @Post(':id/2fa/disable')
  async adminEmergencyDisable2Fa(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: EmergencyDisable2FaDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      user: await this.users.emergencyDisable2Fa(
        id,
        dto.reason,
        user,
        buildCtx(req),
      ),
    };
  }

  @Roles('system_admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.users.softDelete(id, user, buildCtx(req));
  }
}
