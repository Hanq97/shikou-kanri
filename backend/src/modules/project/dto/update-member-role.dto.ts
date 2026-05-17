import { IsEnum } from 'class-validator';
import { ProjectMemberRoleName } from '../domain/types';

const ROLES: ProjectMemberRoleName[] = [
  'owner',
  'contributor',
  'inspector',
  'invited_worker',
];

export class UpdateMemberRoleDto {
  @IsEnum(ROLES)
  roleOnProject!: ProjectMemberRoleName;
}
