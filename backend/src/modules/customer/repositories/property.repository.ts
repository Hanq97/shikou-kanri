import { Injectable } from '@nestjs/common';
import { Prisma, Property } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { Tx } from '../../auth/internal/audit-stub.service';

@Injectable()
export class PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tx?: Tx): Promise<Property | null> {
    const client = tx ?? this.prisma;
    return client.property.findFirst({ where: { id, deletedAt: null } });
  }

  findByCustomer(customerId: string, tx?: Tx): Promise<Property[]> {
    const client = tx ?? this.prisma;
    return client.property.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(input: Prisma.PropertyCreateInput, tx?: Tx): Promise<Property> {
    const client = tx ?? this.prisma;
    return client.property.create({ data: input });
  }

  update(
    id: string,
    data: Prisma.PropertyUpdateInput,
    tx?: Tx,
  ): Promise<Property> {
    const client = tx ?? this.prisma;
    return client.property.update({ where: { id }, data });
  }

  softDelete(id: string, actorId: string, tx?: Tx): Promise<Property> {
    const client = tx ?? this.prisma;
    return client.property.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId },
    });
  }
}
