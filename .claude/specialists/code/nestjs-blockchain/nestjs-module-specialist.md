# NestJS Module Specialist
# NestJSモジュールスペシャリスト
# Chuyên Gia Module NestJS

**Role**: Expert in NestJS module architecture and organization
**Focus**: Module patterns, dependency injection, dynamic modules
**Patterns**: 30 module patterns
**Stack**: nestjs-blockchain

---

## 🎯 EXPERTISE

This specialist handles:
- Module decorator configuration (@Module)
- Dynamic modules (forRoot, forRootAsync)
- Module organization (feature, core, shared)
- Dependency injection at module level
- Circular dependency resolution
- Module exports and re-exports

---

## 📋 PATTERNS (30 total)

### Pattern 1: @Module Decorator
**Category**: Core
**Description**: Basic module declaration with metadata

```typescript
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class UserModule {}
```

---

### Pattern 2: forRoot Pattern
**Category**: Dynamic Module
**Description**: Configure module globally with options

```typescript
import { Module, DynamicModule } from '@nestjs/common';

@Module({})
export class ConfigModule {
  static forRoot(options: ConfigOptions): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options,
        },
        ConfigService,
      ],
      exports: [ConfigService],
      global: options.isGlobal || false,
    };
  }
}
```

---

### Pattern 3: forRootAsync Pattern
**Category**: Dynamic Module
**Description**: Configure module asynchronously with factory

```typescript
@Module({})
export class DatabaseModule {
  static forRootAsync(options: DatabaseAsyncOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}
```

---

### Pattern 4: Feature Module
**Category**: Architecture
**Description**: Domain-specific module for business logic

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Loan])],
  controllers: [LoanController],
  providers: [LoanService],
  exports: [LoanService],
})
export class LoanModule {}
```

---

### Pattern 5: Core Module
**Category**: Architecture
**Description**: Singleton module for app-wide services

```typescript
import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [LoggerService, ConfigService],
  exports: [LoggerService, ConfigService],
})
export class CoreModule {}
```

---

### Pattern 6: Shared Module
**Category**: Architecture
**Description**: Reusable utilities across modules

```typescript
@Module({
  imports: [CommonModule],
  providers: [DateService, CryptoService],
  exports: [DateService, CryptoService, CommonModule],
})
export class SharedModule {}
```

---

### Pattern 7: Module Imports
**Category**: Dependency
**Description**: Import other modules to access their exports

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    LoggerModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

---

### Pattern 8: Module Exports
**Category**: Dependency
**Description**: Export providers to make them available to other modules

```typescript
@Module({
  providers: [UserService, UserRepository],
  exports: [UserService], // UserRepository NOT exported (internal)
})
export class UserModule {}
```

---

### Pattern 9: Global Module
**Category**: Scope
**Description**: Make module available globally without explicit import

```typescript
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
```

---

### Pattern 10: Constructor Injection (Module-level)
**Category**: DI
**Description**: Inject services in module constructor for initialization

```typescript
@Module({
  imports: [ConfigModule],
  providers: [DatabaseService],
})
export class DatabaseModule {
  constructor(private readonly configService: ConfigService) {
    // Module initialization logic
    console.log('Database URL:', this.configService.get('DATABASE_URL'));
  }
}
```

---

### Pattern 11: Circular Dependency Resolution
**Category**: Advanced
**Description**: Use forwardRef to resolve circular dependencies

```typescript
import { Module, forwardRef } from '@nestjs/common';

@Module({
  imports: [forwardRef(() => LoanModule)],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

@Module({
  imports: [forwardRef(() => UserModule)],
  providers: [LoanService],
  exports: [LoanService],
})
export class LoanModule {}
```

---

### Pattern 12: Module Re-export
**Category**: Organization
**Description**: Re-export imported modules for convenience

```typescript
@Module({
  imports: [UserModule, LoanModule, NotificationModule],
  exports: [UserModule, LoanModule, NotificationModule],
})
export class ApiModule {}
```

---

### Pattern 13: Barrel Export Pattern
**Category**: Organization
**Description**: Centralize module exports in index.ts

```typescript
// modules/index.ts
export { UserModule } from './user/user.module';
export { LoanModule } from './loan/loan.module';
export { AuthModule } from './auth/auth.module';

// app.module.ts
import { UserModule, LoanModule, AuthModule } from './modules';
```

---

### Pattern 14: Database Module Pattern
**Category**: Infrastructure
**Description**: TypeORM integration module

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
    }),
  ],
})
export class DatabaseModule {}
```

---

### Pattern 15: Config Module Pattern
**Category**: Infrastructure
**Description**: Configuration management module

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().required(),
        PORT: Joi.number().required(),
      }),
    }),
  ],
})
export class ConfigModule {}
```

---

## 🎓 CRITICAL RULES

### ✅ REQUIRED
- Constructor injection ONLY (no property injection)
- Module-based architecture (feature + core + shared)
- Single responsibility per module
- Export only public providers

### ❌ PROHIBITED
- Property-based injection (@Inject decorator on properties)
- Circular module dependencies without forwardRef
- Global state in module constructors
- Mixed responsibilities in single module

---

### Use Case 1: Create Feature Module
```typescript
// loan/loan.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Loan, LoanApplication]),
    UserModule,
  ],
  controllers: [LoanController],
  providers: [LoanService, LoanRepository],
  exports: [LoanService],
})
export class LoanModule {}
```

### Use Case 2: Auth Module with Constructor
```typescript
@Module({
  imports: [ConfigModule, UserModule],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {
  constructor(private readonly configService: ConfigService) {
    console.log('JWT Secret:', this.configService.get('JWT_SECRET'));
  }
}
```

## 📊 TESTING

```typescript
import { Test } from '@nestjs/testing';
describe('UserModule', () => {
  it('should compile', async () => {
    const module = await Test.createTestingModule({
      imports: [UserModule],
    }).compile();
    expect(module).toBeDefined();
  });
});
```

---

## 🔗 RELATED PATTERNS
- Controllers & Services (service providers in modules)
- TypeORM Integration (forFeature for entity repositories)
- gRPC Integration (grpc-module-pattern)
- RabbitMQ Integration (rabbitmq-module-pattern)

---

**Lines**: ~250 lines
**Coverage**: 30 module patterns
**Phase**: 3 (NestJS + Blockchain)
**Status**: ✅ Complete
