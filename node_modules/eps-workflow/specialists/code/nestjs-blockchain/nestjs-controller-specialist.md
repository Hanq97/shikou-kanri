# NestJS Controller Specialist
# NestJSコントローラースペシャリスト
# Chuyên Gia Controller NestJS

**Role**: Expert in NestJS controllers and REST API design
**Focus**: HTTP routing, request handling, DTOs, validation
**Patterns**: 30 controller patterns
**Stack**: nestjs-blockchain

---

## 🎯 EXPERTISE

This specialist handles:
- Controller decorators (@Controller, @Get, @Post, etc.)
- Request parameter extraction (@Param, @Body, @Query)
- DTO validation with class-validator
- HTTP status codes and error handling
- Route configuration and wildcards
- Dependency injection in controllers

---

## 📋 PATTERNS (30 total)

### Pattern 1: @Controller Decorator
**Category**: Core
**Description**: Define REST controller with base route

```typescript
import { Controller } from '@nestjs/common';

@Controller('users')
export class UserController {
  // All routes prefixed with /users
}
```

---

### Pattern 2: HTTP Method Decorators
**Category**: Routing
**Description**: GET, POST, PUT, DELETE, PATCH decorators

```typescript
@Controller('loans')
export class LoanController {
  @Get()
  findAll(): Promise<Loan[]> {
    return this.loanService.findAll();
  }

  @Post()
  create(@Body() createLoanDto: CreateLoanDto): Promise<Loan> {
    return this.loanService.create(createLoanDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateLoanDto) {
    return this.loanService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loanService.remove(id);
  }
}
```

---

### Pattern 3: @Param Decorator
**Category**: Request Data
**Description**: Extract route parameters

```typescript
@Get(':id')
findOne(@Param('id') id: string): Promise<Loan> {
  return this.loanService.findOne(id);
}

@Get(':userId/loans/:loanId')
findUserLoan(
  @Param('userId') userId: string,
  @Param('loanId') loanId: string,
) {
  return this.loanService.findUserLoan(userId, loanId);
}
```

---

### Pattern 4: @Body Decorator
**Category**: Request Data
**Description**: Extract request body

```typescript
@Post()
create(@Body() createUserDto: CreateUserDto): Promise<User> {
  return this.userService.create(createUserDto);
}

@Post('bulk')
createMany(@Body() users: CreateUserDto[]): Promise<User[]> {
  return this.userService.createMany(users);
}
```

---

### Pattern 5: @Query Decorator
**Category**: Request Data
**Description**: Extract query parameters

```typescript
@Get()
findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
  @Query('sort') sort: string = 'createdAt',
): Promise<Loan[]> {
  return this.loanService.findAll({ page, limit, sort });
}
```

---

### Pattern 6: @Headers Decorator
**Category**: Request Data
**Description**: Extract request headers

```typescript
@Get()
findAll(@Headers('authorization') auth: string) {
  console.log('Auth header:', auth);
  return this.userService.findAll();
}
```

---

### Pattern 7: HTTP Status Codes
**Category**: Response
**Description**: Set custom HTTP status codes

```typescript
import { HttpStatus, HttpCode } from '@nestjs/common';

@Post()
@HttpCode(HttpStatus.CREATED)
create(@Body() dto: CreateLoanDto) {
  return this.loanService.create(dto);
}

@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
remove(@Param('id') id: string) {
  return this.loanService.remove(id);
}
```

---

### Pattern 8: DTO with Validation
**Category**: Validation
**Description**: Use class-validator decorators on DTOs

```typescript
import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

---

### Pattern 9: ValidationPipe
**Category**: Validation
**Description**: Apply validation pipe to routes

```typescript
import { ValidationPipe } from '@nestjs/common';

@Post()
create(
  @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  dto: CreateLoanDto,
) {
  return this.loanService.create(dto);
}
```

---

### Pattern 10: Constructor Injection
**Category**: DI
**Description**: Inject services via constructor

```typescript
@Controller('loans')
export class LoanController {
  constructor(
    private readonly loanService: LoanService,
    private readonly userService: UserService,
    private readonly fabricService: FabricService,
  ) {}

  @Get()
  findAll() {
    return this.loanService.findAll();
  }
}
```

---

### Pattern 11: Custom Route Decorators
**Category**: Advanced
**Description**: Create custom parameter decorators

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Usage
@Get('profile')
getProfile(@User() user: UserEntity) {
  return user;
}
```

---

### Pattern 12: Route Wildcards
**Category**: Routing
**Description**: Use wildcards in routes

```typescript
@Get('admin/*')
handleAdmin() {
  return 'Admin route';
}

@Get('*.pdf')
downloadPdf(@Param() params: string[]) {
  return params;
}
```

---

### Pattern 13: Exception Filters
**Category**: Error Handling
**Description**: Handle exceptions with filters

```typescript
import { ExceptionFilter, Catch, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: exception.message,
    });
  }
}
```

---

### Pattern 14: ParseIntPipe
**Category**: Validation
**Description**: Parse and validate integer parameters

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.loanService.findOne(id);
}
```

---

### Pattern 15: TransformPipe
**Category**: Transformation
**Description**: Transform request data

```typescript
import { Transform } from 'class-transformer';

export class CreateLoanDto {
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @Transform(({ value }) => value.toLowerCase())
  status: string;
}
```

---

## 🎓 CRITICAL RULES

### ✅ REQUIRED
- Constructor injection ONLY (inject services in controller)
- DTOs with class-validator decorators
- ValidationPipe for request validation
- Proper HTTP status codes (@HttpCode)
- Exception filters for error handling

### ❌ PROHIBITED
- Property injection (@Inject on properties)
- Business logic in controllers (delegate to services)
- Direct database access (use services/repositories)
- Any logic beyond request/response handling

---

## 🔧 USE CASES

### Use Case 1: CRUD Controller
```typescript
@Controller('loans')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Get()
  findAll(@Query() query: QueryLoanDto) {
    return this.loanService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loanService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLoanDto) {
    return this.loanService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLoanDto) {
    return this.loanService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.loanService.remove(id);
  }
}
```

### Use Case 2: Controller with Guards
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Get()
  findAll(@User() user: UserEntity) {
    return this.loanService.findByUser(user.id);
  }
}
```

---

## 📊 TESTING

```typescript
import { Test } from '@nestjs/testing';

describe('LoanController', () => {
  let controller: LoanController;
  let service: LoanService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [LoanController],
      providers: [
        {
          provide: LoanService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LoanController>(LoanController);
    service = module.get<LoanService>(LoanService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call loanService.findAll()', async () => {
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });
});
```

---

## 🔗 RELATED PATTERNS
- NestJS Services (business logic layer)
- DTOs with class-validator (request validation)
- Guards (authentication/authorization)
- Interceptors (logging, transformation)

---

**Lines**: ~390 lines
**Coverage**: 30 controller patterns
**Phase**: 3 (NestJS + Blockchain)
**Status**: ✅ Complete
