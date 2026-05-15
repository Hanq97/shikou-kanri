import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

export type Tx = Prisma.TransactionClient | PrismaService;

export interface CreateUserInput {
  email: string;
  name: string;
  nameKana?: string | null;
  role: UserRole;
  status?: UserStatus;
  passwordHash?: string | null;
  forcePasswordChange?: boolean;
  forceTwoFaEnrollment?: boolean;
  createdById?: string | null;
}

export interface ListUsersFilter {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  page: number;
  pageSize: number;
  includeDeleted?: boolean;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // === Read ===

  findById(id: string, tx?: Tx, includeDeleted = false): Promise<User | null> {
    const client = tx ?? this.prisma;
    return client.user.findFirst({
      where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
    });
  }

  findByEmail(email: string, tx?: Tx, includeDeleted = false): Promise<User | null> {
    const client = tx ?? this.prisma;
    return client.user.findFirst({
      where: { email: email.toLowerCase(), ...(includeDeleted ? {} : { deletedAt: null }) },
    });
  }

  async list(filter: ListUsersFilter): Promise<{ data: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...(filter.includeDeleted ? {} : { deletedAt: null }),
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { email: { contains: filter.search, mode: 'insensitive' } },
              { name: { contains: filter.search, mode: 'insensitive' } },
              { nameKana: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';
    const skip = (filter.page - 1) * filter.pageSize;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: filter.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  countByRole(role: UserRole, activeOnly = true, tx?: Tx): Promise<number> {
    const client = tx ?? this.prisma;
    return client.user.count({
      where: {
        role,
        deletedAt: null,
        ...(activeOnly ? { status: 'active' } : {}),
      },
    });
  }

  // === Write ===

  create(input: CreateUserInput, tx?: Tx): Promise<User> {
    const client = tx ?? this.prisma;
    return client.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        nameKana: input.nameKana ?? null,
        role: input.role,
        status: input.status ?? 'active',
        passwordHash: input.passwordHash ?? null,
        forcePasswordChange: input.forcePasswordChange ?? false,
        forceTwoFaEnrollment: input.forceTwoFaEnrollment ?? false,
        createdById: input.createdById ?? null,
        updatedById: input.createdById ?? null,
      },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput, tx?: Tx): Promise<User> {
    const client = tx ?? this.prisma;
    return client.user.update({ where: { id }, data });
  }

  softDelete(id: string, actorId: string, tx?: Tx): Promise<User> {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: actorId,
        status: 'disabled',
      },
    });
  }

  setLastLoginAt(id: string, timestamp: Date, tx?: Tx): Promise<User> {
    const client = tx ?? this.prisma;
    return client.user.update({ where: { id }, data: { lastLoginAt: timestamp } });
  }
}
