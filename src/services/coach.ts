import { SleepSession, LearnerState, BabyProfile, CoachTip } from '../types';
import { time } from '../utils/time';
import { getBaselineForBaby, calculateAgeMonths } from '../utils/ageBaseline';
import { getLearnedWakeWindow, getLearnedNapLength } from './learner';
import { COACH_THRESHOLDS } from '../config/constants';

function generateTipId(): string {
  return `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function detectShortNapStreak(
  sessions: SleepSession[],
  babyProfile: BabyProfile
): CoachTip | null {
  
  const now = time.now();
  const recentSessions = sessions.filter((s) => {
    const daysAgo = now.diff(time.parse(s.startISO), 'day');
    return daysAgo <= 5 && !s.deleted;
  });

  
  const naps: SleepSession[] = [];
  for (const session of recentSessions) {
    const start = time.parse(session.startISO);
    const durationMin = time.durationMinutes(session.startISO, session.endISO);
    const hour = start.hour();
    const isDaytime = hour >= 6 && hour < 20;

    if (durationMin < 240 && isDaytime) {
      naps.push(session);
    }
  }

  
  naps.sort((a, b) => time.parse(b.startISO).diff(time.parse(a.startISO)));

  
  const recentNaps = naps.slice(0, 5);
  const shortNaps = recentNaps.filter((nap) => {
    const durationMin = time.durationMinutes(nap.startISO, nap.endISO);
    return durationMin < COACH_THRESHOLDS.shortNapMinutes;
  });

  if (shortNaps.length >= COACH_THRESHOLDS.shortNapStreakCount) {
    const relatedDateKeys = [...new Set(shortNaps.map((n) => time.dayKey(n.startISO)))];
    
    return {
      id: generateTipId(),
      type: 'warning',
      title: 'Short Nap Streak',
      message: `Baby had ${shortNaps.length} short naps (less than ${COACH_THRESHOLDS.shortNapMinutes} minutes) recently. Consider earlier bedtime to prevent overtiredness.`,
      justification: `Detected ${shortNaps.length} short naps in the last ${recentNaps.length} naps. Short naps can indicate overtiredness or schedule issues.`,
      severity: shortNaps.length >= 4 ? 'high' : 'medium',
      relatedSessionIds: shortNaps.map((n) => n.id),
      relatedDateKeys,
      createdAtISO: time.nowISO(),
    };
  }

  return null;
}

/**
 * Rule 2: Overtired Warning
 * Detects when wake windows are significantly longer than learned/baseline
 */
function detectOvertiredWarning(
  sessions: SleepSession[],
  learnerState: LearnerState | null,
  babyProfile: BabyProfile
): CoachTip | null {
  
  const now = time.now();
  const recentSessions = sessions
    .filter((s) => {
      const daysAgo = now.diff(time.parse(s.startISO), 'day');
      return daysAgo <= 7 && !s.deleted;
    })
    .sort((a, b) => time.parse(a.startISO).diff(time.parse(b.startISO)));

  if (recentSessions.length < 2) {
    return null;
  }

  
  const learnedWakeWindow = getLearnedWakeWindow(learnerState, babyProfile);
  const threshold = learnedWakeWindow * COACH_THRESHOLDS.longWakeWindowMultiplier;

  
  const longWakeWindows: { session: SleepSession; wakeWindowMin: number }[] = [];

  for (let i = 1; i < recentSessions.length; i++) {
    const prevSession = recentSessions[i - 1];
    const currentSession = recentSessions[i];

    const wakeWindowMin = time.durationMinutes(prevSession.endISO, currentSession.startISO);

    
    if (wakeWindowMin >= 15 && wakeWindowMin <= 480 && wakeWindowMin > threshold) {
      longWakeWindows.push({
        session: currentSession,
        wakeWindowMin,
      });
    }
  }

  if (longWakeWindows.length > 0) {
    
    const longest = longWakeWindows.reduce((max, w) =>
      w.wakeWindowMin > max.wakeWindowMin ? w : max
    );

    const hours = Math.floor(longest.wakeWindowMin / 60);
    const minutes = Math.round(longest.wakeWindowMin % 60);
    const targetHours = Math.floor(learnedWakeWindow / 60);
    const targetMinutes = Math.round(learnedWakeWindow % 60);

    const minsStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const targetMinsStr = targetMinutes < 10 ? `0${targetMinutes}` : `${targetMinutes}`;

    return {
      id: generateTipId(),
      type: 'warning',
      title: 'Overtired Warning',
      message: `Baby's wake window was ${hours}h ${minsStr}m (target: ${targetHours}h ${targetMinsStr}m). Try starting wind-down 15 minutes earlier next time.`,
      justification: `Wake window of ${Math.round(longest.wakeWindowMin)} minutes exceeds learned target of ${Math.round(learnedWakeWindow)} minutes by ${Math.round(((longest.wakeWindowMin / learnedWakeWindow - 1) * 100))}%.`,
      severity: longest.wakeWindowMin > learnedWakeWindow * 1.5 ? 'high' : 'medium',
      relatedSessionIds: [longest.session.id],
      relatedDateKeys: [time.dayKey(longest.session.startISO)],
      createdAtISO: time.nowISO(),
    };
  }

  return null;
}

/**
 * Rule 3: Bedtime Shift Alert
 * Detects when bedtime has shifted significantly from baseline/learned pattern
 */
function detectBedtimeShift(
  sessions: SleepSession[],
  learnerState: LearnerState | null,
  babyProfile: BabyProfile
): CoachTip | null {
  
  const now = time.now();
  const recentSessions = sessions
    .filter((s) => {
      const daysAgo = now.diff(time.parse(s.startISO), 'day');
      return daysAgo <= 3 && !s.deleted;
    })
    .sort((a, b) => time.parse(a.startISO).diff(time.parse(b.startISO)));

  
  const bedtimes: { session: SleepSession; bedtimeHour: number; bedtimeMin: number }[] = [];

  for (const session of recentSessions) {
    const start = time.parse(session.startISO);
    const durationMin = time.durationMinutes(session.startISO, session.endISO);
    const hour = start.hour();

    
    if (hour >= 18 && durationMin >= 240) {
      bedtimes.push({
        session,
        bedtimeHour: hour,
        bedtimeMin: start.minute(),
      });
    }
  }

  if (bedtimes.length < 2) {
    return null;
  }


  const baseline = getBaselineForBaby(babyProfile.birthDateISO);
  const typicalBedtimeHour = 19; 
  const bedtimeShiftThreshold = 30; 

  const totalMinutes = bedtimes.reduce(
    (sum, b) => sum + b.bedtimeHour * 60 + b.bedtimeMin,
    0
  );
  const avgBedtimeMin = totalMinutes / bedtimes.length;
  const avgBedtimeHour = Math.floor(avgBedtimeMin / 60);
  const avgBedtimeMinRemainder = avgBedtimeMin % 60;

  // Compare to typical bedtime (7 PM = 19:00 = 1140 minutes)
  const typicalBedtimeMin = typicalBedtimeHour * 60;
  const shiftMinutes = avgBedtimeMin - typicalBedtimeMin;

  if (Math.abs(shiftMinutes) > bedtimeShiftThreshold) {
    const shiftDirection = shiftMinutes > 0 ? 'later' : 'earlier';
    const shiftHours = Math.floor(Math.abs(shiftMinutes) / 60);
    const shiftMins = Math.round(Math.abs(shiftMinutes) % 60);
    const shiftMinsStr = shiftMins < 10 ? `0${shiftMins}` : `${shiftMins}`;
    const avgMinsRounded = Math.round(avgBedtimeMinRemainder);
    const avgMinsStr = avgMinsRounded < 10 ? `0${avgMinsRounded}` : `${avgMinsRounded}`;

    return {
      id: generateTipId(),
      type: 'suggestion',
      title: 'Bedtime Shift Detected',
      message: `Bedtime has shifted ${shiftHours}h ${shiftMinsStr}m ${shiftDirection} (average: ${avgBedtimeHour}:${avgMinsStr}). This might indicate baby needs more daytime sleep.`,
      justification: `Average bedtime over last ${bedtimes.length} nights is ${Math.round(Math.abs(shiftMinutes))} minutes ${shiftDirection} than typical bedtime of ${typicalBedtimeHour}:00.`,
      severity: Math.abs(shiftMinutes) > 60 ? 'high' : 'medium',
      relatedSessionIds: bedtimes.map((b) => b.session.id),
      relatedDateKeys: [...new Set(bedtimes.map((b) => time.dayKey(b.session.startISO)))],
      createdAtISO: time.nowISO(),
    };
  }

  return null;
}


function detectSplitNight(
  sessions: SleepSession[],
  babyProfile: BabyProfile
): CoachTip | null {
  // Get recent night sleep sessions (last 3 nights)
  const now = time.now();
  const recentSessions = sessions
    .filter((s) => {
      const daysAgo = now.diff(time.parse(s.startISO), 'day');
      return daysAgo <= 3 && !s.deleted;
    })
    .sort((a, b) => time.parse(a.startISO).diff(time.parse(b.startISO)));

  // Group sessions by day
  const sessionsByDay: Record<string, SleepSession[]> = {};
  for (const session of recentSessions) {
    const dayKey = time.dayKey(session.startISO);
    if (!sessionsByDay[dayKey]) {
      sessionsByDay[dayKey] = [];
    }
    sessionsByDay[dayKey].push(session);
  }

  // Check each day for split nights
  for (const [dayKey, daySessions] of Object.entries(sessionsByDay)) {
    // Find night sleep sessions (start after 6 PM, duration >4 hours)
    const nightSessions = daySessions.filter((s) => {
      const start = time.parse(s.startISO);
      const durationMin = time.durationMinutes(s.startISO, s.endISO);
      const hour = start.hour();
      return hour >= 18 && durationMin >= 240;
    });

    if (nightSessions.length >= 2) {
      // Multiple night sleep sessions on same day = split night
      // Check if there's a gap >1 hour between them
      nightSessions.sort((a, b) => time.parse(a.startISO).diff(time.parse(b.startISO)));

      for (let i = 1; i < nightSessions.length; i++) {
        const prevEnd = time.parse(nightSessions[i - 1].endISO);
        const nextStart = time.parse(nightSessions[i].startISO);
        const gapMinutes = nextStart.diff(prevEnd, 'minute');

        if (gapMinutes > COACH_THRESHOLDS.splitNightGapMinutes) {
          // Split night detected
          const gapHours = Math.floor(gapMinutes / 60);
          const gapMins = Math.round(gapMinutes % 60);
          const gapMinsStr = gapMins < 10 ? `0${gapMins}` : `${gapMins}`;
          
          return {
            id: generateTipId(),
            type: 'warning',
            title: 'Split Night Detected',
            message: `Night sleep was interrupted with a ${gapHours}h ${gapMinsStr}m wake period. Consider adjusting daytime schedule to prevent split nights.`,
            justification: `Found ${nightSessions.length} night sleep sessions on ${dayKey} with a ${Math.round(gapMinutes)}-minute gap between them.`,
            severity: gapMinutes > 120 ? 'high' : 'medium',
            relatedSessionIds: nightSessions.map((s) => s.id),
            relatedDateKeys: [dayKey],
            createdAtISO: time.nowISO(),
          };
        }
      }
    }
  }

  return null;
}

/**
 * Generates all coach tips by running all rule detectors
 */
export function generateCoachTips(
  sessions: SleepSession[],
  learnerState: LearnerState | null,
  babyProfile: BabyProfile
): CoachTip[] {
  const tips: CoachTip[] = [];

  // Filter out deleted sessions
  const activeSessions = sessions.filter((s) => !s.deleted);

  if (activeSessions.length < 3) {
    // Not enough data for meaningful tips
    return [];
  }

  // Run all rule detectors
  const shortNapTip = detectShortNapStreak(activeSessions, babyProfile);
  if (shortNapTip) tips.push(shortNapTip);

  const overtiredTip = detectOvertiredWarning(activeSessions, learnerState, babyProfile);
  if (overtiredTip) tips.push(overtiredTip);

  const bedtimeShiftTip = detectBedtimeShift(activeSessions, learnerState, babyProfile);
  if (bedtimeShiftTip) tips.push(bedtimeShiftTip);

  const splitNightTip = detectSplitNight(activeSessions, babyProfile);
  if (splitNightTip) tips.push(splitNightTip);

  // Sort by severity (high first) and creation time (newest first)
  tips.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return time.parse(b.createdAtISO).diff(time.parse(a.createdAtISO));
  });

  return tips;
}

/**
 * Gets tips for a specific date
 */
export function getTipsForDate(tips: CoachTip[], dateKey: string): CoachTip[] {
  return tips.filter((tip) => tip.relatedDateKeys.includes(dateKey));
}

