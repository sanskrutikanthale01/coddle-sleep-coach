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
  durationMin: number;
  endISO: string;
  ageMonths: number;
}

interface NapInfo {
  durationMin: number;
  startISO: string;
  ageMonths: number;
  quality?: number;
}

function extractWakeWindows(
  sessions: SleepSession[],
  birthDateISO: string
): WakeWindow[] {
  const wakeWindows: WakeWindow[] = [];
  
  const sortedSessions = [...sessions].sort((a, b) =>
    time.parse(a.startISO).diff(time.parse(b.startISO))
  );

  for (let i = 1; i < sortedSessions.length; i++) {
    const prevSession = sortedSessions[i - 1];
    const currentSession = sortedSessions[i];

    const wakeWindowMin = time.durationMinutes(
      prevSession.endISO,
      currentSession.startISO
    );

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

  if (previousEWMA !== null && values.length === 1) {
    return EWMA_ALPHA * values[0] + (1 - EWMA_ALPHA) * previousEWMA;
  }

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
    return 0; 
  }

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
    return 0.1; 
  }

  const allSessions = [
    ...wakeWindows.map((w) => w.endISO),
    ...naps.map((n) => n.startISO),
  ];
  const recencyWeights = allSessions.map(calculateRecencyWeight);
  const avgRecency = recencyWeights.reduce((a, b) => a + b, 0) / recencyWeights.length;

  let consistencyScore = 0.5; 

  if (wakeWindows.length >= 3) {
    const durations = wakeWindows.map((w) => w.durationMin);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance =
      durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
      durations.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;

    consistencyScore = Math.max(0, 1 - coefficientOfVariation);
  }


  const sessionCountScore = Math.min(1, totalSessions / CONFIDENCE_PARAMS.minSessions);
                  
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
 
  const activeSessions = sessions.filter((s) => !s.deleted);

  if (activeSessions.length < MIN_SESSIONS_FOR_LEARNING) {
  
    const baseline = getBaselineForBaby(babyProfile.birthDateISO);
    const ageMonths = calculateAgeMonths(babyProfile.birthDateISO);

    return {
      version: 1,
      ewmaNapLengthMin: baseline.typicalNapLengthMin,
      ewmaWakeWindowMin: baseline.typicalWakeWindowMin,
      lastUpdatedISO: time.nowISO(),
      confidence: 0.1, 
    };
  }

  const wakeWindows = extractWakeWindows(activeSessions, babyProfile.birthDateISO);
  const naps = extractNaps(activeSessions, babyProfile.birthDateISO);

  const baseline = getBaselineForBaby(babyProfile.birthDateISO);
  const ageMonths = calculateAgeMonths(babyProfile.birthDateISO);

  let ewmaWakeWindow: number;
  if (wakeWindows.length === 0) {
    ewmaWakeWindow = baseline.typicalWakeWindowMin;
  } else {
    const sortedWindows = [...wakeWindows].sort((a, b) =>
      time.parse(b.endISO).diff(time.parse(a.endISO))
    );

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

    ewmaWakeWindow = clampWakeWindow(ewmaWakeWindow, ageMonths);
  }

  let ewmaNapLength: number;
  if (naps.length === 0) {
    ewmaNapLength = baseline.typicalNapLengthMin;
  } else {
    const sortedNaps = [...naps].sort((a, b) =>
      time.parse(b.startISO).diff(time.parse(a.startISO))
    );

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

    ewmaNapLength = clampNapLength(ewmaNapLength, ageMonths);
  }

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

  const baseline = getBaselineForBaby(babyProfile.birthDateISO);
  return baseline.typicalNapLengthMin;
}

