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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/domain/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateMessageDto } from '../dto/create-message.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { ChatService } from '../services/chat.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/chat')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get('messages')
  @Roles('system_admin', 'manager', 'employee', 'invited')
  async list(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Query() query: ListMessagesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(
      projectId,
      user,
      query.page ?? 1,
      query.pageSize ?? 50,
    );
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  @Roles('system_admin', 'manager', 'employee', 'invited')
  async create(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(projectId, user, dto);
  }

  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('system_admin', 'manager', 'employee', 'invited')
  async remove(
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.service.delete(messageId, user);
  }

  @Post('messages/:messageId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('system_admin', 'manager', 'employee', 'invited')
  async markRead(
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.service.markRead(messageId, user);
  }

  @Get('unread-count')
  @Roles('system_admin', 'manager', 'employee', 'invited')
  async unreadCount(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { count: await this.service.unreadCount(projectId, user) };
  }

  @Get('attachments/:attachmentId')
  @Roles('system_admin', 'manager', 'employee', 'invited')
  async getAttachment(
    @Param('attachmentId', new ParseUUIDPipe()) attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const att = await this.service.getAttachment(attachmentId, user);
    const buf = Buffer.from(att.dataBase64, 'base64');
    res.set({
      'Content-Type': att.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(att.fileName)}"`,
      'Content-Length': String(buf.length),
      'Cache-Control': 'private, max-age=3600',
    });
    res.end(buf);
  }
}
