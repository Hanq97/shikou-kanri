import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser, UserRoleName } from '../domain/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) throw new AuthInsufficientPermissionError();
    if (!required.includes(user.role)) throw new AuthInsufficientPermissionError();

    return true;
  }
}
