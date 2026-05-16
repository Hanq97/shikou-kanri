import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth';
import { NotificationModule } from './modules/notification';
import { CryptoModule } from './shared/crypto/crypto.module';
import { PrismaModule } from './shared/database/prisma.module';
import { GlobalExceptionFilter } from './shared/exceptions/global-exception.filter';
import { HttpHelpersModule } from './shared/http/http.module';
import { AppLoggerModule } from './shared/observability/logger.module';
import { TraceMiddleware } from './shared/observability/trace.middleware';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    CryptoModule,
    HttpHelpersModule,
    NotificationModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceMiddleware).forRoutes('*');
  }
}
