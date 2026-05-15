import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CookieService } from '../../../shared/http/cookie.service';
import {
  Auth2FaEnrollmentRequiredError,
  AuthForcePasswordChangeError,
  AuthRefreshInvalidError,
} from '../../../shared/exceptions/auth-errors';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { AuthenticatedUser, RequestContext } from '../domain/types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { Disable2FaDto } from '../dto/disable-2fa.dto';
import { LoginDto } from '../dto/login.dto';
import { PasswordResetDto } from '../dto/password-reset.dto';
import { PasswordResetRequestDto } from '../dto/password-reset-request.dto';
import { Verify2FaDto } from '../dto/verify-2fa.dto';
import { VerifyEnrollmentDto } from '../dto/verify-enrollment.dto';
import { AuthService } from '../services/auth.service';

function buildCtx(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.header('user-agent') ?? null,
    traceId: (req as Request & { traceId?: string }).traceId ?? 'unknown',
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: CookieService,
  ) {}

  // === Login ===

  @Public()
  @Throttle({ login: { limit: 5, ttl: 900_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password, buildCtx(req));
    if (result.kind === 'requires2fa') {
      return {
        requires2fa: true,
        intermediateToken: result.intermediateToken,
        expiresIn: result.expiresIn,
      };
    }
    this.cookies.setAuthCookies(res, result.tokens);
    return { user: result.user, requires2fa: false };
  }

  @Public()
  @Throttle({ login: { limit: 10, ttl: 300_000 } })
  @Post('2fa/verify')
  async verify2Fa(
    @Body() dto: Verify2FaDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verify2Fa(
      dto.intermediateToken,
      dto.code,
      dto.useBackupCode,
      buildCtx(req),
    );
    this.cookies.setAuthCookies(res, result.tokens);
    return {
      user: result.user,
      ...(result.remainingBackupCodes !== undefined
        ? { remainingBackupCodes: result.remainingBackupCodes }
        : {}),
    };
  }

  // === Refresh ===

  @Public()
  @SkipThrottle()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.cookies.extractRefreshToken(req);
    if (!refreshToken) throw new AuthRefreshInvalidError();
    const tokens = await this.auth.refresh(refreshToken, buildCtx(req));
    this.cookies.setAuthCookies(res, tokens);
    return { success: true };
  }

  // === Logout ===

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const refreshToken = this.cookies.extractRefreshToken(req);
    await this.auth.logout(refreshToken, user.id, buildCtx(req));
    this.cookies.clearAuthCookies(res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.auth.logoutAll(user.id, buildCtx(req));
    this.cookies.clearAuthCookies(res);
    return result;
  }

  // === /me ===

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const current = await this.auth.getCurrentUser(user.id);
    return { user: current };
  }

  // === Password change ===

  @UseGuards(JwtAuthGuard)
  @Throttle({ login: { limit: 5, ttl: 3600_000 } })
  @Post('password/change')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const refreshToken = this.cookies.extractRefreshToken(req);
    const tokens = await this.auth.changePassword(
      user.id,
      dto.oldPassword,
      dto.newPassword,
      refreshToken,
      buildCtx(req),
    );
    this.cookies.setAuthCookies(res, tokens);
    return { success: true };
  }

  // === Password reset ===

  @Public()
  @Throttle({ login: { limit: 3, ttl: 3600_000 } })
  @Post('password/reset-request')
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto, @Req() req: Request) {
    await this.auth.requestPasswordReset(dto.email, buildCtx(req));
    return {
      success: true,
      message: '登録されたメールアドレスの場合、パスワードリセットリンクをお送りしました。',
    };
  }

  @Public()
  @Post('password/reset')
  async resetPassword(@Body() dto: PasswordResetDto, @Req() req: Request) {
    await this.auth.resetPassword(dto.token, dto.newPassword, buildCtx(req));
    return { success: true, message: 'パスワードを変更しました。再度ログインしてください。' };
  }

  // === 2FA enrollment ===

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enroll')
  async enroll2Fa(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.start2FaEnrollment(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enroll/verify')
  async verifyEnrollment(
    @Body() dto: VerifyEnrollmentDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auth.verify2FaEnrollment(user.id, dto.code, buildCtx(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disable2Fa(
    @Body() dto: Disable2FaDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.auth.disable2Fa(user.id, dto.password, dto.code, dto.useBackupCode, buildCtx(req));
  }

  // === Invitation ===

  @Public()
  @Get('invitations/:token')
  async getInvitation(@Param('token') token: string) {
    const invitation = await this.auth.getInvitationByToken(token);
    return { valid: true, ...invitation };
  }

  @Public()
  @Post('invitations/accept')
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.acceptInvitation(dto.token, dto.password, buildCtx(req));
    this.cookies.setAuthCookies(res, result.tokens);
    return { user: result.user, message: 'アカウントが有効化されました。' };
  }
}
