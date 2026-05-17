import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Quote } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import {
  QuoteAtLeastOneRequiredLineError,
  QuoteCanOnlyCreateVersionFromSentError,
  QuoteDeleteReasonRequiredError,
  QuoteLockedError,
  QuoteNotFoundError,
  QuoteVersionReasonRequiredError,
} from '../../../shared/exceptions/quote-errors';
import { ProjectNotFoundError } from '../../../shared/exceptions/project-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService, Tx } from '../../auth/internal/audit-stub.service';
import { CloneQuoteDto } from '../dto/clone-quote.dto';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { CreateVersionDto } from '../dto/create-version.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';
import {
  ListQuotesFilter,
  QuoteDetailDto,
  QuoteDto,
  QuoteLineDto as QuoteLineDtoType,
  QuoteStatusName,
  QuoteWithLines,
  QuoteWithRelations,
} from '../domain/types';
import { QuoteCalculator } from '../internal/quote-calculator';
import { QuoteLineRepository } from '../repositories/quote-line.repository';
import { QuoteRepository } from '../repositories/quote.repository';
import { QuoteNumberGeneratorService } from './quote-number-generator.service';
import { QuoteVersioningService } from './quote-versioning.service';

const READ_ROLES = new Set(['system_admin', 'manager', 'employee']);

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: QuoteRepository,
    private readonly lineRepo: QuoteLineRepository,
    private readonly codeGen: QuoteNumberGeneratorService,
    private readonly calculator: QuoteCalculator,
    private readonly versioning: QuoteVersioningService,
    private readonly audit: AuditStubService,
    private readonly events: EventEmitter2,
  ) {}

  async list(
    filter: ListQuotesFilter,
    requester: AuthenticatedUser,
  ): Promise<{
    data: Array<
      QuoteDto & {
        project: { id: string; projectCode: string; name: string };
      }
    >;
    total: number;
    page: number;
    pageSize: number;
  }> {
    if (!READ_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();
    const result = await this.repo.list(filter);
    return {
      data: result.data.map((q) => this.toListItemDto(q)),
      total: result.total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findById(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<QuoteDetailDto> {
    if (!READ_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();
    const quote = await this.repo.findByIdWithLines(id);
    if (!quote) throw new QuoteNotFoundError(id);
    return this.toDetailDto(quote);
  }

  async create(
    input: CreateQuoteDto,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<QuoteDetailDto> {
    if (!READ_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();

    // Validate at least 1 required line
    const requiredLines = input.lines.filter((l) => !l.isOptional);
    if (requiredLines.length === 0)
      throw new QuoteAtLeastOneRequiredLineError();

    // Validate project + snapshot counter_party_name
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, deletedAt: null },
      include: { customer: { select: { id: true, name: true } } },
    });
    if (!project) throw new ProjectNotFoundError(input.projectId);

    const created = await this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const year = new Date(input.issuedAt).getFullYear();
      const quoteNumber = await this.codeGen.next(year, tx);

      // Compute line amounts + totals
      const linesWithAmounts = input.lines.map((l, idx) => ({
        ...l,
        sortOrder: l.sortOrder ?? idx,
        amount: this.calculator.lineAmount(l.unitPrice, l.quantity),
        isOptional: l.isOptional ?? false,
      }));
      const totals = this.calculator.computeQuoteTotals(linesWithAmounts);

      const quote = await this.repo.create(
        {
          quoteNumber,
          project: { connect: { id: input.projectId } },
          versionNo: 1,
          version: 0,
          status: 'draft',
          issuedAt: new Date(input.issuedAt),
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          counterPartyName: project.customer.name,
          amountSubtotal: totals.subtotal,
          amountTax: totals.tax,
          amountTotal: totals.total,
          notes: input.notes ?? null,
          qualifiedInvoiceNumber: input.qualifiedInvoiceNumber ?? null,
          createdBy: { connect: { id: requester.id } },
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );

      if (linesWithAmounts.length > 0) {
        await this.lineRepo.createMany(
          linesWithAmounts.map((l) => ({
            quoteId: quote.id,
            sortOrder: l.sortOrder,
            category: l.category ?? null,
            itemName: l.itemName,
            description: l.description ?? null,
            unit: l.unit,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amount: l.amount,
            taxRate: l.taxRate,
            isOptional: l.isOptional ?? false,
            unitPriceMasterId: l.unitPriceMasterId ?? null,
          })),
          tx,
        );
      }

      await this.audit.logQuoteCreated(quote.id, requester.id, ctx, tx);
      this.events.emit('quote.created', {
        quoteId: quote.id,
        projectId: input.projectId,
      });

      return quote;
    });

    return this.findById(created.id, requester);
  }

  async update(
    id: string,
    input: UpdateQuoteDto,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<QuoteDetailDto> {
    if (!READ_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();

    const existing = await this.repo.findById(id);
    if (!existing) throw new QuoteNotFoundError(id);

    // Only draft/rejected editable; sent+ requires create v2
    if (!['draft', 'rejected'].includes(existing.status)) {
      throw new QuoteLockedError(existing.status);
    }

    // Employee can only edit own draft
    if (
      requester.role === 'employee' &&
      existing.createdById !== requester.id
    ) {
      throw new AuthInsufficientPermissionError();
    }

    // Validate at least 1 required line if lines provided
    if (input.lines) {
      const requiredLines = input.lines.filter((l) => !l.isOptional);
      if (requiredLines.length === 0)
        throw new QuoteAtLeastOneRequiredLineError();
    }

    await this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;

      let totals = {
        subtotal: Number(existing.amountSubtotal),
        tax: Number(existing.amountTax),
        total: Number(existing.amountTotal),
        optionalSubtotal: 0,
      };

      // Recompute totals if lines changed
      if (input.lines) {
        const linesWithAmounts = input.lines.map((l, idx) => ({
          ...l,
          sortOrder: l.sortOrder ?? idx,
          amount: this.calculator.lineAmount(l.unitPrice, l.quantity),
          isOptional: l.isOptional ?? false,
        }));
        totals = this.calculator.computeQuoteTotals(linesWithAmounts);

        await this.lineRepo.replaceLines(
          id,
          linesWithAmounts.map((l) => ({
            sortOrder: l.sortOrder,
            category: l.category ?? null,
            itemName: l.itemName,
            description: l.description ?? null,
            unit: l.unit,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amount: l.amount,
            taxRate: l.taxRate,
            isOptional: l.isOptional ?? false,
            unitPriceMasterId: l.unitPriceMasterId ?? null,
          })),
          tx,
        );
      }

      const updateData: Prisma.QuoteUpdateInput = {
        ...(input.issuedAt !== undefined
          ? { issuedAt: new Date(input.issuedAt) }
          : {}),
        ...(input.validUntil !== undefined
          ? {
              validUntil: input.validUntil ? new Date(input.validUntil) : null,
            }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        ...(input.qualifiedInvoiceNumber !== undefined
          ? {
              qualifiedInvoiceNumber: input.qualifiedInvoiceNumber || null,
            }
          : {}),
        ...(input.lines
          ? {
              amountSubtotal: totals.subtotal,
              amountTax: totals.tax,
              amountTotal: totals.total,
            }
          : {}),
        updatedBy: { connect: { id: requester.id } },
      };

      // Use optimistic lock update
      await this.repo.update(id, input.version, updateData, tx);

      const changed = this.diffFields(existing, input);
      await this.audit.logQuoteUpdated(id, changed, requester.id, ctx, tx);

      this.events.emit('quote.updated', {
        quoteId: id,
        changedFields: changed,
      });
    });

    return this.findById(id, requester);
  }

  async clone(
    sourceId: string,
    input: CloneQuoteDto,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<QuoteDetailDto> {
    if (!READ_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();

    const source = await this.repo.findByIdWithLines(sourceId);
    if (!source) throw new QuoteNotFoundError(sourceId);

    const cloned = await this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const year = new Date().getFullYear();
      const quoteNumber = await this.codeGen.next(year, tx);

      const newQuote = await this.repo.create(
        {
          quoteNumber,
          project: { connect: { id: source.projectId } },
          versionNo: 1,
          version: 0,
          status: 'draft',
          issuedAt: new Date(),
          validUntil: null,
          counterPartyName: source.counterPartyName,
          amountSubtotal: source.amountSubtotal,
          amountTax: source.amountTax,
          amountTotal: source.amountTotal,
          notes: source.notes,
          qualifiedInvoiceNumber: source.qualifiedInvoiceNumber,
          createdBy: { connect: { id: requester.id } },
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );

      if (source.lines.length > 0) {
        await this.lineRepo.createMany(
          source.lines.map((l, idx) => ({
            quoteId: newQuote.id,
            sortOrder: idx,
            category: l.category,
            itemName: l.itemName,
            description: l.description,
            unit: l.unit,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amount: l.amount,
            taxRate: l.taxRate,
            isOptional: l.isOptional,
            unitPriceMasterId: l.unitPriceMasterId,
          })),
          tx,
        );
      }

      await this.audit.logQuoteCloned(
        newQuote.id,
        sourceId,
        requester.id,
        ctx,
        tx,
      );
      this.events.emit('quote.cloned', { newId: newQuote.id, sourceId });

      return newQuote;
    });

    return this.findById(cloned.id, requester);
  }

  async createVersionFromSent(
    sourceId: string,
    input: CreateVersionDto,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<QuoteDetailDto> {
    if (!READ_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();
    if (input.changeReason.trim().length < 5)
      throw new QuoteVersionReasonRequiredError();

    const source = await this.repo.findByIdWithLines(sourceId);
    if (!source) throw new QuoteNotFoundError(sourceId);
    if (!['sent', 'won', 'lost'].includes(source.status)) {
      throw new QuoteCanOnlyCreateVersionFromSentError();
    }

    // Employee can only create version of own original
    if (requester.role === 'employee' && source.createdById !== requester.id) {
      throw new AuthInsufficientPermissionError();
    }

    const newVersion = await this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;

      // Snapshot the source state first
      await this.versioning.snapshot(
        sourceId,
        'status_change',
        input.changeReason,
        requester.id,
        tx,
      );

      const year = new Date().getFullYear();
      const quoteNumber = await this.codeGen.next(year, tx);

      const newQuote = await this.repo.create(
        {
          quoteNumber,
          project: { connect: { id: source.projectId } },
          versionNo: source.versionNo + 1,
          version: 0,
          status: 'draft',
          issuedAt: new Date(),
          validUntil: null,
          counterPartyName: source.counterPartyName,
          amountSubtotal: source.amountSubtotal,
          amountTax: source.amountTax,
          amountTotal: source.amountTotal,
          notes: source.notes,
          qualifiedInvoiceNumber: source.qualifiedInvoiceNumber,
          createdBy: { connect: { id: requester.id } },
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );

      if (source.lines.length > 0) {
        await this.lineRepo.createMany(
          source.lines.map((l, idx) => ({
            quoteId: newQuote.id,
            sortOrder: idx,
            category: l.category,
            itemName: l.itemName,
            description: l.description,
            unit: l.unit,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amount: l.amount,
            taxRate: l.taxRate,
            isOptional: l.isOptional,
            unitPriceMasterId: l.unitPriceMasterId,
          })),
          tx,
        );
      }

      await this.audit.logQuoteCreated(newQuote.id, requester.id, ctx, tx);
      await this.audit.logQuoteVersionCreated(
        newQuote.id,
        newQuote.versionNo,
        'correction',
        requester.id,
        ctx,
        tx,
      );
      this.events.emit('quote.version.created', {
        quoteId: newQuote.id,
        versionNo: newQuote.versionNo,
        changeType: 'correction',
      });

      return newQuote;
    });

    return this.findById(newVersion.id, requester);
  }

  async softDelete(
    id: string,
    reason: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<void> {
    if (requester.role !== 'system_admin')
      throw new AuthInsufficientPermissionError();
    if (reason.trim().length < 5) throw new QuoteDeleteReasonRequiredError();

    const existing = await this.repo.findById(id);
    if (!existing) throw new QuoteNotFoundError(id);

    await this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      // Snapshot before delete
      await this.versioning.snapshot(id, 'deletion', reason, requester.id, tx);
      await this.repo.softDelete(id, requester.id, tx);
      await this.audit.logQuoteDeleted(id, reason, requester.id, ctx, tx);
      this.events.emit('quote.deleted', { quoteId: id });
    });
  }

  // ===== DTO mapping =====

  toDto(q: Quote): QuoteDto {
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      projectId: q.projectId,
      versionNo: q.versionNo,
      version: q.version,
      status: q.status as QuoteStatusName,
      issuedAt: q.issuedAt,
      validUntil: q.validUntil,
      counterPartyName: q.counterPartyName,
      amountSubtotal: q.amountSubtotal.toString(),
      amountTax: q.amountTax.toString(),
      amountTotal: q.amountTotal.toString(),
      notes: q.notes,
      qualifiedInvoiceNumber: q.qualifiedInvoiceNumber,
      approvedById: q.approvedById,
      approvedAt: q.approvedAt,
      sentAt: q.sentAt,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      createdById: q.createdById,
      updatedById: q.updatedById,
    };
  }

  toListItemDto(q: QuoteWithRelations) {
    return {
      ...this.toDto(q),
      project: {
        id: q.project.id,
        projectCode: q.project.projectCode,
        name: q.project.name,
      },
    };
  }

  toDetailDto(q: QuoteWithLines): QuoteDetailDto {
    return {
      ...this.toDto(q),
      project: q.project,
      approvedBy: q.approvedBy,
      lines: q.lines.map((l) => ({
        id: l.id,
        quoteId: l.quoteId,
        sortOrder: l.sortOrder,
        category: l.category,
        itemName: l.itemName,
        description: l.description,
        unit: l.unit,
        quantity: l.quantity.toString(),
        unitPrice: l.unitPrice.toString(),
        amount: l.amount.toString(),
        taxRate: l.taxRate.toString(),
        isOptional: l.isOptional,
        unitPriceMasterId: l.unitPriceMasterId,
      })),
    };
  }

  private diffFields(before: Quote, input: UpdateQuoteDto): string[] {
    const changed: string[] = [];
    if (
      input.issuedAt !== undefined &&
      new Date(input.issuedAt).getTime() !== before.issuedAt.getTime()
    )
      changed.push('issuedAt');
    if (input.validUntil !== undefined) changed.push('validUntil');
    if (input.notes !== undefined && (input.notes || null) !== before.notes)
      changed.push('notes');
    if (
      input.qualifiedInvoiceNumber !== undefined &&
      (input.qualifiedInvoiceNumber || null) !== before.qualifiedInvoiceNumber
    )
      changed.push('qualifiedInvoiceNumber');
    if (input.lines !== undefined) changed.push('lines');
    return changed;
  }
}

// Re-export type for downstream usage
export type { QuoteLineDtoType };
