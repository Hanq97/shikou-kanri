import { EventEmitter2 } from '@nestjs/event-emitter';
import { Project } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  ProjectCancelReasonRequiredError,
  ProjectInvalidStatusTransitionError,
  ProjectMissingFieldForTransitionError,
  ProjectMissingHandoverDateError,
  ProjectMissingPropertyForHandoverError,
  ProjectNotFoundError,
  ProjectReverseReasonRequiredError,
} from '../../../shared/exceptions/project-errors';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService } from '../../auth/internal/audit-stub.service';
import { ProjectRepository } from '../repositories/project.repository';
import { ProjectStatusMachineService } from './project-status-machine.service';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    projectCode: '2026-0001',
    customerId: 'c1',
    propertyId: null,
    projectType: 'remodel',
    status: 'quoting',
    name: 'Test',
    description: null,
    ownerUserId: 'u-owner',
    scheduleStart: null,
    scheduleEnd: null,
    actualStart: null,
    actualEnd: null,
    amountTotal: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdById: 'u-owner',
    updatedById: 'u-owner',
    ...overrides,
  } as Project;
}

const ctx: RequestContext = {
  ipAddress: null,
  userAgent: null,
  traceId: 'trace',
};

const owner: AuthenticatedUser = {
  id: 'u-owner',
  email: 'o@x',
  name: 'Owner',
  nameKana: null,
  role: 'employee',
  twoFaEnabled: false,
  status: 'active',
  forcePasswordChange: false,
  forceTwoFaEnrollment: false,
};

const admin: AuthenticatedUser = {
  ...owner,
  id: 'u-admin',
  role: 'system_admin',
};
const stranger: AuthenticatedUser = { ...owner, id: 'u-other' };

describe('ProjectStatusMachineService', () => {
  let service: ProjectStatusMachineService;
  let repo: jest.Mocked<ProjectRepository>;
  let prisma: { $transaction: jest.Mock; property: { findUnique: jest.Mock } };
  let audit: jest.Mocked<AuditStubService>;
  let events: jest.Mocked<EventEmitter2>;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      update: jest
        .fn()
        .mockImplementation((_, data) =>
          Promise.resolve(makeProject({ ...data })),
        ),
    } as unknown as jest.Mocked<ProjectRepository>;
    prisma = {
      $transaction: jest.fn().mockImplementation((cb) => cb({})),
      property: { findUnique: jest.fn() },
    };
    audit = {
      logProjectStatusChanged: jest.fn().mockResolvedValue(undefined),
      logProjectStatusReversed: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditStubService>;
    events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    service = new ProjectStatusMachineService(
      prisma as unknown as PrismaService,
      repo,
      audit,
      events,
    );
  });

  describe('transition (forward)', () => {
    it('throws when project not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.transition('p1', 'received', {}, owner, ctx),
      ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('blocks invalid transition (quoting → completed)', async () => {
      repo.findById.mockResolvedValue(makeProject({ status: 'quoting' }));
      await expect(
        service.transition('p1', 'completed', {}, owner, ctx),
      ).rejects.toBeInstanceOf(ProjectInvalidStatusTransitionError);
    });

    it('blocks when requester is neither owner nor admin/manager', async () => {
      repo.findById.mockResolvedValue(makeProject({ status: 'quoting' }));
      await expect(
        service.transition(
          'p1',
          'received',
          { amountTotal: 100 },
          stranger,
          ctx,
        ),
      ).rejects.toBeInstanceOf(AuthInsufficientPermissionError);
    });

    it('received requires amountTotal', async () => {
      repo.findById.mockResolvedValue(
        makeProject({ status: 'quoting', amountTotal: null }),
      );
      await expect(
        service.transition('p1', 'received', {}, owner, ctx),
      ).rejects.toBeInstanceOf(ProjectMissingFieldForTransitionError);
    });

    it('cancel requires reason ≥5 chars', async () => {
      repo.findById.mockResolvedValue(makeProject({ status: 'quoting' }));
      await expect(
        service.transition('p1', 'cancelled', { reason: '12' }, owner, ctx),
      ).rejects.toBeInstanceOf(ProjectCancelReasonRequiredError);
    });

    it('handed_over requires property', async () => {
      repo.findById.mockResolvedValue(
        makeProject({ status: 'completed', propertyId: null }),
      );
      await expect(
        service.transition('p1', 'handed_over', {}, owner, ctx),
      ).rejects.toBeInstanceOf(ProjectMissingPropertyForHandoverError);
    });

    it('handed_over requires property.handover_date', async () => {
      repo.findById.mockResolvedValue(
        makeProject({ status: 'completed', propertyId: 'prop1' }),
      );
      prisma.property.findUnique.mockResolvedValue({ handoverDate: null });
      await expect(
        service.transition('p1', 'handed_over', {}, owner, ctx),
      ).rejects.toBeInstanceOf(ProjectMissingHandoverDateError);
    });

    it('construction → completed auto-sets actualEnd', async () => {
      repo.findById.mockResolvedValue(
        makeProject({
          status: 'construction',
          actualStart: new Date('2026-04-01'),
        }),
      );
      await service.transition('p1', 'completed', {}, owner, ctx);
      const updateCall = repo.update.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(updateCall.actualEnd).toBeInstanceOf(Date);
      expect(events.emit).toHaveBeenCalledWith(
        'project.status_changed',
        expect.any(Object),
      );
    });

    it('received → construction auto-sets actualStart', async () => {
      repo.findById.mockResolvedValue(
        makeProject({ status: 'received', actualStart: null }),
      );
      await service.transition('p1', 'construction', {}, owner, ctx);
      const updateCall = repo.update.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(updateCall.actualStart).toBeInstanceOf(Date);
    });

    it('quoting → received with amountTotal works', async () => {
      repo.findById.mockResolvedValue(makeProject({ status: 'quoting' }));
      await service.transition(
        'p1',
        'received',
        { amountTotal: 1500000 },
        owner,
        ctx,
      );
      expect(repo.update).toHaveBeenCalled();
      expect(audit.logProjectStatusChanged).toHaveBeenCalled();
    });
  });

  describe('reverseTransition', () => {
    it('blocks non-admin', async () => {
      await expect(
        service.reverseTransition('p1', 'received', 'reasonX', owner, ctx),
      ).rejects.toBeInstanceOf(AuthInsufficientPermissionError);
    });

    it('requires reason ≥5 chars', async () => {
      await expect(
        service.reverseTransition('p1', 'received', '12', admin, ctx),
      ).rejects.toBeInstanceOf(ProjectReverseReasonRequiredError);
    });

    it('throws when project not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.reverseTransition('p1', 'received', 'valid reason', admin, ctx),
      ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it('admin can reverse and audits', async () => {
      repo.findById.mockResolvedValue(makeProject({ status: 'completed' }));
      await service.reverseTransition(
        'p1',
        'construction',
        'mistake correction',
        admin,
        ctx,
      );
      expect(repo.update).toHaveBeenCalled();
      expect(audit.logProjectStatusReversed).toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith(
        'project.status.reversed',
        expect.any(Object),
      );
    });
  });
});
