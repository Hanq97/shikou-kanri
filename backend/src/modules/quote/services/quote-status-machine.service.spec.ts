import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Quote } from '@prisma/client';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import {
  QuoteAnotherWonExistsError,
  QuoteInvalidStatusTransitionError,
  QuoteNotFoundError,
  QuoteRejectReasonRequiredError,
  QuoteTier2RequiresAdminError,
} from '../../../shared/exceptions/quote-errors';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService } from '../../auth/internal/audit-stub.service';
import { QuoteRepository } from '../repositories/quote.repository';
import { QuoteStatusMachineService } from './quote-status-machine.service';
import { QuoteVersioningService } from './quote-versioning.service';

function d(v: string | number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'q1',
    quoteNumber: 'Q-2026-00001',
    projectId: 'p1',
    versionNo: 1,
    version: 1,
    status: 'draft',
    issuedAt: new Date(),
    validUntil: null,
    counterPartyName: '山田太郎',
    amountSubtotal: d('100000'),
    amountTax: d('10000'),
    amountTotal: d('110000'),
    notes: null,
    qualifiedInvoiceNumber: null,
    approvedById: null,
    approvedAt: null,
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdById: 'u1',
    updatedById: 'u1',
    ...overrides,
  } as Quote;
}

const ctx: RequestContext = { ipAddress: null, userAgent: null, traceId: 't' };

function user(role: AuthenticatedUser['role'], id = 'u1'): AuthenticatedUser {
  return {
    id,
    email: 'x@x',
    name: 'X',
    nameKana: null,
    role,
    twoFaEnabled: false,
    status: 'active',
    forcePasswordChange: false,
    forceTwoFaEnrollment: false,
  };
}

function makeService(repo: Partial<QuoteRepository>) {
  const prisma = {
    $transaction: jest.fn(async (fn) => fn({} as never)),
  } as unknown as PrismaService;
  const versioning = {
    snapshot: jest.fn(),
  } as unknown as QuoteVersioningService;
  const audit: Partial<AuditStubService> = {
    logQuoteSubmitted: jest.fn(),
    logQuoteApproved: jest.fn(),
    logQuoteRejected: jest.fn(),
    logQuoteSent: jest.fn(),
    logQuoteWon: jest.fn(),
    logQuoteLost: jest.fn(),
  };
  const events = { emit: jest.fn() } as unknown as EventEmitter2;
  return new QuoteStatusMachineService(
    prisma,
    repo as QuoteRepository,
    versioning,
    audit as AuditStubService,
    events,
  );
}

describe('QuoteStatusMachineService', () => {
  describe('submit', () => {
    it('routes tier1 (≤10M) to submitted', async () => {
      const quote = makeQuote({ amountTotal: d('9999999') });
      const repo: Partial<QuoteRepository> = {
        findById: jest.fn().mockResolvedValue(quote),
        updateUnlocked: jest
          .fn()
          .mockResolvedValue({ ...quote, status: 'submitted' }),
      };
      const svc = makeService(repo);
      const out = await svc.submit('q1', user('employee'), ctx);
      expect(out.status).toBe('submitted');
      expect(repo.updateUnlocked).toHaveBeenCalledWith(
        'q1',
        expect.objectContaining({ status: 'submitted' }),
        expect.anything(),
      );
    });

    it('routes tier2 (>10M) to pending_admin', async () => {
      const quote = makeQuote({ amountTotal: d('15000000') });
      const repo: Partial<QuoteRepository> = {
        findById: jest.fn().mockResolvedValue(quote),
        updateUnlocked: jest
          .fn()
          .mockResolvedValue({ ...quote, status: 'pending_admin' }),
      };
      const svc = makeService(repo);
      const out = await svc.submit('q1', user('employee'), ctx);
      expect(out.status).toBe('pending_admin');
    });

    it('throws on missing quote', async () => {
      const svc = makeService({ findById: jest.fn().mockResolvedValue(null) });
      await expect(
        svc.submit('q1', user('employee'), ctx),
      ).rejects.toBeInstanceOf(QuoteNotFoundError);
    });

    it('throws on invalid transition (e.g. already approved)', async () => {
      const repo: Partial<QuoteRepository> = {
        findById: jest
          .fn()
          .mockResolvedValue(makeQuote({ status: 'approved' })),
      };
      const svc = makeService(repo);
      await expect(
        svc.submit('q1', user('employee'), ctx),
      ).rejects.toBeInstanceOf(QuoteInvalidStatusTransitionError);
    });

    it('throws on insufficient permission (invited)', async () => {
      const svc = makeService({});
      await expect(
        svc.submit('q1', user('invited' as never), ctx),
      ).rejects.toBeInstanceOf(AuthInsufficientPermissionError);
    });
  });

  describe('approve', () => {
    it('manager can approve tier1 (status=submitted)', async () => {
      const quote = makeQuote({ status: 'submitted' });
      const repo: Partial<QuoteRepository> = {
        findById: jest.fn().mockResolvedValue(quote),
        updateUnlocked: jest
          .fn()
          .mockResolvedValue({ ...quote, status: 'approved' }),
      };
      const svc = makeService(repo);
      const out = await svc.approve('q1', user('manager'), ctx);
      expect(out.status).toBe('approved');
    });

    it('employee CANNOT approve tier1', async () => {
      const repo: Partial<QuoteRepository> = {
        findById: jest
          .fn()
          .mockResolvedValue(makeQuote({ status: 'submitted' })),
      };
      const svc = makeService(repo);
      await expect(
        svc.approve('q1', user('employee'), ctx),
      ).rejects.toBeInstanceOf(AuthInsufficientPermissionError);
    });

    it('manager CANNOT approve tier2 (status=pending_admin)', async () => {
      const repo: Partial<QuoteRepository> = {
        findById: jest
          .fn()
          .mockResolvedValue(makeQuote({ status: 'pending_admin' })),
      };
      const svc = makeService(repo);
      await expect(
        svc.approve('q1', user('manager'), ctx),
      ).rejects.toBeInstanceOf(QuoteTier2RequiresAdminError);
    });

    it('admin CAN approve tier2 (status=pending_admin)', async () => {
      const quote = makeQuote({ status: 'pending_admin' });
      const repo: Partial<QuoteRepository> = {
        findById: jest.fn().mockResolvedValue(quote),
        updateUnlocked: jest
          .fn()
          .mockResolvedValue({ ...quote, status: 'approved' }),
      };
      const svc = makeService(repo);
      const out = await svc.approve('q1', user('system_admin'), ctx);
      expect(out.status).toBe('approved');
    });
  });

  describe('reject', () => {
    it('requires reason ≥ 5 chars', async () => {
      const svc = makeService({});
      await expect(
        svc.reject('q1', 'ng', user('manager'), ctx),
      ).rejects.toBeInstanceOf(QuoteRejectReasonRequiredError);
    });

    it('employee cannot reject', async () => {
      const svc = makeService({});
      await expect(
        svc.reject('q1', 'reason long enough', user('employee'), ctx),
      ).rejects.toBeInstanceOf(AuthInsufficientPermissionError);
    });

    it('rejects approved quote (regret approval)', async () => {
      const quote = makeQuote({ status: 'approved' });
      const repo: Partial<QuoteRepository> = {
        findById: jest.fn().mockResolvedValue(quote),
        updateUnlocked: jest
          .fn()
          .mockResolvedValue({ ...quote, status: 'rejected' }),
      };
      const svc = makeService(repo);
      const out = await svc.reject(
        'q1',
        'price too high',
        user('manager'),
        ctx,
      );
      expect(out.status).toBe('rejected');
    });
  });

  describe('send', () => {
    it('requires status=approved', async () => {
      const repo: Partial<QuoteRepository> = {
        findById: jest.fn().mockResolvedValue(makeQuote({ status: 'draft' })),
      };
      const svc = makeService(repo);
      await expect(
        svc.send('q1', user('employee'), ctx),
      ).rejects.toBeInstanceOf(QuoteInvalidStatusTransitionError);
    });
  });

  describe('won', () => {
    it('requires status=sent', async () => {
      const repo: Partial<QuoteRepository> = {
        findById: jest
          .fn()
          .mockResolvedValue(makeQuote({ status: 'approved' })),
      };
      const svc = makeService(repo);
      await expect(svc.won('q1', user('employee'), ctx)).rejects.toBeInstanceOf(
        QuoteInvalidStatusTransitionError,
      );
    });

    it('blocks non-admin when another quote already won for the project', async () => {
      const repo: Partial<QuoteRepository> = {
        findById: jest.fn().mockResolvedValue(makeQuote({ status: 'sent' })),
        countWonByProject: jest.fn().mockResolvedValue(1),
      };
      const svc = makeService(repo);
      await expect(svc.won('q1', user('manager'), ctx)).rejects.toBeInstanceOf(
        QuoteAnotherWonExistsError,
      );
    });

    it('admin can mark won even when another is already won', async () => {
      const quote = makeQuote({ status: 'sent' });
      const repo: Partial<QuoteRepository> = {
        findById: jest.fn().mockResolvedValue(quote),
        countWonByProject: jest.fn().mockResolvedValue(1),
        updateUnlocked: jest
          .fn()
          .mockResolvedValue({ ...quote, status: 'won' }),
      };
      const svc = makeService(repo);
      const out = await svc.won('q1', user('system_admin'), ctx);
      expect(out.status).toBe('won');
    });

    it('marks won when no other quote is won', async () => {
      const quote = makeQuote({ status: 'sent' });
      const repo: Partial<QuoteRepository> = {
        findById: jest.fn().mockResolvedValue(quote),
        countWonByProject: jest.fn().mockResolvedValue(0),
        updateUnlocked: jest
          .fn()
          .mockResolvedValue({ ...quote, status: 'won' }),
      };
      const svc = makeService(repo);
      const out = await svc.won('q1', user('employee'), ctx);
      expect(out.status).toBe('won');
    });
  });
});
