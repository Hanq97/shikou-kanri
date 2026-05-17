import { PrismaService } from '../../../shared/database/prisma.service';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService } from '../../auth/internal/audit-stub.service';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerImportService } from './customer-import.service';

const ctx: RequestContext = {
  ipAddress: null,
  userAgent: null,
  traceId: 't',
};

const admin: AuthenticatedUser = {
  id: 'u-admin',
  email: 'a@x',
  name: 'A',
  nameKana: null,
  role: 'system_admin',
  twoFaEnabled: false,
  status: 'active',
  forcePasswordChange: false,
  forceTwoFaEnrollment: false,
};

const manager: AuthenticatedUser = { ...admin, id: 'u-mgr', role: 'manager' };

describe('CustomerImportService', () => {
  let service: CustomerImportService;
  let prisma: {
    $transaction: jest.Mock;
    customer: { findMany: jest.Mock };
  };
  let repo: jest.Mocked<CustomerRepository>;
  let audit: jest.Mocked<AuditStubService>;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn().mockImplementation((cb) => cb({})),
      customer: { findMany: jest.fn().mockResolvedValue([]) },
    };
    repo = {
      create: jest.fn().mockResolvedValue({ id: 'new' }),
    } as unknown as jest.Mocked<CustomerRepository>;
    audit = {
      logCustomerCsvImported: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditStubService>;

    service = new CustomerImportService(
      prisma as unknown as PrismaService,
      repo,
      audit,
    );
  });

  it('rejects non-admin', async () => {
    await expect(
      service.import(
        Buffer.from('name,customer_type\nx,individual'),
        manager,
        ctx,
      ),
    ).rejects.toBeInstanceOf(AuthInsufficientPermissionError);
  });

  it('imports valid rows', async () => {
    const csv = `customer_type,name,phone
individual,山田 太郎,0312345678
corporate,株式会社A,0335556666
`;
    const result = await service.import(Buffer.from(csv), admin, ctx);
    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(repo.create).toHaveBeenCalledTimes(2);
  });

  it('dedups phone against existing customers', async () => {
    prisma.customer.findMany.mockResolvedValue([{ phone: '0312345678' }]);
    const csv = `customer_type,name,phone
individual,山田 太郎,03-1234-5678
individual,別人,0398765432
`;
    const result = await service.import(Buffer.from(csv), admin, ctx);
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('dedups phone within same import batch', async () => {
    const csv = `customer_type,name,phone
individual,A,0312345678
individual,B,03-1234-5678
`;
    const result = await service.import(Buffer.from(csv), admin, ctx);
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('collects validation errors per row but continues', async () => {
    const csv = `customer_type,name,phone
invalid_type,A,0311111111
individual,,0322222222
individual,Valid,0333333333
`;
    const result = await service.import(Buffer.from(csv), admin, ctx);
    expect(result.created).toBe(1);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].rowIndex).toBe(1);
    expect(result.errors[1].rowIndex).toBe(2);
  });

  it('parses is_ob boolean correctly', async () => {
    const csv = `customer_type,name,is_ob
individual,A,true
individual,B,false
individual,C,ob
`;
    await service.import(Buffer.from(csv), admin, ctx);
    expect(repo.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ isOb: true }),
      expect.anything(),
    );
    expect(repo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ isOb: false }),
      expect.anything(),
    );
    expect(repo.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ isOb: true }),
      expect.anything(),
    );
  });

  it('audits import result', async () => {
    const csv = `customer_type,name\nindividual,A\n`;
    await service.import(Buffer.from(csv), admin, ctx);
    expect(audit.logCustomerCsvImported).toHaveBeenCalledWith(
      expect.objectContaining({ created: 1, skipped: 0, errorCount: 0 }),
      'u-admin',
      ctx,
      expect.anything(),
    );
  });
});
