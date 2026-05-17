import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import { QuoteNotFoundError } from '../../../shared/exceptions/quote-errors';
import { AuthenticatedUser } from '../../auth/domain/types';
import { Tx } from '../../auth/internal/audit-stub.service';
import {
  QuoteVersionRepository,
  QuoteVersionWithUser,
} from '../repositories/quote-version.repository';
import { QuoteLineRepository } from '../repositories/quote-line.repository';
import { QuoteRepository } from '../repositories/quote.repository';

@Injectable()
export class QuoteVersioningService {
  constructor(
    private readonly repo: QuoteVersionRepository,
    private readonly quoteRepo: QuoteRepository,
    private readonly lineRepo: QuoteLineRepository,
  ) {}

  /**
   * Create append-only version snapshot.
   * Called inside an existing transaction by other services.
   * 電帳法 compliance: NO UPDATE/DELETE on quote_versions table.
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

    await this.repo.create(
      {
        quoteId,
        versionNo: quote.versionNo,
        changeType,
        changeReason: changeReason ?? 'Status change',
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        changedById,
      },
      tx,
    );
  }

  async list(
    quoteId: string,
    requester: AuthenticatedUser,
  ): Promise<QuoteVersionWithUser[]> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();
    const quote = await this.quoteRepo.findById(quoteId);
    if (!quote) throw new QuoteNotFoundError(quoteId);
    return this.repo.findByQuoteNumber(quote.quoteNumber);
  }
}
