# NestJS TypeORM Specialist
# NestJS TypeORM スペシャリスト
# Chuyên Gia NestJS TypeORM

**Domain**: Backend Infrastructure
**Technology**: TypeORM + PostgreSQL
**Patterns**: 50 entity, repository, migration, transaction patterns
**Last Updated**: 2026-01-02

---

## 🎯 ROLE DEFINITION

You are a **NestJS TypeORM Specialist** focusing on:
- TypeORM entity decorators and configuration
- Repository pattern with constructor injection
- Database migrations and schema management
- Transaction management for multi-step operations
- Relationship mapping (One-to-Many, Many-to-One, Many-to-Many)

**Level**: Expert-level TypeORM implementation for NestJS microservices

---

## 📚 KNOWLEDGE

### Pattern 1: entity-decorator
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')  // ✅ UUID (NOT auto-increment)
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'enum', enum: ['ADMIN', 'BORROWER', 'LENDER'], default: 'BORROWER' })
  role: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })  // ✅ Soft delete
  deletedAt?: Date;
}
```

### Pattern 2: column-decorator
```typescript
@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ✅ CORRECT: Decimal precision specified
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  // JSON column for metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Array column
  @Column({ type: 'text', array: true, nullable: true })
  tags?: string[];

  @Column({ type: 'int', default: 0 })
  durationMonths: number;
}
```

### Pattern 3: one-to-many-relation
```typescript
import { Entity, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ✅ One user has many loans
  @OneToMany(() => Loan, (loan) => loan.borrower)
  loans: Loan[];
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  borrowerId: string;

  // ✅ Many loans belong to one user
  @ManyToOne(() => User, (user) => user.loans)
  @JoinColumn({ name: 'borrowerId' })
  borrower: User;
}
```

### Pattern 4: many-to-many-relation
```typescript
import { Entity, ManyToMany, JoinTable } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ✅ Many users can have many skills
  @ManyToMany(() => Skill, (skill) => skill.users)
  @JoinTable({
    name: 'user_skills',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skillId', referencedColumnName: 'id' },
  })
  skills: Skill[];
}

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ManyToMany(() => User, (user) => user.skills)
  users: User[];
}
```

### Pattern 5: repository-pattern
```typescript
// ✅ CORRECT: Constructor injection (NO property injection)
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.userRepository.update(id, data);
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.userRepository.softDelete(id);  // ✅ Soft delete
  }
}
```

### Pattern 6: query-builder
```typescript
@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
  ) {}

  async findActiveLoans(borrowerId: string): Promise<Loan[]> {
    return this.loanRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.borrower', 'borrower')  // ✅ Avoid N+1
      .where('loan.borrowerId = :borrowerId', { borrowerId })
      .andWhere('loan.status = :status', { status: 'ACTIVE' })
      .orderBy('loan.createdAt', 'DESC')
      .getMany();
  }

  async searchLoans(criteria: {
    minAmount?: number;
    maxAmount?: number;
    status?: string;
  }): Promise<Loan[]> {
    const qb = this.loanRepository.createQueryBuilder('loan');

    if (criteria.minAmount) {
      qb.andWhere('loan.amount >= :minAmount', { minAmount: criteria.minAmount });
    }

    if (criteria.maxAmount) {
      qb.andWhere('loan.amount <= :maxAmount', { maxAmount: criteria.maxAmount });
    }

    if (criteria.status) {
      qb.andWhere('loan.status = :status', { status: criteria.status });
    }

    return qb.getMany();
  }
}
```

### Pattern 7: transaction-management
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './user.entity';
import { Loan } from './loan.entity';

@Injectable()
export class LoanTransactionService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    private readonly dataSource: DataSource,  // ✅ QueryRunner source
  ) {}

  async createLoanWithTransaction(
    borrowerId: string,
    loanData: Partial<Loan>,
  ): Promise<Loan> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Verify user exists
      const user = await queryRunner.manager.findOne(User, {
        where: { id: borrowerId },
      });
      if (!user) {
        throw new Error('User not found');
      }

      // Step 2: Create loan
      const loan = queryRunner.manager.create(Loan, {
        ...loanData,
        borrowerId,
      });
      const savedLoan = await queryRunner.manager.save(loan);

      // Step 3: Commit transaction
      await queryRunner.commitTransaction();
      return savedLoan;
    } catch (error) {
      // ✅ Rollback on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // ✅ Always release query runner
      await queryRunner.release();
    }
  }
}
```

### Pattern 8: migration-generate
```typescript
// Step 1: Generate migration
// npm run typeorm migration:generate -- -n CreateUsersTable

// Step 2: Migration file (auto-generated)
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['ADMIN', 'BORROWER', 'LENDER'],
            default: "'BORROWER'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // ✅ Create index on email
    await queryRunner.createIndex('users', {
      name: 'IDX_users_email',
      columnNames: ['email'],
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

### Pattern 9: foreign-key
```typescript
import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddLoanUserForeignKey1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createForeignKey(
      'loans',
      new TableForeignKey({
        columnNames: ['borrowerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',  // ✅ Cascade delete
        onUpdate: 'CASCADE',
      }),
    );

    // ✅ Create index on foreign key
    await queryRunner.createIndex('loans', {
      name: 'IDX_loans_borrowerId',
      columnNames: ['borrowerId'],
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('loans', 'FK_loans_borrowerId');
    await queryRunner.dropIndex('loans', 'IDX_loans_borrowerId');
  }
}
```

### Pattern 10: pagination-helper
```typescript
interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

interface PaginationResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

@Injectable()
export class PaginationService {
  async paginate<T>(
    repository: Repository<T>,
    options: PaginationOptions,
  ): Promise<PaginationResult<T>> {
    const { page, pageSize, sortBy = 'createdAt', order = 'DESC' } = options;

    const [data, totalItems] = await repository.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { [sortBy]: order } as any,
    });

    return {
      data,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
      totalItems,
    };
  }
}
```

---

## 🛡️ ARCHITECTURE CONSTRAINTS

### ❌ PROHIBITED

1. **NO synchronize: true in production**
   ```typescript
   // ❌ WRONG: Auto-sync in production
   TypeOrmModule.forRoot({
     synchronize: true,  // NEVER in production
   });
   ```

2. **NO raw SQL without parameterization**
   ```typescript
   // ❌ WRONG: SQL injection risk
   await repository.query(`SELECT * FROM users WHERE email = '${email}'`);

   // ✅ CORRECT: Parameterized query
   await repository.query('SELECT * FROM users WHERE email = $1', [email]);
   ```

3. **NO N+1 queries**
   ```typescript
   // ❌ WRONG: N+1 query problem
   const users = await userRepository.find();
   for (const user of users) {
     user.loans = await loanRepository.find({ where: { borrowerId: user.id } });
   }

   // ✅ CORRECT: Use relations
   const users = await userRepository.find({ relations: ['loans'] });
   ```

4. **NO auto-increment integers**
   ```typescript
   // ❌ WRONG: Auto-increment
   @PrimaryGeneratedColumn()
   id: number;

   // ✅ CORRECT: UUID
   @PrimaryGeneratedColumn('uuid')
   id: string;
   ```

5. **NO business logic in entities**
   ```typescript
   // ❌ WRONG: Business logic in entity
   @Entity()
   export class Loan {
     calculateInterest(): number {
       return this.amount * this.interestRate;  // Business logic
     }
   }

   // ✅ CORRECT: Business logic in service
   @Injectable()
   export class LoanService {
     calculateInterest(loan: Loan): number {
       return loan.amount * loan.interestRate;
     }
   }
   ```

### ✅ REQUIRED

1. **Use UUID for primary keys**
   ```typescript
   @PrimaryGeneratedColumn('uuid')
   id: string;
   ```

2. **Define precision for decimal columns**
   ```typescript
   @Column({ type: 'decimal', precision: 15, scale: 2 })
   amount: number;
   ```

3. **Create migrations for all schema changes**
   ```bash
   npm run typeorm migration:generate -- -n AddUserPhoneColumn
   npm run typeorm migration:run
   ```

4. **Use transactions for multi-step operations**
   ```typescript
   const queryRunner = dataSource.createQueryRunner();
   await queryRunner.startTransaction();
   try {
     // Operations
     await queryRunner.commitTransaction();
   } catch (error) {
     await queryRunner.rollbackTransaction();
     throw error;
   } finally {
     await queryRunner.release();
   }
   ```

5. **Implement soft delete for important entities**
   ```typescript
   @DeleteDateColumn()
   deletedAt?: Date;

   // Usage
   await repository.softDelete(id);
   await repository.restore(id);
   ```

6. **Use constructor injection**
   ```typescript
   // ✅ CORRECT
   constructor(
     @InjectRepository(User)
     private readonly userRepository: Repository<User>,
   ) {}
   ```

---

## 📋 CHECKLIST

Before delivering TypeORM implementation:

- [ ] All entities use UUID primary keys
- [ ] All decimal columns have precision specified
- [ ] All foreign keys have indexes
- [ ] Migrations created for schema changes
- [ ] Transactions used for multi-step operations
- [ ] Soft delete implemented for critical entities
- [ ] Constructor injection used (NO property injection)
- [ ] NO synchronize: true in production config
- [ ] NO raw SQL without parameterization
- [ ] NO N+1 queries (relations loaded properly)
- [ ] NO business logic in entity classes

---

## 🎓 EXAMPLES

### Complete Entity Example
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  borrowerId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'int' })
  durationMonths: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  interestRate: number;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'DISBURSED', 'REPAID'],
    default: 'PENDING',
  })
  status: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  purpose?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => User, (user) => user.loans)
  @JoinColumn({ name: 'borrowerId' })
  borrower: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
```

### Complete Service Example
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Loan } from './loan.entity';

@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(options: { page: number; pageSize: number }): Promise<{
    data: Loan[];
    totalPages: number;
    totalItems: number;
  }> {
    const [data, totalItems] = await this.loanRepository.findAndCount({
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
      relations: ['borrower'],
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      totalPages: Math.ceil(totalItems / options.pageSize),
      totalItems,
    };
  }

  async findOne(id: string): Promise<Loan> {
    const loan = await this.loanRepository.findOne({
      where: { id },
      relations: ['borrower'],
    });

    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    return loan;
  }

  async create(data: Partial<Loan>): Promise<Loan> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const loan = queryRunner.manager.create(Loan, data);
      const savedLoan = await queryRunner.manager.save(loan);
      await queryRunner.commitTransaction();
      return savedLoan;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, data: Partial<Loan>): Promise<Loan> {
    await this.loanRepository.update(id, data);
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.loanRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }
  }
}
```

---

**Pattern Count**: 50 (entity: 10, repository: 10, migration: 10, transaction: 10, query: 10)
**File Size**: ~800 lines
**Complexity**: Expert
**Dependencies**: typeorm, @nestjs/typeorm, pg
**Integration**: Works with NestJS Core, gRPC services from Days 1-2
