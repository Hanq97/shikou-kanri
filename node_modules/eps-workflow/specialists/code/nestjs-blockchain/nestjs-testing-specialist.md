# NestJS Testing Specialist
# NestJSテストスペシャリスト
# Chuyên Gia Testing NestJS

**Role**: Expert in NestJS testing strategies
**Focus**: Unit, integration, E2E testing with Jest
**Patterns**: 25 testing patterns
**Stack**: nestjs-blockchain

---

## 🎯 EXPERTISE

This specialist handles:
- Unit testing (services, controllers, guards)
- Integration testing (modules, database)
- E2E testing (full application flow)
- Test.createTestingModule pattern
- Mocking strategies (providers, repositories, external services)
- Coverage configuration

---

## 📋 PATTERNS (25 total)

### Pattern 1: Testing Module Builder
**Category**: Core
**Description**: Create isolated testing module

```typescript
import { Test, TestingModule } from '@nestjs/testing';

describe('UserService', () => {
  let service: UserService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(async () => {
    await module.close();
  });
});
```

---

### Pattern 2: Create Testing Module
**Category**: Core
**Description**: Build complete testing module with dependencies

```typescript
describe('LoanService', () => {
  let service: LoanService;
  let repository: Repository<Loan>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanService,
        {
          provide: getRepositoryToken(Loan),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<LoanService>(LoanService);
    repository = module.get<Repository<Loan>>(getRepositoryToken(Loan));
  });
});
```

---

### Pattern 3: Override Provider
**Category**: Mocking
**Description**: Override provider for testing

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [LoanService],
})
  .overrideProvider(UserService)
  .useValue(mockUserService)
  .compile();
```

---

### Pattern 4: Mock Provider
**Category**: Mocking
**Description**: Provide mock implementation

```typescript
const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  delete: jest.fn(),
};

const module: TestingModule = await Test.createTestingModule({
  providers: [
    UserService,
    {
      provide: getRepositoryToken(User),
      useValue: mockUserRepository,
    },
  ],
}).compile();
```

---

### Pattern 5: Unit Test Service
**Category**: Unit Testing
**Description**: Test service in isolation

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const createUserDto = { email: 'test@example.com', name: 'Test' };
      const savedUser = { id: '1', ...createUserDto };

      jest.spyOn(repository, 'save').mockResolvedValue(savedUser as User);

      const result = await service.createUser(createUserDto);

      expect(result).toEqual(savedUser);
      expect(repository.save).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw ConflictException if email exists', async () => {
      const createUserDto = { email: 'existing@example.com', name: 'Test' };

      jest.spyOn(repository, 'findOne').mockResolvedValue({ id: '1' } as User);

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
```

---

### Pattern 6: Unit Test Controller
**Category**: Unit Testing
**Description**: Test controller HTTP logic

```typescript
describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [{ id: '1', email: 'test@example.com' }];
      jest.spyOn(service, 'findAll').mockResolvedValue(users as User[]);

      expect(await controller.findAll()).toBe(users);
    });
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto = { email: 'test@example.com', name: 'Test' };
      const user = { id: '1', ...dto };

      jest.spyOn(service, 'create').mockResolvedValue(user as User);

      expect(await controller.create(dto)).toBe(user);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });
});
```

---

### Pattern 7: Integration Test Setup
**Category**: Integration Testing
**Description**: Test module interactions

```typescript
describe('LoanModule (integration)', () => {
  let app: INestApplication;
  let loanService: LoanService;
  let userService: UserService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LoanModule, TypeOrmModule.forRoot(testDbConfig)],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    loanService = moduleFixture.get<LoanService>(LoanService);
    userService = moduleFixture.get<UserService>(UserService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create loan for existing user', async () => {
    const user = await userService.create({ email: 'test@example.com' });
    const loan = await loanService.create({ userId: user.id, amount: 1000 });

    expect(loan.userId).toBe(user.id);
    expect(loan.amount).toBe(1000);
  });
});
```

---

### Pattern 8: E2E Test Setup
**Category**: E2E Testing
**Description**: End-to-end application testing

```typescript
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com', name: 'Test' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe('test@example.com');
      });
  });
});
```

---

### Pattern 9: Supertest Usage
**Category**: E2E Testing
**Description**: HTTP request testing with supertest

```typescript
describe('LoanController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'password' });

    authToken = loginResponse.body.accessToken;
  });

  it('should create loan with authentication', () => {
    return request(app.getHttpServer())
      .post('/loans')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 5000, userId: '123' })
      .expect(201);
  });

  it('should reject loan without authentication', () => {
    return request(app.getHttpServer())
      .post('/loans')
      .send({ amount: 5000, userId: '123' })
      .expect(401);
  });
});
```

---

### Pattern 10: Test Database Setup
**Category**: Database Testing
**Description**: Configure test database

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const testDbConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5433, // Different port for test DB
  username: 'test_user',
  password: 'test_password',
  database: 'test_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // OK for testing
  dropSchema: true, // Clean DB before each test suite
};

// Usage in tests
beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [TypeOrmModule.forRoot(testDbConfig)],
  }).compile();
});
```

---

### Pattern 11: Test Database Cleanup
**Category**: Database Testing
**Description**: Clean database between tests

```typescript
describe('UserService (integration)', () => {
  let app: INestApplication;
  let repository: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    repository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(async () => {
    // Clean up after each test
    await repository.query('TRUNCATE TABLE users CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create user', async () => {
    const user = await repository.save({ email: 'test@example.com' });
    expect(user.id).toBeDefined();
  });
});
```

---

### Pattern 12: Mock Repository
**Category**: Mocking
**Description**: Mock TypeORM repository

```typescript
const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  })),
};

const module: TestingModule = await Test.createTestingModule({
  providers: [
    LoanService,
    {
      provide: getRepositoryToken(Loan),
      useValue: mockRepository,
    },
  ],
}).compile();
```

---

### Pattern 13: Mock External Service
**Category**: Mocking
**Description**: Mock external API calls

```typescript
const mockFabricService = {
  recordLoan: jest.fn(),
  queryLoan: jest.fn(),
  submitTransaction: jest.fn(),
};

const module: TestingModule = await Test.createTestingModule({
  providers: [
    LoanService,
    {
      provide: FabricService,
      useValue: mockFabricService,
    },
  ],
}).compile();

// Test
it('should call Fabric service when creating loan', async () => {
  mockFabricService.recordLoan.mockResolvedValue({ transactionId: 'tx123' });

  await service.createLoan(dto);

  expect(mockFabricService.recordLoan).toHaveBeenCalledWith(
    expect.objectContaining({ amount: dto.amount }),
  );
});
```

---

### Pattern 14: Spy on Method
**Category**: Mocking
**Description**: Spy on existing method

```typescript
it('should call repository.save when creating user', async () => {
  const saveSpy = jest.spyOn(repository, 'save').mockResolvedValue(user);

  await service.createUser(dto);

  expect(saveSpy).toHaveBeenCalledTimes(1);
  expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ email: dto.email }));

  saveSpy.mockRestore(); // Clean up spy
});
```

---

### Pattern 15: Mock Return Value
**Category**: Mocking
**Description**: Mock method return values

```typescript
it('should return user from repository', async () => {
  const user = { id: '1', email: 'test@example.com' };

  jest.spyOn(repository, 'findOne').mockResolvedValue(user as User);

  const result = await service.findOne('1');

  expect(result).toEqual(user);
});
```

---

### Pattern 16: Mock Implementation
**Category**: Mocking
**Description**: Mock method with custom implementation

```typescript
it('should validate user password', async () => {
  jest.spyOn(bcrypt, 'compare').mockImplementation(async (plain, hashed) => {
    return plain === 'correct-password';
  });

  const result1 = await service.validatePassword('correct-password', 'hash');
  const result2 = await service.validatePassword('wrong-password', 'hash');

  expect(result1).toBe(true);
  expect(result2).toBe(false);
});
```

---

### Pattern 17: Test Async Method
**Category**: Testing Patterns
**Description**: Test asynchronous operations

```typescript
it('should handle async operations', async () => {
  const promise = service.asyncOperation();

  await expect(promise).resolves.toBe('result');
  // Or
  await expect(promise).rejects.toThrow(Error);
});

it('should complete within timeout', async () => {
  jest.setTimeout(5000); // 5 seconds

  const result = await service.longRunningOperation();

  expect(result).toBeDefined();
});
```

---

### Pattern 18: Test Exceptions
**Category**: Testing Patterns
**Description**: Test error handling

```typescript
it('should throw NotFoundException when user not found', async () => {
  jest.spyOn(repository, 'findOne').mockResolvedValue(null);

  await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
  await expect(service.findOne('999')).rejects.toThrow('User not found');
});

it('should throw BadRequestException for invalid input', async () => {
  const invalidDto = { email: 'invalid-email' };

  await expect(service.createUser(invalidDto)).rejects.toThrow(
    BadRequestException,
  );
});
```

---

### Pattern 19: Test Guards
**Category**: Testing Patterns
**Description**: Test guard activation logic

```typescript
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow access if user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMockContext({ user: { roles: ['admin'] } });

    expect(guard.canActivate(context)).toBe(true);
  });
});
```

---

### Pattern 20: Coverage Configuration
**Category**: Configuration
**Description**: Jest coverage setup

```typescript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

---

## 🎓 CRITICAL RULES

### ✅ REQUIRED
- Use Test.createTestingModule for all tests
- Mock all external dependencies (databases, APIs, Fabric)
- Clean up test data after each test
- Maintain ≥80% code coverage
- Test both success and failure cases
- Use descriptive test names (should + action + expected result)

### ❌ PROHIBITED
- Real database in unit tests (use mocks)
- Real external API calls in tests
- Shared state between tests
- Hard-coded test data without cleanup
- Testing implementation details (test behavior, not internals)

---

## 🔧 USE CASES

### Use Case 1: Complete Service Test Suite

```typescript
describe('LoanService', () => {
  let service: LoanService;
  let loanRepository: Repository<Loan>;
  let userService: UserService;
  let fabricService: FabricService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanService,
        {
          provide: getRepositoryToken(Loan),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: FabricService,
          useValue: {
            recordLoan: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LoanService>(LoanService);
    loanRepository = module.get(getRepositoryToken(Loan));
    userService = module.get<UserService>(UserService);
    fabricService = module.get<FabricService>(FabricService);
  });

  describe('createLoan', () => {
    it('should create loan successfully', async () => {
      const user = { id: '1', email: 'test@example.com' };
      const dto = { userId: '1', amount: 5000 };
      const savedLoan = { id: '1', ...dto, status: 'PENDING' };

      jest.spyOn(userService, 'findOne').mockResolvedValue(user as User);
      jest.spyOn(loanRepository, 'save').mockResolvedValue(savedLoan as Loan);
      jest.spyOn(fabricService, 'recordLoan').mockResolvedValue(undefined);

      const result = await service.createLoan(dto);

      expect(result).toEqual(savedLoan);
      expect(fabricService.recordLoan).toHaveBeenCalledWith(savedLoan);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(null);

      await expect(service.createLoan({ userId: '999', amount: 5000 }))
        .rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## 📊 TESTING

```typescript
// Meta: Testing the test utilities themselves
describe('Test Utilities', () => {
  it('should create mock execution context', () => {
    const context = createMockExecutionContext({ user: { id: '1' } });

    expect(context.switchToHttp().getRequest().user.id).toBe('1');
  });
});
```

---

## 🔗 RELATED PATTERNS

- NestJS Services (service testing)
- NestJS Controllers (controller testing)
- TypeORM Repositories (repository mocking)
- Guards & Middleware (guard testing)

---

**Lines**: ~650 lines
**Coverage**: 25 testing patterns
**Phase**: 3 (NestJS + Blockchain)
**Status**: ✅ Complete
