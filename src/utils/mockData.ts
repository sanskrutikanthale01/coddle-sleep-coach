import { SleepSession } from '../types';
import { time } from './time';
import { saveSleepSessions } from '../storage/sleepStorage';

/**

 * @param replaceExisting .
 */
export async function generateMockData(replaceExisting: boolean = false): Promise<SleepSession[]> {
  const now = time.now();
  const sessions: SleepSession[] = [];

  
  let existingSessions: SleepSession[] = [];
  if (!replaceExisting) {
    const { loadSleepSessions } = await import('../storage/sleepStorage');
    const result = await loadSleepSessions();
    existingSessions = result.value.filter((s) => !s.deleted);
  }

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const day = now.subtract(dayOffset, 'day');

    const nightStart = day.hour(19 + Math.floor(Math.random() * 2)).minute(Math.floor(Math.random() * 60));
    const nightDuration = 420 + Math.floor(Math.random() * 60); // 7-8 hours
    const nightEnd = nightStart.add(nightDuration, 'minute');

    sessions.push({
      id: `mock_night_${dayOffset}_${Date.now()}`,
      startISO: nightStart.toISOString(),
      endISO: nightEnd.toISOString(),
      quality: (3 + Math.floor(Math.random() * 3)) as 1 | 2 | 3 | 4 | 5, // 3-5
      source: 'manual',
      updatedAtISO: time.nowISO(),
    });

    const numNaps = 2 + Math.floor(Math.random() * 2); // 2 or 3
    let lastWakeTime = nightEnd;

    for (let nap = 0; nap < numNaps; nap++) {
      const wakeWindow = 90 + Math.floor(Math.random() * 90);
      const napStart = lastWakeTime.add(wakeWindow, 'minute');

      const napDuration = 30 + Math.floor(Math.random() * 90);
      const napEnd = napStart.add(napDuration, 'minute');

      if (napStart.hour() < 19) {
        sessions.push({
          id: `mock_nap_${dayOffset}_${nap}_${Date.now()}`,
          startISO: napStart.toISOString(),
          endISO: napEnd.toISOString(),
          quality: (2 + Math.floor(Math.random() * 3)) as 1 | 2 | 3 | 4 | 5, // 2-4
          source: 'timer',
          updatedAtISO: time.nowISO(),
        });

        lastWakeTime = napEnd;
      }
    }
  }

  let finalSessions: SleepSession[];
  if (replaceExisting) {
    finalSessions = sessions;
  } else {
    const existingIds = new Set(existingSessions.map((s) => s.id));
    const newSessions = sessions.filter((s) => !existingIds.has(s.id));
    finalSessions = [...existingSessions, ...newSessions];
  }

  await saveSleepSessions(finalSessions);

  return finalSessions;
}


export async function clearMockData(): Promise<void> {
  await saveSleepSessions([]);
}

