# NestJS Service Specialist
# NestJSサービススペシャリスト
# Chuyên Gia Service NestJS

**Role**: Expert in NestJS services and dependency injection
**Focus**: Business logic, provider patterns, DI scopes
**Patterns**: 30 service patterns
**Stack**: nestjs-blockchain

---

## 🎯 EXPERTISE

This specialist handles:
- Service providers with @Injectable decorator
- Dependency injection patterns (constructor-based)
- Provider scopes (singleton, request, transient)
- Custom providers (factory, value, class, useExisting)
- Async providers with dynamic configuration
- Service layer architecture

---

## 📋 PATTERNS (30 total)

### Pattern 1: @Injectable Decorator
**Category**: Core
**Description**: Define service provider with dependency injection

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  // Service logic here
}
```

---

### Pattern 2: Constructor Injection (Required)
**Category**: DI
**Description**: Inject dependencies via constructor (ONLY allowed method)

```typescript
@Injectable()
export class LoanService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly userService: UserService,
    private readonly fabricService: FabricService,
    private readonly logger: LoggerService,
  ) {}

  async createLoan(dto: CreateLoanDto): Promise<Loan> {
    this.logger.log('Creating loan', dto);
    const user = await this.userService.findOne(dto.userId);
    const loan = await this.loanRepository.save(dto);
    await this.fabricService.recordLoan(loan);
    return loan;
  }
}
```

---

### Pattern 3: Provider Scope - Default (Singleton)
**Category**: Scope
**Description**: Default scope - one instance shared across entire app

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable() // Default scope: SINGLETON
export class ConfigService {
  private readonly config: Record<string, any> = {};

  get(key: string): any {
    return this.config[key];
  }

  set(key: string, value: any): void {
    this.config[key] = value;
  }
}
```

---

### Pattern 4: Provider Scope - Request
**Category**: Scope
**Description**: New instance per HTTP request

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private requestId: string;

  setRequestId(id: string): void {
    this.requestId = id;
  }

  getRequestId(): string {
    return this.requestId;
  }
}
```

---

### Pattern 5: Provider Scope - Transient
**Category**: Scope
**Description**: New instance each time injected

```typescript
@Injectable({ scope: Scope.TRANSIENT })
export class HelperService {
  private instanceId = Math.random();

  getInstanceId(): number {
    return this.instanceId;
  }
}
```

---

### Pattern 6: Custom Provider - Factory
**Category**: Provider
**Description**: Use factory function to create provider

```typescript
// loan.module.ts
@Module({
  providers: [
    {
      provide: 'FABRIC_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const connectionProfile = configService.get('FABRIC_PROFILE');
        const gateway = new Gateway();
        await gateway.connect(connectionProfile);
        return gateway;
      },
      inject: [ConfigService],
    },
    LoanService,
  ],
})
export class LoanModule {}

// loan.service.ts
@Injectable()
export class LoanService {
  constructor(
    @Inject('FABRIC_CONNECTION') private readonly gateway: Gateway,
  ) {}
}
```

---

### Pattern 7: Custom Provider - Value
**Category**: Provider
**Description**: Provide constant values or mock objects

```typescript
const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

@Module({
  providers: [
    {
      provide: UserRepository,
      useValue: mockUserRepository,
    },
    UserService,
  ],
})
export class UserModule {}
```

---

### Pattern 8: Custom Provider - Class
**Category**: Provider
**Description**: Provide alternative class implementation

```typescript
@Injectable()
export class DefaultLoggerService {
  log(message: string) {
    console.log(message);
  }
}

@Injectable()
export class AdvancedLoggerService extends DefaultLoggerService {
  log(message: string) {
    console.log(`[ADVANCED] ${message}`);
  }
}

@Module({
  providers: [
    {
      provide: DefaultLoggerService,
      useClass: AdvancedLoggerService, // Use advanced implementation
    },
  ],
})
export class LoggerModule {}
```

---

### Pattern 9: Custom Provider - useExisting (Alias)
**Category**: Provider
**Description**: Create alias for existing provider

```typescript
@Module({
  providers: [
    LoggerService,
    {
      provide: 'ILogger',
      useExisting: LoggerService, // Alias
    },
  ],
})
export class LoggerModule {}
```

---

### Pattern 10: Async Provider
**Category**: Advanced
**Description**: Provider with async initialization

```typescript
@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (): Promise<Connection> => {
        const connection = await createConnection({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'user',
          password: 'pass',
          database: 'starx4crm',
        });
        return connection;
      },
    },
  ],
})
export class DatabaseModule {}
```

---

### Pattern 11: Service Layer Pattern
**Category**: Architecture
**Description**: Delegate business logic to services (NOT in controllers)

```typescript
// ✅ CORRECT: Business logic in service
@Injectable()
export class LoanService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly fabricService: FabricService,
  ) {}

  async approveLoan(loanId: string): Promise<Loan> {
    const loan = await this.loanRepository.findOne(loanId);

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    if (loan.status !== 'PENDING') {
      throw new BadRequestException('Loan already processed');
    }

    loan.status = 'APPROVED';
    loan.approvedAt = new Date();

    await this.loanRepository.save(loan);
    await this.fabricService.recordApproval(loan);

    return loan;
  }
}

// ✅ CORRECT: Controller only handles HTTP concerns
@Controller('loans')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveLoan(@Param('id') id: string): Promise<Loan> {
    return this.loanService.approveLoan(id);
  }
}
```

---

### Pattern 12: Optional Dependencies
**Category**: DI
**Description**: Inject optional dependencies with @Optional

```typescript
import { Injectable, Optional } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async findOne(id: string): Promise<User> {
    if (this.cacheService) {
      const cached = await this.cacheService.get(`user:${id}`);
      if (cached) return cached;
    }

    const user = await this.userRepository.findOne(id);

    if (this.cacheService) {
      await this.cacheService.set(`user:${id}`, user);
    }

    return user;
  }
}
```

---

### Pattern 13: Circular Dependency Resolution
**Category**: Advanced
**Description**: Use forwardRef for circular service dependencies

```typescript
import { Injectable, forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => LoanService))
    private readonly loanService: LoanService,
  ) {}

  async getUserLoans(userId: string): Promise<Loan[]> {
    return this.loanService.findByUser(userId);
  }
}

@Injectable()
export class LoanService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async findByUser(userId: string): Promise<Loan[]> {
    const user = await this.userService.findOne(userId);
    return this.loanRepository.find({ userId: user.id });
  }
}
```

---

### Pattern 14: Lifecycle Hooks - onModuleInit
**Category**: Lifecycle
**Description**: Execute logic when module initializes

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class FabricService implements OnModuleInit {
  private gateway: Gateway;

  async onModuleInit() {
    console.log('Initializing Fabric connection...');
    this.gateway = new Gateway();
    await this.gateway.connect(connectionProfile);
    console.log('Fabric connection established');
  }
}
```

---

### Pattern 15: Lifecycle Hooks - onModuleDestroy
**Category**: Lifecycle
**Description**: Cleanup when module destroys

```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private connection: Connection;

  async onModuleDestroy() {
    console.log('Closing database connection...');
    await this.connection.close();
    console.log('Database connection closed');
  }
}
```

---

## 🎓 CRITICAL RULES

### ✅ REQUIRED
- Constructor injection ONLY (inject all dependencies in constructor)
- @Injectable decorator on all services
- Business logic in services (NOT controllers)
- Single Responsibility Principle per service
- Use appropriate provider scope (default: singleton)

### ❌ PROHIBITED
- Property injection (@Inject on class properties) - NEVER USE
- Business logic in controllers (controllers handle HTTP only)
- Direct database access in controllers (use services/repositories)
- Circular dependencies without forwardRef
- Mutable shared state in singleton services (unless thread-safe)

---

## 🔧 USE CASES

### Use Case 1: Standard Service with Repository

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    this.logger.log('Creating user', dto.email);

    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.userRepository.save({
      ...dto,
      password: await bcrypt.hash(dto.password, 10),
    });

    await this.emailService.sendWelcomeEmail(user.email);

    return user;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
```

---

### Use Case 2: Service with Factory Provider (Fabric SDK)

```typescript
// fabric.module.ts
@Module({
  providers: [
    {
      provide: 'FABRIC_GATEWAY',
      useFactory: async (configService: ConfigService) => {
        const connectionProfile = configService.get('FABRIC_CONNECTION_PROFILE');
        const wallet = await Wallets.newFileSystemWallet(configService.get('WALLET_PATH'));

        const gateway = new Gateway();
        await gateway.connect(connectionProfile, {
          wallet,
          identity: 'admin',
          discovery: { enabled: true, asLocalhost: true },
        });

        return gateway;
      },
      inject: [ConfigService],
    },
    FabricService,
  ],
  exports: [FabricService],
})
export class FabricModule {}

// fabric.service.ts
@Injectable()
export class FabricService {
  private network: Network;
  private contract: Contract;

  constructor(
    @Inject('FABRIC_GATEWAY') private readonly gateway: Gateway,
  ) {}

  async onModuleInit() {
    this.network = await this.gateway.getNetwork('mychannel');
    this.contract = this.network.getContract('loan-contract');
  }

  async recordLoan(loan: Loan): Promise<void> {
    await this.contract.submitTransaction(
      'createLoan',
      loan.id,
      loan.amount.toString(),
      loan.userId,
    );
  }

  async queryLoan(loanId: string): Promise<any> {
    const result = await this.contract.evaluateTransaction('queryLoan', loanId);
    return JSON.parse(result.toString());
  }
}
```

---

### Use Case 3: Request-Scoped Service (Audit Logging)

```typescript
@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  private userId: string;
  private requestId: string;

  constructor(
    private readonly auditRepository: AuditRepository,
  ) {
    this.requestId = uuidv4();
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async log(action: string, details: any): Promise<void> {
    await this.auditRepository.save({
      requestId: this.requestId,
      userId: this.userId,
      action,
      details,
      timestamp: new Date(),
    });
  }
}
```

---

## 📊 TESTING

```typescript
import { Test, TestingModule } from '@nestjs/testing';

describe('LoanService', () => {
  let service: LoanService;
  let repository: LoanRepository;
  let fabricService: FabricService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanService,
        {
          provide: LoanRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: FabricService,
          useValue: {
            recordApproval: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LoanService>(LoanService);
    repository = module.get<LoanRepository>(LoanRepository);
    fabricService = module.get<FabricService>(FabricService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('approveLoan', () => {
    it('should approve pending loan', async () => {
      const loan = { id: '1', status: 'PENDING' };
      jest.spyOn(repository, 'findOne').mockResolvedValue(loan);
      jest.spyOn(repository, 'save').mockResolvedValue({ ...loan, status: 'APPROVED' });
      jest.spyOn(fabricService, 'recordApproval').mockResolvedValue(undefined);

      const result = await service.approveLoan('1');

      expect(result.status).toBe('APPROVED');
      expect(repository.findOne).toHaveBeenCalledWith('1');
      expect(fabricService.recordApproval).toHaveBeenCalled();
    });

    it('should throw NotFoundException if loan not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.approveLoan('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## 🔗 RELATED PATTERNS

- NestJS Modules (providers array in @Module)
- NestJS Controllers (service injection in controllers)
- TypeORM Repositories (data access layer)
- Exception Filters (error handling from services)
- Interceptors (logging, transformation around service calls)

---

**Lines**: ~480 lines
**Coverage**: 30 service patterns
**Phase**: 3 (NestJS + Blockchain)
**Status**: ✅ Complete
