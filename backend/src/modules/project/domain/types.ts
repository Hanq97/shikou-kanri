import { Folder, Project, ProjectMember, User } from '@prisma/client';

export type ProjectStatusName =
  | 'quoting'
  | 'received'
  | 'construction'
  | 'completed'
  | 'handed_over'
  | 'cancelled';

export type ProjectTypeName =
  | 'new_construction'
  | 'remodel'
  | 'repair'
  | 'aftercare';

export type ProjectMemberRoleName =
  | 'owner'
  | 'contributor'
  | 'inspector'
  | 'invited_worker';

export type FolderTypeName =
  | 'document'
  | 'drawing'
  | 'schedule'
  | 'photo'
  | 'chalkboard'
  | 'inspection'
  | 'custom';

export interface ProjectDto {
  id: string;
  projectCode: string;
  customerId: string;
  propertyId: string | null;
  projectType: ProjectTypeName;
  status: ProjectStatusName;
  name: string;
  description: string | null;
  ownerUserId: string;
  scheduleStart: Date | null;
  scheduleEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  amountTotal: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
}

export interface ProjectListItemDto extends ProjectDto {
  customer: { id: string; name: string; nameKana: string | null };
  property: { id: string; address: string } | null;
  owner: { id: string; name: string; email: string };
}

export type ProjectWithRelations = Project & {
  customer: { id: string; name: string; nameKana: string | null };
  property: { id: string; address: string } | null;
  owner: Pick<User, 'id' | 'name' | 'email'>;
};

export interface FolderDto {
  id: string;
  projectId: string;
  name: string;
  folderType: FolderTypeName;
  isPublicForInvited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListProjectsFilter {
  search?: string;
  status?: ProjectStatusName[];
  customerId?: string;
  ownerUserId?: string;
  projectType?: ProjectTypeName[];
  from?: string;
  to?: string;
  sortBy: 'createdAt' | 'updatedAt' | 'scheduleStart' | 'projectCode';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export type FolderRecord = Folder;
export type ProjectMemberRecord = ProjectMember;
