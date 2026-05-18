import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  MaintenanceScheduleStatus,
  MaintenanceScheduleType,
} from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EmailService } from '../../notification/email.service';

const SCHEDULE_TYPE_LABEL: Record<MaintenanceScheduleType, string> = {
  one_year: '1年',
  three_year: '3年',
  five_year: '5年',
  ten_year: '10年',
  custom: '臨時',
};

const REMINDER_WINDOW_DAYS = 14;

export interface BatchRunResult {
  notifiedCount: number;
  emailsSent: number;
  overdueMarkedCount: number;
  ranAt: string;
}

@Injectable()
export class AftercareBatchService {
  private readonly logger = new Logger(AftercareBatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Daily batch — runs every day at 8:00 JST (23:00 UTC previous day).
   * Marks overdue + sends reminder emails for schedules within {REMINDER_WINDOW_DAYS} days.
   */
  @Cron('0 23 * * *', { name: 'aftercare-daily', timeZone: 'UTC' })
  async cronRun(): Promise<void> {
    this.logger.log('Aftercare daily batch starting (cron)');
    const result = await this.run();
    this.logger.log(
      `Aftercare batch done — notified=${result.notifiedCount} emails=${result.emailsSent} markedOverdue=${result.overdueMarkedCount}`,
    );
  }

  /**
   * Run the batch immediately (manual trigger from CLI or admin endpoint).
   */
  async run(): Promise<BatchRunResult> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const reminderLimit = new Date(
      today.getTime() + REMINDER_WINDOW_DAYS * 86_400_000,
    );

    // 1. Mark past pending/notified as overdue
    const overdueRes = await this.prisma.maintenanceSchedule.updateMany({
      where: {
        deletedAt: null,
        status: { in: ['pending', 'notified'] },
        scheduledDate: { lt: today },
      },
      data: { status: MaintenanceScheduleStatus.overdue },
    });

    // 2. Find schedules in 14-day window still pending → notify
    const due = await this.prisma.maintenanceSchedule.findMany({
      where: {
        deletedAt: null,
        status: MaintenanceScheduleStatus.pending,
        scheduledDate: { gte: today, lte: reminderLimit },
      },
      include: {
        property: {
          include: {
            customer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    let emailsSent = 0;
    for (const sched of due) {
      const customerEmail = sched.property.customer.email;
      if (customerEmail) {
        const handoverDate = sched.property.handoverDate;
        const daysUntil = Math.floor(
          (sched.scheduledDate.getTime() - today.getTime()) / 86_400_000,
        );
        await this.email.send({
          to: customerEmail,
          subject: `【${SCHEDULE_TYPE_LABEL[sched.scheduleType]}点検のお知らせ】${sched.property.customer.name}様 - ${sched.property.address}`,
          template: 'maintenance-reminder',
          vars: {
            customerName: sched.property.customer.name,
            propertyAddress: sched.property.address,
            handoverDate: handoverDate
              ? handoverDate.toISOString().slice(0, 10)
              : '不明',
            scheduledDate: sched.scheduledDate.toISOString().slice(0, 10),
            daysUntil,
            typeLabel: SCHEDULE_TYPE_LABEL[sched.scheduleType],
          },
        });
        emailsSent++;
      }

      await this.prisma.maintenanceSchedule.update({
        where: { id: sched.id },
        data: {
          status: MaintenanceScheduleStatus.notified,
          notifiedAt: new Date(),
        },
      });
    }

    return {
      notifiedCount: due.length,
      emailsSent,
      overdueMarkedCount: overdueRes.count,
      ranAt: new Date().toISOString(),
    };
  }
}
