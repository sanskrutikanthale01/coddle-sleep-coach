/**
 * Unit Tests for Schedule Generator Service
 * 
 * Tests cover:
 * - Schedule generation for today and tomorrow
 * - Nap generation
 * - Bedtime generation
 * - Wind-down generation
 * - What-if adjustments
 * - Confidence calculation
 */

import { generateSchedule, generateWhatIfSchedule } from '../scheduler';
import { SleepSession, LearnerState, BabyProfile, ScheduleBlock } from '../../types';
import { time } from '../../utils/time';
import { SCHEDULE_CONFIG } from '../../config/constants';

describe('Schedule Generator Service', () => {
  const testBabyProfile: BabyProfile = {
    id: 'test-baby-1',
    birthDateISO: '2024-01-01T00:00:00Z',
    name: 'Test Baby',
  };

  const createSession = (
    startISO: string,
    endISO: string,
    quality?: 1 | 2 | 3 | 4 | 5
  ): SleepSession => ({
    id: `session-${startISO}`,
    startISO,
    endISO,
    quality,
    source: 'manual',
    deleted: false,
    updatedAtISO: time.nowISO(),
  });

  const createLearnerState = (
    wakeWindowMin: number = 120,
    napLengthMin: number = 90,
    confidence: number = 0.7
  ): LearnerState => ({
    version: 1,
    ewmaWakeWindowMin: wakeWindowMin,
    ewmaNapLengthMin: napLengthMin,
    lastUpdatedISO: time.nowISO(),
    confidence,
  });

  describe('generateSchedule - Basic Generation', () => {
    it('should generate schedule blocks for today and tomorrow', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState();
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      expect(result.today).toBeDefined();
      expect(result.tomorrow).toBeDefined();
      expect(Array.isArray(result.today)).toBe(true);
      expect(Array.isArray(result.tomorrow)).toBe(true);
    });

    it('should generate nap blocks based on wake windows', () => {
      const sessions: SleepSession[] = [
        createSession('2024-06-15T08:00:00Z', '2024-06-15T09:30:00Z'),
      ];
      const learnerState = createLearnerState(120, 90); // 2h wake window, 90min nap
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      // Should generate at least one nap after the last wake time
      const napBlocks = [...result.today, ...result.tomorrow].filter((b) => b.kind === 'nap');
      expect(napBlocks.length).toBeGreaterThan(0);

      // First nap should start approximately 2 hours after last wake (10:00 + 2h = 12:00)
      if (napBlocks.length > 0) {
        const firstNap = napBlocks[0];
        const napStart = time.parse(firstNap.startISO);
        const lastWake = time.parse('2024-06-15T09:30:00Z');
        const wakeWindow = napStart.diff(lastWake, 'minute');
        expect(wakeWindow).toBeCloseTo(120, 10); // Within 10 minutes
      }
    });

    it('should generate bedtime block', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState();
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      const bedtimeBlocks = [...result.today, ...result.tomorrow].filter((b) => b.kind === 'bedtime');

      expect(bedtimeBlocks.length).toBeGreaterThan(0);

      // Bedtime should be within configured range (6 PM - 9 PM)
      if (bedtimeBlocks.length > 0) {
        const bedtime = time.parse(bedtimeBlocks[0].startISO);
        const hour = bedtime.hour();
        expect(hour).toBeGreaterThanOrEqual(SCHEDULE_CONFIG.bedtimeRange.earliest);
        expect(hour).toBeLessThanOrEqual(SCHEDULE_CONFIG.bedtimeRange.latest);
      }
    });

    it('should generate wind-down blocks before sleep', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState();
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      const windDownBlocks = [...result.today, ...result.tomorrow].filter((b) => b.kind === 'windDown');

      expect(windDownBlocks.length).toBeGreaterThan(0);

      // Wind-down should be before the corresponding sleep block
      const allBlocks = [...result.today, ...result.tomorrow].sort((a, b) =>
        time.parse(a.startISO).diff(time.parse(b.startISO))
      );

      for (const block of windDownBlocks) {
        const sleepBlock = allBlocks.find(
          (b) =>
            (b.kind === 'nap' || b.kind === 'bedtime') &&
            time.parse(b.startISO).diff(time.parse(block.endISO), 'minute') < 5
        );
        expect(sleepBlock).toBeDefined();
      }
    });
  });

  describe('generateSchedule - Block Properties', () => {
    it('should include confidence in each block', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState(120, 90, 0.8);
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      const allBlocks = [...result.today, ...result.tomorrow];
      allBlocks.forEach((block) => {
        expect(block.confidence).toBeDefined();
        expect(block.confidence).toBeGreaterThan(0);
        expect(block.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should include rationale in each block', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState();
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      const allBlocks = [...result.today, ...result.tomorrow];
      allBlocks.forEach((block) => {
        expect(block.rationale).toBeDefined();
        expect(typeof block.rationale).toBe('string');
        expect(block.rationale.length).toBeGreaterThan(0);
      });
    });

    it('should generate unique IDs for blocks', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState();
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      const allBlocks = [...result.today, ...result.tomorrow];
      const ids = allBlocks.map((b) => b.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length); // All IDs should be unique
    });
  });

  describe('generateWhatIfSchedule', () => {
    it('should adjust wake windows by specified amount', () => {
      const sessions: SleepSession[] = [
        createSession('2024-06-15T08:00:00Z', '2024-06-15T09:30:00Z'),
      ];
      const learnerState = createLearnerState(120, 90); // Base: 2h wake window
      const referenceTime = '2024-06-15T10:00:00Z';

      const normalResult = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      const whatIfResult = generateWhatIfSchedule(
        sessions,
        learnerState,
        testBabyProfile,
        30 // +30 minutes adjustment
      );

      // What-if schedule should have different nap times
      const normalNaps = [...normalResult.today, ...normalResult.tomorrow].filter((b) => b.kind === 'nap');
      const whatIfNaps = [...whatIfResult.today, ...whatIfResult.tomorrow].filter((b) => b.kind === 'nap');

      if (normalNaps.length > 0 && whatIfNaps.length > 0) {
        const normalNapStart = time.parse(normalNaps[0].startISO);
        const whatIfNapStart = time.parse(whatIfNaps[0].startISO);
        const diff = whatIfNapStart.diff(normalNapStart, 'minute');

        // Should be approximately 30 minutes later
        expect(diff).toBeCloseTo(30, 5);
      }
    });

    it('should include what-if indicator in rationale', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState();
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateWhatIfSchedule(
        sessions,
        learnerState,
        testBabyProfile,
        15
      );

      const allBlocks = [...result.today, ...result.tomorrow];
      const hasWhatIfRationale = allBlocks.some((b) =>
        b.rationale.toLowerCase().includes('what-if')
      );

      expect(hasWhatIfRationale).toBe(true);
    });

    it('should clamp adjustments to valid range', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState();
      const referenceTime = '2024-06-15T10:00:00Z';

      // Try extreme adjustments
      const result1 = generateWhatIfSchedule(
        sessions,
        learnerState,
        testBabyProfile,
        -100 // Way too negative
      );

      const result2 = generateWhatIfSchedule(
        sessions,
        learnerState,
        testBabyProfile,
        100 // Way too positive
      );

      // Should still generate valid schedules
      expect(result1.today.length + result1.tomorrow.length).toBeGreaterThan(0);
      expect(result2.today.length + result2.tomorrow.length).toBeGreaterThan(0);
    });
  });

  describe('generateSchedule - Edge Cases', () => {
    it('should handle empty sessions array', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState();
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      expect(result.today).toBeDefined();
      expect(result.tomorrow).toBeDefined();
    });

    it('should handle null learner state', () => {
      const sessions: SleepSession[] = [];
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateSchedule(sessions, null, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      // Should still generate schedule using baselines
      expect(result.today).toBeDefined();
      expect(result.tomorrow).toBeDefined();
      expect(Array.isArray(result.today)).toBe(true);
      expect(Array.isArray(result.tomorrow)).toBe(true);
    });

    it('should not generate naps after 6 PM', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState();
      const referenceTime = '2024-06-15T17:00:00Z'; // 5 PM

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      const lateNaps = [...result.today, ...result.tomorrow].filter((b) => {
        if (b.kind !== 'nap') return false;
        const napStart = time.parse(b.startISO);
        return napStart.hour() >= 18; // 6 PM or later
      });

      expect(lateNaps.length).toBe(0);
    });

    it('should limit number of naps per day', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState(60, 30); // Short wake windows = more naps possible
      const referenceTime = '2024-06-15T06:00:00Z'; // Early morning

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      const todayNaps = result.today.filter((b) => b.kind === 'nap');
      expect(todayNaps.length).toBeLessThanOrEqual(SCHEDULE_CONFIG.maxNapsPerDay);
    });
  });

  describe('generateSchedule - Confidence Decay', () => {
    it('should reduce confidence for blocks further in the future', () => {
      const sessions: SleepSession[] = [];
      const learnerState = createLearnerState(120, 90, 0.8);
      const referenceTime = '2024-06-15T10:00:00Z';

      const result = generateSchedule(sessions, learnerState, testBabyProfile, {
        referenceTimeISO: referenceTime,
      });

      const allBlocks = [...result.today, ...result.tomorrow].sort((a, b) =>
        time.parse(a.startISO).diff(time.parse(b.startISO))
      );

      if (allBlocks.length > 1) {
        const firstBlock = allBlocks[0];
        const lastBlock = allBlocks[allBlocks.length - 1];

        // Later blocks should have lower confidence
        expect(lastBlock.confidence).toBeLessThanOrEqual(firstBlock.confidence);
      }
    });
  });
});

