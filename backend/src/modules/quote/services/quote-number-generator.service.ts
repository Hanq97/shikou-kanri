import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { Tx } from '../../auth/internal/audit-stub.service';

@Injectable()
export class QuoteNumberGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns next quote_number in `Q-YYYY-NNNNN` format, race-safe via DB sequence.
   * Sequences for 2026/2027 pre-created via migration.
   * Future years auto-create on first call.
   */
  async next(year: number, tx?: Tx): Promise<string> {
    const client = tx ?? this.prisma;
    const seqName = `quote_number_seq_${year}`;
    await client.$executeRawUnsafe(
      `CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`,
    );
    const result = await client.$queryRawUnsafe<{ nextval: bigint }[]>(
      `SELECT nextval('${seqName}') AS nextval`,
    );
    const num = Number(result[0].nextval);
    return `Q-${year}-${String(num).padStart(5, '0')}`;
  }
}
