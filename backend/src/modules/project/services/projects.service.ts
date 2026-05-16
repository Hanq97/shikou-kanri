import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Project } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import { CustomerNotFoundError } from '../../../shared/exceptions/customer-errors';
import {
  ProjectCustomerRequiredError,
  ProjectInvalidOwnerError,
  ProjectNotFoundError,
} from '../../../shared/exceptions/project-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService, Tx } from '../../auth/internal/audit-stub.service';
import { UserRepository } from '../../auth/repositories/user.repository';
import { CustomersService } from '../../customer/services/customers.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import {
  ListProjectsFilter,
  ProjectDto,
  ProjectListItemDto,
  ProjectWithRelations,
} from '../domain/types';
import { ProjectMemberRepository } from '../repositories/project-member.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { ProjectCodeGeneratorService } from './project-code-generator.service';
import { ProjectFoldersService } from './project-folders.service';

const INTERNAL_ROLES = ['system_admin', 'manager', 'employee'] as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProjectRepository,
    private readonly members: ProjectMemberRepository,
    private readonly users: UserRepository,
    private readonly customers: CustomersService,
    private readonly codeGen: ProjectCodeGeneratorService,
    private readonly folders: ProjectFoldersService,
    private readonly audit: AuditStubService,
    private readonly events: EventEmitter2,
  ) {}

  async list(
    filter: ListProjectsFilter,
    requester: AuthenticatedUser,
  ): Promise<{
    data: ProjectListItemDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const result = await this.repo.list(filter, requester);
    return {
      data: result.data.map((p) => this.toListItemDto(p)),
      total: result.total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findById(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<ProjectListItemDto> {
    const project = await this.repo.findByIdWithRelations(id);
    if (!project) throw new ProjectNotFoundError(id);

    if (requester.role === 'invited') {
      const member = await this.members.findOne(id, requester.id);
      if (!member || member.revokedAt !== null) {
        throw new AuthInsufficientPermissionError();
      }
    }
    return this.toListItemDto(project);
  }

  async create(
    input: CreateProjectDto,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<ProjectListItemDto> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();

    const owner = await this.users.findById(input.ownerUserId);
    if (!owner || !INTERNAL_ROLES.includes(owner.role as never)) {
      throw new ProjectInvalidOwnerError();
    }

    if (!input.preAcquisition && !input.customerId) {
      throw new ProjectCustomerRequiredError();
    }

    const project = await this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const year = new Date().getFullYear();
      const projectCode = await this.codeGen.next(year, tx);

      let customerId = input.customerId;
      if (input.preAcquisition) {
        const placeholder = await this.customers.findOrCreatePlaceholder(
          projectCode,
          requester,
          ctx,
          tx,
        );
        customerId = placeholder.id;
      }

      if (!customerId) throw new ProjectCustomerRequiredError();

      const customer = await tx.customer.findFirst({
        where: { id: customerId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) throw new CustomerNotFoundError(customerId);

      const created = await this.repo.create(
        {
          projectCode,
          customer: { connect: { id: customerId } },
          ...(input.propertyId
            ? { property: { connect: { id: input.propertyId } } }
            : {}),
          projectType: input.projectType,
          status: 'quoting',
          name: input.name,
          description: input.description ?? null,
          owner: { connect: { id: input.ownerUserId } },
          scheduleStart: input.scheduleStart
            ? new Date(input.scheduleStart)
            : null,
          scheduleEnd: input.scheduleEnd ? new Date(input.scheduleEnd) : null,
          createdBy: { connect: { id: requester.id } },
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );

      await this.folders.createDefaultFolders(created.id, tx);

      await this.members.create(
        {
          projectId: created.id,
          userId: input.ownerUserId,
          roleOnProject: 'owner',
        },
        tx,
      );

      await this.audit.logProjectCreated(created.id, requester.id, ctx, tx);
      this.events.emit('project.created', {
        projectId: created.id,
        customerId,
        projectType: created.projectType,
      });

      return created;
    });

    const withRelations = await this.repo.findByIdWithRelations(project.id);
    if (!withRelations) throw new ProjectNotFoundError(project.id);
    return this.toListItemDto(withRelations);
  }

  async update(
    id: string,
    input: UpdateProjectDto,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<ProjectListItemDto> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();

    const project = await this.repo.findById(id);
    if (!project) throw new ProjectNotFoundError(id);

    const isOwner = project.ownerUserId === requester.id;
    if (!isOwner && !['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }

    if (
      input.ownerUserId !== undefined &&
      input.ownerUserId !== project.ownerUserId
    ) {
      const owner = await this.users.findById(input.ownerUserId);
      if (!owner || !INTERNAL_ROLES.includes(owner.role as never)) {
        throw new ProjectInvalidOwnerError();
      }
    }

    const changed = this.diffFields(project, input);

    await this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      await this.repo.update(
        id,
        {
          ...(input.projectType !== undefined
            ? { projectType: input.projectType }
            : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description || null }
            : {}),
          ...(input.propertyId !== undefined
            ? input.propertyId === null
              ? { property: { disconnect: true } }
              : { property: { connect: { id: input.propertyId } } }
            : {}),
          ...(input.ownerUserId !== undefined
            ? { owner: { connect: { id: input.ownerUserId } } }
            : {}),
          ...(input.scheduleStart !== undefined
            ? {
                scheduleStart: input.scheduleStart
                  ? new Date(input.scheduleStart)
                  : null,
              }
            : {}),
          ...(input.scheduleEnd !== undefined
            ? {
                scheduleEnd: input.scheduleEnd
                  ? new Date(input.scheduleEnd)
                  : null,
              }
            : {}),
          updatedBy: { connect: { id: requester.id } },
        },
        tx,
      );

      if (
        input.ownerUserId !== undefined &&
        input.ownerUserId !== project.ownerUserId
      ) {
        const existing = await this.members.findOne(id, input.ownerUserId, tx);
        if (existing) {
          if (
            existing.revokedAt !== null ||
            existing.roleOnProject !== 'owner'
          ) {
            await this.members.update(
              existing.id,
              { roleOnProject: 'owner', revokedAt: null },
              tx,
            );
          }
        } else {
          await this.members.create(
            {
              projectId: id,
              userId: input.ownerUserId,
              roleOnProject: 'owner',
            },
            tx,
          );
        }
      }

      if (changed.length > 0) {
        await this.audit.logProjectUpdated(id, changed, requester.id, ctx, tx);
      }
    });

    const updated = await this.repo.findByIdWithRelations(id);
    if (!updated) throw new ProjectNotFoundError(id);
    return this.toListItemDto(updated);
  }

  async softDelete(
    id: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<void> {
    if (requester.role !== 'system_admin')
      throw new AuthInsufficientPermissionError();

    const project = await this.repo.findById(id);
    if (!project) throw new ProjectNotFoundError(id);

    await this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      await this.repo.softDelete(id, requester.id, tx);
      await this.audit.logProjectDeleted(id, requester.id, ctx, tx);
    });
  }

  toDto(p: Project): ProjectDto {
    return {
      id: p.id,
      projectCode: p.projectCode,
      customerId: p.customerId,
      propertyId: p.propertyId,
      projectType: p.projectType,
      status: p.status,
      name: p.name,
      description: p.description,
      ownerUserId: p.ownerUserId,
      scheduleStart: p.scheduleStart,
      scheduleEnd: p.scheduleEnd,
      actualStart: p.actualStart,
      actualEnd: p.actualEnd,
      amountTotal: p.amountTotal !== null ? p.amountTotal.toString() : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      createdById: p.createdById,
      updatedById: p.updatedById,
    };
  }

  toListItemDto(p: ProjectWithRelations): ProjectListItemDto {
    return {
      ...this.toDto(p),
      customer: p.customer,
      property: p.property,
      owner: p.owner,
    };
  }

  private diffFields(before: Project, input: UpdateProjectDto): string[] {
    const changed: string[] = [];
    if (
      input.projectType !== undefined &&
      input.projectType !== before.projectType
    )
      changed.push('projectType');
    if (input.name !== undefined && input.name !== before.name)
      changed.push('name');
    if (
      input.description !== undefined &&
      (input.description || null) !== before.description
    )
      changed.push('description');
    if (
      input.propertyId !== undefined &&
      (input.propertyId ?? null) !== before.propertyId
    )
      changed.push('propertyId');
    if (
      input.ownerUserId !== undefined &&
      input.ownerUserId !== before.ownerUserId
    )
      changed.push('ownerUserId');
    if (input.scheduleStart !== undefined) {
      const a = input.scheduleStart
        ? new Date(input.scheduleStart).getTime()
        : null;
      const b = before.scheduleStart?.getTime() ?? null;
      if (a !== b) changed.push('scheduleStart');
    }
    if (input.scheduleEnd !== undefined) {
      const a = input.scheduleEnd
        ? new Date(input.scheduleEnd).getTime()
        : null;
      const b = before.scheduleEnd?.getTime() ?? null;
      if (a !== b) changed.push('scheduleEnd');
    }
    return changed;
  }
}
