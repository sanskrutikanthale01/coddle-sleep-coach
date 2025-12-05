

import { generateSchedule, generateWhatIfSchedule } from '../services/scheduler';
import { updateLearner } from '../services/learner';
import { loadSleepSessions, loadLearnerState } from '../storage/sleepStorage';
import { BabyProfile, SleepSession, LearnerState } from '../types';
import { time } from './time';


export const TEST_BABY_PROFILE: BabyProfile = {
  id: 'test_baby_1',
  name: 'Test Baby',
  birthDateISO: time.now().subtract(6, 'month').toISOString(), // 6 months old
};


export async function testScheduleGenerator(): Promise<void> {
  console.log('=== Testing Schedule Generator ===\n');


  const sessionsResult = await loadSleepSessions();
  const learnerResult = await loadLearnerState();

  const sessions = sessionsResult.value.filter((s) => !s.deleted);
  const learnerState = learnerResult.value;

  console.log(`Loaded ${sessions.length} sleep sessions`);
  console.log(`Learner state: ${learnerState ? 'Available' : 'Not available'}`);
  if (learnerState) {
    console.log(`  - Wake window: ${Math.round(learnerState.ewmaWakeWindowMin)} min`);
    console.log(`  - Nap length: ${Math.round(learnerState.ewmaNapLengthMin)} min`);
    console.log(`  - Confidence: ${(learnerState.confidence * 100).toFixed(1)}%`);
  }
  console.log('');

 
  const schedule = generateSchedule(sessions, learnerState, TEST_BABY_PROFILE);

  console.log('=== TODAY\'S SCHEDULE ===');
  if (schedule.today.length === 0) {
    console.log('No schedule blocks for today');
  } else {
    schedule.today.forEach((block) => {
      const start = time.parse(block.startISO);
      const end = time.parse(block.endISO);
      console.log(`${block.kind.toUpperCase()}:`);
      console.log(`  Time: ${start.format('h:mm A')} - ${end.format('h:mm A')}`);
      console.log(`  Confidence: ${(block.confidence * 100).toFixed(1)}%`);
      console.log(`  Rationale: ${block.rationale}`);
      console.log('');
    });
  }

  console.log('=== TOMORROW\'S SCHEDULE ===');
  if (schedule.tomorrow.length === 0) {
    console.log('No schedule blocks for tomorrow');
  } else {
    schedule.tomorrow.forEach((block) => {
      const start = time.parse(block.startISO);
      const end = time.parse(block.endISO);
      console.log(`${block.kind.toUpperCase()}:`);
      console.log(`  Time: ${start.format('h:mm A')} - ${end.format('h:mm A')}`);
      console.log(`  Confidence: ${(block.confidence * 100).toFixed(1)}%`);
      console.log(`  Rationale: ${block.rationale}`);
      console.log('');
    });
  }

  console.log('=== WHAT-IF SCENARIOS ===');
  console.log('Testing with -15 min wake window adjustment:');
  const whatIfMinus = generateWhatIfSchedule(sessions, learnerState, TEST_BABY_PROFILE, -15);
  console.log(`  Today: ${whatIfMinus.today.length} blocks`);
  console.log(`  Tomorrow: ${whatIfMinus.tomorrow.length} blocks`);

  console.log('Testing with +15 min wake window adjustment:');
  const whatIfPlus = generateWhatIfSchedule(sessions, learnerState, TEST_BABY_PROFILE, 15);
  console.log(`  Today: ${whatIfPlus.today.length} blocks`);
  console.log(`  Tomorrow: ${whatIfPlus.tomorrow.length} blocks`);
}

export async function testScheduleWithMockData(): Promise<void> {
  console.log('=== Testing Schedule Generator with Mock Data ===\n');

  // Create mock sessions
  const now = time.now();
  const mockSessions: SleepSession[] = [
    {
      id: 'mock_1',
      startISO: now.subtract(2, 'hour').toISOString(),
      endISO: now.subtract(1, 'hour').toISOString(),
      source: 'timer',
      updatedAtISO: time.nowISO(),
    },
  ];


  const mockLearnerState: LearnerState = {
    version: 1,
    ewmaWakeWindowMin: 120, 
    ewmaNapLengthMin: 90,
    lastUpdatedISO: time.nowISO(),
    confidence: 0.7,
  };

  // Generate schedule
  const schedule = generateSchedule(mockSessions, mockLearnerState, TEST_BABY_PROFILE);

  console.log('Generated schedule:');
  console.log(`  Today: ${schedule.today.length} blocks`);
  console.log(`  Tomorrow: ${schedule.tomorrow.length} blocks`);

  schedule.today.forEach((block) => {
    const start = time.parse(block.startISO);
    console.log(`  - ${block.kind}: ${start.format('h:mm A')}`);
  });
}


export function formatScheduleBlock(block: {
  kind: string;
  startISO: string;
  endISO: string;
  confidence: number;
  rationale: string;
}): string {
  const start = time.parse(block.startISO);
  const end = time.parse(block.endISO);
  const duration = time.durationMinutes(block.startISO, block.endISO);

  return `${block.kind.toUpperCase()}: ${start.format('h:mm A')} - ${end.format('h:mm A')} (${duration}min) [${(block.confidence * 100).toFixed(0)}%] - ${block.rationale}`;
}


export async function getScheduleSummary(): Promise<{
  todayCount: number;
  tomorrowCount: number;
  nextBlock: string | null;
}> {
  const sessionsResult = await loadSleepSessions();
  const learnerResult = await loadLearnerState();

  const sessions = sessionsResult.value.filter((s) => !s.deleted);
  const learnerState = learnerResult.value;

  const schedule = generateSchedule(sessions, learnerState, TEST_BABY_PROFILE);

  const allBlocks = [...schedule.today, ...schedule.tomorrow];
  const nextBlock = allBlocks.length > 0 ? formatScheduleBlock(allBlocks[0]) : null;

  return {
    todayCount: schedule.today.length,
    tomorrowCount: schedule.tomorrow.length,
    nextBlock,
  };
}

