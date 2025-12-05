import { ScheduleBlock, SleepSession, LearnerState, BabyProfile } from '../types';
import { time } from '../utils/time';
import {
  getLearnedWakeWindow,
  getLearnedNapLength,
} from './learner';
import { SCHEDULE_CONFIG } from '../config/constants';

export interface ScheduleOptions {
  /** What-if adjustment: adjust wake window by this many minutes (-30 to +30) */
  wakeWindowAdjustmentMin?: number;
  /** Reference time for schedule generation (defaults to now) */
  referenceTimeISO?: string;
}

function getLastWakeTimeToday(
  sessions: SleepSession[],
  referenceTimeISO: string
): string | null {
  const today = time.dayKey(referenceTimeISO);
  const todaySessions = sessions
    .filter((s) => !s.deleted && time.dayKey(s.startISO) === today)
    .sort((a, b) => time.parse(b.endISO).diff(time.parse(a.endISO)));

  if (todaySessions.length === 0) {
    return null;
  }

  // Return the end time of the most recent session
  return todaySessions[0].endISO;
}

function isBedtimeHour(hour: number): boolean {
  return hour >= SCHEDULE_CONFIG.bedtimeRange.earliest && hour <= SCHEDULE_CONFIG.bedtimeRange.latest;
}

function generateRationale(
  kind: ScheduleBlock['kind'],
  learnerState: LearnerState | null,
  wakeWindowMin: number,
  napLengthMin: number,
  isWhatIf: boolean
): string {
  const confidence = learnerState?.confidence ?? 0;
  const confidenceLevel = confidence > 0.7 ? 'high' : confidence > 0.4 ? 'moderate' : 'low';

  if (isWhatIf) {
    return `What-if scenario: ${Math.round(wakeWindowMin)}min wake window`;
  }

  switch (kind) {
    case 'nap':
      if (learnerState && confidence > 0.2) {
        return `Based on learned pattern (${confidenceLevel} confidence): ${Math.round(wakeWindowMin)}min wake window, ${Math.round(napLengthMin)}min nap`;
      }
      return `Based on age baseline: ${Math.round(wakeWindowMin)}min wake window, ${Math.round(napLengthMin)}min nap`;

    case 'bedtime':
      if (learnerState && confidence > 0.2) {
        return `Learned bedtime pattern (${confidenceLevel} confidence)`;
      }
      return 'Age-appropriate bedtime window';

    case 'windDown':
      return `Start wind-down ${SCHEDULE_CONFIG.windDownDurationMin} minutes before sleep`;

    default:
      return 'Schedule recommendation';
  }
}

function generateBlockId(kind: ScheduleBlock['kind'], startISO: string): string {
  return `schedule_${kind}_${time.parse(startISO).format('YYYY-MM-DD_HH-mm')}`;
}

function calculateBlockConfidence(
  learnerState: LearnerState | null,
  blockStartISO: string,
  referenceTimeISO: string
): number {
  const baseConfidence = learnerState?.confidence ?? 0.3;
  
  // Confidence decreases for blocks further in the future
  const blockTime = time.parse(blockStartISO);
  const refTime = time.parse(referenceTimeISO);
  const hoursAhead = blockTime.diff(refTime, 'hour', true);
  
  // Reduce confidence by 5% per hour ahead (max 50% reduction)
  const timeDecay = Math.min(0.5, hoursAhead * 0.05);
  
  return Math.max(0.1, baseConfidence * (1 - timeDecay));
}

function generateNaps(
  startFromISO: string,
  wakeWindowMin: number,
  napLengthMin: number,
  learnerState: LearnerState | null,
  referenceTimeISO: string,
  maxNaps: number = SCHEDULE_CONFIG.maxNapsPerDay
): ScheduleBlock[] {
  const naps: ScheduleBlock[] = [];
  let currentTime = time.parse(startFromISO);
  const endOfDay = time.parse(referenceTimeISO).endOf('day');

  for (let i = 0; i < maxNaps; i++) {
    // Calculate next nap start time
    const napStart = currentTime.add(wakeWindowMin, 'minute');
    
    // Don't schedule naps too late in the day (after 6 PM)
    if (napStart.hour() >= 18) {
      break;
    }

    // Don't schedule naps past end of day
    if (napStart.isAfter(endOfDay)) {
      break;
    }

    const napEnd = napStart.add(napLengthMin, 'minute');
    const napStartISO = napStart.toISOString();
    const napEndISO = napEnd.toISOString();

    naps.push({
      id: generateBlockId('nap', napStartISO),
      kind: 'nap',
      startISO: napStartISO,
      endISO: napEndISO,
      confidence: calculateBlockConfidence(learnerState, napStartISO, referenceTimeISO),
      rationale: generateRationale('nap', learnerState, wakeWindowMin, napLengthMin, false),
    });

    // Move to end of this nap for next iteration
    currentTime = napEnd;
  }

  return naps;
}

function generateBedtime(
  lastWakeTimeISO: string,
  wakeWindowMin: number,
  learnerState: LearnerState | null,
  referenceTimeISO: string
): ScheduleBlock | null {
  const lastWake = time.parse(lastWakeTimeISO);
  let bedtime = lastWake.add(wakeWindowMin, 'minute');

  // Clamp bedtime to reasonable range (6 PM - 9 PM)
  const bedtimeHour = bedtime.hour();
  if (bedtimeHour < SCHEDULE_CONFIG.bedtimeRange.earliest) {
    // Too early, set to earliest bedtime
    bedtime = bedtime.hour(SCHEDULE_CONFIG.bedtimeRange.earliest).minute(0).second(0);
  } else if (bedtimeHour > SCHEDULE_CONFIG.bedtimeRange.latest) {
    // Too late, set to latest bedtime
    bedtime = bedtime.hour(SCHEDULE_CONFIG.bedtimeRange.latest).minute(0).second(0);
  } else {
    // Within range, round to nearest 15 minutes
    const minutes = bedtime.minute();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    bedtime = bedtime.minute(roundedMinutes).second(0);
  }

  const bedtimeISO = bedtime.toISOString();

  return {
    id: generateBlockId('bedtime', bedtimeISO),
    kind: 'bedtime',
    startISO: bedtimeISO,
    endISO: bedtime.add(10, 'hour').toISOString(), // Assume 10 hour night sleep
    confidence: calculateBlockConfidence(learnerState, bedtimeISO, referenceTimeISO),
    rationale: generateRationale('bedtime', learnerState, wakeWindowMin, 0, false),
  };
}

function generateWindDown(bedtimeISO: string, learnerState: LearnerState | null): ScheduleBlock {
  const bedtime = time.parse(bedtimeISO);
  const windDownStart = bedtime.subtract(SCHEDULE_CONFIG.windDownDurationMin, 'minute');
  const windDownEnd = bedtime;
  const windDownStartISO = windDownStart.toISOString();

  return {
    id: generateBlockId('windDown', windDownStartISO),
    kind: 'windDown',
    startISO: windDownStartISO,
    endISO: windDownEnd.toISOString(),
    confidence: learnerState?.confidence ?? 0.3,
    rationale: generateRationale('windDown', learnerState, 0, 0, false),
  };
}

function generateDaySchedule(
  dayStartISO: string,
  sessions: SleepSession[],
  learnerState: LearnerState | null,
  babyProfile: BabyProfile,
  options: ScheduleOptions
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  const referenceTime = options.referenceTimeISO || time.nowISO();
  const dayStart = time.parse(dayStartISO).startOf('day');
  const dayEnd = time.parse(dayStartISO).endOf('day');

  // Get learned values
  let wakeWindowMin = getLearnedWakeWindow(learnerState, babyProfile);
  let napLengthMin = getLearnedNapLength(learnerState, babyProfile);

  // Apply what-if adjustment if provided
  if (options.wakeWindowAdjustmentMin) {
    wakeWindowMin = Math.max(30, wakeWindowMin + options.wakeWindowAdjustmentMin);
  }

  // Find last wake time for this day
  const daySessions = sessions
    .filter((s) => !s.deleted && time.dayKey(s.startISO) === time.dayKey(dayStartISO))
    .sort((a, b) => time.parse(b.endISO).diff(time.parse(a.endISO)));

  let lastWakeTime: string;
  if (daySessions.length > 0) {
    // Use end of last session
    lastWakeTime = daySessions[0].endISO;
  } else {
    // No sessions today, start from beginning of day or now (whichever is later)
    const now = time.parse(referenceTime);
    lastWakeTime = now.isAfter(dayStart) ? now.toISOString() : dayStart.hour(7).toISOString();
  }

  const isWhatIf = !!options.wakeWindowAdjustmentMin;

  // Generate naps for the rest of the day
  const naps = generateNaps(
    lastWakeTime,
    wakeWindowMin,
    napLengthMin,
    learnerState,
    referenceTime,
    SCHEDULE_CONFIG.maxNapsPerDay
  );
  
  // Update rationale for what-if if needed
  if (isWhatIf) {
    naps.forEach((nap) => {
      nap.rationale = generateRationale('nap', learnerState, wakeWindowMin, napLengthMin, true);
    });
  }
  
  blocks.push(...naps);

  // Generate bedtime (use last nap end or last wake time)
  const lastNapEnd = naps.length > 0 ? naps[naps.length - 1].endISO : lastWakeTime;
  const bedtime = generateBedtime(lastNapEnd, wakeWindowMin, learnerState, referenceTime);
  
  if (bedtime) {
    // Update bedtime rationale for what-if if needed
    if (isWhatIf) {
      bedtime.rationale = generateRationale('bedtime', learnerState, wakeWindowMin, 0, true);
    }
    
    // Add wind-down before bedtime
    const windDown = generateWindDown(bedtime.startISO, learnerState);
    if (isWhatIf) {
      windDown.rationale = generateRationale('windDown', learnerState, 0, 0, true);
    }
    
    blocks.push(windDown);
    blocks.push(bedtime);
  }

  // Sort blocks by start time
  return blocks.sort((a, b) => time.parse(a.startISO).diff(time.parse(b.startISO)));
}

/**
 * Generates schedule blocks for today (rest of day) and tomorrow
 */
export function generateSchedule(
  sessions: SleepSession[],
  learnerState: LearnerState | null,
  babyProfile: BabyProfile,
  options: ScheduleOptions = {}
): {
  today: ScheduleBlock[];
  tomorrow: ScheduleBlock[];
} {
  const referenceTime = options.referenceTimeISO || time.nowISO();
  const today = time.dayKey(referenceTime);
  const tomorrow = time.parse(referenceTime).add(1, 'day').format('YYYY-MM-DD');

  // Generate today's schedule (rest of day)
  const todayBlocks = generateDaySchedule(today, sessions, learnerState, babyProfile, options);

  // Filter to only show blocks from now onwards
  const now = time.parse(referenceTime);
  const todayFiltered = todayBlocks.filter((block) => {
    const blockStart = time.parse(block.startISO);
    return blockStart.isAfter(now) || blockStart.isSame(now, 'minute');
  });

  // Generate tomorrow's schedule
  const tomorrowBlocks = generateDaySchedule(tomorrow, sessions, learnerState, babyProfile, options);

  return {
    today: todayFiltered,
    tomorrow: tomorrowBlocks,
  };
}

export function generateWhatIfSchedule(
  sessions: SleepSession[],
  learnerState: LearnerState | null,
  babyProfile: BabyProfile,
  wakeWindowAdjustmentMin: number // -30 to +30
): {
  today: ScheduleBlock[];
  tomorrow: ScheduleBlock[];
} {
  // Clamp adjustment to valid range
  const clampedAdjustment = Math.max(
    -SCHEDULE_CONFIG.whatIfAdjustmentRange,
    Math.min(SCHEDULE_CONFIG.whatIfAdjustmentRange, wakeWindowAdjustmentMin)
  );

  return generateSchedule(sessions, learnerState, babyProfile, {
    wakeWindowAdjustmentMin: clampedAdjustment,
  });
}

/**
 * Gets all schedule blocks (today + tomorrow) as a flat array
 */
export function getAllScheduleBlocks(
  sessions: SleepSession[],
  learnerState: LearnerState | null,
  babyProfile: BabyProfile,
  options: ScheduleOptions = {}
): ScheduleBlock[] {
  const { today, tomorrow } = generateSchedule(sessions, learnerState, babyProfile, options);
  return [...today, ...tomorrow];
}

2