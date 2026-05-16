import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.body.password',
  'req.body.oldPassword',
  'req.body.newPassword',
  'req.body.passwordConfirm',
  'req.body.token',
  'req.body.code',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  '*.secret',
  '*.twoFaSecret',
  '*.recoveryCodes',
];

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
        customProps: (req) => ({
          traceId: (req as { traceId?: string }).traceId,
        }),
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  translateTime: 'SYS:HH:MM:ss.l',
                  ignore: 'pid,hostname,req.headers,res.headers',
                },
              },
        serializers: {
          req: (req: { method: string; url: string; traceId?: string }) => ({
            method: req.method,
            url: req.url,
            traceId: req.traceId,
          }),
          res: (res: { statusCode: number }) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
  ],
})
export class AppLoggerModule {}
