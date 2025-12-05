import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TZ = dayjs.tz.guess();

export const time = {
  now(): Dayjs {
    return dayjs();
  },

  nowISO(): string {
    return dayjs().toISOString();
  },

  parse(iso: string): Dayjs {
    return dayjs(iso);
  },

  dayKey(iso: string, tz: string = DEFAULT_TZ): string {
    return dayjs.tz(iso, tz).format('YYYY-MM-DD');
  },

  durationMinutes(startISO: string, endISO: string): number {
    const start = dayjs(startISO);
    const end = dayjs(endISO);
    return end.diff(start, 'minute');
  },

  isCrossMidnight(startISO: string, endISO: string, tz: string = DEFAULT_TZ): boolean {
    const start = dayjs.tz(startISO, tz);
    const end = dayjs.tz(endISO, tz);
    return !start.isSame(end, 'day');
  },

  validateRange(startISO: string, endISO: string): { isValid: boolean; error?: string } {
    const start = dayjs(startISO);
    const end = dayjs(endISO);

    if (!start.isValid() || !end.isValid()) {
      return { isValid: false, error: 'Invalid date format' };
    }

    if (!end.isAfter(start)) {
      return { isValid: false, error: 'End time must be after start time' };
    }

    return { isValid: true };
  },
};

export type { Dayjs };


