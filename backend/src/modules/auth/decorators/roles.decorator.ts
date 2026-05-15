import { SetMetadata } from '@nestjs/common';
import { UserRoleName } from '../domain/types';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRoleName[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
