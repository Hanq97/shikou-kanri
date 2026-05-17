import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Project } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import {
  ProjectCancelReasonRequiredError,
  ProjectInvalidStatusTransitionError,
  ProjectMissingFieldForTransitionError,
  ProjectMissingHandoverDateError,
  ProjectMissingPropertyForHandoverError,
  ProjectNotFoundError,
  ProjectReverseReasonRequiredError,
} from '../../../shared/exceptions/project-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService, Tx } from '../../auth/internal/audit-stub.service';
import { isValidForwardTransition } from '../domain/status-transitions';
import { ProjectStatusName } from '../domain/types';
import { ProjectRepository } from '../repositories/project.repository';

export interface ForwardTransitionOptions {
  amountTotal?: number;
  reason?: string;
}

@Injectable()
export class ProjectStatusMachineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProjectRepository,
    private readonly audit: AuditStubService,
    private readonly events: EventEmitter2,
  ) {}

  async transition(
    projectId: string,
    newStatus: ProjectStatusName,
    options: ForwardTransitionOptions,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Project> {
    const project = await this.repo.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);

    if (
      !isValidForwardTransition(project.status as ProjectStatusName, newStatus)
    ) {
      throw new ProjectInvalidStatusTransitionError(project.status, newStatus);
    }

    const isOwner = project.ownerUserId === requester.id;
    if (!isOwner && !['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }

    if (
      newStatus === 'received' &&
      project.amountTotal === null &&
      options.amountTotal === undefined
    ) {
      throw new ProjectMissingFieldForTransitionError('amountTotal');
    }

    if (newStatus === 'handed_over') {
      if (!project.propertyId)
        throw new ProjectMissingPropertyForHandoverError();
      const property = await this.prisma.property.findUnique({
        where: { id: project.propertyId },
      });
      if (!property?.handoverDate) throw new ProjectMissingHandoverDateError();
    }

    if (
      newStatus === 'cancelled' &&
      (!options.reason || options.reason.length < 5)
    ) {
      throw new ProjectCancelReasonRequiredError();
    }

    return this.prisma.$transaction(async (tx) => {
      const update: Prisma.ProjectUpdateInput = {
        status: newStatus,
        updatedBy: { connect: { id: requester.id } },
      };
      if (newStatus === 'received' && options.amountTotal !== undefined) {
        update.amountTotal = options.amountTotal;
      }
      if (newStatus === 'construction' && !project.actualStart) {
        update.actualStart = new Date();
      }
      if (newStatus === 'completed' && !project.actualEnd) {
        update.actualEnd = new Date();
      }

      const updated = await this.repo.update(projectId, update, tx as Tx);
      await this.audit.logProjectStatusChanged(
        projectId,
        {
          from: project.status,
          to: newStatus,
          reason: options.reason,
        },
        requester.id,
        ctx,
        tx as Tx,
      );
      this.events.emit('project.status_changed', {
        projectId,
        from: project.status,
        to: newStatus,
      });
      return updated;
    });
  }

  async reverseTransition(
    projectId: string,
    newStatus: ProjectStatusName,
    reason: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Project> {
    if (requester.role !== 'system_admin')
      throw new AuthInsufficientPermissionError();
    if (!reason || reason.length < 5)
      throw new ProjectReverseReasonRequiredError();

    const project = await this.repo.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.update(
        projectId,
        {
          status: newStatus,
          updatedBy: { connect: { id: requester.id } },
        },
        tx as Tx,
      );
      await this.audit.logProjectStatusReversed(
        projectId,
        { from: project.status, to: newStatus, reason },
        requester.id,
        ctx,
        tx as Tx,
      );
      this.events.emit('project.status.reversed', {
        projectId,
        from: project.status,
        to: newStatus,
      });
      return updated;
    });
  }
}
