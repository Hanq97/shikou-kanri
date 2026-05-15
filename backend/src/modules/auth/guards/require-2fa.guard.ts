import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Auth2FaEnrollmentRequiredError } from '../../../shared/exceptions/auth-errors';
import { REQUIRE_2FA_KEY } from '../decorators/require-2fa.decorator';
import { AuthenticatedUser } from '../domain/types';

@Injectable()
export class Require2FaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_2FA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;

    // For admin role: always enforce 2FA enrollment
    if (user?.role === 'system_admin' && user.forceTwoFaEnrollment) {
      throw new Auth2FaEnrollmentRequiredError();
    }

    if (required && user && !user.twoFaEnabled) {
      throw new Auth2FaEnrollmentRequiredError();
    }

    return true;
  }
}
