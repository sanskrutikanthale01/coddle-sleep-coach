/**
 * Unit Tests for Learner Service (EWMA/Baseline)
 * 
 * Tests cover:
 * - EWMA calculation
 * - Wake window extraction
 * - Nap extraction
 * - Confidence calculation
 * - Baseline fallback
 * - Age-based clamping
 */

import { updateLearner, getLearnedWakeWindow, getLearnedNapLength } from '../learner';
import { SleepSession, LearnerState, BabyProfile } from '../../types';
import { time } from '../../utils/time';
import { getBaselineForBaby } from '../../utils/ageBaseline';
import { MIN_SESSIONS_FOR_LEARNING, EWMA_ALPHA } from '../../config/constants';

describe('Learner Service - EWMA/Baseline', () => {
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

  describe('updateLearner - Baseline Fallback', () => {
    it('should return baseline values when there are too few sessions', () => {
      const sessions: SleepSession[] = [];
      const result = updateLearner(sessions, testBabyProfile, null);

      const baseline = getBaselineForBaby(testBabyProfile.birthDateISO);
      expect(result.ewmaWakeWindowMin).toBe(baseline.typicalWakeWindowMin);
      expect(result.ewmaNapLengthMin).toBe(baseline.typicalNapLengthMin);
      expect(result.confidence).toBe(0.1);
    });

    it('should return baseline when sessions are below minimum threshold', () => {
      const sessions: SleepSession[] = Array.from({ length: MIN_SESSIONS_FOR_LEARNING - 1 }, (_, i) =>
        createSession(
          `2024-06-01T${10 + i}:00:00Z`,
          `2024-06-01T${10 + i + 1}:00:00Z`
        )
      );

      const result = updateLearner(sessions, testBabyProfile, null);
      const baseline = getBaselineForBaby(testBabyProfile.birthDateISO);

      expect(result.ewmaWakeWindowMin).toBe(baseline.typicalWakeWindowMin);
      expect(result.ewmaNapLengthMin).toBe(baseline.typicalNapLengthMin);
      expect(result.confidence).toBe(0.1);
    });
  });

  describe('updateLearner - Wake Window Extraction', () => {
    it('should extract wake windows from consecutive sessions', () => {
      const sessions: SleepSession[] = [
        createSession('2024-06-01T08:00:00Z', '2024-06-01T09:30:00Z'), // Nap 1
        createSession('2024-06-01T12:00:00Z', '2024-06-01T13:30:00Z'), // Nap 2 (3h wake window)
        createSession('2024-06-01T16:00:00Z', '2024-06-01T17:00:00Z'), // Nap 3 (2.5h wake window)
      ];

      const result = updateLearner(sessions, testBabyProfile, null);

      // Should have learned from wake windows (3h = 180min, 2.5h = 150min)
      expect(result.ewmaWakeWindowMin).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.1);
    });

    it('should filter out unreasonable wake windows (too short or too long)', () => {
      const sessions: SleepSession[] = [
        createSession('2024-06-01T08:00:00Z', '2024-06-01T09:00:00Z'),
        createSession('2024-06-01T09:05:00Z', '2024-06-01T10:00:00Z'), // 5min gap (too short)
        createSession('2024-06-02T08:00:00Z', '2024-06-02T09:00:00Z'), // 23h gap (too long, night sleep)
      ];

      const result = updateLearner(sessions, testBabyProfile, null);
      // Should fall back to baseline since no valid wake windows
      const baseline = getBaselineForBaby(testBabyProfile.birthDateISO);
      expect(result.ewmaWakeWindowMin).toBe(baseline.typicalWakeWindowMin);
    });
  });

  describe('updateLearner - Nap Extraction', () => {
    it('should extract daytime naps (6 AM - 8 PM, < 4 hours)', () => {
      const sessions: SleepSession[] = [
        createSession('2024-06-01T10:00:00Z', '2024-06-01T11:30:00Z'), // 90min nap
        createSession('2024-06-01T14:00:00Z', '2024-06-01T15:00:00Z'), // 60min nap
        createSession('2024-06-01T20:00:00Z', '2024-06-02T06:00:00Z'), // Night sleep (excluded)
      ];

      const result = updateLearner(sessions, testBabyProfile, null);

      expect(result.ewmaNapLengthMin).toBeGreaterThan(0);
      // Should be between 60-90 minutes (the extracted naps)
      expect(result.ewmaNapLengthMin).toBeGreaterThanOrEqual(60);
      expect(result.ewmaNapLengthMin).toBeLessThanOrEqual(90);
    });

    it('should exclude night sleep from nap calculations', () => {
      const sessions: SleepSession[] = [
        createSession('2024-06-01T20:00:00Z', '2024-06-02T06:00:00Z'), // 10h night sleep
      ];

      const result = updateLearner(sessions, testBabyProfile, null);
      const baseline = getBaselineForBaby(testBabyProfile.birthDateISO);

      // Should use baseline since no naps extracted
      expect(result.ewmaNapLengthMin).toBe(baseline.typicalNapLengthMin);
    });
  });

  describe('updateLearner - EWMA Calculation', () => {
    it('should calculate EWMA incrementally with previous state', () => {
      const previousState: LearnerState = {
        version: 1,
        ewmaWakeWindowMin: 120, // 2 hours
        ewmaNapLengthMin: 90,
        lastUpdatedISO: '2024-06-01T00:00:00Z',
        confidence: 0.5,
      };

      const sessions: SleepSession[] = [
        createSession('2024-06-02T08:00:00Z', '2024-06-02T09:00:00Z'),
        createSession('2024-06-02T12:00:00Z', '2024-06-02T13:00:00Z'), // 3h wake window
      ];

      const result = updateLearner(sessions, testBabyProfile, previousState);

      // EWMA formula: alpha * newValue + (1 - alpha) * previousValue
      // If new wake window is 180min and previous is 120min:
      // EWMA = 0.3 * 180 + 0.7 * 120 = 54 + 84 = 138
      const expectedEWMA = EWMA_ALPHA * 180 + (1 - EWMA_ALPHA) * 120;
      expect(result.ewmaWakeWindowMin).toBeCloseTo(expectedEWMA, 1);
    });

    it('should weight recent sessions more heavily', () => {
      const now = time.now();
      const recentSession = createSession(
        now.subtract(1, 'day').toISOString(),
        now.subtract(1, 'day').add(90, 'minute').toISOString()
      );
      const oldSession = createSession(
        now.subtract(20, 'day').toISOString(),
        now.subtract(20, 'day').add(60, 'minute').toISOString()
      );

      const sessions: SleepSession[] = [oldSession, recentSession];

      const result = updateLearner(sessions, testBabyProfile, null);

      // Recent session should have more influence
      expect(result.ewmaNapLengthMin).toBeGreaterThan(60);
    });
  });

  describe('updateLearner - Confidence Calculation', () => {
    it('should have low confidence with few sessions', () => {
      const sessions: SleepSession[] = Array.from({ length: MIN_SESSIONS_FOR_LEARNING }, (_, i) =>
        createSession(
          `2024-06-01T${10 + i}:00:00Z`,
          `2024-06-01T${10 + i + 1}:00:00Z`
        )
      );

      const result = updateLearner(sessions, testBabyProfile, null);

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.confidence).toBeGreaterThan(0.1);
    });

    it('should have higher confidence with more sessions', () => {
      const sessions: SleepSession[] = Array.from({ length: 30 }, (_, i) =>
        createSession(
          `2024-06-${String(Math.floor(i / 3) + 1).padStart(2, '0')}T${10 + (i % 3)}:00:00Z`,
          `2024-06-${String(Math.floor(i / 3) + 1).padStart(2, '0')}T${10 + (i % 3) + 1}:00:00Z`
        )
      );

      const result = updateLearner(sessions, testBabyProfile, null);

      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should have higher confidence with consistent patterns', () => {
      // Create sessions with consistent wake windows (2 hours)
      const sessions: SleepSession[] = [];
      for (let i = 0; i < 20; i++) {
        const startHour = 8 + (i * 2);
        sessions.push(
          createSession(
            `2024-06-01T${startHour}:00:00Z`,
            `2024-06-01T${startHour + 1}:30:00Z`
          )
        );
      }

      const result = updateLearner(sessions, testBabyProfile, null);

      // Consistent patterns should yield higher confidence
      expect(result.confidence).toBeGreaterThan(0.4);
    });
  });

  describe('getLearnedWakeWindow', () => {
    it('should return learned value when confidence is high', () => {
      const learnerState: LearnerState = {
        version: 1,
        ewmaWakeWindowMin: 150,
        ewmaNapLengthMin: 90,
        lastUpdatedISO: time.nowISO(),
        confidence: 0.8,
      };

      const result = getLearnedWakeWindow(learnerState, testBabyProfile);
      expect(result).toBe(150);
    });

    it('should fall back to baseline when confidence is low', () => {
      const learnerState: LearnerState = {
        version: 1,
        ewmaWakeWindowMin: 150,
        ewmaNapLengthMin: 90,
        lastUpdatedISO: time.nowISO(),
        confidence: 0.1,
      };

      const baseline = getBaselineForBaby(testBabyProfile.birthDateISO);
      const result = getLearnedWakeWindow(learnerState, testBabyProfile);
      expect(result).toBe(baseline.typicalWakeWindowMin);
    });

    it('should fall back to baseline when state is null', () => {
      const baseline = getBaselineForBaby(testBabyProfile.birthDateISO);
      const result = getLearnedWakeWindow(null, testBabyProfile);
      expect(result).toBe(baseline.typicalWakeWindowMin);
    });
  });

  describe('getLearnedNapLength', () => {
    it('should return learned value when confidence is high', () => {
      const learnerState: LearnerState = {
        version: 1,
        ewmaWakeWindowMin: 150,
        ewmaNapLengthMin: 105,
        lastUpdatedISO: time.nowISO(),
        confidence: 0.8,
      };

      const result = getLearnedNapLength(learnerState, testBabyProfile);
      expect(result).toBe(105);
    });

    it('should fall back to baseline when confidence is low', () => {
      const learnerState: LearnerState = {
        version: 1,
        ewmaWakeWindowMin: 150,
        ewmaNapLengthMin: 105,
        lastUpdatedISO: time.nowISO(),
        confidence: 0.1,
      };

      const baseline = getBaselineForBaby(testBabyProfile.birthDateISO);
      const result = getLearnedNapLength(learnerState, testBabyProfile);
      expect(result).toBe(baseline.typicalNapLengthMin);
    });
  });

  describe('Age-based Clamping', () => {
    it('should clamp wake windows to age-appropriate ranges', () => {
      const sessions: SleepSession[] = Array.from({ length: 20 }, (_, i) =>
        createSession(
          `2024-06-01T${8 + i}:00:00Z`,
          `2024-06-01T${8 + i + 1}:00:00Z`
        )
      );

      const result = updateLearner(sessions, testBabyProfile, null);
      const baseline = getBaselineForBaby(testBabyProfile.birthDateISO);

      // Wake window should be within age-appropriate bounds
      expect(result.ewmaWakeWindowMin).toBeGreaterThanOrEqual(baseline.minWakeWindowMin);
      expect(result.ewmaWakeWindowMin).toBeLessThanOrEqual(baseline.maxWakeWindowMin);
    });

    it('should clamp nap lengths to age-appropriate ranges', () => {
      const sessions: SleepSession[] = Array.from({ length: 20 }, (_, i) =>
        createSession(
          `2024-06-01T${10 + i}:00:00Z`,
          `2024-06-01T${10 + i + 1}:30:00Z`
        )
      );

      const result = updateLearner(sessions, testBabyProfile, null);
      const baseline = getBaselineForBaby(testBabyProfile.birthDateISO);

      // Nap length should be within age-appropriate bounds
      expect(result.ewmaNapLengthMin).toBeGreaterThanOrEqual(baseline.minNapLengthMin);
      expect(result.ewmaNapLengthMin).toBeLessThanOrEqual(baseline.maxNapLengthMin);
    });
  });
});

