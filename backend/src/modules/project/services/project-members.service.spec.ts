import { EventEmitter2 } from '@nestjs/event-emitter';
import { Project, ProjectMember, User } from '@prisma/client';
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
import { AuditStubService } from '../../auth/internal/audit-stub.service';
import { UserRepository } from '../../auth/repositories/user.repository';
import { ProjectMemberRepository } from '../repositories/project-member.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { ProjectMembersService } from './project-members.service';

const ctx: RequestContext = {
  ipAddress: null,
  userAgent: null,
  traceId: 't',
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

function makeProject(): Project {
  return {
    id: 'p1',
    projectCode: '2026-0001',
    customerId: 'c1',
    propertyId: null,
    projectType: 'remodel',
    status: 'quoting',
    name: 'T',
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
  } as Project;
}

function makeUser(id: string, status: User['status'] = 'active'): User {
  return {
    id,
    email: `${id}@x`,
    name: id,
    role: 'employee',
    status,
  } as User;
}

function makeMember(
  id: string,
  userId: string,
  role: ProjectMember['roleOnProject'] = 'contributor',
  revoked = false,
): ProjectMember {
  return {
    id,
    projectId: 'p1',
    userId,
    roleOnProject: role,
    folderAccessOverride: null,
    invitedAt: new Date(),
    revokedAt: revoked ? new Date() : null,
  } as ProjectMember;
}

describe('ProjectMembersService', () => {
  let service: ProjectMembersService;
  let repo: jest.Mocked<ProjectMemberRepository>;
  let projectRepo: jest.Mocked<ProjectRepository>;
  let users: jest.Mocked<UserRepository>;
  let audit: jest.Mocked<AuditStubService>;
  let prisma: { $transaction: jest.Mock };

  beforeEach(() => {
    repo = {
      findByProject: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      countByProjectAndRole: jest.fn(),
      softDelete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ProjectMemberRepository>;
    projectRepo = {
      findById: jest.fn().mockResolvedValue(makeProject()),
      update: jest.fn().mockResolvedValue(makeProject()),
    } as unknown as jest.Mocked<ProjectRepository>;
    users = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
    audit = {
      logProjectMemberAdded: jest.fn().mockResolvedValue(undefined),
      logProjectMemberRoleChanged: jest.fn().mockResolvedValue(undefined),
      logProjectMemberRemoved: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditStubService>;
    prisma = {
      $transaction: jest.fn().mockImplementation((cb) => cb({})),
    };

    service = new ProjectMembersService(
      prisma as unknown as PrismaService,
      repo,
      projectRepo,
      users,
      audit,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );
  });

  describe('list', () => {
    it('throws when project not found', async () => {
      projectRepo.findById.mockResolvedValue(null);
      await expect(service.list('p1', owner)).rejects.toBeInstanceOf(
        ProjectNotFoundError,
      );
    });

    it('blocks invited user not member', async () => {
      const invited = { ...owner, role: 'invited' as const };
      repo.findOne.mockResolvedValue(null);
      await expect(service.list('p1', invited)).rejects.toBeInstanceOf(
        AuthInsufficientPermissionError,
      );
    });

    it('allows internal user', async () => {
      repo.findByProject.mockResolvedValue([]);
      const result = await service.list('p1', owner);
      expect(result).toEqual([]);
    });
  });

  describe('add', () => {
    it('blocks non-owner non-admin', async () => {
      const other = { ...owner, id: 'u-other' };
      await expect(
        service.add('p1', 'u-new', 'contributor', other, ctx),
      ).rejects.toBeInstanceOf(AuthInsufficientPermissionError);
    });

    it('blocks inactive user', async () => {
      users.findById.mockResolvedValue(makeUser('u-new', 'suspended'));
      await expect(
        service.add('p1', 'u-new', 'contributor', owner, ctx),
      ).rejects.toBeInstanceOf(ProjectMemberUserNotActiveError);
    });

    it('blocks duplicate active member', async () => {
      users.findById.mockResolvedValue(makeUser('u-new'));
      repo.findOne.mockResolvedValue(makeMember('m1', 'u-new'));
      await expect(
        service.add('p1', 'u-new', 'contributor', owner, ctx),
      ).rejects.toBeInstanceOf(ProjectMemberAlreadyExistsError);
    });

    it('re-activates revoked member instead of creating new', async () => {
      users.findById.mockResolvedValue(makeUser('u-new'));
      const revokedMember = makeMember(
        'm-existing',
        'u-new',
        'inspector',
        true,
      );
      repo.findOne.mockResolvedValue(revokedMember);
      repo.update.mockResolvedValue({ ...revokedMember, revokedAt: null });

      const result = await service.add(
        'p1',
        'u-new',
        'contributor',
        owner,
        ctx,
      );

      expect(repo.update).toHaveBeenCalledWith(
        'm-existing',
        expect.objectContaining({ revokedAt: null }),
        expect.anything(),
      );
      expect(repo.create).not.toHaveBeenCalled();
      expect(result.id).toBe('m-existing');
    });

    it('syncs project.ownerUserId when adding new owner role', async () => {
      users.findById.mockResolvedValue(makeUser('u-new'));
      repo.findOne.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeMember('m-new', 'u-new', 'owner'));
      await service.add('p1', 'u-new', 'owner', owner, ctx);
      expect(projectRepo.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ owner: { connect: { id: 'u-new' } } }),
        expect.anything(),
      );
    });
  });

  describe('updateRole', () => {
    it('throws if member not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.updateRole('p1', 'u-x', 'inspector', owner, ctx),
      ).rejects.toBeInstanceOf(ProjectMemberNotFoundError);
    });

    it('blocks demoting last owner', async () => {
      repo.findOne.mockResolvedValue(makeMember('m-o', 'u-owner', 'owner'));
      repo.countByProjectAndRole.mockResolvedValue(1);
      await expect(
        service.updateRole('p1', 'u-owner', 'contributor', owner, ctx),
      ).rejects.toBeInstanceOf(ProjectCannotDemoteLastOwnerError);
    });

    it('allows demoting owner when 2+ owners exist', async () => {
      repo.findOne.mockResolvedValue(makeMember('m-o', 'u-owner', 'owner'));
      repo.countByProjectAndRole.mockResolvedValue(2);
      repo.update.mockResolvedValue(
        makeMember('m-o', 'u-owner', 'contributor'),
      );
      await expect(
        service.updateRole('p1', 'u-owner', 'contributor', owner, ctx),
      ).resolves.toBeDefined();
    });
  });

  describe('remove', () => {
    it('blocks removing last owner', async () => {
      repo.findOne.mockResolvedValue(makeMember('m-o', 'u-owner', 'owner'));
      repo.countByProjectAndRole.mockResolvedValue(1);
      await expect(
        service.remove('p1', 'u-owner', owner, ctx),
      ).rejects.toBeInstanceOf(ProjectCannotRemoveLastOwnerError);
    });

    it('removes non-owner member', async () => {
      repo.findOne.mockResolvedValue(makeMember('m-c', 'u-c', 'contributor'));
      await service.remove('p1', 'u-c', admin, ctx);
      expect(repo.softDelete).toHaveBeenCalledWith('m-c', expect.anything());
      expect(audit.logProjectMemberRemoved).toHaveBeenCalled();
    });
  });
});
