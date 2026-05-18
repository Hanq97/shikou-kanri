import { AftercareRecordsService } from './aftercare-records.service';
import type { AftercareRecordRepository } from '../repositories/aftercare-record.repository';
import type { AuthenticatedUser } from '../../auth/domain/types';

describe('AftercareRecordsService', () => {
  function buildService(
    overrides: {
      repo?: Partial<AftercareRecordRepository>;
      scheduleUpdate?: jest.Mock;
      findRecord?: jest.Mock;
    } = {},
  ): {
    service: AftercareRecordsService;
    scheduleUpdate: jest.Mock;
    findRecord: jest.Mock;
    repoCreate: jest.Mock;
  } {
    const scheduleUpdate =
      overrides.scheduleUpdate ?? jest.fn().mockResolvedValue({});
    const findRecord =
      overrides.findRecord ??
      jest.fn().mockResolvedValue({
        id: 'rec-1',
        customerId: 'cust-1',
        customer: { id: 'cust-1', name: 'TestCustomer' },
        propertyId: null,
        property: null,
        scheduleId: 'sched-1',
        recordType: 'inspection',
        status: 'closed',
        occurredAt: new Date('2026-05-19'),
        title: 'Inspection done',
        description: 'OK',
        handledById: null,
        handledBy: null,
        resolvedAt: null,
        resolutionNotes: null,
        createdAt: new Date(),
      });
    const repoCreate = jest.fn().mockResolvedValue({ id: 'rec-1' });
    const repo = {
      create: repoCreate,
      findById: findRecord,
      ...overrides.repo,
    } as unknown as AftercareRecordRepository;
    const prisma = {
      maintenanceSchedule: { update: scheduleUpdate },
    };
    const service = new AftercareRecordsService(prisma as never, repo);
    return { service, scheduleUpdate, findRecord, repoCreate };
  }

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'system_admin',
  } as AuthenticatedUser;

  describe('create()', () => {
    it('auto-completes linked schedule when scheduleId provided', async () => {
      const { service, scheduleUpdate, repoCreate } = buildService();

      await service.create(
        {
          customerId: 'cust-1',
          scheduleId: 'sched-1',
          recordType: 'inspection',
          occurredAt: '2026-05-19',
          title: 'X',
          description: 'Y',
        },
        user,
      );

      expect(repoCreate).toHaveBeenCalled();
      expect(scheduleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sched-1' },
          data: expect.objectContaining({
            status: 'completed',
            completedRecordId: 'rec-1',
          }),
        }),
      );
    });

    it('does not touch any schedule when scheduleId is omitted', async () => {
      const { service, scheduleUpdate } = buildService();

      await service.create(
        {
          customerId: 'cust-1',
          recordType: 'inquiry',
          occurredAt: '2026-05-19',
          title: 'Standalone inquiry',
          description: 'Customer called',
        },
        user,
      );

      expect(scheduleUpdate).not.toHaveBeenCalled();
    });
  });
});
