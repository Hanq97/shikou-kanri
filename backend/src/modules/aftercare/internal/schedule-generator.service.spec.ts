import { ScheduleGeneratorService } from './schedule-generator.service';

describe('ScheduleGeneratorService', () => {
  const service = new ScheduleGeneratorService();

  describe('generateFromHandoverDate', () => {
    it('returns 4 milestones: 1y/3y/5y/10y after handover', () => {
      const handover = new Date('2020-04-15T00:00:00Z');
      const result = service.generateFromHandoverDate(handover);

      expect(result).toHaveLength(4);
      expect(result[0].scheduleType).toBe('one_year');
      expect(result[0].scheduledDate.toISOString().slice(0, 10)).toBe(
        '2021-04-15',
      );
      expect(result[1].scheduleType).toBe('three_year');
      expect(result[1].scheduledDate.toISOString().slice(0, 10)).toBe(
        '2023-04-15',
      );
      expect(result[2].scheduleType).toBe('five_year');
      expect(result[2].scheduledDate.toISOString().slice(0, 10)).toBe(
        '2025-04-15',
      );
      expect(result[3].scheduleType).toBe('ten_year');
      expect(result[3].scheduledDate.toISOString().slice(0, 10)).toBe(
        '2030-04-15',
      );
    });

    it('handles leap day handover (Feb 29) — JS Date rolls to Mar 1', () => {
      const handover = new Date('2020-02-29T00:00:00Z');
      const result = service.generateFromHandoverDate(handover);
      expect(result[0].scheduledDate.toISOString().slice(0, 10)).toBe(
        '2021-03-01',
      );
    });

    it('preserves handover hour/min in scheduled date (UTC)', () => {
      const handover = new Date('2023-08-15T09:00:00Z');
      const result = service.generateFromHandoverDate(handover);
      expect(result[0].scheduledDate.toISOString()).toBe(
        '2024-08-15T09:00:00.000Z',
      );
    });

    it('does not mutate input handover date', () => {
      const handover = new Date('2020-04-15T00:00:00Z');
      const original = handover.getTime();
      service.generateFromHandoverDate(handover);
      expect(handover.getTime()).toBe(original);
    });
  });

  describe('daysBetween', () => {
    it('returns positive days for future target', () => {
      const from = new Date('2026-05-19T00:00:00Z');
      const to = new Date('2026-05-25T00:00:00Z');
      expect(service.daysBetween(from, to)).toBe(6);
    });

    it('returns negative days for past target', () => {
      const from = new Date('2026-05-19T00:00:00Z');
      const to = new Date('2026-05-15T00:00:00Z');
      expect(service.daysBetween(from, to)).toBe(-4);
    });

    it('returns 0 for same day', () => {
      const same = new Date('2026-05-19T00:00:00Z');
      expect(service.daysBetween(same, same)).toBe(0);
    });
  });
});
