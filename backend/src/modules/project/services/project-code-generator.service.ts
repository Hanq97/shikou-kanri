import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { Tx } from '../../auth/internal/audit-stub.service';

@Injectable()
export class ProjectCodeGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sequences pre-created via migration `20260516180400_add_f1_fts_and_sequences`.
   * Idempotent CREATE allows generation for future years without manual migration.
   */
  async next(year: number, tx?: Tx): Promise<string> {
    const client = tx ?? this.prisma;
    const seqName = `project_code_seq_${year}`;
    await client.$executeRawUnsafe(
      `CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`,
    );
    const result = await client.$queryRawUnsafe<{ nextval: bigint }[]>(
      `SELECT nextval('${seqName}') AS nextval`,
    );
    const num = Number(result[0].nextval);
    return `${year}-${String(num).padStart(4, '0')}`;
  }
}
