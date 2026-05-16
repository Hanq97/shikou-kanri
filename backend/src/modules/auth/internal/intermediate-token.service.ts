import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../../../config/app-config.service';
import {
  AuthTokenExpiredError,
  AuthTokenInvalidError,
} from '../../../shared/exceptions/auth-errors';

const INTERMEDIATE_TTL_SECONDS = 5 * 60; // 5 min

interface IntermediatePayload {
  sub: string;
  typ: '2fa_challenge';
  jti: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class IntermediateTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  get ttlSeconds(): number {
    return INTERMEDIATE_TTL_SECONDS;
  }

  issue(userId: string): { token: string; expiresIn: number } {
    const jti = randomUUID();
    const token = this.jwt.sign(
      { sub: userId, typ: '2fa_challenge', jti } satisfies Omit<
        IntermediatePayload,
        'iat' | 'exp'
      >,
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: INTERMEDIATE_TTL_SECONDS,
      },
    );
    return { token, expiresIn: INTERMEDIATE_TTL_SECONDS };
  }

  verify(token: string): { userId: string } {
    try {
      const payload = this.jwt.verify<IntermediatePayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      if (payload.typ !== '2fa_challenge') throw new AuthTokenInvalidError();
      return { userId: payload.sub };
    } catch (err) {
      if ((err as Error).name === 'TokenExpiredError')
        throw new AuthTokenExpiredError();
      if (err instanceof AuthTokenInvalidError) throw err;
      throw new AuthTokenInvalidError();
    }
  }
}
