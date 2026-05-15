# NestJS gRPC Server Specialist
# NestJS gRPCサーバースペシャリスト
# Chuyên Gia gRPC Server NestJS

**Role**: Expert in NestJS gRPC server implementation
**Focus**: Microservice setup, RPC handlers, streaming, error handling
**Patterns**: 10 gRPC server patterns
**Stack**: nestjs-blockchain (gRPC Server)

---

## 🎯 EXPERTISE

This specialist handles:
- NestJS microservices with Transport.GRPC
- @GrpcMethod() and @GrpcStreamMethod() decorators
- Server streaming, client streaming, bidirectional streaming
- gRPC exception filters and interceptors
- Health checks and graceful shutdown
- Error handling with gRPC status codes

---

## 📋 PATTERNS (10 total)

### Pattern 1: create-microservice (gRPC Server Setup)
**Category**: Server Setup
**Description**: Create NestJS microservice with gRPC transport

```typescript
// apps/loan-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'loan.v1',           // Must match proto package
        protoPath: join(__dirname, '../../../proto/loan/loan.proto'),
        url: '0.0.0.0:50051',          // ✅ 0.0.0.0 for Docker (NOT localhost)
        loader: {
          keepCase: true,              // Keep snake_case (user_id → user_id)
          longs: String,               // Convert int64 to String
          enums: String,               // Convert enums to String
          defaults: true,              // Set default values
          oneofs: true,                // Support oneof fields
        },
      },
    },
  );

  await app.listen();
  console.log('🚀 Loan Service listening on port 50051');
}
bootstrap();
```

---

### Pattern 2: grpc-method-decorator (Unary RPC Handler)
**Category**: RPC Handlers
**Description**: Handle unary RPC calls with @GrpcMethod()

```typescript
// apps/loan-service/src/loan.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { LoanService } from './loan.service';
import {
  CreateLoanRequest,
  CreateLoanResponse,
  GetLoanRequest,
  GetLoanResponse,
  UpdateLoanRequest,
  UpdateLoanResponse,
  DeleteLoanRequest,
} from '../../../generated/loan/loan';
import { Empty } from '../../../generated/google/protobuf/empty';

@Controller()
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  // CREATE: Single request → Single response
  @GrpcMethod('LoanService', 'CreateLoan')
  async createLoan(data: CreateLoanRequest): Promise<CreateLoanResponse> {
    console.log('[CreateLoan] Request:', data);
    const loan = await this.loanService.createLoan(data);
    return {
      loan,
      message: 'Loan created successfully',
    };
  }

  // READ: Single request → Single response
  @GrpcMethod('LoanService', 'GetLoan')
  async getLoan(data: GetLoanRequest): Promise<GetLoanResponse> {
    const loan = await this.loanService.getLoan(data.id);
    return { loan };
  }

  // UPDATE: Single request → Single response
  @GrpcMethod('LoanService', 'UpdateLoan')
  async updateLoan(data: UpdateLoanRequest): Promise<UpdateLoanResponse> {
    const loan = await this.loanService.updateLoan(data.id, data);
    return { loan };
  }

  // DELETE: Single request → Empty response
  @GrpcMethod('LoanService', 'DeleteLoan')
  async deleteLoan(data: DeleteLoanRequest): Promise<Empty> {
    await this.loanService.deleteLoan(data.id);
    return {};
  }
}
```

---

### Pattern 3: grpc-stream-method-server (Server Streaming)
**Category**: Streaming
**Description**: Handle server streaming with @GrpcStreamMethod()

```typescript
import { Controller } from '@nestjs/common';
import { GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject, interval } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  WatchLoanStatusRequest,
  LoanStatusUpdate,
  LoanStatus,
} from '../../../generated/loan/loan';

@Controller()
export class LoanController {
  // SERVER STREAMING: Single request → Stream of responses
  @GrpcStreamMethod('LoanService', 'WatchLoanStatus')
  watchLoanStatus(data: WatchLoanStatusRequest): Observable<LoanStatusUpdate> {
    console.log(`[WatchLoanStatus] Watching loan: ${data.loanId}`);

    // Method 1: Using interval for periodic updates
    return interval(5000).pipe(
      take(6), // Send 6 updates (30 seconds total)
      map((index) => ({
        loanId: data.loanId,
        status: this.getNextStatus(index),
        updatedAt: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
        message: `Status update ${index + 1}/6`,
      })),
    );
  }

  // Alternative: Using Subject for manual control
  @GrpcStreamMethod('LoanService', 'WatchLoanStatusManual')
  watchLoanStatusManual(data: WatchLoanStatusRequest): Observable<LoanStatusUpdate> {
    const subject = new Subject<LoanStatusUpdate>();

    // Simulate status changes
    const statuses = [
      LoanStatus.LOAN_STATUS_PENDING,
      LoanStatus.LOAN_STATUS_APPROVED,
      LoanStatus.LOAN_STATUS_DISBURSED,
    ];

    let index = 0;
    const intervalId = setInterval(() => {
      if (index >= statuses.length) {
        clearInterval(intervalId);
        subject.complete();
        return;
      }

      subject.next({
        loanId: data.loanId,
        status: statuses[index],
        updatedAt: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
        message: `Status changed to ${statuses[index]}`,
      });

      index++;
    }, 5000);

    return subject.asObservable();
  }

  private getNextStatus(index: number): LoanStatus {
    const statuses = [
      LoanStatus.LOAN_STATUS_PENDING,
      LoanStatus.LOAN_STATUS_APPROVED,
      LoanStatus.LOAN_STATUS_DISBURSED,
      LoanStatus.LOAN_STATUS_REPAID,
    ];
    return statuses[index % statuses.length];
  }
}
```

---

### Pattern 4: grpc-stream-method-client (Client Streaming)
**Category**: Streaming
**Description**: Handle client streaming (stream → single response)

```typescript
import { Controller } from '@nestjs/common';
import { GrpcStreamMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { toArray, map } from 'rxjs/operators';
import {
  DocumentChunk,
  UploadDocumentsResponse,
} from '../../../generated/loan/loan';

@Controller()
export class LoanController {
  // CLIENT STREAMING: Stream of requests → Single response
  @GrpcStreamMethod('LoanService', 'UploadDocuments')
  uploadDocuments(data: Observable<DocumentChunk>): Observable<UploadDocumentsResponse> {
    console.log('[UploadDocuments] Receiving document chunks...');

    return data.pipe(
      toArray(), // Collect all chunks
      map((chunks: DocumentChunk[]) => {
        // Group chunks by document name
        const documentsMap = new Map<string, Buffer>();

        chunks.forEach((chunk) => {
          const existing = documentsMap.get(chunk.documentName) || Buffer.alloc(0);
          const newData = Buffer.concat([existing, Buffer.from(chunk.chunkData)]);
          documentsMap.set(chunk.documentName, newData);

          console.log(
            `Received chunk ${chunk.chunkIndex} for ${chunk.documentName} (${chunk.chunkData.length} bytes)`,
          );

          if (chunk.isLastChunk) {
            console.log(`✅ Completed: ${chunk.documentName} (${newData.length} bytes)`);
          }
        });

        // Calculate totals
        const totalDocuments = documentsMap.size;
        const totalBytes = Array.from(documentsMap.values()).reduce(
          (sum, buf) => sum + buf.length,
          0,
        );

        console.log(`[UploadDocuments] Total: ${totalDocuments} documents, ${totalBytes} bytes`);

        return {
          totalDocuments,
          totalBytes,
          message: `Successfully uploaded ${totalDocuments} documents`,
        };
      }),
    );
  }
}
```

---

### Pattern 5: bidirectional-streaming (Bidirectional Streaming)
**Category**: Streaming
**Description**: Handle bidirectional streaming (stream ↔ stream)

```typescript
import { Controller } from '@nestjs/common';
import { GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { ChatMessage } from '../../../generated/user/user';

@Controller()
export class UserController {
  // BIDIRECTIONAL STREAMING: Stream ↔ Stream
  @GrpcStreamMethod('UserService', 'Chat')
  chat(messages: Observable<ChatMessage>): Observable<ChatMessage> {
    const subject = new Subject<ChatMessage>();

    // Subscribe to incoming messages
    messages.subscribe({
      next: (message: ChatMessage) => {
        console.log(`[Chat] Received from ${message.userId}: ${message.content}`);

        // Process message and send response
        const response: ChatMessage = {
          userId: 'bot',
          content: `Echo: ${message.content}`,
          timestamp: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
        };

        subject.next(response);
        console.log(`[Chat] Sent response: ${response.content}`);
      },
      complete: () => {
        console.log('[Chat] Client stream completed');
        subject.complete();
      },
      error: (err) => {
        console.error('[Chat] Client stream error:', err);
        subject.error(err);
      },
    });

    return subject.asObservable();
  }
}
```

---

### Pattern 6: exception-to-grpc-error (Exception Filter)
**Category**: Error Handling
**Description**: Convert NestJS exceptions to gRPC status codes

```typescript
// filters/grpc-exception.filter.ts
import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class GrpcExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    const error = exception.getError();

    // Map to gRPC status codes
    // https://grpc.github.io/grpc/core/md_doc_statuscodes.html
    const grpcError = {
      code: this.getGrpcStatusCode(error),
      message: typeof error === 'string' ? error : error['message'] || 'Unknown error',
      details: error['details'] || {},
    };

    console.error('[gRPC Error]', grpcError);

    return throwError(() => grpcError);
  }

  private getGrpcStatusCode(error: any): number {
    // gRPC status codes:
    // 0: OK, 1: CANCELLED, 2: UNKNOWN, 3: INVALID_ARGUMENT
    // 5: NOT_FOUND, 7: PERMISSION_DENIED, 9: FAILED_PRECONDITION
    // 13: INTERNAL, 16: UNAUTHENTICATED

    const statusCode = error['statusCode'];

    switch (statusCode) {
      case 400:
        return 3; // INVALID_ARGUMENT
      case 401:
        return 16; // UNAUTHENTICATED
      case 403:
        return 7; // PERMISSION_DENIED
      case 404:
        return 5; // NOT_FOUND
      case 409:
        return 9; // FAILED_PRECONDITION
      case 500:
        return 13; // INTERNAL
      default:
        return 2; // UNKNOWN
    }
  }
}

// Usage in main.ts
import { NestFactory } from '@nestjs/core';
import { GrpcExceptionFilter } from './filters/grpc-exception.filter';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(/* ... */);
  app.useGlobalFilters(new GrpcExceptionFilter());
  await app.listen();
}
```

---

### Pattern 7: grpc-logging-interceptor (Logging Interceptor)
**Category**: Interceptors
**Description**: Intercept gRPC calls for logging and monitoring

```typescript
// interceptors/grpc-logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class GrpcLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const rpcContext = context.switchToRpc();
    const data = rpcContext.getData();
    const method = context.getHandler().name;
    const className = context.getClass().name;

    console.log(`[gRPC Request] ${className}.${method}`);
    console.log('Data:', JSON.stringify(data, null, 2));

    const now = Date.now();

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - now;
        console.log(`[gRPC Response] ${className}.${method} - ${duration}ms`);
        console.log('Response:', JSON.stringify(response, null, 2));
      }),
      catchError((error) => {
        const duration = Date.now() - now;
        console.error(`[gRPC Error] ${className}.${method} - ${duration}ms`);
        console.error('Error:', error);
        throw error;
      }),
    );
  }
}

// Usage in controller
import { Controller, UseInterceptors } from '@nestjs/common';

@Controller()
@UseInterceptors(GrpcLoggingInterceptor)
export class LoanController {
  // All methods will be logged
}
```

---

### Pattern 8: grpc-metadata-server (Read Metadata)
**Category**: Metadata
**Description**: Read custom metadata (headers) from gRPC requests

```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException, Metadata } from '@nestjs/microservices';
import { LoanService } from './loan.service';
import { GetLoanRequest, GetLoanResponse } from '../../../generated/loan/loan';

@Controller()
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @GrpcMethod('LoanService', 'GetLoan')
  async getLoan(data: GetLoanRequest, metadata: Metadata): Promise<GetLoanResponse> {
    // Read metadata (headers)
    const authorization = metadata.get('authorization')?.[0];
    const requestId = metadata.get('request-id')?.[0];
    const userAgent = metadata.get('user-agent')?.[0];

    console.log('Authorization:', authorization);
    console.log('Request ID:', requestId);
    console.log('User Agent:', userAgent);

    // Validate authorization
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new RpcException({
        code: 16, // UNAUTHENTICATED
        message: 'Missing or invalid authorization token',
        details: {
          hint: 'Provide a valid Bearer token in the authorization header',
        },
      });
    }

    const loan = await this.loanService.getLoan(data.id);
    return { loan };
  }
}
```

---

### Pattern 9: health-check-service (Health Check)
**Category**: Health
**Description**: Implement gRPC health check service

```typescript
// health.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  HealthCheckRequest,
  HealthCheckResponse,
  ServingStatus,
} from '../../../generated/common/common';

@Controller()
export class HealthController {
  @GrpcMethod('HealthService', 'Check')
  check(data: HealthCheckRequest): HealthCheckResponse {
    console.log(`[Health Check] Service: ${data.service || 'all'}`);

    return {
      status: ServingStatus.SERVING_STATUS_SERVING,
      version: process.env.npm_package_version || '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}

// health.module.ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}

// app.module.ts
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { LoanModule } from './loan/loan.module';

@Module({
  imports: [HealthModule, LoanModule],
})
export class AppModule {}
```

---

### Pattern 10: graceful-shutdown (Shutdown Hooks)
**Category**: Lifecycle
**Description**: Handle graceful shutdown for gRPC server

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'loan.v1',
        protoPath: join(__dirname, '../../../proto/loan/loan.proto'),
        url: '0.0.0.0:50051',
        loader: {
          keepCase: true,
          longs: String,
          enums: String,
        },
      },
    },
  );

  // Enable shutdown hooks
  app.enableShutdownHooks();

  await app.listen();
  console.log('🚀 Loan Service listening on port 50051');

  // Graceful shutdown on SIGTERM (Docker stop)
  process.on('SIGTERM', async () => {
    console.log('⚠️  SIGTERM received, shutting down gracefully...');
    await app.close();
    console.log('✅ Application closed');
    process.exit(0);
  });

  // Graceful shutdown on SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('⚠️  SIGINT received, shutting down gracefully...');
    await app.close();
    console.log('✅ Application closed');
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start microservice:', error);
  process.exit(1);
});
```

---

## 🛡️ ARCHITECTURE CONSTRAINTS

### ✅ REQUIRED

1. **Transport.GRPC**: Always use Transport.GRPC for microservices
2. **0.0.0.0 Binding**: Bind to 0.0.0.0 for Docker (NOT localhost)
3. **Loader Options**: Configure keepCase, longs, enums, defaults, oneofs
4. **Error Handling**: Convert exceptions to gRPC status codes (5, 16, 7, 3, etc.)
5. **Logging**: Use interceptors for request/response logging
6. **Health Checks**: Implement gRPC health check service
7. **Graceful Shutdown**: Handle SIGTERM/SIGINT for clean shutdown
8. **Metadata Validation**: Validate authorization and request metadata
9. **Stream Completion**: Always complete() or error() streams
10. **Proto Path**: Use join(__dirname) for proto file paths (NO absolute paths)

### ❌ PROHIBITED

1. **NO localhost Binding**: Use 0.0.0.0 for server (localhost won't work in Docker)
2. **NO Blocking Operations**: Always use async/await for business logic
3. **NO Missing Error Handling**: Always wrap in try-catch or use exception filters
4. **NO Unhandled Streams**: Always handle stream completion and errors
5. **NO Absolute Proto Paths**: Use relative paths with join(__dirname)
6. **NO Missing Health Checks**: Health checks are mandatory for production
7. **NO Hardcoded Ports**: Use environment variables for port configuration
8. **NO Non-deterministic Code**: gRPC services must be deterministic
9. **NO Missing Logging**: Log all RPC calls for debugging
10. **NO Reflection in Production**: Disable gRPC reflection in production

---

## 📝 COMPLETE EXAMPLE

```typescript
// apps/loan-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { GrpcExceptionFilter } from './filters/grpc-exception.filter';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'loan.v1',
        protoPath: join(__dirname, '../../../proto/loan/loan.proto'),
        url: '0.0.0.0:50051',
        loader: {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    },
  );

  app.useGlobalFilters(new GrpcExceptionFilter());
  app.enableShutdownHooks();

  await app.listen();
  console.log('🚀 Loan Service listening on port 50051');
}

bootstrap();
```

---

**File Size**: ~550 lines
**Patterns Covered**: 10 gRPC server patterns
**Compliance**: ✅ 0.0.0.0 binding, ✅ Error handling, ✅ Graceful shutdown
**Ready for**: Production microservices deployment
