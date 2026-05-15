# NestJS gRPC Client Specialist
# NestJS gRPCクライアントスペシャリスト
# Chuyên Gia gRPC Client NestJS

**Role**: Expert in NestJS gRPC client implementation
**Focus**: Client setup, dependency injection, retry logic, streaming
**Patterns**: 10 gRPC client patterns
**Stack**: nestjs-blockchain (gRPC Client)

---

## 🎯 EXPERTISE

This specialist handles:
- ClientsModule for gRPC client registration
- Constructor injection of gRPC clients
- Observable to Promise conversion (firstValueFrom)
- Retry strategies with exponential backoff
- Timeout configuration and error handling
- Client-side streaming (consuming server streams)

---

## 📋 PATTERNS (10 total)

### Pattern 1: clients-module-register (Client Registration)
**Category**: Client Setup
**Description**: Register gRPC clients in NestJS module

```typescript
// apps/api-gateway/src/app.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { LoansController } from './loans/loans.controller';
import { UsersController } from './users/users.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'LOAN_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'loan.v1',
          protoPath: join(__dirname, '../../../proto/loan/loan.proto'),
          url: 'localhost:50051',           // Service URL
          loader: {
            keepCase: true,                 // Keep snake_case fields
            longs: String,                  // Convert int64 to String
            enums: String,                  // Convert enums to String
          },
        },
      },
      {
        name: 'USER_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'user.v1',
          protoPath: join(__dirname, '../../../proto/user/user.proto'),
          url: 'localhost:50052',
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
          },
        },
      },
    ]),
  ],
  controllers: [LoansController, UsersController],
})
export class AppModule {}
```

---

### Pattern 2: inject-grpc-client (Dependency Injection)
**Category**: Client Setup
**Description**: Inject gRPC client using @Inject() decorator

```typescript
// apps/api-gateway/src/loans/loans.controller.ts
import { Controller, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { LoanService } from '../../../generated/loan/loan';

@Controller('api/loans')
export class LoansController implements OnModuleInit {
  private loanService: LoanService;

  // ✅ CORRECT: Constructor injection
  constructor(@Inject('LOAN_SERVICE') private client: ClientGrpc) {}

  // Get service reference in onModuleInit lifecycle hook
  onModuleInit() {
    this.loanService = this.client.getService<LoanService>('LoanService');
  }

  // ❌ WRONG: Property injection (don't do this!)
  // @Inject('LOAN_SERVICE')
  // private client: ClientGrpc;
}
```

---

### Pattern 3: observable-to-promise (firstValueFrom)
**Category**: Client Usage
**Description**: Convert Observable to Promise for async/await

```typescript
import { Controller, Get, Post, Body, Param, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  LoanService,
  CreateLoanRequest,
  GetLoanRequest,
  ListLoansRequest,
} from '../../../generated/loan/loan';

@Controller('api/loans')
export class LoansController implements OnModuleInit {
  private loanService: LoanService;

  constructor(@Inject('LOAN_SERVICE') private client: ClientGrpc) {}

  onModuleInit() {
    this.loanService = this.client.getService<LoanService>('LoanService');
  }

  @Post()
  async createLoan(@Body() data: CreateLoanRequest) {
    // Convert Observable to Promise using firstValueFrom
    const response = await firstValueFrom(this.loanService.createLoan(data));
    return response;
  }

  @Get(':id')
  async getLoan(@Param('id') id: string) {
    const request: GetLoanRequest = { id };
    const response = await firstValueFrom(this.loanService.getLoan(request));
    return response.loan;
  }

  @Get()
  async listLoans(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const request: ListLoansRequest = {
      pageRequest: {
        page: parseInt(page, 10) || 1,
        pageSize: parseInt(pageSize, 10) || 10,
        sortBy: 'createdAt',
        order: 'desc',
      },
    };

    const response = await firstValueFrom(this.loanService.listLoans(request));
    return {
      loans: response.loans,
      pagination: response.pageResponse,
    };
  }
}
```

---

### Pattern 4: retry-strategy (Exponential Backoff)
**Category**: Reliability
**Description**: Implement retry logic with exponential backoff

```typescript
import { Controller, Get, Inject, OnModuleInit, Param } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, retry, timer } from 'rxjs';
import { LoanService, GetLoanRequest } from '../../../generated/loan/loan';

@Controller('api/loans')
export class LoansController implements OnModuleInit {
  private loanService: LoanService;

  constructor(@Inject('LOAN_SERVICE') private client: ClientGrpc) {}

  onModuleInit() {
    this.loanService = this.client.getService<LoanService>('LoanService');
  }

  @Get(':id')
  async getLoanWithRetry(@Param('id') id: string) {
    const request: GetLoanRequest = { id };

    // Retry with exponential backoff
    const response = await firstValueFrom(
      this.loanService.getLoan(request).pipe(
        retry({
          count: 3,                         // Retry up to 3 times
          delay: (error, retryCount) => {
            console.log(`Retry attempt ${retryCount} after error:`, error.message);
            // Exponential backoff: 2s, 4s, 8s
            return timer(Math.pow(2, retryCount) * 1000);
          },
        }),
      ),
    );

    return response.loan;
  }
}
```

---

### Pattern 5: timeout-configuration (Request Timeout)
**Category**: Reliability
**Description**: Configure timeout for gRPC calls

```typescript
import { Controller, Get, Inject, OnModuleInit, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { LoanService, GetLoanRequest } from '../../../generated/loan/loan';

@Controller('api/loans')
export class LoansController implements OnModuleInit {
  private loanService: LoanService;

  constructor(@Inject('LOAN_SERVICE') private client: ClientGrpc) {}

  onModuleInit() {
    this.loanService = this.client.getService<LoanService>('LoanService');
  }

  @Get(':id')
  async getLoan(@Param('id') id: string) {
    const request: GetLoanRequest = { id };

    try {
      // Set 5-second timeout
      const response = await firstValueFrom(
        this.loanService.getLoan(request).pipe(
          timeout(5000),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              console.error('[gRPC Timeout] Loan service did not respond in 5s');
              return throwError(() => new HttpException(
                'Loan service timeout',
                HttpStatus.GATEWAY_TIMEOUT,
              ));
            }
            return throwError(() => error);
          }),
        ),
      );

      return response.loan;
    } catch (error) {
      console.error('[gRPC Error]', error);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

---

### Pattern 6: environment-variables (Service URL Configuration)
**Category**: Configuration
**Description**: Use environment variables for gRPC service URLs

```typescript
// apps/api-gateway/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { LoansController } from './loans/loans.controller';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Register gRPC clients with async configuration
    ClientsModule.registerAsync([
      {
        name: 'LOAN_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'loan.v1',
            protoPath: join(__dirname, '../../../proto/loan/loan.proto'),
            url: configService.get<string>('LOAN_SERVICE_URL', 'localhost:50051'),
            loader: {
              keepCase: true,
              longs: String,
              enums: String,
            },
          },
        }),
      },
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user.v1',
            protoPath: join(__dirname, '../../../proto/user/user.proto'),
            url: configService.get<string>('USER_SERVICE_URL', 'localhost:50052'),
            loader: {
              keepCase: true,
              longs: String,
              enums: String,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [LoansController],
})
export class AppModule {}

// .env
// LOAN_SERVICE_URL=loan-service:50051
// USER_SERVICE_URL=user-service:50052
```

---

### Pattern 7: grpc-metadata-client (Send Metadata)
**Category**: Metadata
**Description**: Send custom metadata (headers) with gRPC requests

```typescript
import { Controller, Get, Inject, OnModuleInit, Param, Headers } from '@nestjs/common';
import { ClientGrpc, Metadata } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { LoanService, GetLoanRequest } from '../../../generated/loan/loan';

@Controller('api/loans')
export class LoansController implements OnModuleInit {
  private loanService: LoanService;

  constructor(@Inject('LOAN_SERVICE') private client: ClientGrpc) {}

  onModuleInit() {
    this.loanService = this.client.getService<LoanService>('LoanService');
  }

  @Get(':id')
  async getLoan(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
  ) {
    const request: GetLoanRequest = { id };

    // Create metadata (gRPC headers)
    const metadata = new Metadata();
    metadata.set('authorization', authorization || 'Bearer default-token');
    metadata.set('request-id', `req-${Date.now()}`);
    metadata.set('user-agent', 'api-gateway/1.0');

    // Send metadata with request
    const response = await firstValueFrom(
      this.loanService.getLoan(request, metadata),
    );

    return response.loan;
  }
}
```

---

### Pattern 8: server-streaming-client (Consume Server Stream)
**Category**: Streaming
**Description**: Handle server streaming on client side

```typescript
import { Controller, Get, Inject, OnModuleInit, Param, Sse } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, map } from 'rxjs';
import {
  LoanService,
  WatchLoanStatusRequest,
  LoanStatusUpdate,
} from '../../../generated/loan/loan';

interface MessageEvent {
  data: any;
}

@Controller('api/loans')
export class LoansController implements OnModuleInit {
  private loanService: LoanService;

  constructor(@Inject('LOAN_SERVICE') private client: ClientGrpc) {}

  onModuleInit() {
    this.loanService = this.client.getService<LoanService>('LoanService');
  }

  // Server-Sent Events endpoint
  @Sse(':id/watch')
  watchLoanStatus(@Param('id') id: string): Observable<MessageEvent> {
    const request: WatchLoanStatusRequest = { loanId: id };

    // Server streaming: returns Observable<LoanStatusUpdate>
    return this.loanService.watchLoanStatus(request).pipe(
      map((update: LoanStatusUpdate) => {
        console.log('[Watch] Status update:', update);

        // Convert to SSE format
        return {
          data: {
            loanId: update.loanId,
            status: update.status,
            updatedAt: update.updatedAt,
            message: update.message,
          },
        };
      }),
    );
  }
}
```

---

### Pattern 9: error-handling (gRPC Error Handling)
**Category**: Error Handling
**Description**: Handle gRPC errors and convert to HTTP responses

```typescript
import { Controller, Post, Body, Inject, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { LoanService, CreateLoanRequest } from '../../../generated/loan/loan';

@Controller('api/loans')
export class LoansController implements OnModuleInit {
  private loanService: LoanService;

  constructor(@Inject('LOAN_SERVICE') private client: ClientGrpc) {}

  onModuleInit() {
    this.loanService = this.client.getService<LoanService>('LoanService');
  }

  @Post()
  async createLoan(@Body() data: CreateLoanRequest) {
    try {
      const response = await firstValueFrom(
        this.loanService.createLoan(data).pipe(
          catchError((error) => {
            console.error('[gRPC Error]', error);

            // Map gRPC status codes to HTTP status codes
            const httpStatus = this.mapGrpcToHttpStatus(error.code);
            const errorMessage = error.message || error.details || 'Unknown error';

            return throwError(() => new HttpException(
              {
                statusCode: httpStatus,
                message: errorMessage,
                error: error.details || {},
              },
              httpStatus,
            ));
          }),
        ),
      );

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapGrpcToHttpStatus(grpcCode: number): number {
    // gRPC → HTTP status code mapping
    const mapping = {
      0: HttpStatus.OK,                     // OK
      1: HttpStatus.BAD_REQUEST,            // CANCELLED
      2: HttpStatus.INTERNAL_SERVER_ERROR,  // UNKNOWN
      3: HttpStatus.BAD_REQUEST,            // INVALID_ARGUMENT
      5: HttpStatus.NOT_FOUND,              // NOT_FOUND
      7: HttpStatus.FORBIDDEN,              // PERMISSION_DENIED
      9: HttpStatus.CONFLICT,               // FAILED_PRECONDITION
      13: HttpStatus.INTERNAL_SERVER_ERROR, // INTERNAL
      16: HttpStatus.UNAUTHORIZED,          // UNAUTHENTICATED
    };

    return mapping[grpcCode] || HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
```

---

### Pattern 10: connection-testing (Test gRPC Connection)
**Category**: Testing
**Description**: Test gRPC client connection in integration tests

```typescript
// apps/api-gateway/src/loans/loans.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { LoansController } from './loans.controller';

describe('LoansController (Integration)', () => {
  let controller: LoansController;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ClientsModule.register([
          {
            name: 'LOAN_SERVICE',
            transport: Transport.GRPC,
            options: {
              package: 'loan.v1',
              protoPath: join(__dirname, '../../../../proto/loan/loan.proto'),
              url: 'localhost:50051',
              loader: {
                keepCase: true,
                longs: String,
                enums: String,
              },
            },
          },
        ]),
      ],
      controllers: [LoansController],
    }).compile();

    controller = module.get<LoansController>(LoansController);

    // Initialize OnModuleInit manually
    await controller.onModuleInit();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a loan via gRPC', async () => {
    const request = {
      userId: 'user123',
      amount: 10000,
      durationMonths: 12,
      type: 'LOAN_TYPE_PERSONAL',
      interestRate: 5.5,
      purpose: 'Business expansion',
      metadata: {},
    };

    const response = await controller.createLoan(request);

    expect(response).toBeDefined();
    expect(response.loan).toBeDefined();
    expect(response.loan.userId).toBe('user123');
    expect(response.message).toContain('success');
  }, 10000); // 10-second timeout

  it('should get a loan by ID via gRPC', async () => {
    const loanId = 'loan-123';

    const loan = await controller.getLoan(loanId);

    expect(loan).toBeDefined();
    expect(loan.id).toBe(loanId);
  }, 10000);
});
```

---

## 🛡️ ARCHITECTURE CONSTRAINTS

### ✅ REQUIRED

1. **ClientsModule.register()**: Use ClientsModule for gRPC client setup
2. **Constructor Injection**: Inject ClientGrpc via constructor (NOT properties)
3. **OnModuleInit**: Get service reference in onModuleInit() lifecycle hook
4. **firstValueFrom()**: Use firstValueFrom() to convert Observable to Promise
5. **Environment Variables**: Use ConfigService for service URLs (NO hardcoded URLs)
6. **Error Handling**: Wrap gRPC calls in try-catch, map to HTTP status codes
7. **Timeout**: Set timeout for all production gRPC calls
8. **Retry Logic**: Implement retry strategy with exponential backoff
9. **Metadata**: Send authorization and request-id metadata
10. **Logging**: Log all gRPC calls and errors

### ❌ PROHIBITED

1. **NO Property Injection**: Never use @Inject() on properties for gRPC clients
2. **NO Hardcoded URLs**: Always use environment variables for service URLs
3. **NO Blocking Operations**: Always use async/await for gRPC calls
4. **NO Missing Error Handling**: Always wrap gRPC calls in try-catch
5. **NO Missing Timeout**: Set timeout for production calls (avoid indefinite waits)
6. **NO Missing Retry Logic**: Implement retry for transient failures
7. **NO Absolute Proto Paths**: Use join(__dirname) for proto file paths
8. **NO Unhandled gRPC Errors**: Convert gRPC errors to HTTP responses
9. **NO Missing Metadata**: Send authorization metadata for protected RPCs
10. **NO Untyped Services**: Always use typed service interfaces from generated code

---

## 📝 COMPLETE EXAMPLE: API Gateway

```typescript
// apps/api-gateway/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { LoansController } from './loans/loans.controller';
import { UsersController } from './users/users.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.registerAsync([
      {
        name: 'LOAN_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'loan.v1',
            protoPath: join(__dirname, '../../../proto/loan/loan.proto'),
            url: config.get('LOAN_SERVICE_URL', 'localhost:50051'),
            loader: { keepCase: true, longs: String, enums: String },
          },
        }),
      },
    ]),
  ],
  controllers: [LoansController, UsersController],
})
export class AppModule {}

// apps/api-gateway/src/loans/loans.controller.ts
import { Controller, Get, Post, Body, Param, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, timeout, retry, timer } from 'rxjs';
import { LoanService, CreateLoanRequest } from '../../../generated/loan/loan';

@Controller('api/loans')
export class LoansController implements OnModuleInit {
  private loanService: LoanService;

  constructor(@Inject('LOAN_SERVICE') private client: ClientGrpc) {}

  onModuleInit() {
    this.loanService = this.client.getService<LoanService>('LoanService');
  }

  @Post()
  async createLoan(@Body() data: CreateLoanRequest) {
    const response = await firstValueFrom(
      this.loanService.createLoan(data).pipe(
        timeout(5000),
        retry({
          count: 3,
          delay: (_, retryCount) => timer(Math.pow(2, retryCount) * 1000),
        }),
      ),
    );
    return response;
  }

  @Get(':id')
  async getLoan(@Param('id') id: string) {
    const response = await firstValueFrom(
      this.loanService.getLoan({ id }).pipe(timeout(5000)),
    );
    return response.loan;
  }
}
```

---

**File Size**: ~550 lines
**Patterns Covered**: 10 gRPC client patterns
**Compliance**: ✅ Constructor injection, ✅ Environment variables, ✅ Error handling
**Ready for**: Production API Gateway with gRPC clients
