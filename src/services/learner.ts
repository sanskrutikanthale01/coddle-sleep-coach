import { SleepSession, LearnerState, BabyProfile } from '../types';
import { time } from '../utils/time';
import {
  getBaselineForBaby,
  calculateAgeMonths,
  clampWakeWindow,
  clampNapLength,
} from '../utils/ageBaseline';
import {
  EWMA_ALPHA,
  MIN_SESSIONS_FOR_LEARNING,
  MAX_SESSION_AGE_DAYS,
  CONFIDENCE_PARAMS,
} from '../config/constants';

interface WakeWindow {
  /** Wake window duration in minutes */
  durationMin: number;
  /** Timestamp when wake window ended (start of sleep) */
  endISO: string;
  /** Age in months when this wake window occurred */
  ageMonths: number;
}

interface NapInfo {
  /** Nap duration in minutes */
  durationMin: number;
  /** Timestamp when nap started */
  startISO: string;
  /** Age in months when this nap occurred */
  ageMonths: number;
  /** Quality rating if available */
  quality?: number;
}

function extractWakeWindows(
  sessions: SleepSession[],
  birthDateISO: string
): WakeWindow[] {
  const wakeWindows: WakeWindow[] = [];
  
  // Sort sessions by start time
  const sortedSessions = [...sessions].sort((a, b) =>
    time.parse(a.startISO).diff(time.parse(b.startISO))
  );

  for (let i = 1; i < sortedSessions.length; i++) {
    const prevSession = sortedSessions[i - 1];
    const currentSession = sortedSessions[i];

    // Calculate wake window: time from end of previous to start of current
    const wakeWindowMin = time.durationMinutes(
      prevSession.endISO,
      currentSession.startISO
    );

    // Only consider reasonable wake windows (15 minutes to 8 hours)
    // This filters out night sleep gaps
    if (wakeWindowMin >= 15 && wakeWindowMin <= 480) {
      const ageMonths = calculateAgeMonths(
        birthDateISO,
        currentSession.startISO
      );

      wakeWindows.push({
        durationMin: wakeWindowMin,
        endISO: currentSession.startISO,
        ageMonths,
      });
    }
  }

  return wakeWindows;
}

function extractNaps(
  sessions: SleepSession[],
  birthDateISO: string
): NapInfo[] {
  const naps: NapInfo[] = [];

  for (const session of sessions) {
    const start = time.parse(session.startISO);
    const durationMin = time.durationMinutes(session.startISO, session.endISO);

    // Consider it a nap if:
    // 1. Duration is less than 4 hours (240 minutes)
    // 2. Starts between 6 AM and 8 PM (daytime)
    const hour = start.hour();
    const isDaytime = hour >= 6 && hour < 20;

    if (durationMin < 240 && isDaytime) {
      const ageMonths = calculateAgeMonths(birthDateISO, session.startISO);

      naps.push({
        durationMin,
        startISO: session.startISO,
        ageMonths,
        quality: session.quality,
      });
    }
  }

  return naps;
}

function calculateEWMA(
  values: number[],
  previousEWMA: number | null,
  weights?: number[]
): number {
  if (values.length === 0) {
    return previousEWMA ?? 0;
  }

  // If we have a previous EWMA, use incremental update
  if (previousEWMA !== null && values.length === 1) {
    return EWMA_ALPHA * values[0] + (1 - EWMA_ALPHA) * previousEWMA;
  }

  // Otherwise, calculate weighted average
  // Apply recency weights if provided
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const weight = weights ? weights[i] : 1;
    weightedSum += value * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return previousEWMA ?? values[0];
  }

  const average = weightedSum / totalWeight;

  // If we have previous EWMA, blend it
  if (previousEWMA !== null) {
    return EWMA_ALPHA * average + (1 - EWMA_ALPHA) * previousEWMA;
  }

  return average;
}

function calculateRecencyWeight(sessionISO: string): number {
  const sessionDate = time.parse(sessionISO);
  const now = time.now();
  const daysAgo = now.diff(sessionDate, 'day');

  if (daysAgo > MAX_SESSION_AGE_DAYS) {
    return 0; // Too old, ignore
  }

  // Exponential decay: weight = e^(-days/10)
  // Sessions from today have weight ~1, sessions from 10 days ago have weight ~0.37
  return Math.exp(-daysAgo / 10);
}

function calculateConfidence(
  wakeWindows: WakeWindow[],
  naps: NapInfo[],
  currentEWMAWakeWindow: number,
  currentEWMANapLength: number
): number {
  const totalSessions = wakeWindows.length + naps.length;

  if (totalSessions < MIN_SESSIONS_FOR_LEARNING) {
    return 0.1; // Very low confidence with little data
  }

  // Recency score: average recency weight
  const allSessions = [
    ...wakeWindows.map((w) => w.endISO),
    ...naps.map((n) => n.startISO),
  ];
  const recencyWeights = allSessions.map(calculateRecencyWeight);
  const avgRecency = recencyWeights.reduce((a, b) => a + b, 0) / recencyWeights.length;

  // Consistency score: inverse of coefficient of variation
  let consistencyScore = 0.5; // Default moderate consistency

  if (wakeWindows.length >= 3) {
    const durations = wakeWindows.map((w) => w.durationMin);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance =
      durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
      durations.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    // Lower CV = higher consistency
    consistencyScore = Math.max(0, 1 - coefficientOfVariation);
  }

  // Session count score: more sessions = higher confidence
  const sessionCountScore = Math.min(1, totalSessions / CONFIDENCE_PARAMS.minSessions);

  // Combine scores
  const confidence =
    CONFIDENCE_PARAMS.recencyWeight * avgRecency +
    CONFIDENCE_PARAMS.consistencyWeight * consistencyScore +
    CONFIDENCE_PARAMS.sessionCountWeight * sessionCountScore;

  return Math.min(1, Math.max(0.1, confidence));
}

export function updateLearner(
  sessions: SleepSession[],
  babyProfile: BabyProfile,
  previousState: LearnerState | null
): LearnerState {
  // Filter out deleted sessions
  const activeSessions = sessions.filter((s) => !s.deleted);

  if (activeSessions.length < MIN_SESSIONS_FOR_LEARNING) {
    // Not enough data, return baseline-based state
    const baseline = getBaselineForBaby(babyProfile.birthDateISO);
    const ageMonths = calculateAgeMonths(babyProfile.birthDateISO);

    return {
      version: 1,
      ewmaNapLengthMin: baseline.typicalNapLengthMin,
      ewmaWakeWindowMin: baseline.typicalWakeWindowMin,
      lastUpdatedISO: time.nowISO(),
      confidence: 0.1, // Low confidence with little data
    };
  }

  // Extract wake windows and naps
  const wakeWindows = extractWakeWindows(activeSessions, babyProfile.birthDateISO);
  const naps = extractNaps(activeSessions, babyProfile.birthDateISO);

  // Get age baseline
  const baseline = getBaselineForBaby(babyProfile.birthDateISO);
  const ageMonths = calculateAgeMonths(babyProfile.birthDateISO);

  // Calculate EWMA for wake windows
  let ewmaWakeWindow: number;
  if (wakeWindows.length === 0) {
    // No wake windows extracted, use baseline
    ewmaWakeWindow = baseline.typicalWakeWindowMin;
  } else {
    // Sort by recency (most recent first)
    const sortedWindows = [...wakeWindows].sort((a, b) =>
      time.parse(b.endISO).diff(time.parse(a.endISO))
    );

    // Get recent windows (last 14 days)
    const recentWindows = sortedWindows.filter((w) => {
      const daysAgo = time.now().diff(time.parse(w.endISO), 'day');
      return daysAgo <= 14;
    });

    const windowDurations = (recentWindows.length > 0 ? recentWindows : sortedWindows).map(
      (w) => w.durationMin
    );
    const recencyWeights = (recentWindows.length > 0 ? recentWindows : sortedWindows).map((w) =>
      calculateRecencyWeight(w.endISO)
    );

    const previousWakeWindow =
      previousState?.ewmaWakeWindowMin ?? baseline.typicalWakeWindowMin;
    ewmaWakeWindow = calculateEWMA(windowDurations, previousWakeWindow, recencyWeights);

    // Clamp to age-appropriate bounds
    ewmaWakeWindow = clampWakeWindow(ewmaWakeWindow, ageMonths);
  }

  // Calculate EWMA for nap length
  let ewmaNapLength: number;
  if (naps.length === 0) {
    // No naps extracted, use baseline
    ewmaNapLength = baseline.typicalNapLengthMin;
  } else {
    // Sort by recency
    const sortedNaps = [...naps].sort((a, b) =>
      time.parse(b.startISO).diff(time.parse(a.startISO))
    );

    // Get recent naps (last 14 days)
    const recentNaps = sortedNaps.filter((n) => {
      const daysAgo = time.now().diff(time.parse(n.startISO), 'day');
      return daysAgo <= 14;
    });

    const napDurations = (recentNaps.length > 0 ? recentNaps : sortedNaps).map(
      (n) => n.durationMin
    );
    const recencyWeights = (recentNaps.length > 0 ? recentNaps : sortedNaps).map((n) =>
      calculateRecencyWeight(n.startISO)
    );

    const previousNapLength =
      previousState?.ewmaNapLengthMin ?? baseline.typicalNapLengthMin;
    ewmaNapLength = calculateEWMA(napDurations, previousNapLength, recencyWeights);

    // Clamp to age-appropriate bounds
    ewmaNapLength = clampNapLength(ewmaNapLength, ageMonths);
  }

  // Calculate confidence
  const confidence = calculateConfidence(
    wakeWindows,
    naps,
    ewmaWakeWindow,
    ewmaNapLength
  );

  return {
    version: 1,
    ewmaNapLengthMin: ewmaNapLength,
    ewmaWakeWindowMin: ewmaWakeWindow,
    lastUpdatedISO: time.nowISO(),
    confidence,
  };
}

export function getLearnedWakeWindow(
  learnerState: LearnerState | null,
  babyProfile: BabyProfile
): number {
  if (learnerState && learnerState.confidence > 0.2) {
    return learnerState.ewmaWakeWindowMin;
  }

  // Fall back to baseline
  const baseline = getBaselineForBaby(babyProfile.birthDateISO);
  return baseline.typicalWakeWindowMin;
}

export function getLearnedNapLength(
  learnerState: LearnerState | null,
  babyProfile: BabyProfile
): number {
  if (learnerState && learnerState.confidence > 0.2) {
    return learnerState.ewmaNapLengthMin;
  }

  // Fall back to baseline
  const baseline = getBaselineForBaby(babyProfile.birthDateISO);
  return baseline.typicalNapLengthMin;
}

