import { Injectable } from '@nestjs/common';
import { Folder, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { Tx } from '../../auth/internal/audit-stub.service';

@Injectable()
export class FolderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByProject(projectId: string, tx?: Tx): Promise<Folder[]> {
    const client = tx ?? this.prisma;
    return client.folder.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(input: Prisma.FolderUncheckedCreateInput, tx?: Tx): Promise<Folder> {
    const client = tx ?? this.prisma;
    return client.folder.create({ data: input });
  }
}
