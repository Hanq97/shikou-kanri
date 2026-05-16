import { Injectable } from '@nestjs/common';
import { CookieOptions, Request, Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';

const ACCESS_COOKIE_PROD = '__Host-access_token';
const REFRESH_COOKIE_PROD = '__Host-refresh_token';
const ACCESS_COOKIE_DEV = 'access_token';
const REFRESH_COOKIE_DEV = 'refresh_token';

@Injectable()
export class CookieService {
  constructor(private readonly config: AppConfigService) {}

  get accessCookieName(): string {
    return this.config.isProduction() ? ACCESS_COOKIE_PROD : ACCESS_COOKIE_DEV;
  }

  get refreshCookieName(): string {
    return this.config.isProduction()
      ? REFRESH_COOKIE_PROD
      : REFRESH_COOKIE_DEV;
  }

  setAuthCookies(
    res: Response,
    tokens: {
      accessToken: string;
      refreshToken: string;
      accessExpiresIn: number;
      refreshExpiresIn: number;
    },
  ): void {
    const isProd = this.config.isProduction();
    const baseOpts: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    };

    res.cookie(this.accessCookieName, tokens.accessToken, {
      ...baseOpts,
      maxAge: tokens.accessExpiresIn * 1000,
    });
    res.cookie(this.refreshCookieName, tokens.refreshToken, {
      ...baseOpts,
      maxAge: tokens.refreshExpiresIn * 1000,
    });
  }

  clearAuthCookies(res: Response): void {
    const isProd = this.config.isProduction();
    const baseOpts: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    };
    res.clearCookie(this.accessCookieName, baseOpts);
    res.clearCookie(this.refreshCookieName, baseOpts);
  }

  extractAccessToken(req: Request): string | null {
    const cookies = req.cookies as
      | Record<string, string | undefined>
      | undefined;
    return cookies?.[this.accessCookieName] ?? null;
  }

  extractRefreshToken(req: Request): string | null {
    const cookies = req.cookies as
      | Record<string, string | undefined>
      | undefined;
    return cookies?.[this.refreshCookieName] ?? null;
  }
}
