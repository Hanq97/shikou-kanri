# NestJS Middleware & Guards Specialist
# NestJSミドルウェア・ガードスペシャリスト
# Chuyên Gia Middleware & Guards NestJS

**Role**: Expert in NestJS middleware, guards, and interceptors
**Focus**: Request pipeline, authentication, authorization
**Patterns**: 20 middleware & guards patterns
**Stack**: nestjs-blockchain

---

## 🎯 EXPERTISE

This specialist handles:
- Middleware (class-based and functional)
- Guards (authentication and authorization)
- Interceptors (logging, transformation, caching)
- Execution context and reflector
- Custom decorators with metadata
- Request pipeline order

---

## 📋 PATTERNS (20 total)

### Pattern 1: Middleware Interface
**Category**: Core
**Description**: Class-based middleware with NestMiddleware interface

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  }
}
```

---

### Pattern 2: Functional Middleware
**Category**: Core
**Description**: Simple function-based middleware

```typescript
import { Request, Response, NextFunction } from 'express';

export function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
}
```

---

### Pattern 3: Apply Middleware
**Category**: Configuration
**Description**: Configure middleware in module

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

@Module({
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(UserController);
  }
}
```

---

### Pattern 4: Middleware Consumer
**Category**: Configuration
**Description**: Advanced middleware routing with MiddlewareConsumer

```typescript
import { MiddlewareConsumer, RequestMethod } from '@nestjs/common';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware, AuthMiddleware)
      .forRoutes(
        { path: 'users', method: RequestMethod.GET },
        { path: 'users/:id', method: RequestMethod.GET },
      );
  }
}
```

---

### Pattern 5: Global Middleware
**Category**: Scope
**Description**: Apply middleware globally to all routes

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(logger); // Functional middleware

  await app.listen(3000);
}
bootstrap();
```

---

### Pattern 6: Route Middleware
**Category**: Scope
**Description**: Apply middleware to specific routes

```typescript
@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('loans', 'users'); // Apply to specific routes
  }
}
```

---

### Pattern 7: Exclude Routes
**Category**: Configuration
**Description**: Exclude specific routes from middleware

```typescript
@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
      )
      .forRoutes('*'); // Apply to all other routes
  }
}
```

---

### Pattern 8: Guard Interface
**Category**: Core
**Description**: Basic guard implementation

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  private validateRequest(request: any): boolean {
    // Validate JWT token
    return request.headers.authorization !== undefined;
  }
}
```

---

### Pattern 9: Auth Guard Pattern
**Category**: Authentication
**Description**: JWT authentication guard

```typescript
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
```

---

### Pattern 10: Role Guard Pattern
**Category**: Authorization
**Description**: Role-based access control guard

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

---

### Pattern 11: JWT Guard
**Category**: Authentication
**Description**: Passport JWT strategy guard

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email, roles: payload.roles };
  }
}
```

---

### Pattern 12: Local Guard
**Category**: Authentication
**Description**: Local authentication strategy (username/password)

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
```

---

### Pattern 13: Custom Guard
**Category**: Advanced
**Description**: Custom business logic guard

```typescript
@Injectable()
export class LoanOwnerGuard implements CanActivate {
  constructor(private readonly loanService: LoanService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const loanId = request.params.id;

    const loan = await this.loanService.findOne(loanId);
    return loan.userId === user.userId;
  }
}
```

---

### Pattern 14: Execution Context
**Category**: Core
**Description**: Access request/response via ExecutionContext

```typescript
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const apiKey = request.headers['x-api-key'];

    if (!apiKey || apiKey !== process.env.API_KEY) {
      response.status(401).json({ message: 'Invalid API key' });
      return false;
    }

    return true;
  }
}
```

---

### Pattern 15: Reflector Metadata
**Category**: Metadata
**Description**: Use Reflector to access custom metadata

```typescript
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Usage in controller
@Controller('admin')
export class AdminController {
  @Get('users')
  @Roles('admin', 'superadmin')
  getUsers() {
    return this.userService.findAll();
  }
}

// Usage in guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return roles.some(role => user.roles.includes(role));
  }
}
```

---

### Pattern 16: Set Metadata Decorator
**Category**: Metadata
**Description**: Create custom decorators with metadata

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Usage
@Controller('auth')
export class AuthController {
  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}

// Guard checks metadata
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

---

### Pattern 17: Guards Order
**Category**: Configuration
**Description**: Multiple guards execution order

```typescript
@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard) // Executes in order: JWT first, then Roles
export class LoanController {
  @Get()
  @Roles('user', 'admin')
  findAll() {
    return this.loanService.findAll();
  }
}
```

---

### Pattern 18: Global Guards
**Category**: Scope
**Description**: Apply guards globally

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));

  await app.listen(3000);
}

// Or in app.module.ts
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

---

### Pattern 19: Controller Guards
**Category**: Scope
**Description**: Apply guards at controller level

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles('admin')
  getUsers() {
    return this.userService.findAll();
  }

  @Get('settings')
  @Roles('superadmin')
  getSettings() {
    return this.settingsService.findAll();
  }
}
```

---

### Pattern 20: Route Guards
**Category**: Scope
**Description**: Apply guards at route level

```typescript
@Controller('loans')
export class LoanController {
  @Get()
  @UseGuards(JwtAuthGuard) // Only this route is protected
  findAll() {
    return this.loanService.findAll();
  }

  @Get('public')
  // No guard - public route
  findPublicLoans() {
    return this.loanService.findPublicLoans();
  }
}
```

---

## 🎓 CRITICAL RULES

### ✅ REQUIRED
- Use guards for authentication/authorization (NOT middleware)
- Use middleware for request logging, parsing, CORS
- Guards execute AFTER middleware
- Use Reflector for accessing custom metadata
- Apply guards in order: Global → Controller → Route

### ❌ PROHIBITED
- Authentication in middleware (use guards instead)
- Business logic in middleware (use services)
- Modifying request body in guards (use interceptors)
- Circular dependencies in guards/middleware

---

## 🔧 USE CASES

### Use Case 1: Complete Auth Pipeline

```typescript
// 1. Custom decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Public = () => SetMetadata('isPublic', true);

// 2. JWT Guard
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get('isPublic', context.getHandler());
    if (isPublic) return true;

    return super.canActivate(context);
  }
}

// 3. Roles Guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// 4. Controller usage
@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoanController {
  @Get()
  @Roles('user', 'admin')
  findAll() {
    return this.loanService.findAll();
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateLoanDto) {
    return this.loanService.create(dto);
  }
}

// 5. Public route
@Controller('auth')
export class AuthController {
  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

---

### Use Case 2: Logging Middleware

```typescript
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const duration = Date.now() - startTime;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip} - ${duration}ms`,
      );
    });

    next();
  }
}

// Apply in module
@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
  }
}
```

---

## 📊 TESTING

```typescript
import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
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

  it('should allow access if no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockExecutionContext({ user: { roles: ['user'] } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMockExecutionContext({ user: { roles: ['admin'] } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMockExecutionContext({ user: { roles: ['user'] } });
    expect(guard.canActivate(context)).toBe(false);
  });
});

function createMockExecutionContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as any;
}
```

---

## 🔗 RELATED PATTERNS

- NestJS Controllers (guard and middleware application)
- NestJS Services (business logic called from guards)
- Exception Filters (error handling after guards)
- Interceptors (request/response transformation)

---

**Lines**: ~550 lines
**Coverage**: 20 middleware & guards patterns
**Phase**: 3 (NestJS + Blockchain)
**Status**: ✅ Complete
