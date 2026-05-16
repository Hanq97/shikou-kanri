import { Injectable } from '@nestjs/common';
import { Prisma, ProjectMember, ProjectMemberRole } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { Tx } from '../../auth/internal/audit-stub.service';

@Injectable()
export class ProjectMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByProject(projectId: string, tx?: Tx): Promise<ProjectMember[]> {
    const client = tx ?? this.prisma;
    return client.projectMember.findMany({
      where: { projectId, revokedAt: null },
      orderBy: { invitedAt: 'asc' },
    });
  }

  findOne(
    projectId: string,
    userId: string,
    tx?: Tx,
  ): Promise<ProjectMember | null> {
    const client = tx ?? this.prisma;
    return client.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  create(
    input: Prisma.ProjectMemberUncheckedCreateInput,
    tx?: Tx,
  ): Promise<ProjectMember> {
    const client = tx ?? this.prisma;
    return client.projectMember.create({ data: input });
  }

  update(
    id: string,
    data: Prisma.ProjectMemberUpdateInput,
    tx?: Tx,
  ): Promise<ProjectMember> {
    const client = tx ?? this.prisma;
    return client.projectMember.update({ where: { id }, data });
  }

  countByProjectAndRole(
    projectId: string,
    role: ProjectMemberRole,
    tx?: Tx,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    return client.projectMember.count({
      where: { projectId, roleOnProject: role, revokedAt: null },
    });
  }

  softDelete(id: string, tx?: Tx): Promise<ProjectMember> {
    const client = tx ?? this.prisma;
    return client.projectMember.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
