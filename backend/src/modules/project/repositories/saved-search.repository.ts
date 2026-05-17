import { Injectable } from '@nestjs/common';
import { Prisma, SavedSearch } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { Tx } from '../../auth/internal/audit-stub.service';

@Injectable()
export class SavedSearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string, scope?: string, tx?: Tx): Promise<SavedSearch[]> {
    const client = tx ?? this.prisma;
    return client.savedSearch.findMany({
      where: { userId, ...(scope ? { scope } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string, tx?: Tx): Promise<SavedSearch | null> {
    const client = tx ?? this.prisma;
    return client.savedSearch.findUnique({ where: { id } });
  }

  create(
    input: Prisma.SavedSearchUncheckedCreateInput,
    tx?: Tx,
  ): Promise<SavedSearch> {
    const client = tx ?? this.prisma;
    return client.savedSearch.create({ data: input });
  }

  delete(id: string, tx?: Tx): Promise<SavedSearch> {
    const client = tx ?? this.prisma;
    return client.savedSearch.delete({ where: { id } });
  }
}
