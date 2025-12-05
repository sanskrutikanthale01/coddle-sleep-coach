/**
 * Unit Tests for Time Utilities - DST Boundary Handling
 * 
 * Tests cover:
 * - DST transition handling
 * - Timezone conversions
 * - Day key calculations across DST boundaries
 * - Cross-midnight detection
 * - Duration calculations with DST
 */

import { time } from '../time';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('Time Utilities - DST Boundary Handling', () => {
  // Use America/New_York timezone which has DST transitions
  const TZ = 'America/New_York';

  describe('DST Spring Forward (March)', () => {
    it('should handle day key calculation during spring forward', () => {
      // Spring forward in 2024: March 10, 2:00 AM -> 3:00 AM
      // 2024-03-10 01:59:59 EST -> 2024-03-10 03:00:00 EDT
      
      const beforeDST = '2024-03-10T01:59:59-05:00'; // EST
      const afterDST = '2024-03-10T03:00:00-04:00'; // EDT

      const dayKeyBefore = time.dayKey(beforeDST, TZ);
      const dayKeyAfter = time.dayKey(afterDST, TZ);

      // Both should be on the same calendar day
      expect(dayKeyBefore).toBe('2024-03-10');
      expect(dayKeyAfter).toBe('2024-03-10');
    });

    it('should correctly calculate duration across spring forward', () => {
      // Session starting before DST and ending after
      const startISO = '2024-03-10T01:30:00-05:00'; // 1:30 AM EST
      const endISO = '2024-03-10T04:00:00-04:00'; // 4:00 AM EDT

      const duration = time.durationMinutes(startISO, endISO);

      // Actual elapsed time: 1.5 hours (90 minutes)
      // Not 2.5 hours (150 minutes) which would be wrong
      expect(duration).toBeCloseTo(90, 1);
    });
  });

  describe('DST Fall Back (November)', () => {
    it('should handle day key calculation during fall back', () => {
      // Fall back in 2024: November 3, 2:00 AM -> 1:00 AM
      // 2024-11-03 01:59:59 EDT -> 2024-11-03 01:00:00 EST
      
      const beforeDST = '2024-11-03T01:30:00-04:00'; // 1:30 AM EDT
      const afterDST = '2024-11-03T01:30:00-05:00'; // 1:30 AM EST (1 hour later in UTC)

      const dayKeyBefore = time.dayKey(beforeDST, TZ);
      const dayKeyAfter = time.dayKey(afterDST, TZ);

      // Both should be on the same calendar day
      expect(dayKeyBefore).toBe('2024-11-03');
      expect(dayKeyAfter).toBe('2024-11-03');
    });

    it('should correctly calculate duration across fall back', () => {
      // Session starting before DST and ending after
      const startISO = '2024-11-03T01:30:00-04:00'; // 1:30 AM EDT
      const endISO = '2024-11-03T02:30:00-05:00'; // 2:30 AM EST

      const duration = time.durationMinutes(startISO, endISO);

      // Actual elapsed time: 2 hours (120 minutes)
      // The hour that repeats (1:00-2:00 AM) should not be double-counted
      expect(duration).toBeCloseTo(120, 1);
    });

    it('should handle session that spans the repeated hour', () => {
      // Session during the repeated hour (1:00-2:00 AM happens twice)
      const startISO = '2024-11-03T00:45:00-04:00'; // 12:45 AM EDT
      const endISO = '2024-11-03T01:15:00-05:00'; // 1:15 AM EST (second occurrence)

      const duration = time.durationMinutes(startISO, endISO);

      // Should be 30 minutes, not 90 minutes
      expect(duration).toBeCloseTo(30, 1);
    });
  });

  describe('Cross-Midnight Detection with DST', () => {
    it('should correctly detect cross-midnight during DST', () => {
      const startISO = '2024-03-09T23:00:00-05:00'; // 11 PM EST
      const endISO = '2024-03-10T01:00:00-04:00'; // 1 AM EDT (after spring forward)

      const isCrossMidnight = time.isCrossMidnight(startISO, endISO, TZ);

      // Should detect as crossing midnight (March 9 -> March 10)
      expect(isCrossMidnight).toBe(true);
    });

    it('should correctly detect cross-midnight during fall back', () => {
      const startISO = '2024-11-02T23:00:00-04:00'; // 11 PM EDT
      const endISO = '2024-11-03T01:00:00-05:00'; // 1 AM EST (after fall back)

      const isCrossMidnight = time.isCrossMidnight(startISO, endISO, TZ);

      // Should detect as crossing midnight (November 2 -> November 3)
      expect(isCrossMidnight).toBe(true);
    });

    it('should not detect cross-midnight for same-day sessions', () => {
      const startISO = '2024-06-15T10:00:00-04:00';
      const endISO = '2024-06-15T14:00:00-04:00';

      const isCrossMidnight = time.isCrossMidnight(startISO, endISO, TZ);

      expect(isCrossMidnight).toBe(false);
    });
  });

  describe('Timezone-Aware Day Key', () => {
    it('should use local timezone for day key calculation', () => {
      // Same UTC time, different timezones
      const utcTime = '2024-06-15T04:00:00Z'; // 4 AM UTC

      const dayKeyNY = time.dayKey(utcTime, 'America/New_York'); // 12 AM EDT
      const dayKeyLA = time.dayKey(utcTime, 'America/Los_Angeles'); // 9 PM PDT (previous day)

      expect(dayKeyNY).toBe('2024-06-15');
      expect(dayKeyLA).toBe('2024-06-14'); // Previous day in LA
    });

    it('should handle day key at midnight boundary', () => {
      // Just before midnight
      const beforeMidnight = '2024-06-15T23:59:59-04:00';
      // Just after midnight
      const afterMidnight = '2024-06-16T00:00:01-04:00';

      const dayKeyBefore = time.dayKey(beforeMidnight, TZ);
      const dayKeyAfter = time.dayKey(afterMidnight, TZ);

      expect(dayKeyBefore).toBe('2024-06-15');
      expect(dayKeyAfter).toBe('2024-06-16');
    });
  });

  describe('Duration Calculations with DST', () => {
    it('should calculate correct duration ignoring DST transitions', () => {
      // 2-hour session that spans spring forward
      const startISO = '2024-03-10T01:00:00-05:00'; // 1 AM EST
      const endISO = '2024-03-10T04:00:00-04:00'; // 4 AM EDT

      const duration = time.durationMinutes(startISO, endISO);

      // Should be 2 hours (120 minutes), not 3 hours
      expect(duration).toBeCloseTo(120, 1);
    });

    it('should calculate correct duration across fall back', () => {
      // 2-hour session that spans fall back
      const startISO = '2024-11-03T01:00:00-04:00'; // 1 AM EDT
      const endISO = '2024-11-03T02:00:00-05:00'; // 2 AM EST

      const duration = time.durationMinutes(startISO, endISO);

      // Should be 2 hours (120 minutes), accounting for repeated hour
      expect(duration).toBeCloseTo(120, 1);
    });

    it('should handle long sessions spanning multiple DST transitions', () => {
      // Session from before spring forward to after fall back
      const startISO = '2024-03-01T10:00:00-05:00';
      const endISO = '2024-11-15T10:00:00-05:00';

      const duration = time.durationMinutes(startISO, endISO);

      // Should be approximately 8.5 months = ~370,000 minutes
      // We just check it's a large positive number
      expect(duration).toBeGreaterThan(100000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle sessions exactly at DST transition time', () => {
      // Session starting exactly at spring forward
      const startISO = '2024-03-10T07:00:00Z'; // 2 AM EST / 3 AM EDT in UTC
      const endISO = '2024-03-10T08:00:00Z'; // 4 AM EDT

      const duration = time.durationMinutes(startISO, endISO);
      expect(duration).toBe(60); // 1 hour
    });

    it('should handle invalid timezone gracefully', () => {
      const iso = '2024-06-15T12:00:00Z';
      
      // Should not throw error with invalid timezone
      expect(() => {
        time.dayKey(iso, 'Invalid/Timezone');
      }).not.toThrow();
    });

    it('should handle ISO strings without timezone', () => {
      const iso = '2024-06-15T12:00:00';
      
      // Should default to UTC or system timezone
      expect(() => {
        const dayKey = time.dayKey(iso);
        expect(dayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }).not.toThrow();
    });
  });

  describe('Validation', () => {
    it('should validate time ranges correctly', () => {
      const startISO = '2024-06-15T10:00:00Z';
      const endISO = '2024-06-15T12:00:00Z';

      const validation = time.validateRange(startISO, endISO);

      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject invalid date formats', () => {
      const validation = time.validateRange('invalid', '2024-06-15T12:00:00Z');

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('should reject end time before start time', () => {
      const startISO = '2024-06-15T12:00:00Z';
      const endISO = '2024-06-15T10:00:00Z';

      const validation = time.validateRange(startISO, endISO);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });
});

