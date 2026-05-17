import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { Response } from 'express';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService } from '../../auth/internal/audit-stub.service';
import { ListProjectsFilter } from '../domain/types';
import { ProjectRepository } from '../repositories/project.repository';

const PAGE_SIZE = 500;

@Injectable()
export class ProjectExportService {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly audit: AuditStubService,
  ) {}

  async exportCsv(
    filter: Omit<ListProjectsFilter, 'page' | 'pageSize'>,
    requester: AuthenticatedUser,
    ctx: RequestContext,
    res: Response,
  ): Promise<void> {
    if (!['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="projects_${Date.now()}.csv"`,
    );
    res.write('﻿'); // BOM for Excel UTF-8

    const stringifier = stringify({
      header: true,
      columns: [
        'project_code',
        'name',
        'customer_name',
        'property_address',
        'status',
        'project_type',
        'owner_name',
        'schedule_start',
        'schedule_end',
        'actual_start',
        'actual_end',
        'amount_total',
        'created_at',
      ],
    });
    stringifier.pipe(res);

    let totalRows = 0;
    let page = 1;
    while (true) {
      const result = await this.repo.list(
        { ...filter, page, pageSize: PAGE_SIZE },
        requester,
      );
      if (result.data.length === 0) break;
      for (const p of result.data) {
        stringifier.write({
          project_code: p.projectCode,
          name: p.name,
          customer_name: p.customer.name,
          property_address: p.property?.address ?? '',
          status: p.status,
          project_type: p.projectType,
          owner_name: p.owner.name,
          schedule_start: p.scheduleStart
            ? p.scheduleStart.toISOString().split('T')[0]
            : '',
          schedule_end: p.scheduleEnd
            ? p.scheduleEnd.toISOString().split('T')[0]
            : '',
          actual_start: p.actualStart
            ? p.actualStart.toISOString().split('T')[0]
            : '',
          actual_end: p.actualEnd
            ? p.actualEnd.toISOString().split('T')[0]
            : '',
          amount_total: p.amountTotal !== null ? p.amountTotal.toString() : '',
          created_at: p.createdAt.toISOString(),
        });
        totalRows++;
      }
      if (result.data.length < PAGE_SIZE) break;
      page++;
    }
    stringifier.end();

    await this.audit.logProjectCsvExported(
      {
        rowCount: totalRows,
        filter: filter as Record<string, unknown>,
      },
      requester.id,
      ctx,
    );
  }
}
