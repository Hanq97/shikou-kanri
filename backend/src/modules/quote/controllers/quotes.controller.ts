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
import { CloneQuoteDto } from '../dto/clone-quote.dto';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { CreateVersionDto } from '../dto/create-version.dto';
import { DeleteQuoteDto } from '../dto/delete-quote.dto';
import { ListQuotesQueryDto } from '../dto/list-quotes-query.dto';
import { LostDto } from '../dto/lost.dto';
import { RejectDto } from '../dto/reject.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';
import { QuotePdfService } from '../services/quote-pdf.service';
import { QuoteStatusMachineService } from '../services/quote-status-machine.service';
import { QuoteVersioningService } from '../services/quote-versioning.service';
import { QuotesService } from '../services/quotes.service';

function buildCtx(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.header('user-agent') ?? null,
    traceId: (req as Request & { traceId?: string }).traceId ?? 'unknown',
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly service: QuotesService,
    private readonly statusMachine: QuoteStatusMachineService,
    private readonly versioning: QuoteVersioningService,
    private readonly pdf: QuotePdfService,
  ) {}

  @Get()
  @Roles('system_admin', 'manager', 'employee')
  async list(
    @Query() query: ListQuotesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(
      {
        search: query.search,
        status: query.status,
        projectId: query.projectId,
        from: query.from,
        to: query.to,
        minAmount: query.minAmount,
        maxAmount: query.maxAmount,
        counterPartySearch: query.counterPartySearch,
        sortBy: query.sortBy ?? 'issuedAt',
        sortOrder: query.sortOrder ?? 'desc',
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
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
    return { quote: await this.service.findById(id, user) };
  }

  @Get(':id/versions')
  @Roles('system_admin', 'manager', 'employee')
  async getVersions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.versioning.list(id, user) };
  }

  @Get(':id/pdf')
  @Roles('system_admin', 'manager', 'employee')
  async downloadPdf(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const { buffer, filename } = await this.pdf.generate(
      id,
      user,
      buildCtx(req),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  }

  @Post()
  @Roles('system_admin', 'manager', 'employee')
  async create(
    @Body() dto: CreateQuoteDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { quote: await this.service.create(dto, user, buildCtx(req)) };
  }

  @Put(':id')
  @Roles('system_admin', 'manager', 'employee')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQuoteDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { quote: await this.service.update(id, dto, user, buildCtx(req)) };
  }

  @Delete(':id')
  @Roles('system_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeleteQuoteDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.service.softDelete(id, dto.reason, user, buildCtx(req));
  }

  @Post(':id/clone')
  @Roles('system_admin', 'manager', 'employee')
  async clone(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CloneQuoteDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { quote: await this.service.clone(id, dto, user, buildCtx(req)) };
  }

  @Post(':id/submit')
  @Roles('system_admin', 'manager', 'employee')
  async submit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const quote = await this.statusMachine.submit(id, user, buildCtx(req));
    return { quote };
  }

  @Post(':id/approve')
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const quote = await this.statusMachine.approve(id, user, buildCtx(req));
    return { quote };
  }

  @Post(':id/reject')
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const quote = await this.statusMachine.reject(
      id,
      dto.reason,
      user,
      buildCtx(req),
    );
    return { quote };
  }

  @Post(':id/send')
  @Roles('system_admin', 'manager', 'employee')
  async send(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const quote = await this.statusMachine.send(id, user, buildCtx(req));
    return { quote };
  }

  @Post(':id/won')
  @Roles('system_admin', 'manager', 'employee')
  async won(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const quote = await this.statusMachine.won(id, user, buildCtx(req));
    return { quote };
  }

  @Post(':id/lost')
  @Roles('system_admin', 'manager', 'employee')
  async lost(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() _dto: LostDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    void _dto;
    const quote = await this.statusMachine.lost(id, user, buildCtx(req));
    return { quote };
  }

  @Post(':id/version')
  @Roles('system_admin', 'manager', 'employee')
  async createVersion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateVersionDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      quote: await this.service.createVersionFromSent(
        id,
        dto,
        user,
        buildCtx(req),
      ),
    };
  }
}
