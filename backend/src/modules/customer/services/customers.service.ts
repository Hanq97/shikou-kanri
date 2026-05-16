import { Injectable } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  CustomerHasActiveProjectsError,
  CustomerNotFoundError,
} from '../../../shared/exceptions/customer-errors';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService, Tx } from '../../auth/internal/audit-stub.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import {
  CustomerDto,
  DuplicateCheckResult,
  ListCustomersFilter,
} from '../domain/types';
import { CustomerRepository } from '../repositories/customer.repository';
import { normalizePhone } from '../utils/normalize-phone';
import { CustomerDuplicateCheckService } from './customer-duplicate-check.service';

export type CreateCustomerResult =
  | { kind: 'success'; customer: CustomerDto }
  | { kind: 'duplicate'; duplicateOf: DuplicateCheckResult['duplicateOf'] };

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: CustomerRepository,
    private readonly dupCheck: CustomerDuplicateCheckService,
    private readonly audit: AuditStubService,
  ) {}

  async list(
    filter: ListCustomersFilter,
    requester: AuthenticatedUser,
  ): Promise<{
    data: CustomerDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();
    const result = await this.repo.list(filter);
    return {
      data: result.data.map((c) => this.toDto(c)),
      total: result.total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findById(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<CustomerDto> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();
    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundError(id);
    return this.toDto(customer);
  }

  async create(
    input: CreateCustomerDto,
    requester: AuthenticatedUser,
    ctx: RequestContext,
    force = false,
  ): Promise<CreateCustomerResult> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();

    const normalizedPhone = normalizePhone(input.phone);

    if (!force && normalizedPhone) {
      const dup = await this.dupCheck.checkPhone(normalizedPhone);
      if (dup.duplicateOf) {
        return { kind: 'duplicate', duplicateOf: dup.duplicateOf };
      }
    }

    const customer = await this.prisma.$transaction(async (tx) => {
      const created = await this.repo.create(
        {
          customerType: input.customerType,
          name: input.name,
          nameKana: input.nameKana || null,
          phone: normalizedPhone,
          email: input.email || null,
          address: input.address || null,
          isOb: input.isOb ?? false,
          acquiredAt: input.acquiredAt ? new Date(input.acquiredAt) : null,
          notes: input.notes || null,
          createdBy: { connect: { id: requester.id } },
          updatedBy: { connect: { id: requester.id } },
        },
        tx as Tx,
      );
      await this.audit.logCustomerCreated(
        created.id,
        requester.id,
        ctx,
        tx as Tx,
      );
      return created;
    });

    return { kind: 'success', customer: this.toDto(customer) };
  }

  async update(
    id: string,
    input: UpdateCustomerDto,
    requester: AuthenticatedUser,
    ctx: RequestContext,
    force = false,
  ): Promise<CreateCustomerResult> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();

    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundError(id);

    // employee ownership check
    if (
      requester.role === 'employee' &&
      customer.createdById !== requester.id
    ) {
      throw new AuthInsufficientPermissionError();
    }

    const normalizedPhone =
      input.phone !== undefined ? normalizePhone(input.phone) : undefined;

    if (!force && normalizedPhone && normalizedPhone !== customer.phone) {
      const dup = await this.dupCheck.checkPhone(normalizedPhone);
      if (dup.duplicateOf && dup.duplicateOf.id !== id) {
        return { kind: 'duplicate', duplicateOf: dup.duplicateOf };
      }
    }

    const changed = this.diffFields(customer, input, normalizedPhone);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.repo.update(
        id,
        {
          ...(input.customerType !== undefined
            ? { customerType: input.customerType }
            : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.nameKana !== undefined
            ? { nameKana: input.nameKana || null }
            : {}),
          ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
          ...(input.email !== undefined ? { email: input.email || null } : {}),
          ...(input.address !== undefined
            ? { address: input.address || null }
            : {}),
          ...(input.isOb !== undefined ? { isOb: input.isOb } : {}),
          ...(input.acquiredAt !== undefined
            ? {
                acquiredAt: input.acquiredAt
                  ? new Date(input.acquiredAt)
                  : null,
              }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
          updatedBy: { connect: { id: requester.id } },
        },
        tx as Tx,
      );
      if (changed.length > 0) {
        await this.audit.logCustomerUpdated(
          id,
          changed,
          requester.id,
          ctx,
          tx as Tx,
        );
      }
      return result;
    });

    return { kind: 'success', customer: this.toDto(updated) };
  }

  async softDelete(
    id: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<void> {
    if (requester.role !== 'system_admin')
      throw new AuthInsufficientPermissionError();

    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundError(id);

    // BR-CUS-003: block if active projects
    const activeProjects = await this.prisma.project.findMany({
      where: {
        customerId: id,
        deletedAt: null,
        status: { notIn: ['handed_over', 'cancelled'] },
      },
      select: { id: true, projectCode: true, name: true, status: true },
    });
    if (activeProjects.length > 0) {
      throw new CustomerHasActiveProjectsError(
        activeProjects.length,
        activeProjects,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.repo.softDelete(id, requester.id, tx as Tx);
      await this.audit.logCustomerDeleted(id, requester.id, ctx, tx as Tx);
    });
  }

  /**
   * Pre-acquisition placeholder customer for projects without a real customer.
   * Called by ProjectsService during create when preAcquisition=true.
   */
  async findOrCreatePlaceholder(
    projectCode: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
    tx: Tx,
  ): Promise<CustomerDto> {
    const placeholderName = `TBD - 土地仕入れ - ${projectCode}`;
    const placeholderPhone = `TBD-${projectCode}`;
    const created = await this.repo.create(
      {
        customerType: 'individual',
        name: placeholderName,
        phone: placeholderPhone,
        isOb: false,
        createdBy: { connect: { id: requester.id } },
        updatedBy: { connect: { id: requester.id } },
      },
      tx,
    );
    await this.audit.logCustomerCreated(created.id, requester.id, ctx, tx);
    return this.toDto(created);
  }

  toDto(c: Customer): CustomerDto {
    return {
      id: c.id,
      customerType: c.customerType,
      name: c.name,
      nameKana: c.nameKana,
      phone: c.phone,
      email: c.email,
      address: c.address,
      isOb: c.isOb,
      acquiredAt: c.acquiredAt,
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      createdById: c.createdById,
      updatedById: c.updatedById,
    };
  }

  private diffFields(
    before: Customer,
    input: UpdateCustomerDto,
    normalizedPhone?: string | null,
  ): string[] {
    const changed: string[] = [];
    if (
      input.customerType !== undefined &&
      input.customerType !== before.customerType
    )
      changed.push('customerType');
    if (input.name !== undefined && input.name !== before.name)
      changed.push('name');
    if (
      input.nameKana !== undefined &&
      (input.nameKana || null) !== before.nameKana
    )
      changed.push('nameKana');
    if (normalizedPhone !== undefined && normalizedPhone !== before.phone)
      changed.push('phone');
    if (input.email !== undefined && (input.email || null) !== before.email)
      changed.push('email');
    if (
      input.address !== undefined &&
      (input.address || null) !== before.address
    )
      changed.push('address');
    if (input.isOb !== undefined && input.isOb !== before.isOb)
      changed.push('isOb');
    if (input.acquiredAt !== undefined) {
      const newDate = input.acquiredAt
        ? new Date(input.acquiredAt).getTime()
        : null;
      const oldDate = before.acquiredAt?.getTime() ?? null;
      if (newDate !== oldDate) changed.push('acquiredAt');
    }
    if (input.notes !== undefined && (input.notes || null) !== before.notes)
      changed.push('notes');
    return changed;
  }
}
