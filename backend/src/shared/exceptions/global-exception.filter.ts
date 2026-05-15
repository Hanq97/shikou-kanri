import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, ConflictError, NotFoundError, ValidationError } from './app-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = request.traceId ?? response.getHeader('x-trace-id')?.toString();

    if (exception instanceof AppError) {
      this.logger.warn(
        `[${exception.code}] ${exception.message} (traceId=${traceId ?? 'n/a'})`,
      );
      response.status(exception.statusCode).json(exception.toJSON(traceId));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (res as { message?: string | string[] }).message ?? exception.message;

      const code = this.codeForHttpStatus(status);
      this.logger.warn(`[${code}] ${exception.message} (traceId=${traceId ?? 'n/a'})`);
      response.status(status).json({
        code,
        message: Array.isArray(message) ? message.join('; ') : message,
        traceId,
        ...(typeof res === 'object' && res !== null ? { details: this.extractDetails(res) } : {}),
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 = unique violation
      if (exception.code === 'P2002') {
        const err = new ConflictError('CONFLICT_UNIQUE', 'リソースが既に存在します');
        this.logger.warn(`[${err.code}] ${err.message}`);
        response.status(err.statusCode).json(err.toJSON(traceId));
        return;
      }
      // P2025 = not found
      if (exception.code === 'P2025') {
        const err = new NotFoundError('resource');
        response.status(err.statusCode).json(err.toJSON(traceId));
        return;
      }
    }

    if (exception instanceof ValidationError || exception instanceof NotFoundError) {
      this.logger.warn(`[${exception.code}] ${exception.message}`);
      response.status(exception.statusCode).json(exception.toJSON(traceId));
      return;
    }

    const error = exception as Error;
    this.logger.error(
      `Unhandled exception (traceId=${traceId ?? 'n/a'}): ${error?.message ?? exception}`,
      error?.stack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'サーバーエラーが発生しました。',
      traceId,
    });
  }

  private codeForHttpStatus(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'AUTH_TOKEN_INVALID';
      case 403:
        return 'AUTH_INSUFFICIENT_PERMISSION';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 429:
        return 'AUTH_RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  private extractDetails(res: unknown): Record<string, unknown> | undefined {
    if (typeof res !== 'object' || res === null) return undefined;
    const { message: _m, statusCode: _s, error: _e, ...rest } = res as Record<string, unknown>;
    return Object.keys(rest).length > 0 ? rest : undefined;
  }
}
