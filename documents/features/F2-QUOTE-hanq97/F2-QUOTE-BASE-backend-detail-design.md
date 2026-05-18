# Backend Detail Design — F2 見積管理

**Feature ID**: F2-QUOTE
**Version**: BASE (Phase 1 MVP)
**Date**: 2026-05-17
**Tech stack**: NestJS 10 + Prisma 5 + PostgreSQL 16 + Puppeteer + Handlebars
**Reference**: SRS, BD, `.claude/rules/backend-nestjs.md`, F1 implementation patterns

---

## 1. Overview

Document chi tiết implementation cho BE: pseudo-code per service, repository details, transaction strategy, validation, performance.

---

## 2. Module Structure (recap from BD)

```
backend/src/modules/quote/
├── quote.module.ts
├── controllers/         # 2 controllers (quotes + unit-prices)
├── services/            # 6 services + spec files
├── repositories/        # 4 repositories
├── dto/                 # 11 DTOs
├── domain/              # types, transitions, constants, events
├── internal/            # calculator, snapshot builder
├── templates/           # quote-pdf.hbs
└── utils/               # jpy-format helpers
```

---

## 3. Module Wiring

### 3.1 QuoteModule
```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { CustomerModule } from '../customer/customer.module';

import { QuotesController } from './controllers/quotes.controller';
import { UnitPricesController } from './controllers/unit-prices.controller';

import { QuotesService } from './services/quotes.service';
import { QuoteStatusMachineService } from './services/quote-status-machine.service';
import { QuoteVersioningService } from './services/quote-versioning.service';
import { QuotePdfService } from './services/quote-pdf.service';
import { QuoteNumberGeneratorService } from './services/quote-number-generator.service';
import { UnitPricesService } from './services/unit-prices.service';

import { QuoteRepository } from './repositories/quote.repository';
import { QuoteLineRepository } from './repositories/quote-line.repository';
import { QuoteVersionRepository } from './repositories/quote-version.repository';
import { UnitPriceRepository } from './repositories/unit-price.repository';

@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [QuotesController, UnitPricesController],
  providers: [
    QuotesService,
    QuoteStatusMachineService,
    QuoteVersioningService,
    QuotePdfService,
    QuoteNumberGeneratorService,
    UnitPricesService,
    QuoteRepository,
    QuoteLineRepository,
    QuoteVersionRepository,
    UnitPriceRepository,
  ],
  exports: [QuotesService, QuoteRepository],
})
export class QuoteModule {}
```

### 3.2 AppModule update
```typescript
// backend/src/app.module.ts
import { QuoteModule } from './modules/quote/quote.module';

@Module({
  imports: [
    // ... existing
    AuthModule,
    CustomerModule,
    ProjectModule,
    QuoteModule,  // <-- add
  ],
  // ...
})
export class AppModule {}
```

---

## 4. Repositories

### 4.1 QuoteRepository
```typescript
@Injectable()
export class QuoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tx?: Tx): Promise<Quote | null> {
    const client = tx ?? this.prisma;
    return client.quote.findFirst({ where: { id, deletedAt: null } });
  }

  findByIdWithLines(id: string, tx?: Tx): Promise<QuoteWithLines | null> {
    const client = tx ?? this.prisma;
    return client.quote.findFirst({
      where: { id, deletedAt: null },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        project: { select: { id: true, projectCode: true, name: true, customerId: true } },
        approvedByUser: { select: { id: true, name: true } },
      },
    });
  }

  findByQuoteNumber(quoteNumber: string, tx?: Tx): Promise<Quote | null> {
    const client = tx ?? this.prisma;
    return client.quote.findFirst({ where: { quoteNumber, deletedAt: null } });
  }

  async list(
    filter: ListQuotesFilter,
    requester: AuthenticatedUser,
    tx?: Tx,
  ): Promise<{ data: QuoteWithRelations[]; total: number }> {
    const client = tx ?? this.prisma;
    const where: Prisma.QuoteWhereInput = {
      deletedAt: null,
      ...(filter.status?.length ? { status: { in: filter.status } } : {}),
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.from || filter.to ? {
        issuedAt: {
          ...(filter.from ? { gte: new Date(filter.from) } : {}),
          ...(filter.to ? { lte: new Date(filter.to) } : {}),
        },
      } : {}),
      ...(filter.minAmount || filter.maxAmount ? {
        amountTotal: {
          ...(filter.minAmount ? { gte: filter.minAmount } : {}),
          ...(filter.maxAmount ? { lte: filter.maxAmount } : {}),
        },
      } : {}),
      ...(filter.counterPartySearch ? {
        // pg_bigm search via raw SQL (Prisma doesn't natively support bigm)
        // Use string contains for now, switch to raw query phase 2 for performance
        counterPartyName: { contains: filter.counterPartySearch, mode: 'insensitive' },
      } : {}),
    };

    const [data, total] = await Promise.all([
      client.quote.findMany({
        where,
        include: {
          project: { select: { id: true, projectCode: true, name: true } },
        },
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      client.quote.count({ where }),
    ]);
    return { data, total };
  }

  create(input: Prisma.QuoteUncheckedCreateInput, tx?: Tx): Promise<Quote> {
    const client = tx ?? this.prisma;
    return client.quote.create({ data: input });
  }

  /**
   * Optimistic locking update — throws if version mismatch.
   */
  async update(
    id: string,
    expectedVersion: number,
    data: Prisma.QuoteUpdateInput,
    tx?: Tx,
  ): Promise<Quote> {
    const client = tx ?? this.prisma;
    const result = await client.quote.updateMany({
      where: { id, version: expectedVersion, deletedAt: null },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new QuoteConflictError(id);
    }
    return this.findById(id, tx) as Promise<Quote>;
  }

  /**
   * Non-locking update (for status transitions where caller knows current version).
   */
  async updateUnlocked(
    id: string,
    data: Prisma.QuoteUpdateInput,
    tx?: Tx,
  ): Promise<Quote> {
    const client = tx ?? this.prisma;
    return client.quote.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  softDelete(id: string, actorId: string, tx?: Tx): Promise<Quote> {
    const client = tx ?? this.prisma;
    return client.quote.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId, version: { increment: 1 } },
    });
  }

  countWonByProject(projectId: string, tx?: Tx): Promise<number> {
    const client = tx ?? this.prisma;
    return client.quote.count({
      where: { projectId, status: 'won', deletedAt: null },
    });
  }
}
```

### 4.2 QuoteLineRepository
```typescript
@Injectable()
export class QuoteLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByQuote(quoteId: string, tx?: Tx): Promise<QuoteLine[]> {
    const client = tx ?? this.prisma;
    return client.quoteLine.findMany({
      where: { quoteId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async replaceLines(
    quoteId: string,
    lines: Array<Omit<Prisma.QuoteLineUncheckedCreateInput, 'quoteId'>>,
    tx: Tx,
  ): Promise<QuoteLine[]> {
    // Delete all existing lines + insert new ones (simpler than diffing)
    await tx.quoteLine.deleteMany({ where: { quoteId } });
    if (lines.length === 0) return [];
    await tx.quoteLine.createMany({
      data: lines.map((line, idx) => ({
        ...line,
        quoteId,
        sortOrder: line.sortOrder ?? idx,
      })),
    });
    return this.findByQuote(quoteId, tx);
  }

  createMany(
    lines: Prisma.QuoteLineUncheckedCreateInput[],
    tx: Tx,
  ): Promise<{ count: number }> {
    return tx.quoteLine.createMany({ data: lines });
  }
}
```

### 4.3 QuoteVersionRepository (append-only)
```typescript
@Injectable()
export class QuoteVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByQuote(quoteId: string, tx?: Tx): Promise<QuoteVersion[]> {
    const client = tx ?? this.prisma;
    return client.quoteVersion.findMany({
      where: { quoteId },
      orderBy: { changedAt: 'desc' },
      include: { changedByUser: { select: { id: true, name: true } } },
    });
  }

  /**
   * Append-only insert. No update/delete methods exposed.
   */
  create(
    input: Prisma.QuoteVersionUncheckedCreateInput,
    tx: Tx,
  ): Promise<QuoteVersion> {
    return tx.quoteVersion.create({ data: input });
  }

  countByQuote(quoteId: string, tx?: Tx): Promise<number> {
    const client = tx ?? this.prisma;
    return client.quoteVersion.count({ where: { quoteId } });
  }
}
```

### 4.4 UnitPriceRepository
```typescript
@Injectable()
export class UnitPriceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tx?: Tx): Promise<UnitPrice | null> {
    const client = tx ?? this.prisma;
    return client.unitPrice.findFirst({ where: { id, deletedAt: null } });
  }

  findByCode(code: string, tx?: Tx): Promise<UnitPrice | null> {
    const client = tx ?? this.prisma;
    return client.unitPrice.findFirst({ where: { code, deletedAt: null } });
  }

  async list(
    filter: ListUnitPricesFilter,
    tx?: Tx,
  ): Promise<{ data: UnitPrice[]; total: number }> {
    const client = tx ?? this.prisma;
    const where: Prisma.UnitPriceWhereInput = {
      deletedAt: null,
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.search ? {
        OR: [
          { code: { contains: filter.search, mode: 'insensitive' } },
          { itemName: { contains: filter.search, mode: 'insensitive' } },
        ],
      } : {}),
    };
    const [data, total] = await Promise.all([
      client.unitPrice.findMany({
        where,
        orderBy: { itemName: 'asc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      client.unitPrice.count({ where }),
    ]);
    return { data, total };
  }

  create(input: Prisma.UnitPriceUncheckedCreateInput, tx?: Tx): Promise<UnitPrice> {
    const client = tx ?? this.prisma;
    return client.unitPrice.create({ data: input });
  }

  update(id: string, data: Prisma.UnitPriceUpdateInput, tx?: Tx): Promise<UnitPrice> {
    const client = tx ?? this.prisma;
    return client.unitPrice.update({ where: { id }, data });
  }

  softDelete(id: string, actorId: string, tx?: Tx): Promise<UnitPrice> {
    const client = tx ?? this.prisma;
    return client.unitPrice.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId, isActive: false },
    });
  }
}
```

---

## 5. Services — Implementation pseudo-code

### 5.1 QuotesService (CRUD)
```typescript
@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: QuoteRepository,
    private readonly lineRepo: QuoteLineRepository,
    private readonly customers: CustomersService,
    private readonly codeGen: QuoteNumberGeneratorService,
    private readonly calculator: QuoteCalculator,
    private readonly versioning: QuoteVersioningService,
    private readonly audit: AuditStubService,
    private readonly events: EventEmitter2,
  ) {}

  async list(filter: ListQuotesFilter, requester: AuthenticatedUser) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();
    const result = await this.repo.list(filter, requester);
    return {
      data: result.data.map(toQuoteSummary),
      total: result.total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findById(id: string, requester: AuthenticatedUser) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();
    const quote = await this.repo.findByIdWithLines(id);
    if (!quote) throw new QuoteNotFoundError(id);
    return toQuoteDetailDto(quote);
  }

  async create(input: CreateQuoteDto, requester, ctx) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();

    // Validate project + customer
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, deletedAt: null },
      include: { customer: { select: { id: true, name: true } } },
    });
    if (!project) throw new ProjectNotFoundError(input.projectId);

    // Snapshot counter party name
    const counterPartyName = project.customer.name;

    return this.prisma.$transaction(async (tx) => {
      const year = new Date(input.issuedAt).getFullYear();
      const quoteNumber = await this.codeGen.next(year, tx);

      // Compute line amounts + quote totals server-side
      const linesWithAmounts = input.lines.map((l, idx) => ({
        ...l,
        sortOrder: idx,
        amount: this.calculator.lineAmount(l.unitPrice, l.quantity),
      }));
      const totals = this.calculator.computeQuoteTotals(linesWithAmounts);

      // Insert quote
      const quote = await this.repo.create({
        quoteNumber,
        projectId: input.projectId,
        versionNo: 1,
        version: 0,
        status: 'draft',
        issuedAt: new Date(input.issuedAt),
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        counterPartyName,
        amountSubtotal: totals.subtotal,
        amountTax: totals.tax,
        amountTotal: totals.total,
        notes: input.notes ?? null,
        qualifiedInvoiceNumber: input.qualifiedInvoiceNumber ?? null,
        createdById: requester.id,
        updatedById: requester.id,
      }, tx);

      // Insert lines
      if (linesWithAmounts.length > 0) {
        await this.lineRepo.createMany(
          linesWithAmounts.map((l) => ({ ...l, quoteId: quote.id })),
          tx,
        );
      }

      // Audit + event (no version snapshot for create — version 1 baseline)
      await this.audit.logQuoteCreated(quote.id, requester.id, ctx, tx);
      this.events.emit('quote.created', { quoteId: quote.id, projectId: input.projectId });

      return quote;
    }).then((q) => this.findById(q.id, requester));
  }

  async update(id: string, input: UpdateQuoteDto, requester, ctx) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();

    const existing = await this.repo.findById(id);
    if (!existing) throw new QuoteNotFoundError(id);

    // Permission: only draft/rejected editable; sent+ requires create v2
    if (!['draft', 'rejected'].includes(existing.status)) {
      throw new QuoteLockedError(existing.status);
    }

    // Permission: employee can only edit own draft
    if (
      requester.role === 'employee' &&
      existing.createdById !== requester.id
    ) {
      throw new AuthInsufficientPermissionError();
    }

    return this.prisma.$transaction(async (tx) => {
      // Recompute totals if lines changed
      const lines = input.lines ?? await this.lineRepo.findByQuote(id, tx);
      const linesWithAmounts = lines.map((l, idx) => ({
        ...l,
        sortOrder: idx,
        amount: this.calculator.lineAmount(l.unitPrice, l.quantity),
      }));
      const totals = this.calculator.computeQuoteTotals(linesWithAmounts);

      // Update quote (optimistic lock)
      const updated = await this.repo.update(id, input.version, {
        ...(input.issuedAt !== undefined ? { issuedAt: new Date(input.issuedAt) } : {}),
        ...(input.validUntil !== undefined ? { validUntil: input.validUntil ? new Date(input.validUntil) : null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        amountSubtotal: totals.subtotal,
        amountTax: totals.tax,
        amountTotal: totals.total,
        updatedBy: { connect: { id: requester.id } },
      }, tx);

      // Replace lines if provided
      if (input.lines) {
        await this.lineRepo.replaceLines(id, linesWithAmounts, tx);
      }

      const changed = this.diffFields(existing, input);
      await this.audit.logQuoteUpdated(id, changed, requester.id, ctx, tx);

      return updated;
    }).then((q) => this.findById(q.id, requester));
  }

  async clone(sourceId: string, input: CloneQuoteDto, requester, ctx) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();

    const source = await this.repo.findByIdWithLines(sourceId);
    if (!source) throw new QuoteNotFoundError(sourceId);

    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const quoteNumber = await this.codeGen.next(year, tx);

      const cloned = await this.repo.create({
        quoteNumber,
        projectId: source.projectId,
        versionNo: 1,
        version: 0,
        status: 'draft',
        issuedAt: new Date(),
        validUntil: null,
        counterPartyName: source.counterPartyName,  // preserve snapshot
        amountSubtotal: source.amountSubtotal,
        amountTax: source.amountTax,
        amountTotal: source.amountTotal,
        notes: source.notes,
        createdById: requester.id,
        updatedById: requester.id,
      }, tx);

      // Copy lines with new IDs
      if (source.lines.length > 0) {
        await this.lineRepo.createMany(
          source.lines.map((l, idx) => ({
            quoteId: cloned.id,
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

      await this.audit.logQuoteCloned(cloned.id, sourceId, requester.id, ctx, tx);
      this.events.emit('quote.cloned', { newId: cloned.id, sourceId });

      return cloned;
    }).then((q) => this.findById(q.id, requester));
  }

  async createVersionFromSent(sourceId: string, input: CreateVersionDto, requester, ctx) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();
    if (input.changeReason.length < 5) throw new QuoteVersionReasonRequiredError();

    const source = await this.repo.findByIdWithLines(sourceId);
    if (!source) throw new QuoteNotFoundError(sourceId);
    if (!['sent', 'won', 'lost'].includes(source.status)) {
      throw new QuoteCanOnlyCreateVersionFromSentError();
    }

    return this.prisma.$transaction(async (tx) => {
      // Snapshot the source version first
      await this.versioning.snapshot(sourceId, 'status_change', input.changeReason, requester.id, tx);

      // Create new quote referencing source via versionNo
      const year = new Date().getFullYear();
      const quoteNumber = await this.codeGen.next(year, tx);

      const newQuote = await this.repo.create({
        quoteNumber,
        projectId: source.projectId,
        versionNo: source.versionNo + 1,  // increment from source
        version: 0,
        status: 'draft',
        issuedAt: new Date(),
        validUntil: null,
        counterPartyName: source.counterPartyName,
        amountSubtotal: source.amountSubtotal,
        amountTax: source.amountTax,
        amountTotal: source.amountTotal,
        notes: source.notes,
        createdById: requester.id,
        updatedById: requester.id,
      }, tx);

      // Copy lines
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

      // Audit creation
      await this.audit.logQuoteCreated(newQuote.id, requester.id, ctx, tx);
      await this.audit.logQuoteVersionCreated(
        newQuote.id, newQuote.versionNo, 'correction', requester.id, ctx, tx,
      );

      return newQuote;
    }).then((q) => this.findById(q.id, requester));
  }

  async softDelete(id: string, reason: string, requester, ctx) {
    if (requester.role !== 'system_admin') throw new AuthInsufficientPermissionError();
    if (reason.length < 5) throw new QuoteDeleteReasonRequiredError();

    const existing = await this.repo.findById(id);
    if (!existing) throw new QuoteNotFoundError(id);

    return this.prisma.$transaction(async (tx) => {
      // Snapshot before delete
      await this.versioning.snapshot(id, 'deletion', reason, requester.id, tx);
      await this.repo.softDelete(id, requester.id, tx);
      await this.audit.logQuoteDeleted(id, reason, requester.id, ctx, tx);
      this.events.emit('quote.deleted', { quoteId: id });
    });
  }

  private diffFields(before: Quote, input: UpdateQuoteDto): string[] {
    const changed: string[] = [];
    if (input.issuedAt !== undefined && new Date(input.issuedAt).getTime() !== before.issuedAt.getTime()) changed.push('issuedAt');
    if (input.validUntil !== undefined) changed.push('validUntil');
    if (input.notes !== undefined && (input.notes || null) !== before.notes) changed.push('notes');
    if (input.lines !== undefined) changed.push('lines');
    return changed;
  }
}
```

### 5.2 QuoteStatusMachineService

```typescript
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft:         ['submitted'],
  submitted:     ['approved', 'pending_admin', 'rejected'],
  pending_admin: ['approved', 'rejected'],
  approved:      ['sent', 'rejected'],
  sent:          ['won', 'lost'],
  won:           [],
  lost:          [],
  rejected:      ['submitted'],
};

export const APPROVAL_TIER2_THRESHOLD_JPY = 10_000_000;

@Injectable()
export class QuoteStatusMachineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: QuoteRepository,
    private readonly versioning: QuoteVersioningService,
    private readonly audit: AuditStubService,
    private readonly events: EventEmitter2,
  ) {}

  async submit(id: string, requester: AuthenticatedUser, ctx) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();

    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);
    if (quote.status !== 'draft' && quote.status !== 'rejected') {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'submitted');
    }

    // Determine target status based on threshold
    const targetStatus: QuoteStatus = Number(quote.amountTotal) > APPROVAL_TIER2_THRESHOLD_JPY
      ? 'pending_admin'
      : 'submitted';
    const tier = targetStatus === 'pending_admin' ? 2 : 1;

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.updateUnlocked(id, {
        status: targetStatus,
        updatedBy: { connect: { id: requester.id } },
      }, tx);

      await this.versioning.snapshot(id, 'status_change', `Submitted (tier ${tier})`, requester.id, tx);
      await this.audit.logQuoteSubmitted(id, tier, requester.id, ctx, tx);
      this.events.emit('quote.submitted', { quoteId: id, tier });

      return updated;
    });
  }

  async approve(id: string, requester: AuthenticatedUser, ctx) {
    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);

    // Permission check per tier
    if (quote.status === 'submitted') {
      // Tier 1: manager or admin
      if (!['system_admin', 'manager'].includes(requester.role)) {
        throw new AuthInsufficientPermissionError();
      }
    } else if (quote.status === 'pending_admin') {
      // Tier 2: admin only
      if (requester.role !== 'system_admin') {
        throw new QuoteTier2RequiresAdminError();
      }
    } else {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'approved');
    }

    const tier = quote.status === 'pending_admin' ? 2 : 1;

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.updateUnlocked(id, {
        status: 'approved',
        approvedBy: { connect: { id: requester.id } },
        approvedAt: new Date(),
        updatedBy: { connect: { id: requester.id } },
      }, tx);

      await this.versioning.snapshot(id, 'status_change', `Approved (tier ${tier})`, requester.id, tx);
      await this.audit.logQuoteApproved(id, tier, requester.id, ctx, tx);
      this.events.emit('quote.approved', { quoteId: id, tier });

      return updated;
    });
  }

  async reject(id: string, reason: string, requester: AuthenticatedUser, ctx) {
    if (!['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }
    if (reason.length < 5) throw new QuoteRejectReasonRequiredError();

    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);
    if (!['submitted', 'pending_admin', 'approved'].includes(quote.status)) {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'rejected');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.updateUnlocked(id, {
        status: 'rejected',
        updatedBy: { connect: { id: requester.id } },
      }, tx);

      await this.versioning.snapshot(id, 'status_change', reason, requester.id, tx);
      await this.audit.logQuoteRejected(id, reason, requester.id, ctx, tx);
      this.events.emit('quote.rejected', { quoteId: id, reason });

      return updated;
    });
  }

  async send(id: string, requester: AuthenticatedUser, ctx) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();

    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);
    if (quote.status !== 'approved') {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'sent');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.updateUnlocked(id, {
        status: 'sent',
        sentAt: new Date(),
        updatedBy: { connect: { id: requester.id } },
      }, tx);

      await this.versioning.snapshot(id, 'status_change', 'Sent', requester.id, tx);
      await this.audit.logQuoteSent(id, requester.id, ctx, tx);
      this.events.emit('quote.sent', { quoteId: id });

      return updated;
    });
  }

  async won(id: string, requester: AuthenticatedUser, ctx) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();

    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);
    if (quote.status !== 'sent') {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'won');
    }

    // BR-QT-016: warn if another quote is already won for this project
    const wonCount = await this.repo.countWonByProject(quote.projectId);
    if (wonCount > 0 && requester.role !== 'system_admin') {
      throw new QuoteAnotherWonExistsError(quote.projectId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.updateUnlocked(id, {
        status: 'won',
        updatedBy: { connect: { id: requester.id } },
      }, tx);

      await this.versioning.snapshot(id, 'status_change', 'Won', requester.id, tx);
      await this.audit.logQuoteWon(id, quote.projectId, Number(quote.amountTotal), requester.id, ctx, tx);
      this.events.emit('quote.won', {
        quoteId: id,
        projectId: quote.projectId,
        amountTotal: Number(quote.amountTotal),
      });

      return updated;
    });
  }

  async lost(id: string, requester: AuthenticatedUser, ctx) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();

    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);
    if (quote.status !== 'sent') {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'lost');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.updateUnlocked(id, {
        status: 'lost',
        updatedBy: { connect: { id: requester.id } },
      }, tx);

      await this.versioning.snapshot(id, 'status_change', 'Lost', requester.id, tx);
      await this.audit.logQuoteLost(id, requester.id, ctx, tx);
      this.events.emit('quote.lost', { quoteId: id });

      return updated;
    });
  }
}
```

### 5.3 QuoteVersioningService

```typescript
@Injectable()
export class QuoteVersioningService {
  constructor(
    private readonly repo: QuoteVersionRepository,
    private readonly quoteRepo: QuoteRepository,
    private readonly lineRepo: QuoteLineRepository,
  ) {}

  /**
   * Create append-only version snapshot.
   * Called inside transaction by other services.
   */
  async snapshot(
    quoteId: string,
    changeType: 'correction' | 'deletion' | 'status_change',
    changeReason: string | null,
    changedById: string,
    tx: Tx,
  ): Promise<void> {
    const quote = await this.quoteRepo.findById(quoteId, tx);
    if (!quote) throw new QuoteNotFoundError(quoteId);
    const lines = await this.lineRepo.findByQuote(quoteId, tx);

    const snapshot = {
      quote: { ...quote },
      lines: lines.map((l) => ({ ...l })),
      capturedAt: new Date().toISOString(),
    };

    await this.repo.create({
      quoteId,
      versionNo: quote.versionNo,
      changeType,
      changeReason: changeReason ?? 'Status change',
      snapshot: snapshot as Prisma.InputJsonValue,
      changedById,
    }, tx);
  }

  async list(quoteId: string, requester: AuthenticatedUser): Promise<QuoteVersion[]> {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();
    // Verify quote exists (read access already enforced by quote queries elsewhere)
    return this.repo.findByQuote(quoteId);
  }
}
```

### 5.4 QuoteNumberGeneratorService

```typescript
@Injectable()
export class QuoteNumberGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns next quote_number in `Q-YYYY-NNNNN` format, race-safe via DB sequence.
   * Sequences pre-created via migration; this method handles future years.
   */
  async next(year: number, tx?: Tx): Promise<string> {
    const client = tx ?? this.prisma;
    const seqName = `quote_number_seq_${year}`;
    await client.$executeRawUnsafe(
      `CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`,
    );
    const result = await client.$queryRawUnsafe<{ nextval: bigint }[]>(
      `SELECT nextval('${seqName}') AS nextval`,
    );
    const num = Number(result[0].nextval);
    return `Q-${year}-${String(num).padStart(5, '0')}`;
  }
}
```

### 5.5 QuoteCalculator (internal)

```typescript
@Injectable()
export class QuoteCalculator {
  /**
   * Compute line amount = ROUND(unitPrice × quantity).
   * JPY no decimals at total level.
   */
  lineAmount(unitPrice: number | string | Decimal, quantity: number | string | Decimal): number {
    const up = Number(unitPrice);
    const q = Number(quantity);
    return Math.round(up * q);
  }

  /**
   * Compute quote totals from lines.
   * - subtotal: sum of amount where !isOptional
   * - tax: round(sum(amount × tax_rate where !isOptional))
   * - total: subtotal + tax
   * - optionalSubtotal: sum where isOptional
   */
  computeQuoteTotals(lines: Array<{
    amount: number;
    taxRate: number | string | Decimal;
    isOptional: boolean;
  }>): {
    subtotal: number;
    tax: number;
    total: number;
    optionalSubtotal: number;
  } {
    let subtotal = 0;
    let taxAccumulator = 0;  // sum amount × taxRate, round once at end
    let optionalSubtotal = 0;

    for (const line of lines) {
      const amt = line.amount;
      const rate = Number(line.taxRate);
      if (line.isOptional) {
        optionalSubtotal += amt;
      } else {
        subtotal += amt;
        taxAccumulator += amt * rate;
      }
    }

    const tax = Math.round(taxAccumulator);
    const total = subtotal + tax;
    return { subtotal, tax, total, optionalSubtotal };
  }
}
```

### 5.6 QuotePdfService

```typescript
@Injectable()
export class QuotePdfService {
  private template: HandlebarsTemplateDelegate | null = null;

  constructor(
    private readonly quoteRepo: QuoteRepository,
    private readonly lineRepo: QuoteLineRepository,
    private readonly audit: AuditStubService,
  ) {}

  private getTemplate(): HandlebarsTemplateDelegate {
    if (!this.template) {
      const templatePath = path.join(__dirname, '..', 'templates', 'quote-pdf.hbs');
      const source = fs.readFileSync(templatePath, 'utf8');
      this.template = Handlebars.compile(source);

      // Register helpers
      Handlebars.registerHelper('jpy', (n: number) => `¥${Number(n).toLocaleString('ja-JP')}`);
      Handlebars.registerHelper('date', (d: Date) => dayjs(d).format('YYYY年MM月DD日'));
      Handlebars.registerHelper('eq', (a, b) => a === b);
    }
    return this.template;
  }

  async generate(quoteId: string, requester: AuthenticatedUser, ctx: RequestContext): Promise<Buffer> {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();

    const quote = await this.quoteRepo.findByIdWithLines(quoteId);
    if (!quote) throw new QuoteNotFoundError(quoteId);

    // Group lines
    const requiredLines = quote.lines.filter((l) => !l.isOptional);
    const optionalLines = quote.lines.filter((l) => l.isOptional);
    const optionalSubtotal = optionalLines.reduce((sum, l) => sum + Number(l.amount), 0);

    const html = this.getTemplate()({
      quote: {
        ...quote,
        issuedAtFormatted: dayjs(quote.issuedAt).format('YYYY年MM月DD日'),
      },
      requiredLines,
      optionalLines,
      optionalSubtotal,
      isDraft: quote.status === 'draft',
      generatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    });

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      });

      // Audit (no transaction needed — best effort)
      await this.audit.logQuotePdfDownloaded(quoteId, requester.id, ctx);

      return buffer;
    } finally {
      await browser.close();
    }
  }
}
```

### 5.7 UnitPricesService

```typescript
@Injectable()
export class UnitPricesService {
  constructor(
    private readonly repo: UnitPriceRepository,
    private readonly audit: AuditStubService,
  ) {}

  async list(filter: ListUnitPricesFilter, requester: AuthenticatedUser) {
    // All internal roles can view (for picker)
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();
    return this.repo.list(filter);
  }

  async findById(id: string, requester: AuthenticatedUser) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();
    const item = await this.repo.findById(id);
    if (!item) throw new UnitPriceNotFoundError(id);
    return item;
  }

  async create(input: CreateUnitPriceDto, requester: AuthenticatedUser) {
    if (requester.role !== 'system_admin') throw new AuthInsufficientPermissionError();

    // Check unique code
    const existing = await this.repo.findByCode(input.code);
    if (existing) throw new UnitPriceCodeExistsError(input.code);

    return this.repo.create({
      ...input,
      createdById: requester.id,
      updatedById: requester.id,
    });
  }

  async update(id: string, input: UpdateUnitPriceDto, requester: AuthenticatedUser) {
    if (requester.role !== 'system_admin') throw new AuthInsufficientPermissionError();
    const existing = await this.repo.findById(id);
    if (!existing) throw new UnitPriceNotFoundError(id);
    return this.repo.update(id, { ...input, updatedById: requester.id });
  }

  async softDelete(id: string, requester: AuthenticatedUser) {
    if (requester.role !== 'system_admin') throw new AuthInsufficientPermissionError();
    const existing = await this.repo.findById(id);
    if (!existing) throw new UnitPriceNotFoundError(id);
    await this.repo.softDelete(id, requester.id);
  }
}
```

---

## 6. Error Classes

### 6.1 New error file: `backend/src/shared/exceptions/quote-errors.ts`

```typescript
import { AppError } from './app-error';

export class QuoteNotFoundError extends AppError {
  constructor(id?: string) {
    super('QUOTE_NOT_FOUND', 404, '見積が見つかりません。', { id });
  }
}

export class QuoteConflictError extends AppError {
  constructor(id?: string) {
    super('QUOTE_CONFLICT', 409, '他のユーザーが編集しました。再読み込みしてください。', { id });
  }
}

export class QuoteInvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(
      'QUOTE_INVALID_STATUS_TRANSITION',
      400,
      `${from} から ${to} への遷移は許可されていません。`,
      { from, to },
    );
  }
}

export class QuoteTier2RequiresAdminError extends AppError {
  constructor() {
    super(
      'QUOTE_TIER2_REQUIRES_ADMIN',
      403,
      '管理者の承認が必要です (¥10,000,000超)。',
    );
  }
}

export class QuoteRejectReasonRequiredError extends AppError {
  constructor() {
    super(
      'QUOTE_REJECT_REASON_REQUIRED',
      400,
      '却下理由は5文字以上必要です。',
    );
  }
}

export class QuoteDeleteReasonRequiredError extends AppError {
  constructor() {
    super(
      'QUOTE_DELETE_REASON_REQUIRED',
      400,
      '削除理由は5文字以上必要です。',
    );
  }
}

export class QuoteLockedError extends AppError {
  constructor(currentStatus: string) {
    super(
      'QUOTE_LOCKED',
      400,
      `ステータス「${currentStatus}」の見積は編集できません。`,
      { currentStatus },
    );
  }
}

export class QuoteCanOnlyCreateVersionFromSentError extends AppError {
  constructor() {
    super(
      'QUOTE_CAN_ONLY_VERSION_FROM_SENT',
      400,
      '送付済以降の見積のみ新規版作成できます。',
    );
  }
}

export class QuoteVersionReasonRequiredError extends AppError {
  constructor() {
    super(
      'QUOTE_VERSION_REASON_REQUIRED',
      400,
      '変更理由は5文字以上必要です。',
    );
  }
}

export class QuoteAnotherWonExistsError extends AppError {
  constructor(projectId: string) {
    super(
      'QUOTE_ANOTHER_WON_EXISTS',
      409,
      'この案件にはすでに受注見積があります。管理者の承認が必要です。',
      { projectId },
    );
  }
}

export class UnitPriceNotFoundError extends AppError {
  constructor(id?: string) {
    super('UNIT_PRICE_NOT_FOUND', 404, '単価マスタが見つかりません。', { id });
  }
}

export class UnitPriceCodeExistsError extends AppError {
  constructor(code: string) {
    super('UNIT_PRICE_CODE_EXISTS', 409, `単価コード「${code}」はすでに存在します。`, { code });
  }
}
```

---

## 7. Controllers — Pattern

### 7.1 QuotesController
- `@UseGuards(JwtAuthGuard, RolesGuard)` at class level
- `@Roles(...)` per method based on FR-QT-013 matrix
- `buildCtx(req)` helper for RequestContext (reused from F1 pattern)
- 15 endpoints (see API contracts doc)

### 7.2 UnitPricesController
- 4 endpoints, admin-only for CUD, read accessible to internal roles

---

## 8. Transaction Strategy

### 8.1 Operations requiring transaction
- Quote create (insert quote + lines + audit)
- Quote update (update + replace lines + audit)
- Quote softDelete (snapshot version + soft delete + audit)
- Quote clone (insert new quote + copy lines + audit)
- Quote createVersionFromSent (snapshot source + insert new + copy lines + audit)
- Status transitions (update + snapshot + audit + emit)
- Approval (update + snapshot + audit + emit)

### 8.2 Isolation level
- Default `READ COMMITTED` (Postgres default)
- Optimistic locking via `updateMany WHERE version=?` for quote updates
- Sequences for quote_number — race-safe by design

### 8.3 PDF generation
- NO transaction (read-only + external process)
- Audit log: separate non-transactional call (best-effort)

---

## 9. Event Handling

### 9.1 EventEmitter2 (existing from F1)
```typescript
// app.module.ts (already configured)
EventEmitterModule.forRoot({
  wildcard: false,
  delimiter: '.',
  maxListeners: 20,
  verboseMemoryLeak: false,
}),
```

### 9.2 Events emitted by QuoteModule
- `quote.created`: `{ quoteId, projectId }`
- `quote.updated`: `{ quoteId, changedFields }`
- `quote.submitted`: `{ quoteId, tier }`
- `quote.approved`: `{ quoteId, tier }`
- `quote.rejected`: `{ quoteId, reason }`
- `quote.sent`: `{ quoteId }`
- `quote.won`: `{ quoteId, projectId, amountTotal }` — ProjectModule may listen Phase 2
- `quote.lost`: `{ quoteId }`
- `quote.deleted`: `{ quoteId }`
- `quote.cloned`: `{ newId, sourceId }`

### 9.3 Listeners (Phase 1 = none, future-ready)
- ProjectModule Phase 2: subscribe to `quote.won` for auto-suggest transition

---

## 10. Validation Strategy

### 10.1 Class-validator on DTOs
- All input DTOs use class-validator decorators (`@IsString`, `@IsUUID`, `@IsEnum`, etc.)
- Global `ValidationPipe` already configured (from F8)
- Length limits: itemName ≤200, code ≤30, notes ≤5000, etc.

### 10.2 Business validation (in services)
- Status transition validity (status machine table)
- Tier 2 approval permission check
- Reason length ≥5 chars for reject/delete/version
- Won — another won exists check
- Counter party snapshot integrity

### 10.3 Compute validation
- Server-side recompute amounts (no trust client values)
- Quantity != 0 (allow negative for discount)
- Unit price can be negative (discount lines)

---

## 11. Performance Considerations

### 11.1 List query optimization
- Indexes: `idx_quotes_project_id`, `idx_quotes_issued_at DESC`, `idx_quotes_amount_total`, `idx_quotes_counter_party_bigm`
- Pagination: 20 default, max 100
- Use `Promise.all` for data + count parallel

### 11.2 Line items batch insert
- `createMany` not `create` loop (single SQL with values)
- Up to 500 lines per quote (UI warns >100)

### 11.3 PDF generation
- Cache template after first compile
- Puppeteer launch each request (~500ms cold) — acceptable for MVP
- Phase 2: keep browser warm via plugin or worker queue

### 11.4 Versioning storage
- JSONB snapshot ~5-10KB per version
- 22.5K rows/year × 10KB = 225MB/year — acceptable
- S3 archival policy after 3 years (architecture/04 § retention)

---

## 12. Testing Strategy

### 12.1 Unit tests (Jest + jest-mock-extended)
**Coverage targets**:
- QuoteStatusMachineService: 18 tests
- QuoteCalculatorService: 6 tests
- QuoteVersioningService: 5 tests
- QuoteNumberGeneratorService: 4 tests
- QuotesService: 12 tests
- QuotePdfService: 3 tests (smoke)
- UnitPricesService: 5 tests
- **Total**: ~50 tests

### 12.2 Test patterns (per F1 P8)
- Mock all dependencies (PrismaService, repositories, EventEmitter)
- Mock transaction client via `$transaction` callback
- Verify side effects (audit, event emission)
- Verify business rule errors thrown correctly

### 12.3 PDF testing
- Smoke test: HTML template renders without error
- Validate PDF buffer starts with `%PDF`
- JP character rendering (no smoke test for visual, defer to manual QA)

### 12.4 E2E (deferred Phase 9)
- Full workflows: create → submit → approve → send → won → project transition
- 電帳法 versioning audit trail

---

## 13. Migration

### 13.1 Prisma migration generation
```bash
# After adding models to schema.prisma:
pnpm --filter backend run prisma:migrate:dev --name add_quote_tables
```

### 13.2 Raw SQL migration (separate file)
```sql
-- 20260517_120500_add_quote_fts_and_sequences/migration.sql

-- pg_bigm extension for fuzzy JP search on counter_party_name
CREATE EXTENSION IF NOT EXISTS pg_bigm;

-- GIN index for counter_party_name search (電帳法 search key)
CREATE INDEX IF NOT EXISTS idx_quotes_counter_party_bigm
  ON quotes USING gin (counter_party_name gin_bigm_ops)
  WHERE deleted_at IS NULL;

-- Sequences for quote_number per year (Q-YYYY-NNNNN format)
CREATE SEQUENCE IF NOT EXISTS quote_number_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS quote_number_seq_2027 START 1;
```

### 13.3 Seed update (backend/prisma/seed.ts)
```typescript
async function seedF2(prisma: PrismaClient): Promise<void> {
  console.log('🌱 Seeding F2 unit_prices sample data...');

  const admin = await prisma.user.findUnique({ where: { email: 'admin@dev.shikou-kanri.local' } });
  if (!admin) return;

  if ((await prisma.unitPrice.count()) > 0) {
    console.log('  ↩  F2 unit_prices already exists, skipping');
    return;
  }

  const samples = [
    { code: 'EXT-PNT-001', category: '外壁工事', itemName: '外壁塗装 (シリコン)', unit: 'm²', defaultUnitPrice: 3000 },
    { code: 'EXT-PNT-002', category: '外壁工事', itemName: '外壁塗装 (フッ素)', unit: 'm²', defaultUnitPrice: 4500 },
    { code: 'SCF-001', category: '諸経費', itemName: '足場設置・解体', unit: '式', defaultUnitPrice: 80000 },
    { code: 'ROOF-001', category: '屋根工事', itemName: '瓦交換', unit: 'm²', defaultUnitPrice: 12000 },
    { code: 'DML-001', category: '解体工事', itemName: '内装解体', unit: 'm²', defaultUnitPrice: 5000 },
    { code: 'WD-001', category: '木工事', itemName: 'フローリング張替', unit: 'm²', defaultUnitPrice: 8000 },
    { code: 'KCH-001', category: '設備工事', itemName: 'システムキッチン交換', unit: '式', defaultUnitPrice: 800000 },
    { code: 'BTH-001', category: '設備工事', itemName: 'ユニットバス交換', unit: '式', defaultUnitPrice: 700000 },
    { code: 'CLR-001', category: '仕上工事', itemName: 'クロス張替', unit: 'm²', defaultUnitPrice: 1200 },
    { code: 'PLM-001', category: '設備工事', itemName: '配管工事 (給排水)', unit: 'm', defaultUnitPrice: 5000 },
    // ... 30-50 total
  ];

  for (const sample of samples) {
    await prisma.unitPrice.create({
      data: {
        ...sample,
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }
  console.log(`  ✓  F2 seeded ${samples.length} unit_prices`);
}
```

Add `await seedF2(prisma);` to `main()` function.

---

## 14. Dependencies new (BE)

| Package | Version | Purpose |
|---|---|---|
| `puppeteer` | ^23.x | PDF generation (Chromium headless) |
| `handlebars` | ^4.x | HTML template engine for PDF |

**No new shared infrastructure needed** — reuse PrismaService, AuthModule, EventEmitter, AuditStubService.

---

## 15. Out of Scope (BD reminder)

- F2-06 AI suggestions
- BullMQ async PDF queue (Phase 2)
- Quote template library
- Multi-tier approval >2 levels
- Configurable threshold env (hard-code MVP)
- Excel/CSV bulk import line items
- Customer self-view portal
- Real-time collaborative editing

---

*BE Detail Design — F2 見積管理 v1.0 — Services pseudo-code, repositories, transactions, validation*
