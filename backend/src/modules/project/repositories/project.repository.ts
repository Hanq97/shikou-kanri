import { Injectable } from '@nestjs/common';
import { Prisma, Project } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuthenticatedUser } from '../../auth/domain/types';
import { Tx } from '../../auth/internal/audit-stub.service';
import { ListProjectsFilter, ProjectWithRelations } from '../domain/types';

const LIST_INCLUDE = {
  customer: { select: { id: true, name: true, nameKana: true } },
  property: { select: { id: true, address: true } },
  owner: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tx?: Tx): Promise<Project | null> {
    const client = tx ?? this.prisma;
    return client.project.findFirst({ where: { id, deletedAt: null } });
  }

  findByIdWithRelations(
    id: string,
    tx?: Tx,
  ): Promise<ProjectWithRelations | null> {
    const client = tx ?? this.prisma;
    return client.project.findFirst({
      where: { id, deletedAt: null },
      include: LIST_INCLUDE,
    });
  }

  findByCode(code: string, tx?: Tx): Promise<Project | null> {
    const client = tx ?? this.prisma;
    return client.project.findFirst({
      where: { projectCode: code, deletedAt: null },
    });
  }

  async list(
    filter: ListProjectsFilter,
    requester: AuthenticatedUser,
    tx?: Tx,
  ): Promise<{ data: ProjectWithRelations[]; total: number }> {
    const client = tx ?? this.prisma;
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(requester.role === 'invited'
        ? {
            members: {
              some: { userId: requester.id, revokedAt: null },
            },
          }
        : {}),
      ...(filter.status?.length ? { status: { in: filter.status } } : {}),
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.ownerUserId ? { ownerUserId: filter.ownerUserId } : {}),
      ...(filter.projectType?.length
        ? { projectType: { in: filter.projectType } }
        : {}),
      ...(filter.from || filter.to
        ? {
            scheduleStart: {
              ...(filter.from ? { gte: new Date(filter.from) } : {}),
              ...(filter.to ? { lte: new Date(filter.to) } : {}),
            },
          }
        : {}),
    };

    if (filter.search) {
      const cleaned = filter.search.trim();
      if (cleaned.length > 0) {
        where.OR = [
          { projectCode: { contains: cleaned, mode: 'insensitive' } },
          { name: { contains: cleaned, mode: 'insensitive' } },
          { customer: { name: { contains: cleaned, mode: 'insensitive' } } },
        ];
      }
    }

    const [data, total] = await Promise.all([
      client.project.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      client.project.count({ where }),
    ]);
    return { data, total };
  }

  findByCustomer(customerId: string, tx?: Tx): Promise<ProjectWithRelations[]> {
    const client = tx ?? this.prisma;
    return client.project.findMany({
      where: { customerId, deletedAt: null },
      include: LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  countActiveByCustomer(customerId: string, tx?: Tx): Promise<number> {
    const client = tx ?? this.prisma;
    return client.project.count({
      where: {
        customerId,
        deletedAt: null,
        status: { notIn: ['handed_over', 'cancelled'] },
      },
    });
  }

  create(input: Prisma.ProjectCreateInput, tx?: Tx): Promise<Project> {
    const client = tx ?? this.prisma;
    return client.project.create({ data: input });
  }

  update(
    id: string,
    data: Prisma.ProjectUpdateInput,
    tx?: Tx,
  ): Promise<Project> {
    const client = tx ?? this.prisma;
    return client.project.update({ where: { id }, data });
  }

  softDelete(id: string, actorId: string, tx?: Tx): Promise<Project> {
    const client = tx ?? this.prisma;
    return client.project.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId },
    });
  }
}
