import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Quote } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import {
  QuoteAnotherWonExistsError,
  QuoteInvalidStatusTransitionError,
  QuoteNotFoundError,
  QuoteRejectReasonRequiredError,
  QuoteTier2RequiresAdminError,
} from '../../../shared/exceptions/quote-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService, Tx } from '../../auth/internal/audit-stub.service';
import { APPROVAL_TIER2_THRESHOLD_JPY } from '../domain/constants';
import { isValidTransition } from '../domain/status-transitions';
import { QuoteStatusName } from '../domain/types';
import { QuoteRepository } from '../repositories/quote.repository';
import { QuoteVersioningService } from './quote-versioning.service';

const APPROVER_ROLES = new Set(['system_admin', 'manager']);
const EDIT_ROLES = new Set(['system_admin', 'manager', 'employee']);

@Injectable()
export class QuoteStatusMachineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: QuoteRepository,
    private readonly versioning: QuoteVersioningService,
    private readonly audit: AuditStubService,
    private readonly events: EventEmitter2,
  ) {}

  async submit(
    id: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Quote> {
    if (!EDIT_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();

    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);

    if (!isValidTransition(quote.status as QuoteStatusName, 'submitted')) {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'submitted');
    }

    // Determine target status based on threshold
    const isOverThreshold =
      Number(quote.amountTotal) > APPROVAL_TIER2_THRESHOLD_JPY;
    const targetStatus: QuoteStatusName = isOverThreshold
      ? 'pending_admin'
      : 'submitted';
    const tier: 1 | 2 = isOverThreshold ? 2 : 1;

    return this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const updated = await this.repo.updateUnlocked(
        id,
        {
          status: targetStatus,
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );
      await this.versioning.snapshot(
        id,
        'status_change',
        `Submitted (tier ${tier})`,
        requester.id,
        tx,
      );
      await this.audit.logQuoteSubmitted(id, tier, requester.id, ctx, tx);
      this.events.emit('quote.submitted', { quoteId: id, tier });
      return updated;
    });
  }

  async approve(
    id: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Quote> {
    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);

    let tier: 1 | 2;
    if (quote.status === 'submitted') {
      if (!APPROVER_ROLES.has(requester.role)) {
        throw new AuthInsufficientPermissionError();
      }
      tier = 1;
    } else if (quote.status === 'pending_admin') {
      if (requester.role !== 'system_admin') {
        throw new QuoteTier2RequiresAdminError();
      }
      tier = 2;
    } else {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'approved');
    }

    return this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const updated = await this.repo.updateUnlocked(
        id,
        {
          status: 'approved',
          approvedBy: { connect: { id: requester.id } },
          approvedAt: new Date(),
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );
      await this.versioning.snapshot(
        id,
        'status_change',
        `Approved (tier ${tier})`,
        requester.id,
        tx,
      );
      await this.audit.logQuoteApproved(id, tier, requester.id, ctx, tx);
      this.events.emit('quote.approved', { quoteId: id, tier });
      return updated;
    });
  }

  async reject(
    id: string,
    reason: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Quote> {
    if (!APPROVER_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();
    if (reason.trim().length < 5) throw new QuoteRejectReasonRequiredError();

    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);
    if (!['submitted', 'pending_admin', 'approved'].includes(quote.status)) {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'rejected');
    }

    return this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const updated = await this.repo.updateUnlocked(
        id,
        {
          status: 'rejected',
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );
      await this.versioning.snapshot(
        id,
        'status_change',
        reason,
        requester.id,
        tx,
      );
      await this.audit.logQuoteRejected(id, reason, requester.id, ctx, tx);
      this.events.emit('quote.rejected', { quoteId: id, reason });
      return updated;
    });
  }

  async send(
    id: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Quote> {
    if (!EDIT_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();

    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);
    if (quote.status !== 'approved') {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'sent');
    }

    return this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const updated = await this.repo.updateUnlocked(
        id,
        {
          status: 'sent',
          sentAt: new Date(),
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );
      await this.versioning.snapshot(
        id,
        'status_change',
        'Sent',
        requester.id,
        tx,
      );
      await this.audit.logQuoteSent(id, requester.id, ctx, tx);
      this.events.emit('quote.sent', { quoteId: id });
      return updated;
    });
  }

  async won(
    id: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Quote> {
    if (!EDIT_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();

    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);
    if (quote.status !== 'sent') {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'won');
    }

    // BR-QT-016: warn if another quote already won for this project
    const wonCount = await this.repo.countWonByProject(quote.projectId);
    if (wonCount > 0 && requester.role !== 'system_admin') {
      throw new QuoteAnotherWonExistsError(quote.projectId);
    }

    return this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const updated = await this.repo.updateUnlocked(
        id,
        {
          status: 'won',
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );
      await this.versioning.snapshot(
        id,
        'status_change',
        'Won',
        requester.id,
        tx,
      );
      await this.audit.logQuoteWon(
        id,
        quote.projectId,
        Number(quote.amountTotal),
        requester.id,
        ctx,
        tx,
      );
      this.events.emit('quote.won', {
        quoteId: id,
        projectId: quote.projectId,
        amountTotal: Number(quote.amountTotal),
      });
      return updated;
    });
  }

  async lost(
    id: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Quote> {
    if (!EDIT_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();

    const quote = await this.repo.findById(id);
    if (!quote) throw new QuoteNotFoundError(id);
    if (quote.status !== 'sent') {
      throw new QuoteInvalidStatusTransitionError(quote.status, 'lost');
    }

    return this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const updated = await this.repo.updateUnlocked(
        id,
        {
          status: 'lost',
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );
      await this.versioning.snapshot(
        id,
        'status_change',
        'Lost',
        requester.id,
        tx,
      );
      await this.audit.logQuoteLost(id, requester.id, ctx, tx);
      this.events.emit('quote.lost', { quoteId: id });
      return updated;
    });
  }
}
