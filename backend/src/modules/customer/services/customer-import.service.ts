import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService, Tx } from '../../auth/internal/audit-stub.service';
import { CustomerTypeName } from '../domain/types';
import { CustomerRepository } from '../repositories/customer.repository';
import { normalizePhone } from '../utils/normalize-phone';

export interface ImportError {
  rowIndex: number;
  message: string;
  raw: Record<string, string>;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportError[];
}

type CsvRow = Record<string, string>;

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ['true', 'yes', 'y', '1', 'ob', 'はい'].includes(
    value.trim().toLowerCase(),
  );
}

@Injectable()
export class CustomerImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: CustomerRepository,
    private readonly audit: AuditStubService,
  ) {}

  async import(
    fileBuffer: Buffer,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<ImportResult> {
    if (requester.role !== 'system_admin') {
      throw new AuthInsufficientPermissionError();
    }

    const records = await this.parseCsv(fileBuffer);
    const errors: ImportError[] = [];
    let createdCount = 0;
    let skippedCount = 0;

    // Pre-fetch existing phones for dedup
    const existing = await this.prisma.customer.findMany({
      where: { deletedAt: null, phone: { not: null } },
      select: { phone: true },
    });
    const seenPhones = new Set<string>();
    for (const c of existing) {
      if (c.phone) seenPhones.add(c.phone);
    }

    await this.prisma.$transaction(async (txClient) => {
      const tx = txClient as Tx;
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          this.validateRow(row);
          const phone = row.phone ? normalizePhone(row.phone) : null;
          if (phone && seenPhones.has(phone)) {
            skippedCount++;
            continue;
          }
          await this.repo.create(
            {
              customerType: row.customer_type as CustomerTypeName,
              name: row.name,
              nameKana: row.name_kana || null,
              phone,
              email: row.email || null,
              address: row.address || null,
              isOb: parseBoolean(row.is_ob),
              acquiredAt: row.acquired_at ? new Date(row.acquired_at) : null,
              notes: row.notes || null,
              createdBy: { connect: { id: requester.id } },
              updatedBy: { connect: { id: requester.id } },
            },
            tx,
          );
          if (phone) seenPhones.add(phone);
          createdCount++;
        } catch (err) {
          errors.push({
            rowIndex: i + 1,
            message: err instanceof Error ? err.message : String(err),
            raw: row,
          });
        }
      }
      await this.audit.logCustomerCsvImported(
        {
          created: createdCount,
          skipped: skippedCount,
          errorCount: errors.length,
        },
        requester.id,
        ctx,
        tx,
      );
    });

    return { created: createdCount, skipped: skippedCount, errors };
  }

  private parseCsv(buffer: Buffer): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
      const records: CsvRow[] = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
      parser.on('data', (row: CsvRow) => records.push(row));
      parser.on('end', () => resolve(records));
      parser.on('error', reject);
      parser.write(buffer);
      parser.end();
    });
  }

  private validateRow(row: CsvRow): void {
    if (!row.name || row.name.length > 200) {
      throw new Error('name is required (max 200 chars)');
    }
    if (!['individual', 'corporate'].includes(row.customer_type)) {
      throw new Error('customer_type must be individual or corporate');
    }
    if (row.email && row.email.length > 255) {
      throw new Error('email too long (max 255 chars)');
    }
    if (row.address && row.address.length > 2000) {
      throw new Error('address too long (max 2000 chars)');
    }
    if (row.notes && row.notes.length > 5000) {
      throw new Error('notes too long (max 5000 chars)');
    }
    if (row.acquired_at && Number.isNaN(new Date(row.acquired_at).getTime())) {
      throw new Error('acquired_at invalid date format (use YYYY-MM-DD)');
    }
  }
}
