
import { coddleTheme } from '../theme/coddleTheme';
import { SleepSession } from '../types';
import { time } from './time';

export function getSessionColor(session: SleepSession): string {
  const duration = time.durationMinutes(session.startISO, session.endISO);
  const startHour = time.parse(session.startISO).hour();

  if (duration > 240 || (startHour >= 18 || startHour < 6)) {
    return coddleTheme.colors.sleepNight;
  }
  return coddleTheme.colors.sleepNap;
}

export function getQualityColor(quality?: number): string {
  if (!quality) return coddleTheme.colors.border;
  if (quality >= 4) return coddleTheme.colors.success;
  if (quality >= 3) return coddleTheme.colors.warning;
  return coddleTheme.colors.error;
}

export function getKindColor(kind: string): string {
  switch (kind) {
    case 'windDown':
      return coddleTheme.colors.accentPurple;
    case 'nap':
      return coddleTheme.colors.sleepNap;
    case 'bedtime':
      return coddleTheme.colors.sleepNight;
    default:
      return coddleTheme.colors.textSecondary;
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return coddleTheme.colors.success;
  if (confidence >= 0.4) return coddleTheme.colors.warning;
  return coddleTheme.colors.error;
}

export function getBlockColor(kind: 'nap' | 'bedtime' | 'windDown'): string {
  switch (kind) {
    case 'nap':
      return coddleTheme.colors.accentPurple;
    case 'bedtime':
      return coddleTheme.colors.sleepNight;
    case 'windDown':
      return coddleTheme.colors.accentPeach;
    default:
      return coddleTheme.colors.primarySoft;
  }
}

