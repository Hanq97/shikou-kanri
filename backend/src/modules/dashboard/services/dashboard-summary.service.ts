import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type {
  AftercareDueAlert,
  DashboardSummary,
  PendingApproval,
  RecentActivity,
} from '../domain/types';

const REMINDER_WINDOW_DAYS = 14;

@Injectable()
export class DashboardSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<DashboardSummary> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const limit = new Date(today.getTime() + REMINDER_WINDOW_DAYS * 86_400_000);

    const [
      activeCustomers,
      activeProjects,
      pendingQuotes,
      overdueAftercare,
      aftercareDue,
      pendingApprovalsRaw,
      recentProjects,
      recentQuotes,
      recentAftercareRecords,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.project.count({
        where: {
          deletedAt: null,
          status: { in: ['received', 'construction', 'completed'] },
        },
      }),
      this.prisma.quote.count({
        where: {
          deletedAt: null,
          status: { in: ['submitted', 'pending_admin'] },
        },
      }),
      this.prisma.maintenanceSchedule.count({
        where: { deletedAt: null, status: 'overdue' },
      }),
      this.prisma.maintenanceSchedule.findMany({
        where: {
          deletedAt: null,
          status: { in: ['pending', 'notified'] },
          scheduledDate: { gte: today, lte: limit },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 10,
        include: {
          property: {
            include: {
              customer: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.quote.findMany({
        where: {
          deletedAt: null,
          status: { in: ['submitted', 'pending_admin'] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          project: {
            include: { customer: { select: { name: true } } },
          },
        },
      }),
      this.prisma.project.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          projectCode: true,
          createdAt: true,
        },
      }),
      this.prisma.quote.findMany({
        where: {
          deletedAt: null,
          status: { in: ['approved', 'won'] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          quoteNumber: true,
          amountTotal: true,
          updatedAt: true,
          status: true,
        },
      }),
      this.prisma.aftercareRecord.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
    ]);

    const todayMs = today.getTime();
    const aftercareDue14d: AftercareDueAlert[] = aftercareDue.map((s) => ({
      scheduleId: s.id,
      customerId: s.property.customer.id,
      customerName: s.property.customer.name,
      propertyAddress: s.property.address,
      scheduledDate: s.scheduledDate.toISOString().slice(0, 10),
      scheduleType: s.scheduleType,
      daysUntil: Math.floor((s.scheduledDate.getTime() - todayMs) / 86_400_000),
    }));

    const pendingApprovals: PendingApproval[] = pendingApprovalsRaw.map(
      (q) => ({
        quoteId: q.id,
        quoteNumber: q.quoteNumber,
        projectName: q.project?.name ?? null,
        customerName: q.project?.customer?.name ?? null,
        amountTotal: q.amountTotal.toString(),
        submittedAt: q.updatedAt.toISOString(),
      }),
    );

    const recentActivity: RecentActivity[] = [
      ...recentProjects.map<RecentActivity>((p) => ({
        kind: 'project_created',
        timestamp: p.createdAt.toISOString(),
        summary: `案件「${p.name}」(${p.projectCode}) 作成`,
        link: `/projects/${p.id}`,
      })),
      ...recentQuotes.map<RecentActivity>((q) => ({
        kind: q.status === 'won' ? 'quote_won' : 'quote_approved',
        timestamp: q.updatedAt.toISOString(),
        summary:
          q.status === 'won'
            ? `見積 ${q.quoteNumber} 受注 (¥${Number(q.amountTotal).toLocaleString('ja-JP')})`
            : `見積 ${q.quoteNumber} 承認`,
        link: `/estimates/${q.id}`,
      })),
      ...recentAftercareRecords.map<RecentActivity>((r) => ({
        kind: 'aftercare_record',
        timestamp: r.createdAt.toISOString(),
        summary: `アフター履歴: ${r.customer.name}「${r.title}」`,
        link: `/customers/${r.customer.id}`,
      })),
    ]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 10);

    return {
      counts: {
        activeCustomers,
        activeProjects,
        pendingQuotes,
        overdueAftercare,
      },
      alerts: {
        aftercareDue14d,
        pendingApprovals,
      },
      recentActivity,
    };
  }
}
