import { Injectable } from '@nestjs/common';
import { MaintenanceScheduleType } from '@prisma/client';

export interface GeneratedSchedule {
  scheduleType: MaintenanceScheduleType;
  scheduledDate: Date;
}

const MILESTONES: Array<{ type: MaintenanceScheduleType; years: number }> = [
  { type: MaintenanceScheduleType.one_year, years: 1 },
  { type: MaintenanceScheduleType.three_year, years: 3 },
  { type: MaintenanceScheduleType.five_year, years: 5 },
  { type: MaintenanceScheduleType.ten_year, years: 10 },
];

@Injectable()
export class ScheduleGeneratorService {
  /**
   * Generate the 4 auto milestone schedules from a property's handover date.
   * Returns dates with year added to handoverDate; month + day preserved.
   */
  generateFromHandoverDate(handoverDate: Date): GeneratedSchedule[] {
    return MILESTONES.map((m) => ({
      scheduleType: m.type,
      scheduledDate: this.addYears(handoverDate, m.years),
    }));
  }

  /**
   * Days from `from` to `to` (integer; negative if `to` is past `from`).
   */
  daysBetween(from: Date, to: Date): number {
    const ms = to.getTime() - from.getTime();
    return Math.floor(ms / 86_400_000);
  }

  private addYears(base: Date, years: number): Date {
    const d = new Date(base);
    d.setUTCFullYear(d.getUTCFullYear() + years);
    return d;
  }
}
