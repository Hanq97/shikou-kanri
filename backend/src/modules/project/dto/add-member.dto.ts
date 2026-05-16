import { IsEnum, IsUUID } from 'class-validator';
import { ProjectMemberRoleName } from '../domain/types';

const ROLES: ProjectMemberRoleName[] = [
  'owner',
  'contributor',
  'inspector',
  'invited_worker',
];

export class AddMemberDto {
  @IsUUID()
  userId!: string;

  @IsEnum(ROLES)
  roleOnProject!: ProjectMemberRoleName;
}
