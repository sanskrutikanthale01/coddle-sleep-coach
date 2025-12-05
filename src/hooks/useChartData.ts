import { useMemo } from 'react';
import { SleepSession } from '../types';
import { time } from '../utils/time';

function isNap(session: SleepSession): boolean {
  const duration = time.durationMinutes(session.startISO, session.endISO);
  const startHour = time.parse(session.startISO).hour();
  // Nap: shorter duration (<4 hours) and starts during daytime (6 AM - 6 PM)
  return duration < 240 && startHour >= 6 && startHour < 18;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{ data: number[] }>;
}

export function useNapLengthChartData(sessions: SleepSession[]): ChartData {
  return useMemo(() => {
    // Group sessions by date
    const sessionsByDate: Record<string, SleepSession[]> = {};
    
    sessions.forEach((session) => {
      const dateKey = time.dayKey(session.startISO);
      if (!sessionsByDate[dateKey]) {
        sessionsByDate[dateKey] = [];
      }
      sessionsByDate[dateKey].push(session);
    });

    // Calculate average nap length per day
    const labels: string[] = [];
    const data: number[] = [];
    const sortedDates = Object.keys(sessionsByDate).sort().slice(-7); // Last 7 days

    sortedDates.forEach((dateKey) => {
      const daySessions = sessionsByDate[dateKey];
      const naps = daySessions.filter(isNap);
      
      if (naps.length > 0) {
        const totalNapMinutes = naps.reduce((sum, nap) => {
          return sum + time.durationMinutes(nap.startISO, nap.endISO);
        }, 0);
        const avgNapMinutes = totalNapMinutes / naps.length;
        labels.push(time.parse(dateKey + 'T00:00:00').format('MMM D'));
        data.push(Math.round(avgNapMinutes));
      } else {
        labels.push(time.parse(dateKey + 'T00:00:00').format('MMM D'));
        data.push(0);
      }
    });

    return { labels, datasets: [{ data }] };
  }, [sessions]);
}

export function useDaytimeSleepChartData(sessions: SleepSession[]): ChartData {
  return useMemo(() => {
    // Group sessions by date
    const sessionsByDate: Record<string, SleepSession[]> = {};
    
    sessions.forEach((session) => {
      const dateKey = time.dayKey(session.startISO);
      if (!sessionsByDate[dateKey]) {
        sessionsByDate[dateKey] = [];
      }
      sessionsByDate[dateKey].push(session);
    });

    // Calculate total daytime sleep per day (naps only)
    const labels: string[] = [];
    const data: number[] = [];
    const sortedDates = Object.keys(sessionsByDate).sort().slice(-7); // Last 7 days

    sortedDates.forEach((dateKey) => {
      const daySessions = sessionsByDate[dateKey];
      const naps = daySessions.filter(isNap);
      
      const totalDaytimeSleepMinutes = naps.reduce((sum, nap) => {
        return sum + time.durationMinutes(nap.startISO, nap.endISO);
      }, 0);
      labels.push(time.parse(dateKey + 'T00:00:00').format('MMM D'));
      data.push(Math.round(totalDaytimeSleepMinutes));
    });

    return { labels, datasets: [{ data }] };
  }, [sessions]);
}

