import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectMember } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import {
  ProjectCannotDemoteLastOwnerError,
  ProjectCannotRemoveLastOwnerError,
  ProjectMemberAlreadyExistsError,
  ProjectMemberNotFoundError,
  ProjectMemberUserNotActiveError,
  ProjectNotFoundError,
} from '../../../shared/exceptions/project-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService, Tx } from '../../auth/internal/audit-stub.service';
import { UserRepository } from '../../auth/repositories/user.repository';
import { ProjectMemberRoleName } from '../domain/types';
import { ProjectMemberRepository } from '../repositories/project-member.repository';
import { ProjectRepository } from '../repositories/project.repository';

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProjectMemberRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly users: UserRepository,
    private readonly audit: AuditStubService,
    private readonly events: EventEmitter2,
  ) {}

  async list(
    projectId: string,
    requester: AuthenticatedUser,
  ): Promise<ProjectMember[]> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);

    if (requester.role === 'invited') {
      const member = await this.repo.findOne(projectId, requester.id);
      if (!member || member.revokedAt !== null) {
        throw new AuthInsufficientPermissionError();
      }
    }
    return this.repo.findByProject(projectId);
  }

  async add(
    projectId: string,
    userId: string,
    roleOnProject: ProjectMemberRoleName,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<ProjectMember> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);

    const isOwner = project.ownerUserId === requester.id;
    if (!isOwner && !['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }

    const user = await this.users.findById(userId);
    if (!user || user.status !== 'active') {
      throw new ProjectMemberUserNotActiveError(userId);
    }

    const existing = await this.repo.findOne(projectId, userId);
    if (existing && existing.revokedAt === null) {
      throw new ProjectMemberAlreadyExistsError();
    }

    return this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const member =
        existing && existing.revokedAt !== null
          ? await this.repo.update(
              existing.id,
              { roleOnProject, revokedAt: null },
              tx,
            )
          : await this.repo.create({ projectId, userId, roleOnProject }, tx);

      if (roleOnProject === 'owner' && project.ownerUserId !== userId) {
        await this.projectRepo.update(
          projectId,
          { owner: { connect: { id: userId } } },
          tx,
        );
      }

      await this.audit.logProjectMemberAdded(
        projectId,
        userId,
        roleOnProject,
        requester.id,
        ctx,
        tx,
      );
      this.events.emit('project.member_added', {
        projectId,
        userId,
        roleOnProject,
      });
      return member;
    });
  }

  async updateRole(
    projectId: string,
    userId: string,
    newRole: ProjectMemberRoleName,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<ProjectMember> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);

    const isOwner = project.ownerUserId === requester.id;
    if (!isOwner && !['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }

    const member = await this.repo.findOne(projectId, userId);
    if (!member || member.revokedAt !== null) {
      throw new ProjectMemberNotFoundError();
    }

    if (member.roleOnProject === 'owner' && newRole !== 'owner') {
      const ownerCount = await this.repo.countByProjectAndRole(
        projectId,
        'owner',
      );
      if (ownerCount <= 1) throw new ProjectCannotDemoteLastOwnerError();
    }

    return this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      const updated = await this.repo.update(
        member.id,
        { roleOnProject: newRole },
        tx,
      );
      await this.audit.logProjectMemberRoleChanged(
        projectId,
        userId,
        { from: member.roleOnProject, to: newRole },
        requester.id,
        ctx,
        tx,
      );
      return updated;
    });
  }

  async remove(
    projectId: string,
    userId: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);

    const isOwner = project.ownerUserId === requester.id;
    if (!isOwner && !['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }

    const member = await this.repo.findOne(projectId, userId);
    if (!member || member.revokedAt !== null) {
      throw new ProjectMemberNotFoundError();
    }

    if (member.roleOnProject === 'owner') {
      const ownerCount = await this.repo.countByProjectAndRole(
        projectId,
        'owner',
      );
      if (ownerCount <= 1) throw new ProjectCannotRemoveLastOwnerError();
    }

    await this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      await this.repo.softDelete(member.id, tx);
      await this.audit.logProjectMemberRemoved(
        projectId,
        userId,
        requester.id,
        ctx,
        tx,
      );
    });
  }
}
